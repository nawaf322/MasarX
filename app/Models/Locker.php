<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Locker extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'customer_id',
        'warehouse_id',
        'code',
        'address',
        'status',
        'assigned_at',
        'expires_at',
        'notes',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'expires_at'  => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * PreAlerts received at this locker.
     * Each pre_alert.locker_id → this locker.
     */
    public function preAlerts(): HasMany
    {
        return $this->hasMany(PreAlert::class);
    }

    /**
     * Shipments originated from this locker.
     * Set when PreAlertService::convertToShipment() runs.
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
