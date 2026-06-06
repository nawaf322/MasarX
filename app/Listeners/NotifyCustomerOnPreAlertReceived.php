<?php

namespace App\Listeners;

use App\Events\PreAlertReceived;
use App\Services\InAppNotificationService;

class NotifyCustomerOnPreAlertReceived
{
    public function __construct(private InAppNotificationService $notifications) {}

    public function handle(PreAlertReceived $event): void
    {
        $preAlert = $event->preAlert;

        try {
            $this->notifications->notify(
                orgId:  $preAlert->organization_id,
                userId: $preAlert->customer_id,
                type:   'pre_alert_received',
                title:  __('pre_alerts.notification_received_title'),
                body:   __('pre_alerts.notification_received_body', [
                    'store'    => $preAlert->store_name,
                    'tracking' => $preAlert->store_tracking_number,
                ]),
                icon:   'package-check',
                url:    "/pre-alerts/{$preAlert->id}",
            );
        } catch (\Throwable) {
            // Never block the main flow
        }
    }
}
