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

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaasInvoice extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'subscription_id',
        'invoice_number',
        'type',
        'status',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'total',
        'currency',
        'description',
        'billing_period_start',
        'billing_period_end',
        'issued_at',
        'paid_at',
        'due_at',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'subtotal'             => 'decimal:2',
        'tax_rate'             => 'decimal:2',
        'tax_amount'           => 'decimal:2',
        'total'                => 'decimal:2',
        'billing_period_start' => 'date',
        'billing_period_end'   => 'date',
        'issued_at'            => 'datetime',
        'paid_at'              => 'datetime',
        'due_at'               => 'datetime',
        'metadata'             => 'array',
    ];

    // ──────────────────────────────────────────────────────────────
    // Relations
    // ──────────────────────────────────────────────────────────────

    public function subscription()
    {
        return $this->belongsTo(SaasSubscription::class, 'subscription_id');
    }

    // ──────────────────────────────────────────────────────────────
    // Invoice number generation
    // ──────────────────────────────────────────────────────────────

    /**
     * Generate next sequential invoice number in format SAAS-INV-YYYYMM-XXXX.
     * Uses a DB lock to prevent duplicates under concurrent requests.
     */
    public static function generateInvoiceNumber(): string
    {
        $prefix = 'SAAS-INV-' . now()->format('Ym') . '-';

        $last = static::withTrashed()
            ->where('invoice_number', 'like', $prefix . '%')
            ->lockForUpdate()
            ->orderByDesc('id')
            ->first();

        $next = 1;
        if ($last) {
            $parts = explode('-', $last->invoice_number);
            $next  = ((int) end($parts)) + 1;
        }

        return $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
    }

    // ──────────────────────────────────────────────────────────────
    // Status helpers
    // ──────────────────────────────────────────────────────────────

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function isOverdue(): bool
    {
        return $this->status === 'overdue'
            || ($this->status === 'issued' && $this->due_at !== null && $this->due_at->isPast());
    }

    // ──────────────────────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────────────────────

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeUnpaid($query)
    {
        return $query->whereIn('status', ['draft', 'issued', 'overdue']);
    }

    public function scopeOverdue($query)
    {
        return $query->where(function ($q) {
            $q->where('status', 'overdue')
              ->orWhere(function ($q2) {
                  $q2->where('status', 'issued')
                     ->where('due_at', '<', now());
              });
        });
    }
}
