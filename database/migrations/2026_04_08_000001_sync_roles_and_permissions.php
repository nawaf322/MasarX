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
 * Re-runs RolesAndPermissionsSeeder safely on every update.
 *
 * Purpose: when a new version adds new permissions or roles, existing
 * customers who apply the update via Settings > Updates get those
 * permissions automatically without losing any existing data.
 *
 * Safe because RolesAndPermissionsSeeder uses firstOrCreate() for every
 * permission and role — running it multiple times is idempotent.
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
        // Intentionally empty — permissions are additive and safe to keep.
    }
};
