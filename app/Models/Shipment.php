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

use App\Enums\PaymentStatus;
use App\Models\OriginPickup;
use App\Enums\ShipmentStatus as ShipmentStatusEnum;
use App\Models\ShipmentStatus as ShipmentStatusModel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\InventoryMovement;

class Shipment extends Model
{
    use HasFactory, SoftDeletes, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'uuid',
        'invoice_number',
        'tracking_number',
        'organization_id',
        'sender_details',
        'receiver_details',
        'package_details',
        'status',
        'status_id', // Nueva columna para relación con ShipmentStatus
        'payment_status',
        'service_type',
        'subtotal',
        'tax',
        'discount',
        'total',
        'currency',
        'exchange_rate',
        'ship_date',
        'estimated_delivery_date',
        'delivered_at',
        'is_archived',
        'created_by',
        'rate_card_id',
        'rate_rule_id',
        'manifest_id',
        'department_id', // Column added by 2026_02_02_041938; was missing from fillable
        'paypal_pending_order_id', // Transient; set on PayPal order creation, cleared after capture
        'cost_price',
        'is_cod',
        'cod_amount',
        'cod_currency',
        'cod_status',
        'cod_collected_at',
        'cod_collected_by',
        // Locker / casillero bridge (nullable for standard courier shipments)
        'origin_type',
        'locker_id',
        'pre_alert_id',
    ];

    protected $casts = [
        'sender_details' => 'array',
        'receiver_details' => 'array',
        'package_details' => 'array', // Stored as-is; use getPackageDetailsNormalizedAttribute() for standard structure
        'payment_status' => PaymentStatus::class,
        'status' => 'string', // Guardado como string; usar statusAsEnum() o ShipmentStatusEnum::from($shipment->status) cuando se necesite el enum
        'ship_date' => 'datetime',
        'estimated_delivery_date' => 'datetime',
        'delivered_at' => 'datetime',
        'is_archived' => 'boolean',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'is_cod' => 'boolean',
        'cod_amount' => 'decimal:2',
        'cod_collected_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function rateCard(): BelongsTo
    {
        return $this->belongsTo(RateCard::class);
    }

    public function rateRule(): BelongsTo
    {
        return $this->belongsTo(RateRule::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(ShipmentHistory::class)->latest();
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function shipmentStatus(): BelongsTo
    {
        return $this->belongsTo(ShipmentStatusModel::class, 'status_id');
    }

    public function packages(): HasMany
    {
        return $this->hasMany(ShipmentPackage::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ShipmentAttachment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest();
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ShipmentActivity::class)->latest();
    }

    public function proofOfDelivery(): HasOne
    {
        return $this->hasOne(ProofOfDelivery::class);
    }

    public function customsDeclaration(): HasOne
    {
        return $this->hasOne(CustomsDeclaration::class);
    }

    public function returnRequest(): HasOne
    {
        return $this->hasOne(ReturnShipment::class, 'original_shipment_id');
    }

    public function originPickup(): HasOne
    {
        return $this->hasOne(OriginPickup::class, 'shipment_id');
    }

    public function codCollector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cod_collected_by');
    }

    /**
     * The locker this shipment was originated from.
     * NULL for standard courier shipments.
     */
    public function locker(): BelongsTo
    {
        return $this->belongsTo(Locker::class);
    }

    /**
     * The pre-alert that originated this shipment.
     * NULL for standard courier shipments.
     * Set by PreAlertService::convertToShipment().
     */
    public function preAlert(): BelongsTo
    {
        return $this->belongsTo(PreAlert::class);
    }

    /**
     * Inventory movements linked to this shipment.
     * Includes locker receipt (IN) movements backfilled during convertToShipment().
     */
    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    /**
     * Whether this shipment was originated from a locker/casillero.
     */
    public function isLockerOrigin(): bool
    {
        return $this->origin_type === 'locker';
    }

    /**
     * Returns package_details in normalized structure (packages + summary).
     * Use when consuming for rate calculation or display. Stored value is not rewritten.
     */
    public function getPackageDetailsNormalizedAttribute(): array
    {
        $raw = $this->attributes['package_details'] ?? null;
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        $arr = is_array($decoded) ? $decoded : [];
        return \App\Services\PackageDetailsNormalizer::normalize($arr, 'kg', 'cm');
    }

    /**
     * Set status by code. Resolves status_id from shipment_statuses when available;
     * always sets status string for legacy compatibility.
     */
    public function setStatusByCode(string $code): bool
    {
        return app(\App\Services\StatusResolver::class)->setStatusByCode($this, $code);
    }

    /**
     * Devuelve el status como enum (para comparaciones y ->value / ->label()).
     */
    public function statusAsEnum(): ?ShipmentStatusEnum
    {
        $code = $this->status_id && $this->relationLoaded('shipmentStatus')
            ? ($this->shipmentStatus->code ?? $this->getRawOriginal('status'))
            : $this->getRawOriginal('status');
        return $code ? ShipmentStatusEnum::tryFrom((string) $code) : null;
    }

    /**
     * Accessor: código de estado (string) para compatibilidad.
     */
    public function getStatusAttribute($value)
    {
        if ($this->status_id && $this->relationLoaded('shipmentStatus')) {
            return $this->shipmentStatus->code ?? $value;
        }
        return $value;
    }
}
