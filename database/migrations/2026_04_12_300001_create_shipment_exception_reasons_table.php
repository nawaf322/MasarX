<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_exception_reasons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->index();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['organization_id', 'is_active']);
        });

        // Seed global (organization_id = null) default reasons
        $now = now();
        DB::table('shipment_exception_reasons')->insert([
            ['organization_id' => null, 'name' => 'Incorrect address',      'slug' => 'incorrect_address',      'is_active' => true, 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['organization_id' => null, 'name' => 'Weather conditions',     'slug' => 'weather_conditions',     'is_active' => true, 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['organization_id' => null, 'name' => 'Federal Holidays',       'slug' => 'federal_holidays',       'is_active' => true, 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['organization_id' => null, 'name' => 'Damage during transit',  'slug' => 'damage_during_transit',  'is_active' => true, 'sort_order' => 4, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_exception_reasons');
    }
};
