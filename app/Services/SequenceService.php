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

use App\Models\NumberingSequence;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SequenceService
{
    public function nextInvoiceNumber(int $orgId): string
    {
        return $this->next($orgId, 'invoice');
    }

    public function nextTrackingNumber(int $orgId): string
    {
        $this->ensureTrackingSequence($orgId);
        return $this->next($orgId, 'tracking');
    }

    /**
     * Create default tracking sequence for org if it does not exist.
     */
    public function ensureTrackingSequence(int $orgId): void
    {
        NumberingSequence::firstOrCreate(
            [
                'organization_id' => $orgId,
                'type' => 'tracking',
            ],
            [
                'prefix' => 'TRK',
                'suffix' => null,
                'next_number' => 1,
                'padding' => 8,
                'reset_rule' => 'never',
                'last_reset_at' => null,
            ]
        );
    }

    public function next(int $orgId, string $type): string
    {
        return DB::transaction(function () use ($orgId, $type) {
            $sequence = NumberingSequence::where('organization_id', $orgId)
                ->where('type', $type)
                ->lockForUpdate()
                ->first();

            if (!$sequence) {
                // Fallback default (caller should ensure sequence exists for tracking/invoice)
                return 'UNK-' . str_pad('1', 6, '0', STR_PAD_LEFT);
            }

            // Check Reset Rule
            if ($this->shouldReset($sequence)) {
                $sequence->next_number = 1;
                $sequence->last_reset_at = now();
            }

            $number = $sequence->next_number;
            $formatted = $this->format($sequence, $number);

            $sequence->next_number++;
            $sequence->save();

            return $formatted;
        });
    }

    public function preview(int $orgId, string $type): string
    {
        $sequence = NumberingSequence::where('organization_id', $orgId)
            ->where('type', $type)
            ->first();

        if (!$sequence)
            return '---';

        return $this->format($sequence, $sequence->next_number);
    }

    protected function format($sequence, $number): string
    {
        $padded = str_pad((string) $number, $sequence->padding, '0', STR_PAD_LEFT);
        return ($sequence->prefix ?? '') . $padded . ($sequence->suffix ?? '');
    }

    protected function shouldReset($sequence): bool
    {
        if ($sequence->reset_rule === 'never')
            return false;

        $last = $sequence->last_reset_at ? Carbon::parse($sequence->last_reset_at) : null;
        if (!$last)
            return true; // First time

        $now = now();

        switch ($sequence->reset_rule) {
            case 'daily':
                return !$now->isSameDay($last);
            case 'monthly':
                return !$now->isSameMonth($last);
            case 'yearly':
                return !$now->isSameYear($last);
            default:
                return false;
        }
    }
}
