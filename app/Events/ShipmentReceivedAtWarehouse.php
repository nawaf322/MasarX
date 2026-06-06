<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a shipment is received and checked in at the warehouse.
 * Downstream: inventory update, status sync, audit.
 */
class ShipmentReceivedAtWarehouse
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
    ) {}
}
