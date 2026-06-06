<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contract extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'customer_id',
        'rate_card_id',
        'contract_number',
        'title',
        'terms',
        'start_date',
        'end_date',
        'status',
        'file_path',
        'signed_at',
        'signed_by',
        'file_paths',
        'signature_path',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
        'signed_at'  => 'datetime',
        'file_paths' => 'array',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function rateCard(): BelongsTo
    {
        return $this->belongsTo(RateCard::class);
    }

    public function signedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_by');
    }

    /**
     * Auto-expire contracts past end_date on read.
     */
    public function getStatusAttribute(string $value): string
    {
        if ($value === 'active' && $this->end_date && $this->end_date->isPast()) {
            return 'expired';
        }
        return $value;
    }
}
