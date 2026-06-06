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

class PurgeAuditLogs extends Command
{
    /**
     * audit_logs grows with every admin action. This command prunes records
     * older than the configured retention period.
     *
     * Default retention: 365 days (1 year).
     * Override via: AUDIT_LOG_RETENTION_DAYS env variable.
     */
    protected $signature = 'audit-logs:purge {--days= : Retention period in days (default: 365)}';
    protected $description = 'Purge audit_log records older than the retention period';

    public function handle(): int
    {
        $days   = (int) ($this->option('days') ?? env('AUDIT_LOG_RETENTION_DAYS', 365));
        $cutoff = now()->subDays($days);

        $deleted = DB::table('audit_logs')
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Purged {$deleted} audit_logs older than {$days} days.");

        return self::SUCCESS;
    }
}
