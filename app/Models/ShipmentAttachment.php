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
use Illuminate\Support\Facades\Storage;

class ShipmentAttachment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'shipment_id',
        'organization_id',
        'type',
        'path',
        'original_name',
        'mime_type',
        'size',
    ];

    public const TYPES = ['photo', 'payment_proof'];

    /** Formatos seguros permitidos (MIME) para evitar virus/malware */
    public const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];

    public const MAX_SIZE_KB = 5120; // 5 MB

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function getFullPathAttribute(): string
    {
        return Storage::disk('local')->path($this->path);
    }

    public function exists(): bool
    {
        return Storage::disk('local')->exists($this->path);
    }
}
