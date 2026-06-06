<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 9: Additional performance indexes.
 *
 * 1. commissions: composite (organization_id, status, created_at)
 *    → speeds up date-range + status filter queries in CommissionController and FinanceService
 *
 * 2. return_shipments: created_by index
 *    → FK exists but explicit index improves filtering by creator
 *
 * 3. shipments: cod_collected_by index
 *    → FK exists but explicit index improves COD collector lookups
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->index(
                ['organization_id', 'status', 'created_at'],
                'commissions_org_status_created_idx'
            );
        });

        if (Schema::hasTable('return_shipments')) {
            Schema::table('return_shipments', function (Blueprint $table) {
                if (Schema::hasColumn('return_shipments', 'created_by')) {
                    $table->index('created_by', 'return_shipments_created_by_idx');
                }
            });
        }

        if (Schema::hasTable('shipments') && Schema::hasColumn('shipments', 'cod_collected_by')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->index('cod_collected_by', 'shipments_cod_collected_by_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->dropIndex('commissions_org_status_created_idx');
        });

        if (Schema::hasTable('return_shipments')) {
            Schema::table('return_shipments', function (Blueprint $table) {
                $table->dropIndex('return_shipments_created_by_idx');
            });
        }

        if (Schema::hasTable('shipments')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->dropIndex('shipments_cod_collected_by_idx');
            });
        }
    }
};
