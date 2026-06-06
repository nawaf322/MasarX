<?php
namespace App\Events;

use App\Models\ReturnShipment;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a return process is completed.
 * Downstream: reverse delivery commission, adjust finance, audit.
 */
class ShipmentReturned
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly ReturnShipment $return,
        public readonly Shipment       $originalShipment,
    ) {}
}
