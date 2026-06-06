<?php
namespace App\Events;

use App\Models\Commission;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when a commission is reversed (due to return/cancellation).
 * Downstream: notify agent, update payable ledger, audit.
 */
class CommissionReversed
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Commission $reversalCommission,
        public readonly Commission $originalCommission,
        public readonly string     $reason,
    ) {}
}
