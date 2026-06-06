<?php

namespace App\Events;

use App\Models\PreAlert;
use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a pre-alert is converted into a real Shipment.
 * This is the critical bridge event: casillero flow re-enters the core Shipment lifecycle.
 */
class PreAlertConverted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly PreAlert $preAlert,
        public readonly Shipment $shipment,
    ) {}
}
