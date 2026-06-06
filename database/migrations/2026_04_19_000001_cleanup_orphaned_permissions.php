<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Artisan;

/**
 * Removes permissions that have no corresponding route guard, controller check,
 * or nav visibility function. These were legacy/placeholder permissions that
 * do not belong in this version of Deprixa Plus:
 *
 *  - manage settings   (never used in routes or controllers)
 *  - manage users      (nav now uses customers.access; no route check)
 *  - view organizations (no route or nav check)
 *  - manage saas billing (no route check; only view saas billing is gated)
 *  - recharge wallet   (no route check)
 *
 * After deleting, re-runs the seeder to ensure roles are consistent.
 */
return new class extends Migration
{
    private array $toRemove = [
        'manage settings',
        'manage users',
        'view organizations',
        'manage saas billing',
        'recharge wallet',
        'manage organizations',       // super-admin-only; route guard changed to role:super-admin
        'view saas billing',          // premium billing portal; route guard changed to role:super-admin
        'settings.api.view',          // premium API management — removed from Plus edition
        'settings.api.tokens.manage', // premium
        'settings.api.clients.manage',// premium
        'settings.api.webhooks.manage',// premium
        'settings.api.logs.view',     // premium
    ];

    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        foreach ($this->toRemove as $name) {
            $perm = Permission::findByName($name, 'web');
            if ($perm) {
                $perm->delete();
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Artisan::call('db:seed', [
            '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
            '--force' => true,
        ]);
    }

    public function down(): void
    {
        // Permissions are not restored on rollback — re-run seeder if needed.
    }
};
