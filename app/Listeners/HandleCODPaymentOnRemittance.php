<?php
namespace App\Listeners;

use App\Events\CODRemitted;
use App\Models\Payment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * When COD cash is remitted to the organisation:
 *  - payment_status → paid
 *  - Creates a Payment record (method = cod_remittance)
 *
 * This is the correct financial closure point for COD shipments.
 */
class HandleCODPaymentOnRemittance implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(CODRemitted $event): void
    {
        $shipment = $event->shipment;

        if (!in_array($shipment->payment_status, ['unpaid', 'partial'])) {
            return;
        }

        DB::transaction(function () use ($shipment, $event) {
            $shipment->updateQuietly(['payment_status' => 'paid']);

            // Create a Payment record so the finance ledger has a paper trail
            Payment::firstOrCreate(
                [
                    'shipment_id'     => $shipment->id,
                    'organization_id' => $shipment->organization_id,
                    'method'          => 'cod_remittance',
                ],
                [
                    'amount'     => $event->amount,
                    'currency'   => $shipment->currency ?? 'USD',
                    'notes'      => "COD remitted for {$shipment->tracking_number}",
                    'created_by' => $event->remittedBy,
                ]
            );
        });

        Log::info("COD remitted: payment_status=paid for {$shipment->tracking_number}");
    }
}
