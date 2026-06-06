<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a shipment enters exception status.
 * Downstream: notify admins, log SLA breach, audit.
 */
class ShipmentExceptionRaised
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
        public readonly ?string  $exceptionCode = null,
        public readonly ?string  $notes = null,
    ) {}
}
