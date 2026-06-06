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
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AppDoctorCommand extends Command
{
    protected $signature = 'app:doctor';
    protected $description = 'Verify critical tables and columns exist. Fails if schema is incomplete.';

    private array $errors = [];

    public function handle(): int
    {
        $this->info('Checking schema integrity...');

        $this->checkTable('shipments');
        $this->checkTable('shipment_packages');
        $this->checkTable('shipment_package_items');
        $this->checkTable('rate_cards');
        $this->checkTable('rate_zones');
        $this->checkTable('rate_rules');
        $this->checkTable('organization_settings');
        $this->checkTable('numbering_sequences');
        $this->checkTable('shipment_statuses');
        $this->checkTable('shipment_histories');
        $this->checkTable('integration_request_logs');
        $this->checkTable('carrier_accounts');

        $this->checkColumn('rate_zones', 'origin_any');
        $this->checkColumn('rate_zones', 'dest_any');
        $this->checkColumn('rate_rules', 'price_per_kg');
        $this->checkColumn('shipments', 'status_id');
        $this->checkColumn('shipment_histories', 'status_id');

        if (!empty($this->errors)) {
            $this->newLine();
            $this->error('Schema check FAILED. Run: php artisan migrate');
            foreach ($this->errors as $e) {
                $this->error('  - ' . $e);
            }
            return 1;
        }

        $this->info('OK — Schema is consistent.');
        return 0;
    }

    private function checkTable(string $table): void
    {
        if (!Schema::hasTable($table)) {
            $this->errors[] = "Missing table: {$table}";
        }
    }

    private function checkColumn(string $table, string $column): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }
        if (!Schema::hasColumn($table, $column)) {
            $this->errors[] = "Missing column: {$table}.{$column}";
        }
    }
}
