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

namespace App\Notifications;

use App\Models\Shipment;
use App\Models\NotificationChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;

class ShipmentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $shipment;

    /**
     * Create a new notification instance.
     */
    public function __construct(Shipment $shipment)
    {
        $this->shipment = $shipment;
    }

    public function getRule()
    {
        $eventKey = $this->getEventKey();
        $organizationId = $this->shipment->organization_id;

        return \App\Models\NotificationRule::where('organization_id', $organizationId)
            ->where('event_key', $eventKey)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];
        $rule = $this->getRule();

        if (!$rule)
            return []; // No rules, no noise

        if (in_array('email', $rule->channels)) {
            $channels[] = 'mail';
        }

        if (in_array('whatsapp', $rule->channels) || in_array('sms', $rule->channels)) {
            $channels[] = \App\Notifications\Channels\TwilioChannel::class;
        }

        if (in_array('webhook', $rule->channels)) {
            $channels[] = \App\Notifications\Channels\WebhookChannel::class;
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $eventKey = $this->getEventKey();
        $language = $notifiable->language ?? 'en';
        $template = $this->getTemplate('email', $eventKey, $language);

        if (!$template && $language !== 'en') {
            $template = $this->getTemplate('email', $eventKey, 'en');
        }

        $branding   = $this->getBranding();
        $content    = $this->replaceVariables($template->content ?? $this->getDefaultMessage(), $notifiable);
        $subject    = $this->replaceVariables($template->subject ?? "Shipment Update: {$this->shipment->tracking_number}", $notifiable);
        $designType = $template->design_type ?? 'classic';

        $mail = (new MailMessage)
            ->subject($subject)
            ->view('emails.notification', [
                'content'     => $content,
                'subject'     => $subject,
                'branding'    => $branding,
                'design_type' => $designType,
                'actionUrl'   => route('tracking.index', ['tracking' => $this->shipment->tracking_number]),
                'actionText'  => 'Track Shipment',
            ]);

        // Use the org's configured SMTP channel instead of the default (log) mailer
        $smtpChannel = NotificationChannel::where('organization_id', $this->shipment->organization_id)
            ->where('channel_type', 'smtp')
            ->where('status', 'active')
            ->first();

        if ($smtpChannel && !empty($smtpChannel->config)) {
            $cfg = $smtpChannel->config;
            if (isset($cfg['password']) && is_string($cfg['password'])) {
                try {
                    $cfg['password'] = Crypt::decryptString($cfg['password']);
                } catch (\Exception $e) {
                    // Password not decryptable — skip custom mailer, use default
                    return $mail;
                }
            }

            $mailerKey = 'smtp_org_' . $this->shipment->organization_id;
            Config::set("mail.mailers.{$mailerKey}", [
                'transport'  => 'smtp',
                'host'       => $cfg['host'] ?? '127.0.0.1',
                'port'       => (int) ($cfg['port'] ?? 587),
                'encryption' => $cfg['encryption'] ?? 'tls',
                'username'   => $cfg['username'] ?? '',
                'password'   => $cfg['password'] ?? '',
                'timeout'    => 10,
            ]);

            return $mail->mailer($mailerKey);
        }

        return $mail;
    }

    public function toTwilio(object $notifiable): string
    {
        $eventKey = $this->getEventKey();
        $language = $notifiable->language ?? 'en';
        $template = $this->getTemplate('whatsapp', $eventKey, $language);

        if (!$template && $language !== 'en') {
            $template = $this->getTemplate('whatsapp', $eventKey, 'en');
        }

        return $this->replaceVariables($template->content ?? $this->getDefaultMessage(), $notifiable);
    }

    public function toWebhook(object $notifiable): array
    {
        return [
            'event' => $this->getEventKey(),
            'timestamp' => now()->toIso8601String(),
            'shipment' => [
                'tracking_number' => $this->shipment->tracking_number,
                'status' => $this->shipment->status,
                'reference' => $this->shipment->reference_number ?? null,
            ],
            'customer' => [
                'id'    => $notifiable->id ?? null,
                'email' => $notifiable->email ?? ($notifiable->routes['mail'] ?? null),
            ]
        ];
    }

    protected function getEventKey(): string
    {
        $status = is_object($this->shipment->status) ? $this->shipment->status->value : (string) $this->shipment->status;

        return match ($status) {
            // ── Created / initial states ──────────────────────────────
            'pending', 'label_created', 'processed', 'manifest_created',
            'pickup_scheduled', 'awaiting_payment', 'payment_received',
            'courier'
                => 'shipment_created',

            // ── In-transit states ──────────────────────────────────────
            'picked_up', 'in_transit', 'on_delivery', 'at_warehouse',
            'sorting', 'customs_clearance', 'at_destination_hub',
            'out_for_delivery', 'delivery_attempted', 'available_for_pickup'
                => 'out_for_delivery',

            // ── Delivered / completed ──────────────────────────────────
            'delivered', 'completed', 'proof_of_delivery'
                => 'delivered',

            // ── Exception / problem states ─────────────────────────────
            'exception', 'returned', 'failed_delivery', 'on_hold',
            'cancelled', 'refused', 'undeliverable', 'damaged', 'lost'
                => 'exception',

            default => 'shipment_created',
        };
    }

    protected function getTemplate(string $channel, string $eventKey, string $language = 'en')
    {
        // Explicitly fetch by language
        return \App\Models\NotificationTemplate::where('organization_id', $this->shipment->organization_id)
            ->where('channel', $channel)
            ->where('event_key', $eventKey)
            ->where('language', $language)
            ->where('is_active', true)
            ->first();
    }

    protected function getBranding()
    {
        $org = $this->shipment->organization; // Relation assuming exists
        // Mock or fetch logic if relation missing, likely already eager loaded or simple query
        return [
            'company_name' => $org->name ?? 'MasarX Logistics',
            'logo_url' => $org->logo_url ?? null,
            'primary_color' => $org->primary_color ?? '#1f2937'
        ];
    }

    protected function replaceVariables(string $content, object $notifiable): string
    {
        $statusLabel = $this->shipment->statusAsEnum() ? $this->shipment->statusAsEnum()->label() : (string) $this->shipment->status;

        // AnonymousNotifiable (from Notification::route) has no name/email properties
        $customerName = $notifiable->name
            ?? ($notifiable->routes['mail'] ?? $this->shipment->sender_details['name'] ?? '');

        $vars = [
            '{{tracking_number}}' => $this->shipment->tracking_number,
            '{{customer_name}}' => $customerName,
            '{{status}}' => $statusLabel,
            '{{tracking_url}}' => url('/tracking/' . $this->shipment->tracking_number),
            '{{date}}' => date('Y-m-d')
        ];

        return str_replace(array_keys($vars), array_values($vars), $content);
    }

    protected function getDefaultMessage(): string
    {
        return "Your shipment {$this->shipment->tracking_number} is updated: {$this->shipment->status}. Track here: " . url('/tracking/' . $this->shipment->tracking_number);
    }
}
