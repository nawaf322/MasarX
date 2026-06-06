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

class State extends Model
{
    protected $fillable = [
        'country_id',
        'name',
        'code',
        'iso2',
        'is_active',
        'organization_id',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeByOrganization($query, $organizationId = null)
    {
        $organizationId = $organizationId ?? auth()->user()->organization_id;
        return $query->where('organization_id', $organizationId);
    }

    /** Incluye datos globales (organization_id null) y los de la organización actual. */
    public function scopeVisibleToOrganization($query, $organizationId = null)
    {
        $organizationId = $organizationId ?? auth()->user()?->organization_id;
        return $query->where(function ($q) use ($organizationId) {
            $q->whereNull('organization_id')
                ->when($organizationId !== null, fn ($q2) => $q2->orWhere('organization_id', $organizationId));
        });
    }

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function cities()
    {
        return $this->hasMany(City::class);
    }
}
