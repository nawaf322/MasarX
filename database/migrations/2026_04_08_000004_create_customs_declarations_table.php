<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customs_declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('declaration_type')->default('gift');
            $table->json('items');
            $table->decimal('declared_value', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->boolean('insurance_required')->default(false);
            $table->decimal('insurance_value', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('shipment_id');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customs_declarations');
    }
};
