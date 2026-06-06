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

class ApiWebhookDeliveryLog extends Model
{
    protected $fillable = [
        'api_webhook_subscription_id',
        'event',
        'callback_url',
        'http_status',
        'attempt',
        'success',
        'response_body',
        'error_message',
        'duration_ms',
    ];

    protected $casts = [
        'success' => 'boolean',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(ApiWebhookSubscription::class, 'api_webhook_subscription_id');
    }
}
