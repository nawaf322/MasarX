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

namespace App\Services;

use App\Exceptions\InsufficientBalanceException;
use App\Models\Organization;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SaasSubscriptionService
{
    public function __construct(
        private readonly SaasWalletService  $walletService,
        private readonly SaasInvoiceService $invoiceService,
    ) {}

    // ──────────────────────────────────────────────────────────────
    // Create / Activate
    // ──────────────────────────────────────────────────────────────

    /**
     * Create a new subscription for an organization.
     * If the plan has trial_days > 0, starts a trial without charging.
     * Otherwise tries to debit the wallet immediately.
     *
     * @throws InsufficientBalanceException
     * @throws \Throwable
     */
    public function create(
        Organization $org,
        SaasPlan     $plan,
        string       $billingCycle = 'monthly',
    ): SaasSubscription {
        return DB::transaction(function () use ($org, $plan, $billingCycle) {
            $price   = $plan->priceFor($billingCycle);
            $months  = $plan->monthsFor($billingCycle);
            $now     = now();

            if ($plan->trial_days > 0) {
                $trialEnds = $now->copy()->addDays($plan->trial_days);

                $subscription = SaasSubscription::create([
                    'organization_id' => $org->id,
                    'plan_id'         => $plan->id,
                    'billing_cycle'   => $billingCycle,
                    'status'          => 'trial',
                    'price'           => $price,
                    'currency'        => $plan->currency,
                    'starts_at'       => $now,
                    'expires_at'      => $trialEnds,
                    'trial_ends_at'   => $trialEnds,
                    'auto_renew'      => true,
                ]);
            } else {
                // Debit wallet
                $this->walletService->debit(
                    $org,
                    $price,
                    "Subscription: {$plan->name} ({$billingCycle})",
                    null,
                    ['plan_id' => $plan->id, 'billing_cycle' => $billingCycle],
                );

                $expiresAt = $now->copy()->addMonths($months);

                $subscription = SaasSubscription::create([
                    'organization_id' => $org->id,
                    'plan_id'         => $plan->id,
                    'billing_cycle'   => $billingCycle,
                    'status'          => 'active',
                    'price'           => $price,
                    'currency'        => $plan->currency,
                    'starts_at'       => $now,
                    'expires_at'      => $expiresAt,
                    'last_renewed_at' => $now,
                    'auto_renew'      => true,
                ]);

                $this->invoiceService->createSubscriptionInvoice(
                    $org,
                    $subscription,
                    $price,
                    "New subscription: {$plan->name} ({$billingCycle})"
                );
            }

            return $subscription;
        });
    }

    // ──────────────────────────────────────────────────────────────
    // Renewal
    // ──────────────────────────────────────────────────────────────

    /**
     * Attempt to renew a subscription by debiting the wallet.
     * On insufficient balance, transitions to grace_period.
     *
     * @throws \Throwable
     */
    public function renew(SaasSubscription $subscription): SaasSubscription
    {
        return DB::transaction(function () use ($subscription) {
            $org   = $subscription->organization;
            $plan  = $subscription->plan;
            $price = $plan->priceFor($subscription->billing_cycle);

            try {
                $this->walletService->debit(
                    $org,
                    $price,
                    "Renewal: {$plan->name} ({$subscription->billing_cycle})",
                    null,
                    ['subscription_id' => $subscription->id],
                );
            } catch (InsufficientBalanceException) {
                return $this->enterGracePeriod($subscription, $plan);
            }

            $months    = $plan->monthsFor($subscription->billing_cycle);
            $expiresAt = now()->addMonths($months);

            $subscription->update([
                'status'          => 'active',
                'expires_at'      => $expiresAt,
                'last_renewed_at' => now(),
                'grace_period_ends_at' => null,
            ]);

            $this->invoiceService->createSubscriptionInvoice(
                $org,
                $subscription->fresh(),
                $price,
                "Renewal: {$plan->name} ({$subscription->billing_cycle})"
            );

            return $subscription->fresh();
        });
    }

    // ──────────────────────────────────────────────────────────────
    // Status transitions
    // ──────────────────────────────────────────────────────────────

    /**
     * Transition to grace_period. Called when renewal payment fails.
     */
    public function enterGracePeriod(SaasSubscription $subscription, ?SaasPlan $plan = null): SaasSubscription
    {
        $plan          ??= $subscription->plan;
        $graceDays     = $plan->grace_period_days ?? 7;
        $graceEndsAt   = now()->addDays($graceDays);

        $subscription->update([
            'status'               => 'grace_period',
            'grace_period_ends_at' => $graceEndsAt,
        ]);

        return $subscription->fresh();
    }

    /**
     * Transition to read_only after grace period expires without payment.
     */
    public function enterReadOnly(SaasSubscription $subscription): SaasSubscription
    {
        $subscription->update(['status' => 'read_only']);
        return $subscription->fresh();
    }

    /**
     * Suspend a subscription (manual super-admin action).
     */
    public function suspend(SaasSubscription $subscription): SaasSubscription
    {
        $subscription->update(['status' => 'suspended']);
        return $subscription->fresh();
    }

    /**
     * Cancel a subscription.
     */
    public function cancel(SaasSubscription $subscription): SaasSubscription
    {
        $subscription->update([
            'status'       => 'cancelled',
            'cancelled_at' => now(),
            'auto_renew'   => false,
        ]);
        return $subscription->fresh();
    }

    // ──────────────────────────────────────────────────────────────
    // Scheduled check (called from CheckSaasSubscriptions command)
    // ──────────────────────────────────────────────────────────────

    /**
     * Process all subscriptions that need attention:
     * - Expired trials         → grace_period
     * - Expired active subs    → attempt renewal or grace_period
     * - Expired grace periods  → read_only
     *
     * @return array{trials: int, renewals: int, grace_periods: int, read_only: int}
     */
    public function processExpired(): array
    {
        $counts = ['trials' => 0, 'renewals' => 0, 'grace_periods' => 0, 'read_only' => 0];

        // 1. Expired trials → grace_period
        SaasSubscription::where('status', 'trial')
            ->where('trial_ends_at', '<', now())
            ->with('plan')
            ->each(function (SaasSubscription $sub) use (&$counts) {
                try {
                    $this->enterGracePeriod($sub);
                    $counts['trials']++;
                } catch (\Throwable $e) {
                    Log::error('SaaS: failed to enter grace period from trial', [
                        'subscription_id' => $sub->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });

        // 2. Expired active subscriptions → attempt renewal, fallback to grace_period
        SaasSubscription::where('status', 'active')
            ->where('expires_at', '<', now())
            ->where('auto_renew', true)
            ->with(['plan', 'organization'])
            ->each(function (SaasSubscription $sub) use (&$counts) {
                try {
                    $this->renew($sub);
                    $counts['renewals']++;
                } catch (\Throwable $e) {
                    Log::error('SaaS: renewal failed, entering grace period', [
                        'subscription_id' => $sub->id,
                        'error'           => $e->getMessage(),
                    ]);
                    try {
                        $this->enterGracePeriod($sub);
                        $counts['grace_periods']++;
                    } catch (\Throwable $ge) {
                        Log::error('SaaS: failed to enter grace period after renewal failure', [
                            'subscription_id' => $sub->id,
                            'error'           => $ge->getMessage(),
                        ]);
                    }
                }
            });

        // 3. Expired grace periods → read_only
        SaasSubscription::where('status', 'grace_period')
            ->where('grace_period_ends_at', '<', now())
            ->each(function (SaasSubscription $sub) use (&$counts) {
                try {
                    $this->enterReadOnly($sub);
                    $counts['read_only']++;
                } catch (\Throwable $e) {
                    Log::error('SaaS: failed to enter read_only', [
                        'subscription_id' => $sub->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });

        return $counts;
    }

    // ──────────────────────────────────────────────────────────────
    // Queries
    // ──────────────────────────────────────────────────────────────

    /**
     * Return the current active subscription for an organization, or null.
     */
    public function activeSubscription(Organization $org): ?SaasSubscription
    {
        return SaasSubscription::where('organization_id', $org->id)
            ->whereIn('status', ['active', 'trial', 'grace_period'])
            ->latest()
            ->first();
    }
}
