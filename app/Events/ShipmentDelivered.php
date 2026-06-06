<?php
namespace App\Events;

use App\Models\ProofOfDelivery;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a shipment is delivered and POD is recorded.
 * Downstream: commission calculation, COD status, payment closure, audit.
 */
class ShipmentDelivered
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment        $shipment,
        public readonly ?ProofOfDelivery $pod = null,
    ) {}
}
