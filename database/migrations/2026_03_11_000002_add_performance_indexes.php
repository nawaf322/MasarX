<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PERFORMANCE FIX: Índices faltantes en tablas de alta frecuencia.
 *
 * Tablas afectadas (con justificación):
 *  - users              : organization_id + branch_id filtrados en cada request autenticado
 *  - shipment_histories : shipment_id + organization_id sin índice compuesto; usados en tracking
 *  - manifests          : organization_id + status + driver_id filtrados en Dispatch y API
 *  - personal_access_tokens : token buscado en CADA request API autenticado
 *
 * Tablas con índices YA OK (no se tocan):
 *  - shipments         : [tracking_number, organization_id], status ✅
 *  - payments          : [shipment_id, organization_id] ✅
 *  - shipment_packages : [shipment_id, organization_id] ✅
 *  - shipment_activities: [shipment_id, created_at] ✅
 *  - shipment_statuses : [organization_id, is_active], code ✅
 *  - rate_rules        : [organization_id, rate_card_id, rate_zone_id] ✅
 *  - audit_logs        : [organization_id, module], created_at ✅
 *  - warehouses        : organization_id ✅
 *  - driver_locations  : [driver_id, captured_at] ✅
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── users ────────────────────────────────────────────────────────────
        // organization_id: filtrando cada query con BelongsToTenant scope
        // branch_id: JOIN frecuente en FinanceController y DashboardController
        Schema::table('users', function (Blueprint $table) {
            if (!$this->hasIndex('users', 'users_organization_id_index')) {
                $table->index('organization_id', 'users_organization_id_index');
            }
            if (!$this->hasIndex('users', 'users_branch_id_index')) {
                $table->index('branch_id', 'users_branch_id_index');
            }
            if (!$this->hasIndex('users', 'users_is_active_index')) {
                $table->index('is_active', 'users_is_active_index');
            }
        });

        // ─── shipment_histories ──────────────────────────────────────────────
        // shipment_id tiene FK (crea índice implícito en InnoDB) pero sin índice compuesto
        // organization_id: usado en scopes y filtros
        Schema::table('shipment_histories', function (Blueprint $table) {
            if (!$this->hasIndex('shipment_histories', 'shipment_histories_org_created_index')) {
                $table->index(['organization_id', 'created_at'], 'shipment_histories_org_created_index');
            }
        });

        // ─── manifests ───────────────────────────────────────────────────────
        // Dispatch y API filtran por organization_id + status + driver_id constantemente
        // Guard: tabla opcional — no presente en instalación básica
        if (Schema::hasTable('manifests')) {
            Schema::table('manifests', function (Blueprint $table) {
                if (!$this->hasIndex('manifests', 'manifests_org_status_index')) {
                    $table->index(['organization_id', 'status'], 'manifests_org_status_index');
                }
                if (!$this->hasIndex('manifests', 'manifests_driver_status_index')) {
                    $table->index(['driver_id', 'status'], 'manifests_driver_status_index');
                }
            });
        }

        // ─── personal_access_tokens ──────────────────────────────────────────
        // El campo 'token' (hash SHA-256) es buscado en CADA request API.
        // Sanctum crea el índice unique por defecto; este bloque es sólo safety-net.
        // organization_id NO existe en la tabla estándar de Sanctum — no se indexa aquí.
        if (Schema::hasTable('personal_access_tokens')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                if (!$this->hasIndex('personal_access_tokens', 'personal_access_tokens_token_unique')) {
                    $table->unique('token', 'personal_access_tokens_token_unique');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndexIfExists('users_organization_id_index');
            $table->dropIndexIfExists('users_branch_id_index');
            $table->dropIndexIfExists('users_is_active_index');
        });

        Schema::table('shipment_histories', function (Blueprint $table) {
            $table->dropIndexIfExists('shipment_histories_org_created_index');
        });

        if (Schema::hasTable('manifests')) {
            Schema::table('manifests', function (Blueprint $table) {
                $table->dropIndexIfExists('manifests_org_status_index');
                $table->dropIndexIfExists('manifests_driver_status_index');
            });
        }

        if (Schema::hasTable('personal_access_tokens')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $table->dropIndexIfExists('personal_access_tokens_token_unique');
            });
        }
    }

    /**
     * Helper: check if an index exists — database-agnostic (MySQL + SQLite compatible).
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        $driver = \Illuminate\Support\Facades\DB::getDriverName();

        if ($driver === 'sqlite') {
            // SQLite: query sqlite_master for the index name
            return collect(\Illuminate\Support\Facades\DB::select(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND name=?",
                [$table, $indexName]
            ))->isNotEmpty();
        }

        // MySQL / MariaDB
        return collect(\Illuminate\Support\Facades\DB::select(
            "SHOW INDEX FROM `{$table}` WHERE Key_name = ?",
            [$indexName]
        ))->isNotEmpty();
    }
};
