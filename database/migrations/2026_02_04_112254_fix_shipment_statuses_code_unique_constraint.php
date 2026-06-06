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

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * IDEMPOTENT: Transition from unique(code) to unique(organization_id, code).
     * create_shipment_statuses already has org_code_unique; this handles older schemas.
     */
    public function up(): void
    {
        $table = 'shipment_statuses';

        // 1. Drop old unique on 'code' only if it exists (Laravel names it shipment_statuses_code_unique)
        if ($this->hasIndex($table, 'shipment_statuses_code_unique')) {
            try {
                DB::statement("ALTER TABLE `{$table}` DROP INDEX `shipment_statuses_code_unique`");
            } catch (\Exception $e) {
                // Ignore
            }
        }

        // 2. Create org_code_unique only if it does not exist
        if (!$this->hasIndex($table, 'org_code_unique')) {
            Schema::table($table, function (Blueprint $t) {
                $t->unique(['organization_id', 'code'], 'org_code_unique');
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql') {
            $rows = DB::select("SELECT 1 FROM information_schema.STATISTICS WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1", [
                DB::getDatabaseName(),
                $table,
                $indexName,
            ]);
            return !empty($rows);
        }
        if ($driver === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list(`{$table}`)");
            foreach ($indexes as $idx) {
                if (($idx->name ?? '') === $indexName) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    public function down(): void
    {
        if ($this->hasIndex('shipment_statuses', 'org_code_unique')) {
            Schema::table('shipment_statuses', function (Blueprint $t) {
                $t->dropUnique('org_code_unique');
            });
        }
    }
};
