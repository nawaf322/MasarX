<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

namespace App\Http\Controllers;

use App\Services\FinanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function __construct(private FinanceService $finance) {}

    public function index(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        // ── Filters ───────────────────────────────────────────────────────────
        $start        = $request->input('start_date', Carbon::now()->startOfMonth()->toDateString());
        $end          = $request->input('end_date',   Carbon::now()->endOfMonth()->toDateString());
        $branchId     = $request->input('branch_id', 'all');
        $departmentId = $request->input('department_id', 'all');

        // ── All aggregations via FinanceService ───────────────────────────────
        $metrics         = $this->finance->getMetrics($orgId, $start, $end);
        $revenueTrend    = $this->finance->getRevenueTrend($orgId, $start, $end);
        $codPipeline     = $this->finance->getCodPipeline($orgId, $start, $end);
        $commMetrics     = $this->finance->getCommissionMetrics($orgId, $start, $end);
        $topCommissionees= $this->finance->getTopCommissionees($orgId, $start, $end);
        $returnRow       = $this->finance->getReturnMetrics($orgId, $start, $end);
        $returnsByReason = $this->finance->getReturnsByReason($orgId, $start, $end);
        $topBranches     = $this->finance->getTopBranches($orgId, $start, $end, $branchId);
        $topDepartments  = $this->finance->getTopDepartments($orgId, $start, $end, $departmentId);

        // ── Derived values ────────────────────────────────────────────────────
        $totalRefunds    = (float) ($returnRow->total_refunds ?? 0);
        $netAfterRefunds = (float) ($metrics->net_revenue ?? 0) - $totalRefunds;

        return Inertia::render('Finance/Dashboard', [
            'metrics'            => $metrics,
            'trend'              => $revenueTrend,
            'topBranches'        => $topBranches,
            'topDepartments'     => $topDepartments,
            'cod_pipeline'       => $codPipeline,
            'commission_metrics' => $commMetrics,
            'top_commissionees'  => $topCommissionees,
            'returns_count'      => (int) ($returnRow->returns_count ?? 0),
            'total_refunds'      => $totalRefunds,
            'net_after_refunds'  => $netAfterRefunds,
            'returns_by_reason'  => $returnsByReason,
            'filters' => [
                'start_date'    => $start,
                'end_date'      => $end,
                'branch_id'     => $branchId,
                'department_id' => $departmentId,
            ],
            'branches'    => \App\Models\Branch::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']),
            'departments' => rescue(
                fn () => \App\Models\Department::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']),
                collect(),
                false,
            ),
        ]);
    }
}
