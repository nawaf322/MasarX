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
        Schema::create('rate_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rate_card_id')->constrained('rate_cards')->cascadeOnDelete();
            $table->foreignId('rate_zone_id')->constrained('rate_zones')->cascadeOnDelete();
            
            $table->string('service_type')->default('Standard'); // Air, Sea, etc.
            
            // Weight Range
            $table->decimal('min_weight', 10, 2)->default(0);
            $table->decimal('max_weight', 10, 2);
            
            // Pricing
            $table->decimal('price_per_lb', 10, 2)->nullable(); // Price per unit (lb/kg)
            $table->decimal('flat_price', 10, 2)->nullable(); // Fixed price if set
            
            // Fees & Surcharges
            $table->decimal('min_charge', 10, 2)->nullable();
            $table->decimal('fuel_surcharge_percent', 5, 2)->nullable()->default(0);
            $table->decimal('insurance_percent', 5, 2)->nullable()->default(0);
            $table->decimal('tax_percent', 5, 2)->nullable()->default(0);
            $table->decimal('handling_fee', 10, 2)->nullable()->default(0);
            
            $table->enum('rounding_rule', ['none', 'ceil', 'floor', 'nearest'])->default('none');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'rate_card_id', 'rate_zone_id']);
            $table->index(['min_weight', 'max_weight']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rate_rules');
    }
};
