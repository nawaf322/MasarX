<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commission_rules', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->decimal('min_amount', 10, 2)->nullable()->after('rate')->comment('Min shipment total to apply rule');
            $table->decimal('max_amount', 10, 2)->nullable()->after('min_amount')->comment('Max shipment total (null = no cap)');
            $table->unsignedSmallInteger('priority')->default(0)->after('max_amount')->comment('Higher = evaluated first');
        });
    }

    public function down(): void
    {
        Schema::table('commission_rules', function (Blueprint $table) {
            $table->dropColumn(['description', 'min_amount', 'max_amount', 'priority']);
        });
    }
};
