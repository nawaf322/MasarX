<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace App\Listeners;

use App\Events\PackageStatusUpdated;
use App\Notifications\ShipmentNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendShipmentNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(PackageStatusUpdated $event): void
    {
        $shipment = $event->shipment;

        // 1. Notify Customer (Creator or Sender)
        // Check if we have a registered creator
        if ($shipment->creator) {
            try {
                $shipment->creator->notify(new ShipmentNotification($shipment));
            } catch (\Exception $e) {
                Log::error("Failed to notify creator: " . $e->getMessage());
            }
        }
        // Fallback: route notification to sender email if no registered creator
        elseif (isset($shipment->sender_details['email'])) {
            try {
                \Illuminate\Support\Facades\Notification::route('mail', $shipment->sender_details['email'])
                    ->notify(new ShipmentNotification($shipment));
            } catch (\Exception $e) {
                Log::error("Failed to notify sender by email: " . $e->getMessage());
            }
        }

        // 2. Notify Admins on Exception
        $status = is_object($shipment->status) ? $shipment->status->value : (string) $shipment->status;
        if (in_array($status, ['exception', 'returned', 'delayed'])) {
            $admins = \App\Models\User::role(['admin', 'super-admin'])
                ->where('organization_id', $shipment->organization_id)
                ->get();

            foreach ($admins as $admin) {
                try {
                    $admin->notify(new \App\Notifications\AdminExceptionNotification($shipment));
                } catch (\Exception $e) {
                    Log::error("Failed to notify admin: " . $e->getMessage());
                }
            }
        }
    }
}
