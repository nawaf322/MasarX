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

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GaRunLog extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'ga_run_logs';

    protected $fillable = [
        'organization_id',
        'type',
        'input_summary',
        'output_summary',
        'fitness_score',
        'generation_count',
        'execution_time_ms',
        'status',
    ];

    protected $casts = [
        'input_summary'  => 'array',
        'output_summary' => 'array',
        'fitness_score'  => 'float',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
