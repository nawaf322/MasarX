<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the two_factor_enabled boolean column to the users table.
 *
 * This column is referenced in:
 *   - App\Models\User::$fillable and $casts (boolean)
 *   - App\Http\Controllers\TwoFactorAuthenticationController::verify()
 *   - App\Http\Middleware\Enforce2faLock (reads the value to enforce 2FA requirement)
 *
 * Without this column in the DB, two_factor_enabled reads as NULL (2FA appears
 * never enabled) and writes via forceFill()->save() silently have no effect.
 * This was identified as a broken feature in the April 2026 production audit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')
                      ->default(false)
                      ->after('must_change_password');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->dropColumn('two_factor_enabled');
            }
        });
    }
};
