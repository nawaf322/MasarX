<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds casillero/locker bridge columns to shipments.
 *
 * origin_type: distinguishes standard courier shipments from locker-originated ones.
 * locker_id:   which locker this shipment was received at (nullable for standard shipments).
 * pre_alert_id: the pre-alert that originated this shipment (nullable for standard shipments).
 *
 * These columns NEVER break existing shipments — all nullable with no default change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->enum('origin_type', ['standard', 'locker'])->default('standard')->after('is_cod');
            $table->foreignId('locker_id')->nullable()->after('origin_type')
                ->constrained('lockers')->nullOnDelete();
            $table->foreignId('pre_alert_id')->nullable()->after('locker_id')
                ->constrained('pre_alerts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['locker_id']);
            $table->dropForeign(['pre_alert_id']);
            $table->dropColumn(['origin_type', 'locker_id', 'pre_alert_id']);
        });
    }
};
