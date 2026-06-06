<?php

namespace App\Http\Controllers;

use App\Models\CustomerWallet;
use App\Models\CustomerWalletTransaction;
use App\Services\CustomerWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CustomerWalletController extends Controller
{
    public function __construct(private CustomerWalletService $walletService) {}

    public function index(Request $request): Response
    {
        $user   = Auth::user();
        $wallet = $this->walletService->getOrCreate($user);

        $perPage = in_array((int) $request->get('per_page', 10), [10, 20, 50]) ? (int) $request->get('per_page', 10) : 10;

        $transactions = CustomerWalletTransaction::where('user_id', $user->id)
            ->with('shipment:id,tracking_number')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $stats = CustomerWalletTransaction::where('user_id', $user->id)
            ->selectRaw('
                SUM(CASE WHEN type = "credit" THEN amount ELSE 0 END) as total_credited,
                SUM(CASE WHEN type IN ("debit","hold") THEN amount ELSE 0 END) as total_spent,
                COUNT(CASE WHEN type = "credit" THEN 1 END) as recharge_count
            ')
            ->first();

        return Inertia::render('Customer/Wallet/Index', [
            'wallet'       => [
                'balance'           => (float) $wallet->balance,
                'currency'          => $wallet->currency,
                'formatted_balance' => $wallet->formatted_balance,
                'last_recharged_at' => $wallet->last_recharged_at?->toIso8601String(),
                'last_debited_at'   => $wallet->last_debited_at?->toIso8601String(),
            ],
            'transactions' => $transactions,
            'stats'        => [
                'total_credited'  => (float) ($stats->total_credited ?? 0),
                'total_spent'     => (float) ($stats->total_spent ?? 0),
                'recharge_count'  => (int) ($stats->recharge_count ?? 0),
            ],
        ]);
    }

    public function rechargeForm(): Response
    {
        $user   = Auth::user();
        $wallet = $this->walletService->getOrCreate($user);

        return Inertia::render('Customer/Wallet/Recharge', [
            'wallet' => [
                'balance'  => (float) $wallet->balance,
                'currency' => $wallet->currency,
            ],
        ]);
    }

    public function processRecharge(Request $request)
    {
        $data = $request->validate([
            'amount'         => 'required|numeric|min:10|max:50000',
            'payment_method' => 'required|in:mada,apple_pay,bank_transfer,stripe',
        ]);

        $user = Auth::user();
        $this->walletService->getOrCreate($user);

        // For bank_transfer: create pending transaction, await admin approval
        // For online methods: integrate payment gateway (Stripe/Mada)
        // Demo: credit immediately
        $this->walletService->credit(
            $user,
            (float) $data['amount'],
            'شحن المحفظة عبر ' . $data['payment_method'],
            null,
            $data['payment_method'],
            ['method' => $data['payment_method']],
            $user->id,
        );

        return redirect()->route('my-wallet.index')->with('success', 'تم شحن المحفظة بنجاح');
    }

    public function adminIndex(int $customerId): Response
    {
        $this->authorize('customers.access');

        $wallet = CustomerWallet::where('user_id', $customerId)
            ->with('user:id,name,email')
            ->firstOrFail();

        $transactions = CustomerWalletTransaction::where('user_id', $customerId)
            ->with(['shipment:id,tracking_number', 'performer:id,name'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Admin/CustomerWallet/Show', [
            'wallet'       => $wallet,
            'transactions' => $transactions,
        ]);
    }

    public function adminCredit(Request $request, int $customerId)
    {
        $this->authorize('customers.access');

        $data = $request->validate([
            'amount'      => 'required|numeric|min:1|max:100000',
            'description' => 'required|string|max:255',
        ]);

        $customer = \App\Models\User::findOrFail($customerId);
        $this->walletService->getOrCreate($customer);
        $this->walletService->adminCredit($customer, (float) $data['amount'], $data['description'], Auth::id());

        return back()->with('success', 'تم شحن المحفظة بنجاح');
    }
}
