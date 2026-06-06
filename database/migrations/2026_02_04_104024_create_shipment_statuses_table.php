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
        Schema::create('shipment_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code'); // slug: pending, delivered, etc.
            $table->string('name'); // Nombre traducible: "Pending", "Delivered"
            $table->string('icon')->default('circle'); // Nombre del ícono de lucide-react
            $table->string('color', 7)->default('#6B7280'); // Color hex para el badge
            $table->integer('order')->default(0); // Orden de visualización
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Índices
            $table->index(['organization_id', 'is_active']);
            $table->index('code');
            // Índice único compuesto: código único por organización
            $table->unique(['organization_id', 'code'], 'org_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_statuses');
    }
};
