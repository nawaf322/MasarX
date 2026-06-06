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
     */
    public function up(): void
    {
        Schema::create('rate_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->foreignId('origin_country_id')->constrained('countries');
            $table->foreignId('origin_state_id')->nullable()->constrained('states');
            $table->foreignId('origin_city_id')->nullable()->constrained('cities');
            $table->foreignId('dest_country_id')->constrained('countries');
            $table->foreignId('dest_state_id')->nullable()->constrained('states');
            $table->foreignId('dest_city_id')->nullable()->constrained('cities');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'active']);
            $table->index(['origin_country_id', 'dest_country_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rate_zones');
    }
};
