<?php

namespace App\Events;

use App\Models\PreAlert;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Fired when the physical package arrives at the warehouse/locker and the operator registers it. */
class PreAlertReceived
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly PreAlert $preAlert) {}
}
