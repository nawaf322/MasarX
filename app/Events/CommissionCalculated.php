<?php
namespace App\Events;

use App\Models\Commission;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired after a commission record is created.
 * Downstream: notify agent, audit.
 */
class CommissionCalculated
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Commission $commission) {}
}
