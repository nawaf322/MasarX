<?php

namespace App\Listeners;

use App\Events\PreAlertConverted;
use App\Services\InAppNotificationService;

class NotifyCustomerOnPreAlertConverted
{
    public function __construct(private InAppNotificationService $notifications) {}

    public function handle(PreAlertConverted $event): void
    {
        $preAlert = $event->preAlert;
        $shipment = $event->shipment;

        try {
            $this->notifications->notify(
                orgId:  $preAlert->organization_id,
                userId: $preAlert->customer_id,
                type:   'pre_alert_converted',
                title:  __('pre_alerts.notification_converted_title'),
                body:   __('pre_alerts.notification_converted_body', [
                    'store'    => $preAlert->store_name,
                    'tracking' => $shipment->tracking_number,
                ]),
                icon:   'truck',
                url:    "/shipments/{$shipment->id}",
            );
        } catch (\Throwable) {
            // Never block the main flow
        }
    }
}
