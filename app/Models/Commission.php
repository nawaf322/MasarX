<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Commission extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'shipment_id',
        'user_id',
        'commission_rule_id',
        'shipment_total',
        'commission_amount',
        'currency',
        'status',
        'paid_at',
        'notes',
        'trigger_event',
        'reversed_at',
        'reversal_reason',
        'parent_commission_id',
    ];

    protected $casts = [
        'shipment_total'    => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'paid_at'           => 'datetime',
        'reversed_at'       => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(CommissionRule::class, 'commission_rule_id');
    }
}
