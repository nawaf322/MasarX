<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Phase 2 — Domain Model Normalization
 *
 * 1. Adds commission_status column to commissions table
 * 2. Adds return_status column to return_shipments table
 * 3. Adds financial_status column to shipments table
 *
 * NOTE: New lifecycle status codes (draft, quoted, confirmed, pending_pickup,
 * received_at_warehouse, sorted, return_requested, return_in_transit) are seeded
 * via ShipmentStatusSeeder — shipment_statuses.organization_id is NOT NULL (per-org).
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. commission_status on commissions table ─────────────────────────
        if (Schema::hasTable('commissions') && !Schema::hasColumn('commissions', 'commission_status')) {
            Schema::table('commissions', function (Blueprint $table) {
                $table->string('commission_status', 32)->default('pending')->after('status');
                $table->index('commission_status');
            });

            DB::table('commissions')->update([
                'commission_status' => DB::raw('status'),
            ]);
        }

        // ── 2. return_status on return_shipments table ────────────────────────
        if (Schema::hasTable('return_shipments') && !Schema::hasColumn('return_shipments', 'return_status')) {
            Schema::table('return_shipments', function (Blueprint $table) {
                $table->string('return_status', 32)->default('requested')->after('status');
                $table->index('return_status');
            });

            DB::table('return_shipments')->update([
                'return_status' => DB::raw("COALESCE(status, 'requested')"),
            ]);
        }

        // ── 3. financial_status on shipments ──────────────────────────────────
        if (Schema::hasTable('shipments') && !Schema::hasColumn('shipments', 'financial_status')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->string('financial_status', 32)->nullable()->after('payment_status');
                $table->index('financial_status');
            });

            DB::statement("
                UPDATE shipments
                SET financial_status = CASE
                    WHEN payment_status = 'paid'     THEN 'paid'
                    WHEN payment_status = 'partial'  THEN 'partial'
                    WHEN payment_status = 'unpaid'   THEN 'unpaid'
                    WHEN payment_status = 'refunded' THEN 'refunded'
                    WHEN payment_status = 'cod'      THEN 'cod'
                    ELSE payment_status
                END
                WHERE financial_status IS NULL
            ");
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('commissions', 'commission_status')) {
            Schema::table('commissions', fn ($t) => $t->dropColumn('commission_status'));
        }
        if (Schema::hasColumn('return_shipments', 'return_status')) {
            Schema::table('return_shipments', fn ($t) => $t->dropColumn('return_status'));
        }
        if (Schema::hasColumn('shipments', 'financial_status')) {
            Schema::table('shipments', fn ($t) => $t->dropColumn('financial_status'));
        }
    }
};
