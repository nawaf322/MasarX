<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 8: Add user_id + action indexes to audit_logs for faster filter queries.
 * The original migration already has (organization_id, module) and (created_at) indexes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            // Needed for "filter by user" queries in AuditController
            $table->index('user_id', 'audit_logs_user_id_index');
            // Needed for "filter by action" queries
            $table->index('action', 'audit_logs_action_index');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_user_id_index');
            $table->dropIndex('audit_logs_action_index');
        });
    }
};
