<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NumberingSequence extends Model
{
    use HasFactory, \App\Traits\BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'type',
        'prefix',
        'suffix',
        'next_number',
        'padding',
        'reset_rule',
        'last_reset_at'
    ];

    protected $casts = [
        'last_reset_at' => 'datetime',
        'next_number' => 'integer',
        'padding' => 'integer'
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
