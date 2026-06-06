<?php
namespace App\Events;

use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a shipment status changes to out_for_delivery.
 * Downstream: notifications, driver assignment audit.
 */
class ShipmentOutForDelivery
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
        public readonly ?User    $driver = null,
    ) {}
}
