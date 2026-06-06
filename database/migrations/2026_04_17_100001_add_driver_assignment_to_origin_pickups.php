<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('origin_pickups', function (Blueprint $table) {
            // Driver assigned to execute this pickup
            $table->foreignId('driver_id')
                  ->nullable()
                  ->after('confirmed_by')
                  ->constrained('users')
                  ->nullOnDelete();

            // When the driver was assigned
            $table->timestamp('assigned_at')->nullable()->after('driver_id');

            // When the in-app/push notification was sent to the driver
            $table->timestamp('driver_notified_at')->nullable()->after('assigned_at');

            $table->index('driver_id', 'origin_pickups_driver_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('origin_pickups', function (Blueprint $table) {
            $table->dropForeign(['driver_id']);
            $table->dropIndex('origin_pickups_driver_id_index');
            $table->dropColumn(['driver_id', 'assigned_at', 'driver_notified_at']);
        });
    }
};
