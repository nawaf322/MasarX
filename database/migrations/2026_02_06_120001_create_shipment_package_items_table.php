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
        Schema::create('shipment_package_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_package_id')->constrained('shipment_packages')->cascadeOnDelete();
            $table->string('description', 500)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_value', 12, 2)->default(0);
            $table->decimal('total_value', 12, 2)->default(0);
            $table->decimal('weight', 10, 3)->nullable();
            $table->string('sku', 100)->nullable();
            $table->timestamps();

            $table->index('shipment_package_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_package_items');
    }
};
