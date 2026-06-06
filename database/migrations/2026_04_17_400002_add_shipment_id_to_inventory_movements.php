<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds direct shipment_id FK to inventory_movements.
 *
 * Previously only the polymorphic (reference_type/reference_id) pair existed.
 * That pair is kept intact for legacy movements.
 * shipment_id provides a direct, indexed FK for trazabilidad:
 * - when a pre_alert is received → movement.shipment_id is NULL (pre_alert not yet converted)
 * - after PreAlertService::convertToShipment() → movement.shipment_id filled
 * - for direct warehouse receipts → movement.shipment_id filled immediately
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->foreignId('shipment_id')->nullable()->after('reference_id')
                ->constrained('shipments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropForeign(['shipment_id']);
            $table->dropColumn('shipment_id');
        });
    }
};
