<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProofOfDelivery extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'shipment_id',
        'organization_id',
        'created_by',
        'recipient_name',
        'recipient_id_number',
        'signature',
        'photos',
        'notes',
        'delivered_at',
    ];

    protected $casts = [
        'photos' => 'array',
        'delivered_at' => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
