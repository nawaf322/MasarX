<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SaasInvoice;
use App\Models\SaasWalletTransaction;
use App\Services\SaasPaymentService;
use App\Services\SaasWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TenantBillingController extends Controller
{
    public function __construct(
        private readonly SaasWalletService $walletService,
        private readonly SaasPaymentService $paymentService,
    ) {}

    public function dashboard()
    {
        $user = Auth::user();
        $org  = $user->organization;

        $wallet           = $org ? $this->walletService->getOrCreate($org) : null;
        $activeSubscription = $org?->activeSaasSubscription()?->load('plan');

        $latestTransactions = $org
            ? SaasWalletTransaction::where('organization_id', $org->id)
                ->latest()->limit(10)->get()
            : collect();

        $latestInvoices = $org
            ? SaasInvoice::where('organization_id', $org->id)
                ->with('subscription.plan')
                ->latest()->limit(5)->get()
            : collect();

        return Inertia::render('Billing/SaasDashboard', [
            'wallet'              => $wallet,
            'active_subscription' => $activeSubscription,
            'latest_transactions' => $latestTransactions,
            'latest_invoices'     => $latestInvoices,
        ]);
    }

    public function transactions(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $query = SaasWalletTransaction::where('organization_id', $orgId);

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        $transactions = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Billing/SaasTransactions', [
            'transactions' => $transactions,
            'filters'      => $request->only(['type', 'from', 'to']),
        ]);
    }

    public function invoices(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $query = SaasInvoice::where('organization_id', $orgId)
            ->with('subscription.plan');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $invoices = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Billing/SaasInvoices/Index', [
            'invoices' => $invoices,
            'filters'  => $request->only(['status']),
        ]);
    }

    public function invoiceDetail(SaasInvoice $invoice)
    {
        $orgId = Auth::user()->organization_id;

        // Tenant can only see their own invoices
        abort_if($invoice->organization_id !== $orgId, 403);

        $invoice->load(['subscription.plan']);

        return Inertia::render('Billing/SaasInvoices/Show', [
            'invoice' => $invoice,
        ]);
    }

    public function rechargeForm()
    {
        $org    = Auth::user()->organization;
        $wallet = $org ? $this->walletService->getOrCreate($org) : null;

        return Inertia::render('Billing/Recharge', [
            'wallet' => $wallet,
        ]);
    }

    // ─── Stripe recharge flow ─────────────────────────────────────────────────

    public function createStripeSession(Request $request)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:10000'],
        ]);

        $org = Auth::user()->organization;
        abort_if(!$org, 403);

        try {
            $result = $this->paymentService->createStripeSession(
                org: $org,
                amount: (float) $request->amount,
            );
            return redirect()->away($result['redirect_url']);
        } catch (\Throwable $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }
    }

    public function stripeSuccess(Request $request)
    {
        $sessionId = $request->query('session_id');
        $orgId     = Auth::user()->organization_id;

        if ($sessionId && $orgId) {
            $this->paymentService->handleStripeSuccess($sessionId, $orgId);
        }

        return redirect()->route('tenant.billing.dashboard')
            ->with('success', __('saas_billing.recharge_success'));
    }

    public function stripeCancel()
    {
        return redirect()->route('tenant.billing.recharge')
            ->with('warning', __('saas_billing.recharge_cancelled'));
    }

    // ─── PayPal recharge flow ─────────────────────────────────────────────────

    public function createPayPalOrder(Request $request)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:10000'],
        ]);

        $org = Auth::user()->organization;
        abort_if(!$org, 403);

        try {
            $result = $this->paymentService->createPayPalOrder(
                org: $org,
                amount: (float) $request->amount,
            );
            return redirect()->away($result['redirect_url']);
        } catch (\Throwable $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }
    }

    public function capturePayPalOrder(Request $request)
    {
        $orderId = $request->query('token'); // PayPal returns `token` param on return_url
        $orgId   = Auth::user()->organization_id;

        if ($orderId && $orgId) {
            $ok = $this->paymentService->capturePayPalOrder($orderId, $orgId);

            if ($ok) {
                return redirect()->route('tenant.billing.dashboard')
                    ->with('success', __('saas_billing.recharge_success'));
            }
        }

        return redirect()->route('tenant.billing.recharge')
            ->withErrors(['payment' => __('saas_billing.recharge_failed')]);
    }

    public function paypalCancel()
    {
        return redirect()->route('tenant.billing.recharge')
            ->with('warning', __('saas_billing.recharge_cancelled'));
    }
}
