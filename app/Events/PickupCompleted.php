<?php
namespace App\Events;

use App\Models\OriginPickup;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when an origin pickup is completed.
 * Downstream: update shipment status, commission if pickup rule, audit.
 */
class PickupCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly OriginPickup $pickup,
        public readonly ?Shipment    $shipment = null,
    ) {}
}
