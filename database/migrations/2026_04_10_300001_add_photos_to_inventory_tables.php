<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add photos to inventory items (product images)
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->json('photos')->nullable()->after('description');
        });

        // Add photos to inventory locations (shelf/zone photos)
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->json('photos')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn('photos');
        });
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->dropColumn('photos');
        });
    }
};
