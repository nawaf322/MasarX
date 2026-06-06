<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PreAlertAttachment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'pre_alert_id',
        'organization_id',
        'type',
        'path',
        'original_name',
        'mime_type',
        'size',
        'invoice_parsed',
    ];

    protected $casts = [
        'invoice_parsed' => 'boolean',
        'size'           => 'integer',
    ];

    const TYPE_PURCHASE_INVOICE = 'purchase_invoice';
    const TYPE_PRODUCT_PHOTO    = 'product_photo';
    const TYPE_OTHER            = 'other';

    const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    public function preAlert(): BelongsTo
    {
        return $this->belongsTo(PreAlert::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    public function url(): string
    {
        return Storage::url($this->path);
    }
}
