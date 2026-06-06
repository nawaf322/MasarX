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

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds origin_any/dest_any to support wildcard zones when origin_country_id/dest_country_id are NOT NULL.
     * When origin_any=1, the zone matches any origin country.
     */
    public function up(): void
    {
        Schema::table('rate_zones', function (Blueprint $table) {
            $table->boolean('origin_any')->default(false)->after('origin_country_id');
            $table->boolean('dest_any')->default(false)->after('dest_country_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rate_zones', function (Blueprint $table) {
            $table->dropColumn(['origin_any', 'dest_any']);
        });
    }
};
