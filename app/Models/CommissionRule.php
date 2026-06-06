<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommissionRule extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'type',
        'rate',
        'currency',
        'applies_to',
        'reference_id',
        'min_amount',
        'max_amount',
        'priority',
        'is_active',
        'trigger_on',
    ];

    protected $casts = [
        'rate'       => 'decimal:4',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'priority'   => 'integer',
        'is_active'  => 'boolean',
    ];

    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class);
    }
}
