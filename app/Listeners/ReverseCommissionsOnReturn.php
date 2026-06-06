<?php
namespace App\Listeners;

use App\Events\ShipmentReturned;
use App\Models\Commission;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * When a return is completed, creates reversal records for all non-reversed
 * pending/approved commissions linked to the original shipment.
 * Uses negative commission records (status = 'reversed') for audit integrity.
 */
class ReverseCommissionsOnReturn implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ShipmentReturned $event): void
    {
        if (!app(\App\Services\EditionService::class)->has('commissions')) {
            return;
        }

        $shipment = $event->originalShipment;
        $return   = $event->return;

        $commissions = Commission::where('shipment_id', $shipment->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('reversed_at')
            ->get();

        foreach ($commissions as $commission) {
            // Mark original as reversed
            $commission->update([
                'status'          => 'reversed',
                'reversed_at'     => now(),
                'reversal_reason' => "Return #{$return->return_number} completed",
            ]);

            // Create a reversal record (negative amount for ledger accuracy)
            $reversal = Commission::create([
                'organization_id'    => $commission->organization_id,
                'shipment_id'        => $commission->shipment_id,
                'user_id'            => $commission->user_id,
                'commission_rule_id' => $commission->commission_rule_id,
                'shipment_total'     => $commission->shipment_total,
                'commission_amount'  => -$commission->commission_amount,
                'currency'           => $commission->currency,
                'status'             => 'reversed',
                'trigger_event'      => $commission->trigger_event,
                'reversed_at'        => now(),
                'reversal_reason'    => "Reversal for return #{$return->return_number}",
                'parent_commission_id' => $commission->id,
                'notes'              => "Reversal of commission #{$commission->id} due to return #{$return->return_number}",
            ]);

            event(new \App\Events\CommissionReversed($reversal, $commission, "Return #{$return->return_number} completed"));

            Log::info("Commission #{$commission->id} reversed due to return #{$return->return_number}");
        }
    }
}
