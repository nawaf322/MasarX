<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Encapsulates all financial aggregation queries for a single org / date range.
 * All methods accept orgId + date range as parameters so results can be
 * assembled independently (controller, export, API, etc.) without duplication.
 */
class FinanceService
{
    // ── Revenue & Shipment Metrics ────────────────────────────────────────────

    /**
     * Core revenue/cost/tax/AR aggregates.
     *
     * Revenue is recognised when payment_status is paid|partial.
     * AR balance = invoiced but unpaid (excludes cancelled/returned).
     */
    public function getMetrics(int $orgId, string $start, string $end): object
    {
        [$from, $to] = $this->range($start, $end);

        return DB::table('shipments')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("
                COUNT(*) as total_shipments,
                COALESCE(SUM(CASE WHEN payment_status IN ('paid','partial') THEN total      ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_status IN ('paid','partial') THEN total - tax ELSE 0 END), 0) as net_revenue,
                COALESCE(SUM(CASE WHEN payment_status IN ('paid','partial') THEN tax        ELSE 0 END), 0) as total_tax,
                COALESCE(SUM(COALESCE(cost_price, 0)), 0)                                                   as total_cost,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'unpaid'
                     AND status NOT IN ('cancelled','returned')
                    THEN total ELSE 0 END), 0)                                                              as ar_balance,
                COUNT(CASE WHEN payment_status = 'unpaid'
                            AND status NOT IN ('cancelled','returned')
                     THEN 1 END)                                                                            as ar_count
            ")
            ->first();
    }

    /**
     * Daily revenue trend (paid|partial shipments in the period).
     * Uses created_at for consistency — see note below.
     *
     * NOTE: Ideally this should use delivered_at / paid_at for strict revenue
     * recognition, but those columns are nullable for in-transit shipments.
     * Using created_at ensures all paid shipments in the range appear.
     */
    public function getRevenueTrend(int $orgId, string $start, string $end): Collection
    {
        [$from, $to] = $this->range($start, $end);

        return DB::table('shipments')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('payment_status', ['paid', 'partial'])
            ->selectRaw('DATE(created_at) as date, SUM(total) as value')
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }

    // ── COD Pipeline ──────────────────────────────────────────────────────────

    /**
     * Cash-on-delivery pipeline: how much is at each stage.
     * Only COD shipments (is_cod = 1) created in the date range.
     */
    public function getCodPipeline(int $orgId, string $start, string $end): object
    {
        [$from, $to] = $this->range($start, $end);

        return DB::table('shipments')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->where('is_cod', true)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("
                COUNT(*)                                                                 as total_cod_shipments,
                COALESCE(SUM(COALESCE(cod_amount, total)), 0)                            as total_cod_value,
                COALESCE(SUM(CASE WHEN cod_status = 'pending'   THEN COALESCE(cod_amount, total) ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN cod_status = 'collected' THEN COALESCE(cod_amount, total) ELSE 0 END), 0) as collected_amount,
                COALESCE(SUM(CASE WHEN cod_status = 'remitted'  THEN COALESCE(cod_amount, total) ELSE 0 END), 0) as remitted_amount,
                COUNT(CASE WHEN cod_status = 'pending'   THEN 1 END)                     as pending_count,
                COUNT(CASE WHEN cod_status = 'collected' THEN 1 END)                     as collected_count,
                COUNT(CASE WHEN cod_status = 'remitted'  THEN 1 END)                     as remitted_count
            ")
            ->first();
    }

    // ── Commission Metrics ────────────────────────────────────────────────────

    /**
     * Commission expense summary for the period.
     * Excludes reversal records (commission_amount < 0) from payable totals.
     * Reversals are shown separately so the net is clear.
     */
    public function getCommissionMetrics(int $orgId, string $start, string $end): object
    {
        [$from, $to] = $this->range($start, $end);

        return DB::table('commissions')
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("
                COALESCE(SUM(CASE WHEN status = 'pending'  AND commission_amount > 0 THEN commission_amount ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'approved' AND commission_amount > 0 THEN commission_amount ELSE 0 END), 0) as approved_amount,
                COALESCE(SUM(CASE WHEN status = 'paid'     AND commission_amount > 0 THEN commission_amount ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(CASE WHEN commission_amount > 0 THEN commission_amount   ELSE 0 END), 0)                        as gross_amount,
                COALESCE(SUM(CASE WHEN commission_amount < 0 THEN ABS(commission_amount) ELSE 0 END), 0)                    as reversed_amount,
                COALESCE(SUM(commission_amount), 0)                                                                           as net_amount,
                COUNT(CASE WHEN commission_amount > 0 THEN 1 END)                                                           as total_count,
                COUNT(CASE WHEN status = 'pending'  AND commission_amount > 0 THEN 1 END)                                   as pending_count,
                COUNT(CASE WHEN status = 'approved' AND commission_amount > 0 THEN 1 END)                                   as approved_count,
                COUNT(CASE WHEN status = 'paid'     AND commission_amount > 0 THEN 1 END)                                   as paid_count
            ")
            ->first();
    }

    /**
     * Top earners by commission amount (positive commissions only).
     */
    public function getTopCommissionees(int $orgId, string $start, string $end, int $limit = 5): Collection
    {
        [$from, $to] = $this->range($start, $end);

        return DB::table('commissions')
            ->join('users', 'commissions.user_id', '=', 'users.id')
            ->where('commissions.organization_id', $orgId)
            ->whereBetween('commissions.created_at', [$from, $to])
            ->where('commissions.commission_amount', '>', 0)
            ->selectRaw('users.name, SUM(commissions.commission_amount) as total, COUNT(*) as count')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total')
            ->limit($limit)
            ->get();
    }

    // ── Returns & Refunds ─────────────────────────────────────────────────────

    public function getReturnMetrics(int $orgId, string $start, string $end): object
    {
        [$from, $to] = $this->range($start, $end);

        try {
            return DB::table('return_shipments')
                ->where('organization_id', $orgId)
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('COUNT(*) as returns_count, COALESCE(SUM(refund_amount), 0) as total_refunds')
                ->first() ?? (object)['returns_count' => 0, 'total_refunds' => 0];
        } catch (\Throwable $e) {
            Log::warning('FinanceService::getReturnMetrics failed', ['orgId' => $orgId, 'error' => $e->getMessage()]);
            return (object)['returns_count' => 0, 'total_refunds' => 0];
        }
    }

    public function getReturnsByReason(int $orgId, string $start, string $end): Collection
    {
        [$from, $to] = $this->range($start, $end);

        try {
            return DB::table('return_shipments')
                ->where('organization_id', $orgId)
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('reason, COUNT(*) as cnt')
                ->groupBy('reason')
                ->orderByDesc('cnt')
                ->get()
                ->pluck('cnt', 'reason');
        } catch (\Throwable $e) {
            Log::warning('FinanceService::getReturnsByReason failed', ['orgId' => $orgId, 'error' => $e->getMessage()]);
            return collect();
        }
    }

    // ── Top Performers ────────────────────────────────────────────────────────

    public function getTopBranches(int $orgId, string $start, string $end, string|int $branchFilter = 'all', int $limit = 5): Collection
    {
        [$from, $to] = $this->range($start, $end);

        return DB::table('shipments')
            ->leftJoin('users', 'shipments.created_by', '=', 'users.id')
            ->leftJoin('branches', 'users.branch_id', '=', 'branches.id')
            ->where('shipments.organization_id', $orgId)
            ->whereBetween('shipments.created_at', [$from, $to])
            ->whereNotNull('branches.id')
            ->whereNull('shipments.deleted_at')
            ->whereIn('shipments.payment_status', ['paid', 'partial'])
            ->when($branchFilter !== 'all', fn($q) => $q->where('branches.id', $branchFilter))
            ->selectRaw('branches.name, SUM(shipments.total) as value')
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('value')
            ->limit($limit)
            ->get();
    }

    public function getTopDepartments(int $orgId, string $start, string $end, string|int $deptFilter = 'all', int $limit = 5): Collection
    {
        [$from, $to] = $this->range($start, $end);

        try {
            return DB::table('shipments')
                ->leftJoin('users as dept_users', 'shipments.created_by', '=', 'dept_users.id')
                ->leftJoin('departments', 'dept_users.department_id', '=', 'departments.id')
                ->where('shipments.organization_id', $orgId)
                ->whereBetween('shipments.created_at', [$from, $to])
                ->whereNotNull('departments.id')
                ->whereNull('shipments.deleted_at')
                ->whereIn('shipments.payment_status', ['paid', 'partial'])
                ->when($deptFilter !== 'all', fn($q) => $q->where('departments.id', $deptFilter))
                ->selectRaw('departments.name, SUM(shipments.total) as value')
                ->groupBy('departments.id', 'departments.name')
                ->orderByDesc('value')
                ->limit($limit)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('FinanceService::getTopDepartments failed', ['orgId' => $orgId, 'error' => $e->getMessage()]);
            return collect();
        }
    }

    /**
     * Commission totals across all time for a given org (no date filter).
     * Used by CommissionController::index() for the summary KPI cards.
     * Returns: total_pending, total_approved, total_paid, total_reversed.
     */
    public function getCommissionSummary(int $orgId): object
    {
        return DB::table('commissions')
            ->where('organization_id', $orgId)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN status = 'pending'  AND commission_amount > 0 THEN commission_amount ELSE 0 END), 0) as total_pending,
                COALESCE(SUM(CASE WHEN status = 'approved' AND commission_amount > 0 THEN commission_amount ELSE 0 END), 0) as total_approved,
                COALESCE(SUM(CASE WHEN status = 'paid'     AND commission_amount > 0 THEN commission_amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status = 'reversed' OR commission_amount < 0  THEN ABS(commission_amount) ELSE 0 END), 0) as total_reversed
            ")
            ->first();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function range(string $start, string $end): array
    {
        return [
            Carbon::parse($start)->startOfDay(),
            Carbon::parse($end)->endOfDay(),
        ];
    }
}
