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
use App\Traits\BelongsToTenant;

class Service extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'mode',
        'description',
        'base_price',
        'price_per_kg',
        'currency',
        'estimated_days',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'base_price' => 'decimal:2',
        'price_per_kg' => 'decimal:2',
        'estimated_days' => 'integer',
    ];

    public const MODES = ['air', 'sea', 'land'];

    public static function modesForSelect(): array
    {
        return [
            'air' => __('services.mode_air'),
            'sea' => __('services.mode_sea'),
            'land' => __('services.mode_land'),
        ];
    }

    /**
     * Scope to get active services for an organization (no global scope).
     */
    public static function activeForOrganization(int $organizationId)
    {
        return static::withoutGlobalScope('tenant')
            ->where('organization_id', $organizationId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }
}
