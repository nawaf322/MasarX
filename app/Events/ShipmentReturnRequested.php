<?php
namespace App\Events;

use App\Models\ReturnShipment;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a return request is created.
 * Downstream: notification to ops team, audit.
 */
class ShipmentReturnRequested
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly ReturnShipment $return,
        public readonly Shipment       $originalShipment,
    ) {}
}
