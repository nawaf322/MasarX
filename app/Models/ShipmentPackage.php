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
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShipmentPackage extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'shipment_id',
        'organization_id',
        'weight',
        'pieces',
        'declared_value',
        'length',
        'width',
        'height',
        'content_description',
        'volumetric_weight',
        'chargeable_weight',
        'subtotal',
        'surcharges_total',
        'tax',
        'total',
        'currency',
        'meta',
    ];

    protected $casts = [
        'weight' => 'decimal:3',
        'declared_value' => 'decimal:2',
        'length' => 'decimal:2',
        'width' => 'decimal:2',
        'height' => 'decimal:2',
        'volumetric_weight' => 'decimal:3',
        'chargeable_weight' => 'decimal:3',
        'subtotal' => 'decimal:2',
        'surcharges_total' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'meta' => 'array',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ShipmentPackageItem::class, 'shipment_package_id');
    }
}
