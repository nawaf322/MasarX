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

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaasPlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_monthly',
        'price_quarterly',
        'price_semiannual',
        'price_annual',
        'currency',
        'features',
        'limits',
        'trial_days',
        'grace_period_days',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'features'         => 'array',
        'limits'           => 'array',
        'is_active'        => 'boolean',
        'price_monthly'    => 'decimal:2',
        'price_quarterly'  => 'decimal:2',
        'price_semiannual' => 'decimal:2',
        'price_annual'     => 'decimal:2',
        'trial_days'       => 'integer',
        'grace_period_days'=> 'integer',
        'sort_order'       => 'integer',
    ];

    // ──────────────────────────────────────────────────────────────
    // Relations
    // ──────────────────────────────────────────────────────────────

    public function subscriptions()
    {
        return $this->hasMany(SaasSubscription::class, 'plan_id');
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────

    /**
     * Return the price for the given billing cycle.
     */
    public function priceFor(string $billingCycle): float
    {
        return match ($billingCycle) {
            'monthly'    => (float) $this->price_monthly,
            'quarterly'  => (float) ($this->price_quarterly ?? $this->price_monthly * 3),
            'semiannual' => (float) ($this->price_semiannual ?? $this->price_monthly * 6),
            'annual'     => (float) ($this->price_annual ?? $this->price_monthly * 12),
            default      => (float) $this->price_monthly,
        };
    }

    /**
     * Return the number of months for a given billing cycle.
     */
    public function monthsFor(string $billingCycle): int
    {
        return match ($billingCycle) {
            'monthly'    => 1,
            'quarterly'  => 3,
            'semiannual' => 6,
            'annual'     => 12,
            default      => 1,
        };
    }

    // ──────────────────────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('price_monthly');
    }
}
