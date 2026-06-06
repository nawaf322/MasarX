<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomsDeclaration extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'shipment_id',
        'organization_id',
        'declaration_type',
        'items',
        'declared_value',
        'currency',
        'insurance_required',
        'insurance_value',
        'notes',
    ];

    protected $casts = [
        'items' => 'array',
        'declared_value' => 'decimal:2',
        'insurance_value' => 'decimal:2',
        'insurance_required' => 'boolean',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
