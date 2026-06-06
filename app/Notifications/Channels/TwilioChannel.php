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
use App\Services\NotificationService;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class TwilioChannel
{
    protected $service;

    public function __construct(NotificationService $service)
    {
        $this->service = $service;
    }

    /**
     * Send the given notification.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        if (!method_exists($notification, 'toTwilio')) {
            return;
        }

        $message = $notification->toTwilio($notifiable);
        $organizationId = $notifiable->organization_id ?? null;
        if (!$organizationId) {
            Log::warning('TwilioChannel: notifiable has no organization_id — skipping send.', [
                'notifiable_type' => get_class($notifiable),
                'notifiable_id'   => $notifiable->id ?? null,
            ]);
            return;
        }

        // Fetch Config
        $channelConfig = NotificationChannel::where('organization_id', $organizationId)
            ->where('channel_type', 'twilio')
            ->first();

        if (!$channelConfig || !$channelConfig->config) {
            return;
        }

        $config = $channelConfig->config;

        // Decrypt
        if (isset($config['token'])) {
            try {
                $config['token'] = Crypt::decryptString($config['token']);
            } catch (\Exception $e) {
                Log::error('Twilio Token Decryption Failed: ' . $e->getMessage());
                return;
            }
        }

        $to = $notifiable->phone;
        if (!$to)
            return; // No phone

        // Get Rule from Notification to check which channel is actually authorized
        $rule = method_exists($notification, 'getRule') ? $notification->getRule() : null;
        $channels = $rule ? $rule->channels : ['whatsapp', 'sms']; // Fallback if no rule logic

        try {
            $sent = false;

            // Prioritize WhatsApp
            if (in_array('whatsapp', $channels) && !empty($config['whatsapp_from'])) {
                try {
                    $this->service->sendWhatsapp($config, $to, $message);
                    $sent = true;
                } catch (\Exception $e) {
                    Log::warning('Twilio WhatsApp Failed, attempting SMS Fallback: ' . $e->getMessage());
                    // Don't return, allow fall-through to SMS if enabled
                }
            }

            // Fallback to SMS if WhatsApp failed OR if SMS is the only/primary channel requested and WA wasn't sent
            // Logic: If WA was sent ($sent=true), skip SMS. If WA failed ($sent=false) AND SMS is enabled, send SMS.
            if (!$sent && in_array('sms', $channels) && !empty($config['sms_from'])) {
                $this->service->sendSms($config, $to, $message);
            }

        } catch (\Exception $e) {
            Log::error('Twilio Critical Failure: ' . $e->getMessage());
        }
    }
}
