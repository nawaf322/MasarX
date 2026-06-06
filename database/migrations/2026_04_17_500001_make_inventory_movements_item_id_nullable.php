<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make inventory_movements.item_id nullable.
 *
 * Locker/casillero warehouse receipts are NOT inventory items (no SKU exists).
 * The original NOT NULL constraint makes markReceived() crash when receiving
 * a pre-alert package. Making it nullable allows the intake movement to be
 * created without an item; the shipment_id FK is sufficient for traceability.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            // Drop the FK first, change to nullable, then re-add FK allowing NULL
            $table->dropForeign('inventory_movements_item_id_foreign');
            $table->foreignId('item_id')->nullable()->change();
            $table->foreign('item_id')
                  ->references('id')
                  ->on('inventory_items')
                  ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropForeign('inventory_movements_item_id_foreign');
            $table->foreignId('item_id')->nullable(false)->change();
            $table->foreign('item_id')
                  ->references('id')
                  ->on('inventory_items')
                  ->cascadeOnDelete();
        });
    }
};
