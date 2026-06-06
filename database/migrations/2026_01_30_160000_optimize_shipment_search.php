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

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Virtual Columns for JSON indexing (High Performance Search)
            // We strip quotes with the ->> operator (JSON_UNQUOTE(JSON_EXTRACT(...)))

            // Check if column exists first to be safe, though unlikely collision
            if (!Schema::hasColumn('shipments', 'sender_name_search')) {
                $table->string('sender_name_search')->virtualAs('sender_details->>"$.name"')->after('sender_details');
                $table->index('sender_name_search');
            }

            if (!Schema::hasColumn('shipments', 'receiver_name_search')) {
                $table->string('receiver_name_search')->virtualAs('receiver_details->>"$.name"')->after('receiver_details');
                $table->index('receiver_name_search');
            }

            // Also ensure tracking_number is individually indexed if not already covered by composite
            // (It is covered by tracking_number+org_id composite, but single index can help pure tracking lookup)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropIndex(['sender_name_search']);
            $table->dropIndex(['receiver_name_search']);
            $table->dropColumn(['sender_name_search', 'receiver_name_search']);
        });
    }
};
