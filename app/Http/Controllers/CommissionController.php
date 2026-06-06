<?php

namespace App\Http\Controllers;

use App\Exports\CommissionsExport;
use App\Models\Branch;
use App\Models\Commission;
use App\Models\CommissionRule;
use App\Models\User;
use App\Services\AuditService;
use App\Services\FinanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class CommissionController extends Controller
{
    public function __construct(
        private readonly AuditService   $audit,
        private readonly FinanceService $finance,
    ) {}
    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $query = Commission::with(['shipment', 'user', 'rule'])
            ->where('organization_id', $orgId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $perPage     = (int) $request->get('per_page', 20);
        $commissions = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        // Summary via FinanceService — single source of truth, avoids duplicated SQL
        $summary = $this->finance->getCommissionSummary($orgId);

        // Agent list for filter dropdown
        $users = User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Commissions/Index', [
            'commissions' => $commissions,
            'summary'     => $summary,
            'filters'     => $request->only(['status', 'user_id', 'from', 'to']),
            'users'       => $users,
        ]);
    }

    // ── Export ────────────────────────────────────────────────────────────────

    public function export(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $orgId   = Auth::user()->organization_id;
        $filters = $request->only(['status', 'user_id', 'from', 'to']);
        $fname   = 'commissions_' . now()->format('Ymd_His') . '.xlsx';

        return Excel::download(new CommissionsExport($orgId, $filters), $fname);
    }

    // ── Bulk operations ───────────────────────────────────────────────────────

    public function bulkApprove(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'ids'   => 'required|array|min:1|max:200',
            'ids.*' => 'integer',
        ]);

        $approved = DB::transaction(function () use ($validated, $orgId) {
            return Commission::where('organization_id', $orgId)
                ->whereIn('id', $validated['ids'])
                ->where('status', 'pending')
                ->where('commission_amount', '>', 0) // never approve reversals
                ->update(['status' => 'approved']);
        });

        $this->audit->log('commission_bulk_approved', 'commissions', 'commission', null, [
            'ids'   => $validated['ids'],
            'count' => $approved,
        ]);

        return back()->with('success', __('commissions.bulk_approved', ['count' => $approved]));
    }

    public function bulkPay(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'ids'   => 'required|array|min:1|max:200',
            'ids.*' => 'integer',
        ]);

        $paid = DB::transaction(function () use ($validated, $orgId) {
            $rows = Commission::where('organization_id', $orgId)
                ->whereIn('id', $validated['ids'])
                ->where('status', 'approved')
                ->where('commission_amount', '>', 0)
                ->get();

            foreach ($rows as $c) {
                $c->update(['status' => 'paid', 'paid_at' => now()]);
            }
            return $rows->count();
        });

        $this->audit->log('commission_bulk_paid', 'commissions', 'commission', null, [
            'ids'   => $validated['ids'],
            'count' => $paid,
        ]);

        return back()->with('success', __('commissions.bulk_paid', ['count' => $paid]));
    }

    // ── Rules CRUD ────────────────────────────────────────────────────────────

    public function rules(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $perPage = (int) $request->get('per_page', 15);
        $rules = CommissionRule::where('organization_id', $orgId)
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $users = User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['driver', 'employee', 'admin']))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $branches = Branch::where('organization_id', $orgId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Commissions/Rules', [
            'rules'    => $rules,
            'users'    => $users,
            'branches' => $branches,
        ]);
    }

    public function storeRule(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string|max:1000',
            'type'         => 'required|in:percentage,fixed',
            'rate'         => 'required|numeric|min:0',
            'currency'     => 'nullable|string|size:3',
            'applies_to'   => 'required|in:all,branch,user,zone',
            'reference_id' => 'nullable|integer',
            'min_amount'   => 'nullable|numeric|min:0',
            'max_amount'   => 'nullable|numeric|min:0',
            'priority'     => 'nullable|integer|min:0|max:9999',
            'is_active'    => 'boolean',
            'trigger_on'   => 'nullable|in:on_creation,on_delivery,on_cod_remittance,on_pickup_completion',
        ]);

        $rule = CommissionRule::create(array_merge($validated, [
            'organization_id' => $orgId,
            'currency'        => $validated['currency'] ?? 'USD',
            'is_active'       => $validated['is_active'] ?? true,
            'priority'        => $validated['priority'] ?? 0,
            'trigger_on'      => $validated['trigger_on'] ?? 'on_creation',
        ]));

        $this->audit->log('commission_rule_created', 'commissions', 'commission_rule', null, ['name' => $rule->name], $rule->id);

        return redirect()->route('commissions.rules')
            ->with('success', __('commissions.rule_created'));
    }

    public function updateRule(Request $request, CommissionRule $rule): RedirectResponse
    {
        abort_if($rule->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string|max:1000',
            'type'         => 'required|in:percentage,fixed',
            'rate'         => 'required|numeric|min:0',
            'currency'     => 'nullable|string|size:3',
            'applies_to'   => 'required|in:all,branch,user,zone',
            'reference_id' => 'nullable|integer',
            'min_amount'   => 'nullable|numeric|min:0',
            'max_amount'   => 'nullable|numeric|min:0',
            'priority'     => 'nullable|integer|min:0|max:9999',
            'is_active'    => 'boolean',
            'trigger_on'   => 'nullable|in:on_creation,on_delivery,on_cod_remittance,on_pickup_completion',
        ]);

        $old = $rule->only(['name', 'type', 'rate', 'is_active', 'trigger_on']);
        $rule->update($validated);

        $this->audit->log('commission_rule_updated', 'commissions', 'commission_rule', $old, $rule->only(['name', 'type', 'rate', 'is_active', 'trigger_on']), $rule->id);

        return redirect()->route('commissions.rules')
            ->with('success', __('commissions.rule_updated'));
    }

    public function destroyRule(CommissionRule $rule): RedirectResponse
    {
        abort_if($rule->organization_id !== Auth::user()->organization_id, 403);

        if ($rule->commissions()->exists()) {
            return back()->withErrors(['rule' => __('commissions.rule_has_commissions')]);
        }

        $ruleId = $rule->id;
        $ruleName = $rule->name;
        $rule->delete();

        $this->audit->log('commission_rule_deleted', 'commissions', 'commission_rule', ['name' => $ruleName], null, $ruleId);

        return redirect()->route('commissions.rules')
            ->with('success', __('commissions.rule_deleted'));
    }

    // ── Single record actions ─────────────────────────────────────────────────

    public function approve(Request $request, Commission $commission): RedirectResponse
    {
        abort_if($commission->organization_id !== Auth::user()->organization_id, 403);
        abort_if($commission->status !== 'pending', 422, __('commissions.only_pending_can_be_approved'));
        abort_if($commission->commission_amount < 0, 422, __('commissions.reversal_cannot_be_approved'));

        // Cross-module guard: delivery-triggered commissions need a delivered shipment
        if (in_array($commission->trigger_event, ['shipment_delivered', 'cod_remitted'], true)) {
            $shipment = $commission->shipment;
            abort_if(
                $shipment && !in_array($shipment->status, ['delivered', 'returned'], true),
                422,
                __('commissions.shipment_not_delivered')
            );
        }

        $commission->update(['status' => 'approved']);

        $this->audit->log('commission_approved', 'commissions', 'commission', ['status' => 'pending'], ['status' => 'approved'], $commission->id);

        return back()->with('success', __('commissions.approved'));
    }

    public function markPaid(Request $request, Commission $commission): RedirectResponse
    {
        abort_if($commission->organization_id !== Auth::user()->organization_id, 403);
        abort_if($commission->status !== 'approved', 422, __('commissions.only_approved_can_be_paid'));
        abort_if($commission->commission_amount < 0, 422, __('commissions.reversal_cannot_be_paid'));

        $commission->update([
            'status'  => 'paid',
            'paid_at' => now(),
        ]);

        $this->audit->log('commission_paid', 'commissions', 'commission', ['status' => 'approved'], ['status' => 'paid', 'paid_at' => now()->toIso8601String()], $commission->id);

        return back()->with('success', __('commissions.paid'));
    }
}
