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
        // Countries
        Schema::table('countries', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('id');
            $table->index('organization_id');
            // Unique constraint: name unique per organization
            // Note: unique with nullable column allows multiple nulls in MySQL.
            // If data is strictly tenant-based, this works.
            $table->unique(['organization_id', 'name']);
        });

        // States
        Schema::table('states', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('id');
            $table->index('organization_id');
            // Unique constraint: name unique per organization + country
            // Dropping previous unique if exists? Previous was unique(['country_id', 'name']).
            // We should drop it and add the new one.
            $table->dropUnique(['country_id', 'name']);
            $table->unique(['organization_id', 'country_id', 'name']);
        });

        // Cities
        Schema::table('cities', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('id');
            $table->index('organization_id');
            // Index recommendation from user: unique(organization_id, state_id, name)
            $table->unique(['organization_id', 'state_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'name']);
            $table->dropColumn('organization_id');
        });

        Schema::table('states', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'country_id', 'name']);
            $table->dropColumn('organization_id');
            $table->unique(['country_id', 'name']); // Restore old unique
        });

        Schema::table('cities', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'state_id', 'name']);
            $table->dropColumn('organization_id');
        });
    }
};
