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

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Notifications\Channels\TwilioChannel;
use App\Models\Organization;

class TwoFactorCode extends Notification implements ShouldQueue
{
    use Queueable;

    public $code;
    public $channels;

    public function __construct($code, $channels = ['mail'])
    {
        $this->code = $code;
        $this->channels = $channels;
    }

    public function via($notifiable)
    {
        return $this->channels;
    }

    public function toMail($notifiable)
    {
        // Branding injection
        $org = $notifiable->organization ?? Organization::first();
        $appName = $org ? $org->name : config('app.name');

        return (new MailMessage)
            ->subject("{$this->code} contains your {$appName} verification code")
            ->line("Your verification code is: **{$this->code}**")
            ->line("It will expire in 10 minutes.")
            ->line("If you did not request this code, securing your account is recommended.");
    }

    // Support for TwilioChannel
    public function toTwilio($notifiable)
    {
        $org = $notifiable->organization ?? Organization::first();
        $appName = $org ? $org->name : config('app.name');

        return "Your {$appName} verification code is: {$this->code}. Do not share it.";
    }
}
