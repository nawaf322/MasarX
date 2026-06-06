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

namespace App\Services;

use App\Jobs\DispatchWebhookJob;
use App\Models\ApiWebhookSubscription;

class WebhookDispatcher
{
    /**
     * Dispatch webhooks to all active subscriptions for the given event and org.
     */
    public function dispatch(string $event, array $payload, int $organizationId): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('api_webhook_subscriptions')) {
            return;
        }

        $subscriptions = ApiWebhookSubscription::where('organization_id', $organizationId)
            ->where('event', $event)
            ->where('is_active', true)
            ->get();

        foreach ($subscriptions as $subscription) {
            DispatchWebhookJob::dispatch($subscription, $event, $payload);
        }
    }
}
