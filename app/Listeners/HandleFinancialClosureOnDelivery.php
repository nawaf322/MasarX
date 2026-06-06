<?php
namespace App\Listeners;

use App\Events\ShipmentDelivered;
use App\Models\Payment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handles payment_status and creates a Payment record on delivery:
 * - Non-COD, unpaid → payment_status = paid  + Payment record created
 * - COD shipment    → cod_status stays pending (driver must collect)
 *                     payment_status stays unpaid (recognised on remittance)
 *
 * Replaces the naive RecordDeliveryRevenue listener which always set paid.
 */
class HandleFinancialClosureOnDelivery implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ShipmentDelivered $event): void
    {
        $shipment = $event->shipment;

        if ($shipment->is_cod) {
            // COD: delivery does not mean cash received.
            // Driver still needs to collect from recipient.
            if (in_array($shipment->cod_status, [null, 'pending'])) {
                $shipment->updateQuietly([
                    'cod_status'     => 'pending',
                    'payment_status' => 'unpaid',
                ]);
            }
            return;
        }

        // Non-COD: delivery = financial closure
        if ($shipment->payment_status === 'unpaid') {
            DB::transaction(function () use ($shipment) {
                $shipment->updateQuietly(['payment_status' => 'paid']);

                // Create a Payment record for the audit trail
                Payment::firstOrCreate(
                    [
                        'shipment_id'     => $shipment->id,
                        'organization_id' => $shipment->organization_id,
                        'method'          => 'delivery_closure',
                    ],
                    [
                        'amount'          => $shipment->total,
                        'currency'        => $shipment->currency ?? 'USD',
                        'notes'           => "Auto-closed on delivery of {$shipment->tracking_number}",
                        'created_by'      => null, // system-generated
                    ]
                );
            });

            Log::info("Financial closure: payment_status=paid for {$shipment->tracking_number}");
        }
    }
}
