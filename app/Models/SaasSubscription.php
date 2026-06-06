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
use Illuminate\Support\Carbon;

class SaasSubscription extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'plan_id',
        'billing_cycle',
        'status',
        'price',
        'currency',
        'starts_at',
        'expires_at',
        'grace_period_ends_at',
        'trial_ends_at',
        'cancelled_at',
        'last_renewed_at',
        'auto_renew',
        'notes',
    ];

    protected $casts = [
        'starts_at'            => 'datetime',
        'expires_at'           => 'datetime',
        'grace_period_ends_at' => 'datetime',
        'trial_ends_at'        => 'datetime',
        'cancelled_at'         => 'datetime',
        'last_renewed_at'      => 'datetime',
        'auto_renew'           => 'boolean',
        'price'                => 'decimal:2',
    ];

    // ──────────────────────────────────────────────────────────────
    // Relations
    // ──────────────────────────────────────────────────────────────

    public function plan()
    {
        return $this->belongsTo(SaasPlan::class, 'plan_id');
    }

    public function invoices()
    {
        return $this->hasMany(SaasInvoice::class, 'subscription_id');
    }

    // ──────────────────────────────────────────────────────────────
    // Status helpers
    // ──────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return in_array($this->status, ['active', 'trial', 'grace_period']);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isInTrial(): bool
    {
        return $this->status === 'trial'
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture();
    }

    public function isInGracePeriod(): bool
    {
        return $this->status === 'grace_period'
            && $this->grace_period_ends_at !== null
            && $this->grace_period_ends_at->isFuture();
    }

    public function isReadOnly(): bool
    {
        return $this->status === 'read_only';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Days remaining until expiration (0 if already expired).
     */
    public function daysUntilExpiry(): int
    {
        if (!$this->expires_at || $this->expires_at->isPast()) {
            return 0;
        }
        return (int) now()->diffInDays($this->expires_at);
    }

    // ──────────────────────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['active', 'trial', 'grace_period']);
    }

    public function scopeExpiringSoon($query, int $days = 7)
    {
        return $query->whereIn('status', ['active', 'trial'])
            ->where('expires_at', '<=', now()->addDays($days))
            ->where('expires_at', '>', now());
    }

    public function scopeExpired($query)
    {
        return $query->whereIn('status', ['active', 'trial'])
            ->where('expires_at', '<', now());
    }
}
