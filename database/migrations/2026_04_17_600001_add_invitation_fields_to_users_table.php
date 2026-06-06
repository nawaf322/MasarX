<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Invitation system for user onboarding.
 *
 * When an admin creates a customer/employee/driver, the system generates a
 * secure token and sends an invitation email. The user clicks the link,
 * sets their own password, and their account is activated — the admin
 * never sees or handles the user's password.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('invitation_token', 100)->nullable()->unique()->after('password');
            $table->timestamp('invitation_sent_at')->nullable()->after('invitation_token');
            $table->timestamp('invitation_accepted_at')->nullable()->after('invitation_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['invitation_token']);
            $table->dropColumn(['invitation_token', 'invitation_sent_at', 'invitation_accepted_at']);
        });
    }
};
