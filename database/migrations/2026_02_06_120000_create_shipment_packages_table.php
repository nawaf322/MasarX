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
    public function up(): void
    {
        Schema::create('shipment_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->decimal('weight', 10, 3)->default(0);
            $table->unsignedInteger('pieces')->default(1);
            $table->decimal('declared_value', 12, 2)->default(0);
            $table->decimal('length', 8, 2)->nullable();
            $table->decimal('width', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->string('content_description', 500)->nullable();
            $table->decimal('volumetric_weight', 10, 3)->nullable();
            $table->decimal('chargeable_weight', 10, 3)->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('surcharges_total', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['shipment_id', 'organization_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_packages');
    }
};
