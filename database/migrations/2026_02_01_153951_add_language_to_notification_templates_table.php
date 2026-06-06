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
     */
    public function up(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('notification_templates', 'language')) {
                $table->string('language', 5)->default('en')->after('event_key');
            }
        });

        // Raw SQL to handle indexes robustly on MySQL
        try {
            DB::statement("ALTER TABLE notification_templates DROP INDEX org_chan_event_unique");
        } catch (\Exception $e) {
            // Check if it's "check that column/key exists" error - ignore
        }

        try {
            DB::statement("ALTER TABLE notification_templates DROP INDEX notification_templates_organization_id_channel_event_key_unique");
        } catch (\Exception $e) {
            // Ignore
        }

        try {
            DB::statement("ALTER TABLE notification_templates ADD UNIQUE INDEX org_chan_evt_lang_unique (organization_id, channel, event_key, language)");
        } catch (\Exception $e) {
            // Ignore if exists
        }
    }

    public function down(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'channel', 'event_key', 'language']);
            $table->dropColumn('language');
            $table->unique(['organization_id', 'channel', 'event_key']); // Restore old unique
        });
    }
};
