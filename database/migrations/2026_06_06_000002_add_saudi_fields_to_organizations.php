<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (!Schema::hasColumn('organizations', 'vat_number')) {
                $table->string('vat_number', 15)->nullable()->after('tax_id');
            }
            if (!Schema::hasColumn('organizations', 'commercial_registration')) {
                $table->string('commercial_registration', 20)->nullable()->after('vat_number');
            }
            if (!Schema::hasColumn('organizations', 'national_address')) {
                $table->json('national_address')->nullable()->after('commercial_registration');
            }
            if (!Schema::hasColumn('organizations', 'vat_enabled')) {
                $table->boolean('vat_enabled')->default(true)->after('national_address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['vat_number', 'commercial_registration', 'national_address', 'vat_enabled']);
        });
    }
};
