<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace App\Http\Controllers;

use App\Enums\ShipmentStatus;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    /**
     * Financial summary report for the authenticated organization.
     * Replaces the hardcoded stub that returned 'revenue' => 24500.
     */
    public function financial(Request $request)
    {
        // Distributed verification point #5
        if (!app(\App\Services\LicenseVerificationService::class)->isActivated()) {
            return Inertia::render('Reports/Financial', ['data' => []]);
        }

        $orgId = Auth::user()->organization_id;

        // Single aggregation replaces 5 separate cloned queries.
        $aggQuery = DB::table('shipments')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at');

        if ($request->filled('date_from')) {
            $aggQuery->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $aggQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $agg = (clone $aggQuery)->selectRaw("
            COUNT(*) as shipment_count,
            COALESCE(SUM(CASE WHEN payment_status IN ('paid','partial') THEN total ELSE 0 END), 0) as revenue,
            COALESCE(SUM(CASE WHEN payment_status = 'paid'    THEN total ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN payment_status = 'partial' THEN total ELSE 0 END), 0) as total_partial,
            COALESCE(SUM(CASE WHEN payment_status = 'unpaid'  THEN total ELSE 0 END), 0) as total_unpaid,
            COUNT(CASE WHEN status = ? THEN 1 END) as delivered_count
        ", [ShipmentStatus::DELIVERED->value])->first();

        $revenue        = (float) ($agg->revenue ?? 0);
        $totalPaid      = (float) ($agg->total_paid ?? 0);
        $totalPartial   = (float) ($agg->total_partial ?? 0);
        $totalUnpaid    = (float) ($agg->total_unpaid ?? 0);
        $shipmentCount  = (int) ($agg->shipment_count ?? 0);
        $deliveredCount = (int) ($agg->delivered_count ?? 0);

        // Monthly revenue for the last 7 months (for chart).
        $monthlyRows = DB::table('shipments')
            ->select(DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"), DB::raw('SUM(total) as total'))
            ->where('organization_id', $orgId)
            ->whereIn('payment_status', ['paid', 'partial'])
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->map(fn ($v) => (float) $v);

        // Build a 7-slot array with zero-fill for missing months.
        $monthlyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $key = now()->subMonths($i)->format('Y-m');
            $monthlyData[$key] = $monthlyRows->get($key, 0.0);
        }

        // ── Returns stats ──────────────────────────────────────────────────────
        try {
            $returnsQuery = DB::table('return_shipments')->where('organization_id', $orgId);
            if ($request->filled('date_from')) {
                $returnsQuery->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $returnsQuery->whereDate('created_at', '<=', $request->date_to);
            }

            $returnsCount       = (clone $returnsQuery)->count();
            $returnsRefundTotal = (float) (clone $returnsQuery)->whereIn('status', ['approved', 'completed'])->sum('refund_amount');
            $returnsByReason    = (clone $returnsQuery)
                ->selectRaw('reason, COUNT(*) as cnt')
                ->groupBy('reason')->orderByDesc('cnt')->get()
                ->pluck('cnt', 'reason');
            $returnsByStatus    = (clone $returnsQuery)
                ->selectRaw('status, COUNT(*) as cnt')
                ->groupBy('status')->get()
                ->pluck('cnt', 'status');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ReportController::financial returns query failed', ['error' => $e->getMessage()]);
            $returnsCount = $returnsRefundTotal = 0;
            $returnsByReason = $returnsByStatus = collect();
        }

        return Inertia::render('Reports/Financial', [
            'revenue'              => $revenue,
            'total_paid'           => $totalPaid,
            'total_partial'        => $totalPartial,
            'total_unpaid'         => $totalUnpaid,
            'shipment_count'       => $shipmentCount,
            'delivered_count'      => $deliveredCount,
            'monthly_data'         => $monthlyData,
            'returns_count'        => $returnsCount,
            'returns_refund_total' => $returnsRefundTotal,
            'returns_by_reason'    => $returnsByReason,
            'returns_by_status'    => $returnsByStatus,
            'filters'              => $request->only(['date_from', 'date_to']),
        ]);
    }

    public function index()
    {
        $orgId = Auth::user()->organization_id;
        $stats = [
            'total_shipments' => \App\Models\Shipment::where('organization_id', $orgId)->count(),
            'delivered'       => \App\Models\Shipment::where('organization_id', $orgId)->where('status', 'delivered')->count(),
            'total_revenue'   => (float) \App\Models\Shipment::where('organization_id', $orgId)->whereIn('payment_status', ['paid','partial'])->sum('total'),
            'total_returns'   => \App\Models\ReturnShipment::where('organization_id', $orgId)->count(),
        ];
        return Inertia::render('Reports/Index', ['stats' => $stats]);
    }

    public function shipmentsReport(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $query = \App\Models\Shipment::where('organization_id', $orgId)
            ->with('shipmentStatus')
            ->select('id','tracking_number','status','payment_status','total','currency','created_at','sender_details','receiver_details','service_type');

        if ($request->filled('status'))        { $query->where('status', $request->status); }
        if ($request->filled('payment_status')){ $query->where('payment_status', $request->payment_status); }
        if ($request->filled('date_from'))     { $query->whereDate('created_at', '>=', $request->date_from); }
        if ($request->filled('date_to'))       { $query->whereDate('created_at', '<=', $request->date_to); }

        $shipments = $query->orderByDesc('created_at')->paginate(25)->withQueryString();

        $totals = [
            'count'   => (clone $query)->count(),
            'revenue' => (float)(clone $query)->whereIn('payment_status',['paid','partial'])->sum('total'),
            'unpaid'  => (float)(clone $query)->where('payment_status','unpaid')->sum('total'),
        ];

        $statuses = \App\Models\ShipmentStatus::where('organization_id', $orgId)->where('is_active', true)->get(['code','name']);

        return Inertia::render('Reports/Shipments', [
            'shipments' => $shipments,
            'totals'    => $totals,
            'statuses'  => $statuses,
            'filters'   => $request->only(['status','payment_status','date_from','date_to']),
        ]);
    }

    public function exportShipmentsPdf(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $org   = Auth::user()->organization;

        $query = \App\Models\Shipment::where('organization_id', $orgId)
            ->select('id','tracking_number','status','payment_status','total','currency','created_at','sender_details','receiver_details');
        if ($request->filled('status'))        { $query->where('status', $request->status); }
        if ($request->filled('payment_status')){ $query->where('payment_status', $request->payment_status); }
        if ($request->filled('date_from'))     { $query->whereDate('created_at', '>=', $request->date_from); }
        if ($request->filled('date_to'))       { $query->whereDate('created_at', '<=', $request->date_to); }

        $PDF_LIMIT   = 1000;
        $totalCount  = (clone $query)->count();
        $truncated   = $totalCount > $PDF_LIMIT;
        $shipments   = $query->orderByDesc('created_at')->limit($PDF_LIMIT)->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.reports.shipments', [
            'shipments'    => $shipments,
            'org'          => $org,
            'filters'      => $request->only(['status','payment_status','date_from','date_to']),
            'generated_at' => now()->format('Y-m-d H:i'),
            'truncated'    => $truncated,
            'total_count'  => $totalCount,
            'pdf_limit'    => $PDF_LIMIT,
        ])->setPaper('a4', 'landscape');

        return $pdf->download('shipments-report-' . now()->format('Y-m-d') . '.pdf');
    }

    public function exportShipmentsExcel(Request $request)
    {
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\ShipmentsReportExport(Auth::user()->organization_id, $request->only(['status','payment_status','date_from','date_to'])),
            'shipments-report-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    public function returnsReport(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $query = \App\Models\ReturnShipment::where('organization_id', $orgId)
            ->with(['originalShipment:id,tracking_number,total,currency', 'createdBy:id,name']);

        if ($request->filled('status'))   { $query->where('status', $request->status); }
        if ($request->filled('reason'))   { $query->where('reason', $request->reason); }
        if ($request->filled('date_from')){ $query->whereDate('created_at', '>=', $request->date_from); }
        if ($request->filled('date_to'))  { $query->whereDate('created_at', '<=', $request->date_to); }

        $returns = $query->orderByDesc('created_at')->paginate(25)->withQueryString();

        $totals = [
            'count'         => \App\Models\ReturnShipment::where('organization_id', $orgId)->count(),
            'total_refunds' => (float)\App\Models\ReturnShipment::where('organization_id', $orgId)->whereIn('status',['approved','completed'])->sum('refund_amount'),
        ];

        return Inertia::render('Reports/Returns', [
            'returns' => $returns,
            'totals'  => $totals,
            'filters' => $request->only(['status','reason','date_from','date_to']),
        ]);
    }

    public function exportReturnsPdf(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $org   = Auth::user()->organization;

        $query = \App\Models\ReturnShipment::where('organization_id', $orgId)
            ->with('originalShipment:id,tracking_number,total,currency');
        if ($request->filled('status'))   { $query->where('status', $request->status); }
        if ($request->filled('reason'))   { $query->where('reason', $request->reason); }
        if ($request->filled('date_from')){ $query->whereDate('created_at', '>=', $request->date_from); }
        if ($request->filled('date_to'))  { $query->whereDate('created_at', '<=', $request->date_to); }

        $returns = $query->orderByDesc('created_at')->limit(1000)->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.reports.returns', [
            'returns'      => $returns,
            'org'          => $org,
            'filters'      => $request->only(['status','reason','date_from','date_to']),
            'generated_at' => now()->format('Y-m-d H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('returns-report-' . now()->format('Y-m-d') . '.pdf');
    }

    public function exportReturnsExcel(Request $request)
    {
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\ReturnsReportExport(Auth::user()->organization_id, $request->only(['status','reason','date_from','date_to'])),
            'returns-report-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    public function exportFinancialPdf(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $org   = Auth::user()->organization;

        $query = \App\Models\Shipment::where('organization_id', $orgId)->whereIn('payment_status', ['paid', 'partial']);
        if ($request->filled('date_from')){ $query->whereDate('created_at', '>=', $request->date_from); }
        if ($request->filled('date_to'))  { $query->whereDate('created_at', '<=', $request->date_to); }

        $revenue      = (float)(clone $query)->sum('total');
        $totalPaid    = (float)(clone $query)->where('payment_status','paid')->sum('total');
        $totalPartial = (float)(clone $query)->where('payment_status','partial')->sum('total');
        $totalUnpaid  = (float)\App\Models\Shipment::where('organization_id',$orgId)->where('payment_status','unpaid')->sum('total');
        $delivered    = \App\Models\Shipment::where('organization_id',$orgId)->where('status','delivered')->count();
        $total        = \App\Models\Shipment::where('organization_id',$orgId)->count();

        try {
            $rq = \Illuminate\Support\Facades\DB::table('return_shipments')->where('organization_id',$orgId);
            if ($request->filled('date_from')){ $rq->whereDate('created_at','>=',$request->date_from); }
            if ($request->filled('date_to'))  { $rq->whereDate('created_at','<=',$request->date_to); }
            $returnsCount = $rq->count();
            $totalRefunds = (float)$rq->whereIn('status',['approved','completed'])->sum('refund_amount');
        } catch (\Throwable $e) { $returnsCount = 0; $totalRefunds = 0.0; }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.reports.financial', [
            'org'           => $org,
            'revenue'       => $revenue,
            'total_paid'    => $totalPaid,
            'total_partial' => $totalPartial,
            'total_unpaid'  => $totalUnpaid,
            'delivered'     => $delivered,
            'total'         => $total,
            'returns_count' => $returnsCount,
            'total_refunds' => $totalRefunds,
            'net_revenue'   => $revenue - $totalRefunds,
            'filters'       => $request->only(['date_from','date_to']),
            'generated_at'  => now()->format('Y-m-d H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download('financial-report-' . now()->format('Y-m-d') . '.pdf');
    }

    public function exportFinancialExcel(Request $request)
    {
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\FinancialReportExport(Auth::user()->organization_id, $request->only(['date_from','date_to'])),
            'financial-report-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    // M8 — GL Accounting Export
    public function exportGl(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\GlExport($orgId, $request->only(['date_from', 'date_to'])),
            'gl-journal-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    // M8 — Branch Profitability Report
    public function branchReport(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $from  = $request->input('from', now()->startOfMonth()->toDateString());
        $to    = $request->input('to',   now()->endOfMonth()->toDateString());

        $branchData = \DB::table('shipments')
            ->join('users', 'shipments.created_by', '=', 'users.id')
            ->leftJoin('branches', 'users.branch_id', '=', 'branches.id')
            ->where('shipments.organization_id', $orgId)
            ->whereBetween(\DB::raw('DATE(shipments.created_at)'), [$from, $to])
            ->whereNull('shipments.deleted_at')
            ->select(
                \DB::raw('COALESCE(branches.name, "No Branch") as branch_name'),
                \DB::raw('COALESCE(branches.id, 0) as branch_id'),
                \DB::raw('COUNT(shipments.id) as total_shipments'),
                \DB::raw('COALESCE(SUM(CASE WHEN shipments.payment_status IN ("paid","partial") THEN shipments.total ELSE 0 END), 0) as revenue'),
                \DB::raw('SUM(COALESCE(shipments.cost_price, 0)) as total_cost'),
                \DB::raw('COALESCE(SUM(CASE WHEN shipments.payment_status IN ("paid","partial") THEN shipments.total ELSE 0 END), 0) - SUM(COALESCE(shipments.cost_price, 0)) as profit'),
                \DB::raw('SUM(CASE WHEN shipments.status = "delivered" THEN 1 ELSE 0 END) as delivered_count')
            )
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('revenue')
            ->get();

        return Inertia::render('Reports/BranchProfitability', [
            'branchData' => $branchData,
            'filters'    => compact('from', 'to'),
        ]);
    }

    // M8 — Zone Profitability Report
    public function zoneReport(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $from  = $request->input('from', now()->startOfMonth()->toDateString());
        $to    = $request->input('to',   now()->endOfMonth()->toDateString());

        $zoneData = \DB::table('shipments')
            ->leftJoin('rate_rules', 'shipments.rate_rule_id', '=', 'rate_rules.id')
            ->leftJoin('rate_cards', 'rate_rules.rate_card_id', '=', 'rate_cards.id')
            ->where('shipments.organization_id', $orgId)
            ->whereBetween(\DB::raw('DATE(shipments.created_at)'), [$from, $to])
            ->whereNull('shipments.deleted_at')
            ->select(
                \DB::raw('COALESCE(rate_cards.name, "No Zone / Rate Card") as zone_name'),
                \DB::raw('COUNT(shipments.id) as total_shipments'),
                \DB::raw('COALESCE(SUM(CASE WHEN shipments.payment_status IN ("paid","partial") THEN shipments.total ELSE 0 END), 0) as revenue'),
                \DB::raw('SUM(COALESCE(shipments.cost_price, 0)) as total_cost'),
                \DB::raw('COALESCE(SUM(CASE WHEN shipments.payment_status IN ("paid","partial") THEN shipments.total ELSE 0 END), 0) - SUM(COALESCE(shipments.cost_price, 0)) as profit'),
                \DB::raw('COALESCE(AVG(NULLIF(shipments.total, 0)), 0) as avg_shipment_value')
            )
            ->groupBy('rate_cards.id', 'rate_cards.name')
            ->orderByDesc('revenue')
            ->get();

        return Inertia::render('Reports/ZoneProfitability', [
            'zoneData' => $zoneData,
            'filters'  => compact('from', 'to'),
        ]);
    }
}
