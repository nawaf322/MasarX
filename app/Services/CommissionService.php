<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\CommissionRule;
use App\Models\Shipment;
use App\Models\User;

class CommissionService
{
    /**
     * Calculate commissions for shipment CREATION (trigger_on = 'on_creation').
     * Called by ShipmentController::store().
     * Idempotent: skips if commission already exists for this shipment + rule.
     */
    public function calculateForShipment(Shipment $shipment): void
    {
        $this->calculate($shipment, 'on_creation', 'shipment_created');
    }

    /**
     * Calculate commissions on delivery (trigger_on = 'on_delivery').
     * Called by CalculateCommissionsOnDelivery listener.
     */
    public function calculateForDelivery(Shipment $shipment): void
    {
        $this->calculate($shipment, 'on_delivery', 'shipment_delivered');
    }

    /**
     * Calculate commissions on COD remittance (trigger_on = 'on_cod_remittance').
     * Called by CalculateCommissionsOnCOD listener.
     */
    public function calculateForCodRemittance(Shipment $shipment, float $codAmount): void
    {
        $this->calculate($shipment, 'on_cod_remittance', 'cod_remitted', $codAmount);
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    private function calculate(
        Shipment $shipment,
        string   $triggerOn,
        string   $triggerEvent,
        ?float   $baseAmount = null,
    ): void {
        $orgId = $shipment->organization_id;

        $creator = $shipment->createdBy ?? $shipment->creator ?? User::find($shipment->created_by);
        if (!$creator) {
            return;
        }

        $rules = CommissionRule::where('organization_id', $orgId)
            ->where('is_active', true)
            ->where('trigger_on', $triggerOn)
            ->orderBy('priority', 'desc')
            ->get();

        $amount = $baseAmount ?? (float) $shipment->total;

        foreach ($rules as $rule) {
            if (!$this->ruleApplies($rule, $shipment, $creator)) {
                continue;
            }

            // Amount range guard
            if ($rule->min_amount !== null && $amount < (float) $rule->min_amount) {
                continue;
            }
            if ($rule->max_amount !== null && $amount > (float) $rule->max_amount) {
                continue;
            }

            // Idempotency: same shipment + rule + trigger_event must not create twice
            if (Commission::where('shipment_id', $shipment->id)
                ->where('commission_rule_id', $rule->id)
                ->where('trigger_event', $triggerEvent)
                ->exists()) {
                continue;
            }

            $commission = $rule->type === 'percentage'
                ? round($amount * ((float) $rule->rate / 100), 2)
                : round((float) $rule->rate, 2);

            $record = Commission::create([
                'organization_id'    => $orgId,
                'shipment_id'        => $shipment->id,
                'user_id'            => $creator->id,
                'commission_rule_id' => $rule->id,
                'shipment_total'     => $shipment->total,
                'commission_amount'  => $commission,
                'currency'           => $shipment->currency ?? $rule->currency,
                'status'             => 'pending',
                'trigger_event'      => $triggerEvent,
            ]);

            event(new \App\Events\CommissionCalculated($record));
        }
    }

    private function ruleApplies(CommissionRule $rule, Shipment $shipment, User $creator): bool
    {
        return match ($rule->applies_to) {
            'all'    => true,
            'user'   => (int) $creator->id === (int) $rule->reference_id,
            'branch' => $creator->branch_id !== null && (int) $creator->branch_id === (int) $rule->reference_id,
            'zone'   => $shipment->rate_card_id !== null && (int) $shipment->rate_card_id === (int) $rule->reference_id,
            default  => false,
        };
    }
}
