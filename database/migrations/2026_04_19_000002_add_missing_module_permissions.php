<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

/**
 * Adds permissions for modules that had no permission guards in v1.3.0:
 *
 *  - contracts.view / contracts.create / contracts.manage
 *  - locations.view / locations.manage
 *  - settings.shipment-statuses.view / settings.shipment-statuses.manage
 *  - settings.services.view / settings.services.manage
 *  - settings.updates.view
 *
 * Assigns them to admin (all) and Employee (view/create subset).
 * Super-admin receives all via Permission::all() sync in seeder.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('db:seed', [
            '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
            '--force' => true,
        ]);
    }

    public function down(): void
    {
        // Permissions are additive — no rollback.
    }
};
