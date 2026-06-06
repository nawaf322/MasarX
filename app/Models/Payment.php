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
use Illuminate\Support\Facades\Storage;

class Payment extends Model
{
    use \App\Traits\BelongsToTenant;
    public const METHOD_MANUAL = 'manual';
    public const METHOD_STRIPE = 'stripe';
    public const METHOD_PAYPAL = 'paypal';

    protected $fillable = [
        'shipment_id',
        'organization_id',
        'amount',
        'currency',
        'method',
        'receipt_path',
        'original_filename',
        'external_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function hasReceipt(): bool
    {
        return !empty($this->receipt_path);
    }

    public function receiptExists(): bool
    {
        return $this->receipt_path && Storage::disk('local')->exists($this->receipt_path);
    }

    public function getMethodLabelAttribute(): string
    {
        return match ($this->method) {
            self::METHOD_STRIPE => 'Stripe',
            self::METHOD_PAYPAL => 'PayPal',
            self::METHOD_MANUAL => __('Manual'),
            default => $this->method,
        };
    }
}
