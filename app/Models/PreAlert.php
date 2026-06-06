<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PreAlert extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'customer_id',
        'locker_id',
        'pre_alert_number',
        'store_name',
        'store_tracking_number',
        'store_url',
        'declared_value',
        'declared_currency',
        'declared_weight_kg',
        'description',
        'notes',
        'invoice_data',
        'status',
        'received_at',
        'converted_at',
        'shipment_id',
    ];

    protected $casts = [
        'invoice_data'      => 'array',
        'declared_value'    => 'decimal:2',
        'declared_weight_kg'=> 'decimal:2',
        'received_at'       => 'datetime',
        'converted_at'      => 'datetime',
    ];

    // ── Status constants ────────────────────────────────────────────────────────

    const STATUS_PENDING   = 'pending';
    const STATUS_RECEIVED  = 'received';
    const STATUS_PROCESSING = 'processing';
    const STATUS_CONVERTED = 'converted';
    const STATUS_CANCELLED = 'cancelled';

    // ── Relationships ──────────────────────────────────────────────────────────

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function locker(): BelongsTo
    {
        return $this->belongsTo(Locker::class);
    }

    /**
     * The Shipment this pre-alert was converted into.
     * NULL until PreAlertService::convertToShipment() runs.
     * This is the CORE LINK: pre_alert → shipment.
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Attached files: purchase invoices, product photos.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(PreAlertAttachment::class);
    }

    /**
     * The purchase invoice attachment (single, for PDF parsing).
     */
    public function purchaseInvoice(): HasOne
    {
        return $this->hasOne(PreAlertAttachment::class)->where('type', 'purchase_invoice')->latestOfMany();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function isConverted(): bool
    {
        return $this->status === self::STATUS_CONVERTED && $this->shipment_id !== null;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isReceived(): bool
    {
        return in_array($this->status, [self::STATUS_RECEIVED, self::STATUS_PROCESSING], true);
    }
}
