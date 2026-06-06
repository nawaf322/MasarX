<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OriginPickup extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'shipment_id',
        'requested_by',
        'confirmed_by',
        'driver_id',
        'assigned_at',
        'driver_notified_at',
        'scheduled_for',
        'contact_name',
        'contact_phone',
        'pickup_address',
        'special_instructions',
        'photos',
        'status',
        'confirmed_at',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'photos'              => 'array',
        'scheduled_for'       => 'datetime',
        'confirmed_at'        => 'datetime',
        'completed_at'        => 'datetime',
        'assigned_at'         => 'datetime',
        'driver_notified_at'  => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }
}
