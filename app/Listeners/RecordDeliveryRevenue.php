<?php

namespace App\Listeners;

use App\Events\DeliveryConfirmed;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class RecordDeliveryRevenue implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(DeliveryConfirmed $event): void
    {
        $shipment = $event->shipment;

        // Only transition unpaid → paid on delivery; respect existing paid/partial status
        if ($shipment->payment_status === 'unpaid') {
            $shipment->updateQuietly(['payment_status' => 'paid']);
            Log::info("RecordDeliveryRevenue: payment_status set to paid for {$shipment->tracking_number}");
        }
    }
}
