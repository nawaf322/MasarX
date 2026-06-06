<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerWallet extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'balance',
        'currency',
        'last_recharged_at',
        'last_debited_at',
    ];

    protected $casts = [
        'balance'           => 'decimal:2',
        'last_recharged_at' => 'datetime',
        'last_debited_at'   => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(CustomerWalletTransaction::class, 'wallet_id');
    }

    public function hasSufficientBalance(float $amount): bool
    {
        return (float) $this->balance >= $amount;
    }

    public function getFormattedBalanceAttribute(): string
    {
        return number_format((float) $this->balance, 2) . ' ' . $this->currency;
    }
}
