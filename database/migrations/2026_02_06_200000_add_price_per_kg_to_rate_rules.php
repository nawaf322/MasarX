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
     * Adds price_per_kg for consistent internal calculation in KG.
     * Convention: LocalCarrierAdapter uses KG/CM; price_per_lb is legacy.
     * If price_per_kg exists -> use it. Else convert price_per_lb (price_per_kg = price_per_lb * 2.2046226218).
     */
    public function up(): void
    {
        Schema::table('rate_rules', function (Blueprint $table) {
            $table->decimal('price_per_kg', 10, 2)->nullable()->after('price_per_lb');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rate_rules', function (Blueprint $table) {
            $table->dropColumn('price_per_kg');
        });
    }
};
