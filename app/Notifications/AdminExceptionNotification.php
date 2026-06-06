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
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminExceptionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $shipment;

    public function __construct(Shipment $shipment)
    {
        $this->shipment = $shipment;
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("ACTION REQUIRED: Shipment Exception #{$this->shipment->tracking_number}")
            ->view('emails.notification', [
                'branding' => [
                    'company_name' => 'MasarX Admin',
                    'primary_color' => '#dc2626' // Red for alert
                ],
                'subject' => "Shipment Exception Alert",
                'content' => "Shipment #{$this->shipment->tracking_number} has been marked as **{$this->shipment->status}**.

Reason/Details: Please check the shipment details immediately.", // Could add exception reason if available
                'actionUrl' => route('shipments.show', $this->shipment->id),
                'actionText' => 'View Shipment'
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'shipment_id' => $this->shipment->id,
            'tracking_number' => $this->shipment->tracking_number,
            'status' => $this->shipment->status,
            'message' => "Shipment {$this->shipment->tracking_number} is in Exception."
        ];
    }
}
