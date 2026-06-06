<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\SaasInvoice;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\SaasWallet;
use App\Models\SaasWalletTransaction;
use App\Services\SaasInvoiceService;
use App\Services\SaasSubscriptionService;
use App\Services\SaasWalletService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SaasBillingController extends Controller
{
    public function __construct(
        private readonly SaasWalletService      $walletService,
        private readonly SaasSubscriptionService $subscriptionService,
        private readonly SaasInvoiceService      $invoiceService,
    ) {}

    // ──────────────────────────────────────────────────────────────
    // Dashboard
    // ──────────────────────────────────────────────────────────────

    public function dashboard()
    {
        $now = Carbon::now();

        // Revenue stats from wallet transactions (debits for subscription = platform earned)
        $revenueThisMonth = SaasWalletTransaction::where('type', 'debit')
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        $revenueThisYear = SaasWalletTransaction::where('type', 'debit')
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        // Subscription status counts
        $activeCount      = SaasSubscription::whereIn('status', ['active', 'trial'])->count();
        $graceCount       = SaasSubscription::where('status', 'grace_period')->count();
        $readOnlyCount    = SaasSubscription::where('status', 'read_only')->count();
        $noSubCount       = Organization::where('is_active', true)
            ->whereDoesntHave('saasSubscriptions', fn ($q) => $q->whereIn('status', ['active', 'trial', 'grace_period', 'read_only']))
            ->count();

        // Monthly revenue for last 12 months (cross-DB compatible)
        $driver     = DB::getDriverName();
        $monthExpr  = $driver === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $monthlyRevenue = SaasWalletTransaction::where('type', 'debit')
            ->where('created_at', '>=', $now->copy()->subMonths(11)->startOfMonth())
            ->selectRaw("{$monthExpr} as month, SUM(amount) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $revenueChart = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = $now->copy()->subMonths($i)->format('Y-m');
            $revenueChart[] = [
                'month' => $now->copy()->subMonths($i)->format('M Y'),
                'total' => (float) ($monthlyRevenue[$key]->total ?? 0),
            ];
        }

        // Expiring soon (7 days)
        $expiringSoon = SaasSubscription::with(['organization', 'plan'])
            ->whereIn('status', ['active', 'trial'])
            ->where('expires_at', '<=', $now->copy()->addDays(7))
            ->where('expires_at', '>', $now)
            ->orderBy('expires_at')
            ->limit(20)
            ->get();

        // Last 10 transactions globally
        $latestTransactions = SaasWalletTransaction::with(['organization', 'performedBy'])
            ->latest()
            ->limit(10)
            ->get();

        return Inertia::render('Admin/Billing/Dashboard', [
            'stats' => [
                'revenue_this_month' => (float) $revenueThisMonth,
                'revenue_this_year'  => (float) $revenueThisYear,
                'active'             => $activeCount,
                'grace_period'       => $graceCount,
                'read_only'          => $readOnlyCount,
                'no_subscription'    => $noSubCount,
            ],
            'revenue_chart'       => $revenueChart,
            'expiring_soon'       => $expiringSoon,
            'latest_transactions' => $latestTransactions,
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // Plans
    // ──────────────────────────────────────────────────────────────

    public function plans()
    {
        $plans = SaasPlan::withTrashed()
            ->withCount('subscriptions')
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Admin/Billing/Plans/Index', ['plans' => $plans]);
    }

    public function createPlan()
    {
        return Inertia::render('Admin/Billing/Plans/Create');
    }

    public function storePlan(Request $request)
    {
        $data = $request->validate([
            'name'              => 'required|string|max:100',
            'slug'              => 'required|string|max:100|unique:saas_plans,slug',
            'description'       => 'nullable|string',
            'price_monthly'     => 'required|numeric|min:0',
            'price_quarterly'   => 'nullable|numeric|min:0',
            'price_semiannual'  => 'nullable|numeric|min:0',
            'price_annual'      => 'nullable|numeric|min:0',
            'currency'          => 'required|string|size:3',
            'trial_days'        => 'required|integer|min:0',
            'grace_period_days' => 'required|integer|min:0',
            'sort_order'        => 'required|integer|min:0',
            'features'          => 'nullable|array',
            'limits'            => 'nullable|array',
            'is_active'         => 'boolean',
        ]);

        SaasPlan::create($data);

        return redirect()->route('admin.billing.plans')
            ->with('success', 'saas_billing.plan_created');
    }

    public function editPlan(SaasPlan $plan)
    {
        return Inertia::render('Admin/Billing/Plans/Edit', ['plan' => $plan]);
    }

    public function updatePlan(Request $request, SaasPlan $plan)
    {
        $data = $request->validate([
            'name'              => 'required|string|max:100',
            'slug'              => "required|string|max:100|unique:saas_plans,slug,{$plan->id}",
            'description'       => 'nullable|string',
            'price_monthly'     => 'required|numeric|min:0',
            'price_quarterly'   => 'nullable|numeric|min:0',
            'price_semiannual'  => 'nullable|numeric|min:0',
            'price_annual'      => 'nullable|numeric|min:0',
            'currency'          => 'required|string|size:3',
            'trial_days'        => 'required|integer|min:0',
            'grace_period_days' => 'required|integer|min:0',
            'sort_order'        => 'required|integer|min:0',
            'features'          => 'nullable|array',
            'limits'            => 'nullable|array',
            'is_active'         => 'boolean',
        ]);

        $plan->update($data);

        return redirect()->route('admin.billing.plans')
            ->with('success', 'saas_billing.plan_updated');
    }

    public function togglePlanStatus(SaasPlan $plan)
    {
        $plan->update(['is_active' => !$plan->is_active]);

        return back()->with('success', 'saas_billing.plan_updated');
    }

    // ──────────────────────────────────────────────────────────────
    // Wallets
    // ──────────────────────────────────────────────────────────────

    public function wallets(Request $request)
    {
        $query = Organization::with(['saasWallet', 'saasSubscriptions' => fn ($q) => $q->whereIn('status', ['active', 'trial', 'grace_period'])->with('plan')->latest()->limit(1)])
            ->where('is_active', true);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('balance') && $request->balance !== 'all') {
            if ($request->balance === 'with_balance') {
                $query->whereHas('saasWallet', fn ($q) => $q->where('balance', '>', 0));
            } elseif ($request->balance === 'no_balance') {
                $query->whereDoesntHave('saasWallet')
                      ->orWhereHas('saasWallet', fn ($q) => $q->where('balance', '<=', 0));
            }
        }

        $organizations = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Admin/Billing/Wallets/Index', [
            'organizations' => $organizations,
            'filters'       => $request->only(['search', 'balance']),
        ]);
    }

    public function walletDetail(Organization $organization)
    {
        $wallet = $this->walletService->getOrCreate($organization);

        $transactions = SaasWalletTransaction::where('organization_id', $organization->id)
            ->with('performedBy')
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $activeSubscription = $organization->activeSaasSubscription()?->load('plan');

        return Inertia::render('Admin/Billing/Wallets/Show', [
            'organization'       => $organization,
            'wallet'             => $wallet,
            'transactions'       => $transactions,
            'active_subscription'=> $activeSubscription,
        ]);
    }

    public function creditWallet(Request $request, Organization $organization)
    {
        $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
            'credit_type' => 'nullable|in:promotional,demo,goodwill,manual',
            'expires_at'  => 'nullable|date|after:today',
        ]);

        $this->walletService->getOrCreate($organization);

        $typeLabel   = match ($request->credit_type) {
            'promotional' => '[Promotional] ',
            'demo'        => '[Demo] ',
            'goodwill'    => '[Goodwill] ',
            'manual'      => '',
            default       => '',
        };
        $description = $typeLabel . $request->description;

        $expiresAt = $request->filled('expires_at')
            ? Carbon::parse($request->expires_at)->endOfDay()
            : null;

        $this->walletService->credit(
            $organization,
            (float) $request->amount,
            $description,
            null,
            $request->credit_type ?? 'manual',
            [],
            Auth::id(),
            $expiresAt,
        );

        return back()->with('success', 'saas_billing.wallet_credited');
    }

    public function debitWallet(Request $request, Organization $organization)
    {
        $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
        ]);

        try {
            $this->walletService->debit(
                $organization,
                (float) $request->amount,
                $request->description,
                null,
                [],
                Auth::id(),
            );
        } catch (\App\Exceptions\InsufficientBalanceException) {
            return back()->with('error', 'saas_billing.insufficient_balance');
        }

        return back()->with('success', 'saas_billing.wallet_debited');
    }

    // ──────────────────────────────────────────────────────────────
    // Subscriptions
    // ──────────────────────────────────────────────────────────────

    public function subscriptions(Request $request)
    {
        $query = SaasSubscription::with(['organization', 'plan'])
            ->withoutGlobalScope('tenant');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('organization', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        $subscriptions = $query->latest()->paginate(15)->withQueryString();
        $plans         = SaasPlan::active()->ordered()->get(['id', 'name', 'slug', 'price_monthly', 'currency']);
        $organizations = Organization::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Billing/Subscriptions/Index', [
            'subscriptions' => $subscriptions,
            'plans'         => $plans,
            'organizations' => $organizations,
            'filters'       => $request->only(['status', 'search']),
        ]);
    }

    public function assignSubscription(Request $request, Organization $organization)
    {
        $request->validate([
            'plan_id'       => 'required|exists:saas_plans,id',
            'billing_cycle' => 'required|in:monthly,quarterly,semiannual,annual',
            'custom_price'  => 'nullable|numeric|min:0',
            'auto_renew'    => 'boolean',
        ]);

        $plan = SaasPlan::findOrFail($request->plan_id);

        try {
            DB::transaction(function () use ($request, $organization, $plan) {
                // Cancel any existing active subscription first
                $existing = $organization->activeSaasSubscription();
                if ($existing) {
                    $this->subscriptionService->cancel($existing);
                }

                $subscription = $this->subscriptionService->create($organization, $plan, $request->billing_cycle);

                // Apply custom price if provided
                if ($request->filled('custom_price')) {
                    $subscription->update(['price' => (float) $request->custom_price]);
                }

                if ($request->has('auto_renew')) {
                    $subscription->update(['auto_renew' => (bool) $request->auto_renew]);
                }
            });
        } catch (\App\Exceptions\InsufficientBalanceException) {
            return back()->with('error', 'saas_billing.insufficient_balance');
        }

        return back()->with('success', 'saas_billing.subscription_assigned');
    }

    public function cancelSubscription(Organization $organization)
    {
        $subscription = $organization->activeSaasSubscription();
        if ($subscription) {
            $this->subscriptionService->cancel($subscription);
        }

        return back()->with('success', 'saas_billing.subscription_cancelled');
    }

    // ──────────────────────────────────────────────────────────────
    // Invoices
    // ──────────────────────────────────────────────────────────────

    public function invoices(Request $request)
    {
        $query = SaasInvoice::with(['organization', 'subscription.plan'])
            ->withoutGlobalScope('tenant');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('organization', fn ($qq) => $qq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('from')) {
            $query->where('issued_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('issued_at', '<=', $request->to . ' 23:59:59');
        }

        $invoices = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('Admin/Billing/Invoices/Index', [
            'invoices' => $invoices,
            'filters'  => $request->only(['status', 'type', 'search', 'from', 'to']),
        ]);
    }

    public function invoiceDetail(SaasInvoice $invoice)
    {
        $invoice->load(['organization', 'subscription.plan']);

        return Inertia::render('Admin/Billing/Invoices/Show', [
            'invoice' => $invoice,
        ]);
    }

    public function markInvoicePaid(SaasInvoice $invoice)
    {
        if (!$invoice->isPaid()) {
            $this->invoiceService->markAsPaid($invoice);
        }

        return back()->with('success', 'saas_billing.invoice_marked_paid');
    }
}
