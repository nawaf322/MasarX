<?php
namespace App\Listeners;

use App\Events\ShipmentExceptionRaised;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Notifies admin users when a shipment exception is raised.
 */
class NotifyAdminsOnException implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ShipmentExceptionRaised $event): void
    {
        $shipment = $event->shipment;

        $admins = User::role(['admin', 'super-admin'])
            ->where('organization_id', $shipment->organization_id)
            ->get();

        foreach ($admins as $admin) {
            try {
                $admin->notify(new \App\Notifications\AdminExceptionNotification($shipment));
            } catch (\Throwable $e) {
                Log::error("NotifyAdminsOnException: " . $e->getMessage());
            }
        }
    }
}
