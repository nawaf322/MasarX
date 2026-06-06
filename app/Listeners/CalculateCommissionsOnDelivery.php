<?php
namespace App\Listeners;

use App\Events\ShipmentDelivered;
use App\Services\CommissionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Calculates commissions when a shipment is delivered.
 * Handles rules with trigger_on = 'on_delivery'.
 * Delegates to CommissionService for idempotency and range checks.
 */
class CalculateCommissionsOnDelivery implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(private CommissionService $commissions) {}

    public function handle(ShipmentDelivered $event): void
    {
        if (!app(\App\Services\EditionService::class)->has('commissions')) {
            return;
        }
        $this->commissions->calculateForDelivery($event->shipment);
    }
}
