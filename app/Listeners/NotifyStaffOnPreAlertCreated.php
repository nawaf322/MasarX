<?php

namespace App\Listeners;

use App\Events\PreAlertCreated;
use App\Services\InAppNotificationService;

class NotifyStaffOnPreAlertCreated
{
    public function __construct(private InAppNotificationService $notifications) {}

    public function handle(PreAlertCreated $event): void
    {
        $preAlert = $event->preAlert;

        try {
            $this->notifications->broadcast(
                orgId: $preAlert->organization_id,
                type:  'pre_alert_new',
                title: __('pre_alerts.notification_staff_created_title'),
                body:  __('pre_alerts.notification_staff_created_body', [
                    'number'   => $preAlert->pre_alert_number ?? "#{$preAlert->id}",
                    'store'    => $preAlert->store_name,
                    'tracking' => $preAlert->store_tracking_number,
                ]),
                icon: 'package',
                url:  "/pre-alerts/{$preAlert->id}",
            );
        } catch (\Throwable) {
            // Nunca bloquear el flujo principal
        }
    }
}
