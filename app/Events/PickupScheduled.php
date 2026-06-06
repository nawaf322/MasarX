<?php
namespace App\Events;

use App\Models\OriginPickup;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a pickup is scheduled for a shipment.
 * Downstream: notifications (email/SMS to sender), audit.
 */
class PickupScheduled
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment     $shipment,
        public readonly OriginPickup $pickup,
    ) {}
}
