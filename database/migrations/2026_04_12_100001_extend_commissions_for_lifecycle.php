<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends commissions table with:
 * - trigger_event: what operational event created this commission
 * - reversed_at / reversal_reason / parent_commission_id: for reversal records
 *
 * Extends commission_rules table with:
 * - trigger_on: when to calculate (on_creation, on_delivery, on_cod_remittance)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->enum('trigger_event', [
                'shipment_created',
                'shipment_delivered',
                'cod_collected',
                'cod_remitted',
                'pickup_completed',
                'manual',
            ])->default('shipment_created')->after('notes');

            $table->timestamp('reversed_at')->nullable()->after('trigger_event');
            $table->text('reversal_reason')->nullable()->after('reversed_at');
            $table->foreignId('parent_commission_id')
                ->nullable()
                ->after('reversal_reason')
                ->references('id')->on('commissions')
                ->nullOnDelete();
        });

        Schema::table('commission_rules', function (Blueprint $table) {
            $table->enum('trigger_on', [
                'on_creation',
                'on_delivery',
                'on_cod_remittance',
                'on_pickup_completion',
            ])->default('on_creation')->after('priority')
              ->comment('When to calculate this commission relative to shipment lifecycle');
        });
    }

    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->dropColumn(['trigger_event', 'reversed_at', 'reversal_reason', 'parent_commission_id']);
        });
        Schema::table('commission_rules', function (Blueprint $table) {
            $table->dropColumn('trigger_on');
        });
    }
};
