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
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Permissions for modules that do not exist in the basic version.
     * These have no corresponding web routes or their backing tables are absent.
     */
    private array $orphaned = [
        // Departments module — table not present in basic install
        'settings.departments.view',
        'settings.departments.store',
        'settings.departments.update',
        'settings.departments.destroy',

        // Integrations settings — no web route registered
        'settings.integrations.view',
        'settings.integrations.update',

        // API management settings — no web route registered
        'settings.api.view',
        'settings.api.tokens.manage',
        'settings.api.clients.manage',
        'settings.api.webhooks.manage',
        'settings.api.logs.view',

        // settings.billing.update — billing web routes only gate with .view; .update is unused
        'settings.billing.update',

        // Warehouse web module — no /warehouse web route registered
        'warehouse.access',

        // SaaS platform permissions — saas_* tables absent in basic version
        'manage saas billing',
        'view saas billing',
        'recharge wallet',

        // Platform admin (super org) permissions — no route registered
        'manage organizations',
        'view organizations',
    ];

    public function up(): void
    {
        // 1. Remove pivot rows first (role_has_permissions, model_has_permissions)
        $ids = DB::table('permissions')
            ->whereIn('name', $this->orphaned)
            ->where('guard_name', 'web')
            ->pluck('id');

        if ($ids->isNotEmpty()) {
            DB::table('role_has_permissions')->whereIn('permission_id', $ids)->delete();
            DB::table('model_has_permissions')->whereIn('permission_id', $ids)->delete();

            // 2. Delete the permissions themselves
            DB::table('permissions')
                ->whereIn('id', $ids)
                ->delete();
        }

        // Bust Spatie permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Re-create the permissions (without re-assigning to roles)
        $now = now();
        foreach ($this->orphaned as $name) {
            DB::table('permissions')->insertOrIgnore([
                'name'       => $name,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
