<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class ReturnShipment extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'original_shipment_id',
        'return_shipment_id',
        'created_by',
        'return_number',
        'reason',
        'reason_notes',
        'status',
        'refund_amount',
        'refund_method',
        'approved_at',
        'received_at',
        'completed_at',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'received_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->return_number)) {
                $year = Carbon::now()->year;
                $seq  = str_pad((static::whereYear('created_at', $year)->count() + 1), 6, '0', STR_PAD_LEFT);
                $model->return_number = "RET-{$year}-{$seq}";
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function originalShipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'original_shipment_id');
    }

    public function returnShipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'return_shipment_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
