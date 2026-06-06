<?php

namespace App\Listeners;

use App\Events\PreAlertCreated;
use App\Services\InAppNotificationService;

class NotifyCustomerOnPreAlertCreated
{
    public function __construct(private InAppNotificationService $notifications) {}

    public function handle(PreAlertCreated $event): void
    {
        $preAlert = $event->preAlert;

        try {
            $this->notifications->notify(
                orgId:  $preAlert->organization_id,
                userId: $preAlert->customer_id,
                type:   'pre_alert_created',
                title:  __('pre_alerts.notification_created_title'),
                body:   __('pre_alerts.notification_created_body', [
                    'store'    => $preAlert->store_name,
                    'tracking' => $preAlert->store_tracking_number,
                ]),
                icon:   'package',
                url:    "/pre-alerts/{$preAlert->id}",
            );
        } catch (\Throwable) {
            // Never block the main flow
        }
    }
}
