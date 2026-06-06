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

use App\Models\Organization;
use App\Models\Country;
use App\Models\State;
use App\Models\City;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RateZone extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'name',
        'origin_country_id',
        'origin_any',
        'origin_state_id',
        'origin_city_id',
        'dest_country_id',
        'dest_any',
        'dest_state_id',
        'dest_city_id',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'origin_any' => 'boolean',
        'dest_any' => 'boolean',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function originCountry()
    {
        return $this->belongsTo(Country::class, 'origin_country_id');
    }

    public function originState()
    {
        return $this->belongsTo(State::class, 'origin_state_id');
    }

    public function originCity()
    {
        return $this->belongsTo(City::class, 'origin_city_id');
    }

    public function destCountry()
    {
        return $this->belongsTo(Country::class, 'dest_country_id');
    }

    public function destState()
    {
        return $this->belongsTo(State::class, 'dest_state_id');
    }

    public function destCity()
    {
        return $this->belongsTo(City::class, 'dest_city_id');
    }

    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }
}
