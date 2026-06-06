<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $role = Role::where('name', 'Customer')->orWhere('name', 'customer')->first();

        if (!$role) {
            return;
        }

        // Remove permissions that give customers access to admin areas
        $toRemove = [
            'customers.access',       // would allow accessing /customers (admin area)
            'dashboard.kpi.view',     // admin KPI dashboard — customers go to my-locker instead
            'dashboard.activity.view', // admin activity feed — customers go to my-locker instead
        ];

        foreach ($toRemove as $permName) {
            $perm = Permission::where('name', $permName)->first();
            if ($perm && $role->hasPermissionTo($perm)) {
                $role->revokePermissionTo($perm);
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $role = Role::where('name', 'Customer')->orWhere('name', 'customer')->first();

        if (!$role) {
            return;
        }

        $toRestore = ['customers.access', 'dashboard.kpi.view', 'dashboard.activity.view'];

        foreach ($toRestore as $permName) {
            $perm = Permission::where('name', $permName)->first();
            if ($perm) {
                $role->givePermissionTo($perm);
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
