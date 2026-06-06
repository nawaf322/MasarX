<?php
namespace App\Listeners;

use App\Events\CODRemitted;
use App\Services\CommissionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Calculates commissions on COD remittance.
 * Handles rules with trigger_on = 'on_cod_remittance'.
 * Delegates to CommissionService for idempotency and range checks.
 */
class CalculateCommissionsOnCOD implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(private CommissionService $commissions) {}

    public function handle(CODRemitted $event): void
    {
        if (!app(\App\Services\EditionService::class)->has('commissions')) {
            return;
        }
        $this->commissions->calculateForCodRemittance($event->shipment, $event->amount);
    }
}
