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
 * Adds missing module permissions for v1.3.0:
 * - pickups.view / pickups.create / pickups.manage
 * - pre-alerts.view / pre-alerts.create / pre-alerts.manage
 * - lockers.view / lockers.manage
 * - commissions.view / commissions.manage
 *
 * Also corrects the customer role (removes customers.access, adds pre-alert perms)
 * and grants new permissions to Employee and Admin roles.
 *
 * Re-runs the seeder which is idempotent (firstOrCreate / syncPermissions).
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
        // Permissions are additive; no rollback needed.
    }
};
