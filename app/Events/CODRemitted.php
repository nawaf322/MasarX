<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when COD cash is remitted back to the organization.
 * Downstream: close COD ledger, commission if cod_remitted rule, audit.
 */
class CODRemitted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
        public readonly float    $amount,
        public readonly int      $remittedBy,
    ) {}
}
