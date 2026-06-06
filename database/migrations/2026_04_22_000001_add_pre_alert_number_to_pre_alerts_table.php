<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pre_alerts', function (Blueprint $table) {
            $table->string('pre_alert_number', 30)->nullable()->after('id')
                ->comment('Human-readable pre-alert number, e.g. PA-2026-00001');
            $table->index(['organization_id', 'pre_alert_number']);
        });
    }

    public function down(): void
    {
        Schema::table('pre_alerts', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'pre_alert_number']);
            $table->dropColumn('pre_alert_number');
        });
    }
};
