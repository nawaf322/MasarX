<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Services\ShipmentStateMachine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CodController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $query = Shipment::where('organization_id', $orgId)
            ->where('is_cod', true)
            ->with('codCollector');

        if ($request->filled('cod_status')) {
            $query->where('cod_status', $request->get('cod_status'));
        }

        $shipments = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        // Single aggregation query replaces 4 separate sum() calls
        $statsRaw = Shipment::where('organization_id', $orgId)
            ->where('is_cod', true)
            ->selectRaw("
                COALESCE(SUM(cod_amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN cod_status = 'pending'   THEN cod_amount ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN cod_status = 'collected' THEN cod_amount ELSE 0 END), 0) as collected,
                COALESCE(SUM(CASE WHEN cod_status = 'remitted'  THEN cod_amount ELSE 0 END), 0) as remitted,
                COUNT(*) as total_count,
                COUNT(CASE WHEN cod_status = 'pending'   THEN 1 END) as pending_count,
                COUNT(CASE WHEN cod_status = 'collected' THEN 1 END) as collected_count,
                COUNT(CASE WHEN cod_status = 'remitted'  THEN 1 END) as remitted_count
            ")
            ->first();

        $stats = [
            'total_amount'    => (float) ($statsRaw->total_amount ?? 0),
            'pending'         => (float) ($statsRaw->pending ?? 0),
            'collected'       => (float) ($statsRaw->collected ?? 0),
            'remitted'        => (float) ($statsRaw->remitted ?? 0),
            'total_count'     => (int)   ($statsRaw->total_count ?? 0),
            'pending_count'   => (int)   ($statsRaw->pending_count ?? 0),
            'collected_count' => (int)   ($statsRaw->collected_count ?? 0),
            'remitted_count'  => (int)   ($statsRaw->remitted_count ?? 0),
        ];

        return Inertia::render('Cod/Index', [
            'shipments' => $shipments,
            'stats' => $stats,
            'filters' => $request->only(['cod_status']),
        ]);
    }

    public function collect(Request $request, Shipment $shipment): \Illuminate\Http\RedirectResponse
    {
        abort_if($shipment->organization_id !== Auth::user()->organization_id, 403);
        abort_if(!$shipment->is_cod, 422, __('cod.not_cod_shipment'));

        // Business rule: COD can only be collected on a delivered shipment
        app(ShipmentStateMachine::class)->requireState($shipment, 'delivered', 'collect COD');

        $shipment->update([
            'cod_status'       => 'collected',
            'cod_collected_at' => now(),
            'cod_collected_by' => Auth::id(),
        ]);

        event(new \App\Events\CODCollected($shipment, (float) $shipment->cod_amount, Auth::id()));

        return back()->with('success', __('cod.collected'));
    }

    public function remit(Request $request, Shipment $shipment): \Illuminate\Http\RedirectResponse
    {
        abort_if($shipment->organization_id !== Auth::user()->organization_id, 403);
        abort_if($shipment->cod_status !== 'collected', 422, __('cod.not_collected_yet'));

        $shipment->update([
            'cod_status' => 'remitted',
        ]);

        event(new \App\Events\CODRemitted($shipment, (float) $shipment->cod_amount, Auth::id()));

        return back()->with('success', __('cod.remitted'));
    }
}
