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

class ApiClient extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'client_id',
        'client_secret_hash',
        'name',
        'type',
        'status',
        'is_active',
        'expires_at',
        'callback_url',
        'webhook_secret',
        'allowed_scopes',
        'rate_limit_per_minute',
        'ip_whitelist',
        'request_id_prefix',
        'metadata',
    ];

    protected $casts = [
        'allowed_scopes' => 'array',
        'ip_whitelist' => 'array',
        'metadata' => 'array',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
