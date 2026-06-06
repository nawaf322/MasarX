<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when the driver collects COD from the recipient.
 * Downstream: commission if cod_collected rule, audit.
 */
class CODCollected
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
        public readonly float    $amount,
        public readonly int      $collectedBy,
    ) {}
}
