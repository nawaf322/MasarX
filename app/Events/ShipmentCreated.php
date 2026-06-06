<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a new shipment is created.
 * Downstream: audit trail, HandleShipmentCreatedAudit listener.
 */
class ShipmentCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
    ) {}
}
