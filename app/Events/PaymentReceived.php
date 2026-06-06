<?php
namespace App\Events;

use App\Models\Shipment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a payment is received for a shipment or invoice.
 * Downstream: invoice status update, commission trigger, audit.
 */
class PaymentReceived
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Shipment $shipment,
        public readonly float    $amount,
        public readonly string   $method = 'manual',
    ) {}
}
