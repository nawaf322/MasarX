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

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use App\Models\NotificationChannel;
use App\Models\NotificationRule;
use App\Models\NotificationTemplate;
use App\Models\Shipment;
use App\Notifications\ShipmentNotification;
use Exception;

class NotificationService
{
    /**
     * Test SMTP Configuration.
     */
    public function testSmtp(array $config, string $toEmail): bool
    {
        // Temporarily override config
        Config::set('mail.mailers.smtp_test', [
            'transport' => 'smtp',
            'host' => $config['host'],
            'port' => $config['port'],
            'encryption' => $config['encryption'],
            'username' => $config['username'],
            'password' => $config['password'],
            'timeout' => 5,
        ]);

        try {
            Mail::mailer('smtp_test')->raw('This is a test email from MasarX Settings.', function ($message) use ($toEmail, $config) {
                $message->to($toEmail)
                    ->from($config['from_email'], $config['from_name'] ?? 'MasarX Test')
                    ->subject('SMTP Configuration Test');
            });
            return true;
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * Send WhatsApp message via Twilio.
     */
    public function sendWhatsapp(array $config, string $to, string $message): bool
    {
        try {
            if (empty($config['sid']) || empty($config['token']) || empty($config['whatsapp_from'])) {
                throw new Exception("Twilio WhatsApp configuration missing.");
            }

            $twilio = new \Twilio\Rest\Client($config['sid'], $config['token']);

            // Ensure numbers format (whatsapp:+123...)
            $from = str_starts_with($config['whatsapp_from'], 'whatsapp:') ? $config['whatsapp_from'] : 'whatsapp:' . $config['whatsapp_from'];
            $to = str_starts_with($to, 'whatsapp:') ? $to : 'whatsapp:' . $to;

            $twilio->messages->create($to, [
                'from' => $from,
                'body' => $message
            ]);

            return true;
        } catch (Exception $e) {
            throw new Exception("Twilio WhatsApp Error: " . $e->getMessage());
        }
    }

    /**
     * Send SMS via Twilio.
     */
    public function sendSms(array $config, string $to, string $message): bool
    {
        try {
            if (empty($config['sid']) || empty($config['token']) || empty($config['sms_from'])) {
                throw new Exception("Twilio SMS configuration missing.");
            }

            $twilio = new \Twilio\Rest\Client($config['sid'], $config['token']);

            $twilio->messages->create($to, [
                'from' => $config['sms_from'],
                'body' => $message
            ]);

            return true;
        } catch (Exception $e) {
            throw new Exception("Twilio SMS Error: " . $e->getMessage());
        }
    }

    /**
     * Send an email using the organization's SMTP channel (Settings > Notifications > SMTP).
     * 
     * @param int $orgId Organization ID
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $bodyHtml Email body HTML
     * @param array $attachments Optional array of attachments: [['path' => '/path/to/file', 'name' => 'filename.pdf'], ...]
     */
    public function sendMailFromSmtpChannel(int $orgId, string $to, string $subject, string $bodyHtml, array $attachments = []): void
    {
        $channel = NotificationChannel::where('organization_id', $orgId)
            ->where('channel_type', 'smtp')
            ->first();

        if (!$channel || empty($channel->config)) {
            throw new Exception('SMTP is not configured. Please set it up in Settings > Notifications > Channels.');
        }

        $config = $channel->config;
        if (isset($config['password']) && is_string($config['password'])) {
            try {
                $config['password'] = \Illuminate\Support\Facades\Crypt::decryptString($config['password']);
            } catch (\Exception $e) {
                throw new Exception('Invalid SMTP password. Please re-enter it in Notifications.');
            }
        }

        Config::set('mail.mailers.smtp_invoice', [
            'transport' => 'smtp',
            'host' => $config['host'] ?? 'smtp.mailtrap.io',
            'port' => (int) ($config['port'] ?? 2525),
            'encryption' => $config['encryption'] ?? 'tls',
            'username' => $config['username'] ?? '',
            'password' => $config['password'] ?? '',
            'timeout' => 10,
        ]);

        Mail::mailer('smtp_invoice')->html($bodyHtml, function ($message) use ($to, $subject, $config, $attachments) {
            $message->to($to)
                ->from($config['from_email'] ?? config('mail.from.address'), $config['from_name'] ?? config('mail.from.name'))
                ->subject($subject);
            
            // Attach files if provided
            foreach ($attachments as $attachment) {
                if (isset($attachment['path']) && file_exists($attachment['path'])) {
                    $name = $attachment['name'] ?? basename($attachment['path']);
                    $mime = $attachment['mime'] ?? 'application/pdf';
                    $message->attach($attachment['path'], [
                        'as' => $name,
                        'mime' => $mime,
                    ]);
                } elseif (isset($attachment['data']) && isset($attachment['name'])) {
                    // Attach from raw data
                    $mime = $attachment['mime'] ?? 'application/pdf';
                    $message->attachData($attachment['data'], $attachment['name'], [
                        'mime' => $mime,
                    ]);
                }
            }
        });
    }

    /**
     * Dispatch a notification for a shipment event.
     * Looks up the active rule, validates channels, and notifies via ShipmentNotification.
     *
     * @param string $eventKey  One of: shipment_created, out_for_delivery, delivered, exception
     * @param array  $payload   Must contain 'shipment_id'
     * @param int    $orgId     Organization ID
     */
    public function send(string $eventKey, array $payload, int $orgId): void
    {
        // 1. Verify there is an active rule for this event
        $rule = NotificationRule::where('organization_id', $orgId)
            ->where('event_key', $eventKey)
            ->where('is_active', true)
            ->first();

        if (!$rule || empty($rule->channels)) {
            return; // No active rule — nothing to send
        }

        // 2. Resolve shipment
        $shipmentId = $payload['shipment_id'] ?? null;
        if (!$shipmentId) {
            Log::warning("NotificationService::send() — missing shipment_id in payload", compact('eventKey', 'orgId'));
            return;
        }

        $shipment = Shipment::where('organization_id', $orgId)->find($shipmentId);
        if (!$shipment) {
            Log::warning("NotificationService::send() — shipment #{$shipmentId} not found for org #{$orgId}");
            return;
        }

        // 3. Notify the shipment creator (if registered user)
        if ($shipment->creator) {
            try {
                $shipment->creator->notify(new ShipmentNotification($shipment));
            } catch (Exception $e) {
                Log::error("NotificationService::send() — notify creator failed: " . $e->getMessage());
            }
            return;
        }

        // 4. Fallback: route by email if sender_email exists in JSON
        if (!empty($shipment->sender_details['email'])) {
            try {
                \Illuminate\Support\Facades\Notification::route('mail', $shipment->sender_details['email'])
                    ->notify(new ShipmentNotification($shipment));
            } catch (Exception $e) {
                Log::error("NotificationService::send() — route-to-email failed: " . $e->getMessage());
            }
        }
    }
}
