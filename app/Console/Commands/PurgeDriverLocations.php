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

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeDriverLocations extends Command
{
    /**
     * driver_locations grows indefinitely with GPS tracking data.
     * This command removes records older than the configured retention period.
     * Schedule it daily in bootstrap/app.php or app/Console/Kernel.php.
     *
     * Default retention: 30 days.
     * Override via: DRIVER_LOCATION_RETENTION_DAYS env variable.
     */
    protected $signature = 'driver-locations:purge {--days= : Retention period in days (default: 30)}';
    protected $description = 'Purge GPS driver location records older than the retention period';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? env('DRIVER_LOCATION_RETENTION_DAYS', 30));

        if ($days < 1) {
            $this->error('Retention period must be at least 1 day.');
            return self::FAILURE;
        }

        $cutoff = now()->subDays($days);

        $deleted = DB::table('driver_locations')
            ->where('captured_at', '<', $cutoff)
            ->delete();

        $this->info("Purged {$deleted} driver_locations records older than {$days} days (before {$cutoff->toDateTimeString()}).");

        return self::SUCCESS;
    }
}
