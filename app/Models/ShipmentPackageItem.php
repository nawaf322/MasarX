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
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentPackageItem extends Model
{
    protected $fillable = [
        'shipment_package_id',
        'description',
        'quantity',
        'unit_value',
        'total_value',
        'weight',
        'sku',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_value' => 'decimal:2',
        'total_value' => 'decimal:2',
        'weight' => 'decimal:3',
    ];

    public function shipmentPackage(): BelongsTo
    {
        return $this->belongsTo(ShipmentPackage::class);
    }
}
