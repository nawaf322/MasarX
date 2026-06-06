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

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookChannel
{
    /**
     * Send the given notification.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        if (!method_exists($notification, 'toWebhook')) {
            return;
        }

        $organizationId = $notifiable->organization_id ?? null;
        if (!$organizationId) {
            return;
        }

        // Fetch Webhook Config (Assuming handled via 'webhook' channel type in DB)
        // Or if we don't have a DB config for it yet, we might check if the Rule has a specific URL?
        // For now, let's assume it's a registered channel or finding key 'webhook_url' in settings.

        // Actually, often Webhooks are configured PER USER or PER Organization globally.
        // Let's check NotificationChannel table for 'webhook'.
        $channelConfig = NotificationChannel::where('organization_id', $organizationId)
            ->where('channel_type', 'webhook')
            ->first();

        if (!$channelConfig || empty($channelConfig->config['url'])) {
            // If no global webhook, maybe check if the User model has a webhook_url?
            return;
        }

        $url = $channelConfig->config['url'];
        $secret = $channelConfig->config['secret'] ?? null;

        $payload = $notification->toWebhook($notifiable);

        try {
            $response = Http::timeout(5)
                ->withHeaders([
                    'X-Deprixa-Event' => 'notification',
                    'X-Deprixa-Signature' => $secret ? hash_hmac('sha256', json_encode($payload), $secret) : ''
                ])
                ->post($url, $payload);

            if ($response->failed()) {
                Log::warning("Webhook Failed to {$url}: " . $response->status());
            }
        } catch (\Exception $e) {
            Log::error("Webhook Dispatch Error: " . $e->getMessage());
        }
    }
}
