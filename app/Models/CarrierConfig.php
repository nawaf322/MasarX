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

/**
 * LEGACY: Carrier credentials were originally stored here.
 * The app now uses CarrierAccount (carrier_accounts table) for DHL/FedEx/UPS credentials.
 * This table is NOT read for rate quoting or label creation. Kept for backward compatibility only.
 */
class CarrierConfig extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'carrier_slug',
        'account_number',
        'credentials',
        'is_enabled',
        'is_test_mode',
    ];

    protected $casts = [
        'credentials' => 'encrypted:array', // Auto encrypt/decrypt
        'is_enabled' => 'boolean',
        'is_test_mode' => 'boolean',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
