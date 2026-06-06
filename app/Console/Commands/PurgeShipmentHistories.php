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

class PurgeShipmentHistories extends Command
{
    /**
     * shipment_histories accumulates a row per status transition per shipment.
     * For delivered/cancelled shipments older than the retention window these
     * are rarely needed and can be pruned to keep the table lean.
     *
     * Default retention: 180 days.
     * Override via: SHIPMENT_HISTORY_RETENTION_DAYS env variable.
     *
     * Only histories attached to shipments whose status is terminal
     * (delivered, cancelled, returned) are eligible for deletion, so that
     * active shipment audit trails are never touched.
     */
    protected $signature = 'shipment-histories:purge {--days= : Retention period in days (default: 180)}';
    protected $description = 'Purge shipment_histories for terminal shipments older than the retention period';

    public function handle(): int
    {
        $days   = (int) ($this->option('days') ?? env('SHIPMENT_HISTORY_RETENTION_DAYS', 180));
        $cutoff = now()->subDays($days);

        $terminalStatuses = ['delivered', 'cancelled', 'returned'];

        $deleted = DB::table('shipment_histories')
            ->where('created_at', '<', $cutoff)
            ->whereIn('status', $terminalStatuses)
            ->delete();

        $this->info("Purged {$deleted} shipment_histories (terminal statuses) older than {$days} days.");

        return self::SUCCESS;
    }
}
