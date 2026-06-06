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

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Organization;
use App\Models\RateCard;
use App\Models\RateZone;

class RateRule extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'rate_card_id',
        'rate_zone_id',
        'service_type',
        'min_weight',
        'max_weight',
        'price_per_lb',
        'price_per_kg',
        'flat_price',
        'min_charge',
        'fuel_surcharge_percent',
        'insurance_percent',
        'tax_percent',
        'handling_fee',
        'rounding_rule',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Price per kg for weight-based charge. Internal convention: all calculations in KG.
     * If null, falls back to price_per_lb converted: price_per_lb * 2.2046226218.
     */
    public function getEffectivePricePerKgAttribute(): float
    {
        if ($this->price_per_kg !== null && (float) $this->price_per_kg > 0) {
            return (float) $this->price_per_kg;
        }
        $perLb = (float) ($this->price_per_lb ?? 0);
        return $perLb * 2.2046226218;
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function card()
    {
        return $this->belongsTo(RateCard::class, 'rate_card_id');
    }

    public function zone()
    {
        return $this->belongsTo(RateZone::class, 'rate_zone_id');
    }

    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }
}
