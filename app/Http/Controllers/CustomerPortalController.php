<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Services\CustomerWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CustomerPortalController extends Controller
{
    public function __construct(private CustomerWalletService $walletService) {}

    /**
     * Customer shipments list (self-service portal)
     */
    public function shipments(Request $request): Response
    {
        $user    = Auth::user();
        $perPage = in_array((int) $request->get('per_page', 10), [10, 20, 50]) ? (int) $request->get('per_page', 10) : 10;

        $shipments = Shipment::where('organization_id', $user->organization_id)
            ->where('created_by', $user->id)
            ->select([
                'id', 'tracking_number', 'status', 'payment_status',
                'receiver_name', 'receiver_city', 'receiver_country',
                'total_amount', 'currency', 'weight', 'service_name',
                'created_at', 'delivered_at',
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $wallet  = $this->walletService->getOrCreate($user);

        $counts = Shipment::where('organization_id', $user->organization_id)
            ->where('created_by', $user->id)
            ->selectRaw('
                COUNT(*) as total,
                SUM(status = "pending") as pending,
                SUM(status = "in_transit") as in_transit,
                SUM(status = "delivered") as delivered,
                SUM(status IN ("returned","cancelled")) as returned
            ')
            ->first();

        return Inertia::render('Customer/Shipments/Index', [
            'shipments' => $shipments,
            'wallet'    => [
                'balance'           => (float) $wallet->balance,
                'currency'          => $wallet->currency,
                'formatted_balance' => $wallet->formatted_balance,
            ],
            'stats' => [
                'total'      => (int) ($counts->total ?? 0),
                'pending'    => (int) ($counts->pending ?? 0),
                'in_transit' => (int) ($counts->in_transit ?? 0),
                'delivered'  => (int) ($counts->delivered ?? 0),
                'returned'   => (int) ($counts->returned ?? 0),
            ],
        ]);
    }
}
