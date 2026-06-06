<?php
namespace App\Events;

use App\Models\Manifest;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a shipment is assigned to a manifest and dispatched.
 * Downstream: commission basis if dispatch-triggered rule exists, audit.
 */
class ShipmentDispatched
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment  $shipment,
        public readonly ?Manifest $manifest = null,
    ) {}
}
