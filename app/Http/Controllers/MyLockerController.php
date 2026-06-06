<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use App\Models\OriginPickup;
use App\Models\PreAlert;
use App\Models\Shipment;
use App\Services\CustomerWalletService;
use App\Services\Settings\SettingsResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MyLockerController extends Controller
{
    /**
     * Customer-facing locker dashboard.
     * Shows the customer's assigned locker and all their pre-alerts.
     */
    public function __construct(private CustomerWalletService $walletService) {}

    public function index(Request $request): Response
    {
        $customerId = Auth::id();
        $orgId      = Auth::user()->organization_id;

        $perPage = in_array((int) $request->get('per_page', 10), [10, 20, 30, 50])
            ? (int) $request->get('per_page', 10)
            : 10;

        // Load the customer's locker (one per customer in this flow)
        $locker = Locker::where('organization_id', $orgId)
            ->where('customer_id', $customerId)
            ->where('status', 'active')
            ->with('warehouse')
            ->withCount(['preAlerts', 'shipments'])
            ->first();

        // Pre-alerts belonging to this customer — paginated, per_page configurable
        $preAlerts = PreAlert::where('organization_id', $orgId)
            ->where('customer_id', $customerId)
            ->with(['locker:id,code', 'shipment:id,tracking_number'])
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        // Summary counters — single grouped query (was 5 separate COUNT queries)
        $counts = PreAlert::where('organization_id', $orgId)
            ->where('customer_id', $customerId)
            ->selectRaw('
                COUNT(*) as total,
                SUM(status = "pending") as pending,
                SUM(status IN ("received","processing")) as received,
                SUM(status = "converted") as converted,
                SUM(status = "cancelled") as cancelled
            ')
            ->first();

        $summary = [
            'total'     => (int) ($counts->total     ?? 0),
            'pending'   => (int) ($counts->pending   ?? 0),
            'received'  => (int) ($counts->received  ?? 0),
            'converted' => (int) ($counts->converted ?? 0),
            'cancelled' => (int) ($counts->cancelled ?? 0),
        ];

        // Org-level suite prefix — configurable by admin via Settings > Shipping Config
        $cfg         = app(SettingsResolver::class)->getEffectiveSettings($orgId);
        $suitePrefix = (string) ($cfg['locker_suite_prefix'] ?? 'Suite');

        // Pending pickups created automatically when customer placed a shipment
        $pendingPickups = OriginPickup::where('organization_id', $orgId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereHas('shipment', fn ($q) => $q->where('created_by', $customerId))
            ->with(['shipment:id,tracking_number,status'])
            ->orderBy('scheduled_for')
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'status'          => $p->status,
                'tracking_number' => $p->shipment?->tracking_number,
                'shipment_id'     => $p->shipment_id,
                'contact_name'    => $p->contact_name,
                'pickup_address'  => $p->pickup_address,
                'scheduled_for'   => $p->scheduled_for?->toIso8601String(),
                'driver_assigned' => !is_null($p->driver_id),
            ]);

        // Customer wallet balance
        $wallet = $this->walletService->getOrCreate(Auth::user());

        // Recent shipments (last 5)
        $recentShipments = Shipment::where('organization_id', $orgId)
            ->where('created_by', $customerId)
            ->select(['id', 'tracking_number', 'status', 'receiver_name', 'receiver_city', 'total_amount', 'currency', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        $shipmentCounts = Shipment::where('organization_id', $orgId)
            ->where('created_by', $customerId)
            ->selectRaw('COUNT(*) as total, SUM(status = "in_transit") as in_transit, SUM(status = "delivered") as delivered')
            ->first();

        return Inertia::render('MyLocker/Index', [
            'locker'          => $locker,
            'preAlerts'       => $preAlerts,
            'summary'         => $summary,
            'customerName'    => Auth::user()->name,
            'suitePrefix'     => $suitePrefix,
            'pendingPickups'  => $pendingPickups,
            'wallet'          => [
                'balance'           => (float) $wallet->balance,
                'currency'          => $wallet->currency,
                'formatted_balance' => $wallet->formatted_balance,
            ],
            'recentShipments' => $recentShipments,
            'shipmentCounts'  => [
                'total'      => (int) ($shipmentCounts->total ?? 0),
                'in_transit' => (int) ($shipmentCounts->in_transit ?? 0),
                'delivered'  => (int) ($shipmentCounts->delivered ?? 0),
            ],
        ]);
    }
}
