<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a shipment is canceled.
 * Downstream: reverse commissions, void invoice, audit.
 */
class ShipmentCanceled
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
        public readonly ?string  $reason = null,
        public readonly ?int     $canceledBy = null,
    ) {}
}
