<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerContact extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'customer_id',
        'organization_id',
        'name',
        'email',
        'phone',
        'address',
        'address_line2',
        'city',
        'state',
        'country',
        'zip_code',
        'document_id',
        'notes',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
