<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerWalletTransaction extends Model
{
    protected $fillable = [
        'wallet_id',
        'user_id',
        'organization_id',
        'type',
        'amount',
        'balance_before',
        'balance_after',
        'description',
        'reference',
        'payment_method',
        'shipment_id',
        'metadata',
        'performed_by',
    ];

    protected $casts = [
        'amount'         => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after'  => 'decimal:2',
        'metadata'       => 'array',
    ];

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(CustomerWallet::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function scopeCredits($query)
    {
        return $query->where('type', 'credit');
    }

    public function scopeDebits($query)
    {
        return $query->whereIn('type', ['debit', 'hold']);
    }
}
