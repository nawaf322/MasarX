<?php

namespace App\Events;

use App\Models\PreAlert;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PreAlertCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly PreAlert $preAlert) {}
}
