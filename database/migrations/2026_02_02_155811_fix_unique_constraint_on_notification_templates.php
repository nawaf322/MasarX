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

return new class extends Migration {
    /**
     * Run the migrations.
     * IDEMPOTENT: org_chan_evt_lang_unique may already exist from add_language migration.
     */
    public function up(): void
    {
        // 1–2. Drop OLD indexes — use Schema::table (cross-DB: MySQL + SQLite)
        //      then fall back to raw SQL for MySQL only.
        foreach (['org_chan_event_unique', 'notification_templates_organization_id_channel_event_key_unique'] as $idx) {
            // Schema::table path (works for SQLite and MySQL)
            try {
                if ($this->hasIndex('notification_templates', $idx)) {
                    Schema::table('notification_templates', function (Blueprint $table) use ($idx) {
                        $table->dropUnique($idx);
                    });
                }
            } catch (\Exception $e) {
                // Fall back to raw SQL (MySQL only)
                try {
                    DB::statement("ALTER TABLE notification_templates DROP INDEX `{$idx}`");
                } catch (\Exception $e2) {
                    // Index might not exist — continue
                }
            }
        }

        // 3. Drop target index only if we plan to recreate (avoids duplicate if add_language already created it)
        $recreate = !$this->hasIndex('notification_templates', 'org_chan_evt_lang_unique');
        if (!$recreate) {
            return; // Index already exists from add_language, nothing to do
        }

        try {
            DB::statement("ALTER TABLE notification_templates DROP INDEX org_chan_evt_lang_unique");
        } catch (\Exception $e) {
            // Continue
        }

        // 4. CLEANUP DUPLICATES (MySQL-only)
        if (DB::connection()->getDriverName() === 'mysql') {
            try {
                DB::statement("
                    DELETE t1 FROM notification_templates t1
                    INNER JOIN notification_templates t2
                    ON t1.organization_id = t2.organization_id
                    AND t1.channel = t2.channel
                    AND t1.event_key = t2.event_key
                    AND t1.language = t2.language
                    AND t1.id < t2.id
                ");
            } catch (\Exception $e) {
                // Continue
            }
        }

        // 5. Create index only if missing
        if (!$this->hasIndex('notification_templates', 'org_chan_evt_lang_unique')) {
            Schema::table('notification_templates', function (Blueprint $table) {
                $table->unique(['organization_id', 'channel', 'event_key', 'language'], 'org_chan_evt_lang_unique');
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql') {
            $rows = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]);
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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the old incorrect state (optional, or just drop the new one)
        Schema::table('notification_templates', function (Blueprint $table) {
            $table->dropUnique('org_chan_evt_lang_unique');
            $table->unique(['organization_id', 'channel', 'event_key'], 'org_chan_event_unique');
        });
    }
};
