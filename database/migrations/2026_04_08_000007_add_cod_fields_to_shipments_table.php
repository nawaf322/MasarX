<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->boolean('is_cod')->default(false)->after('payment_status');
            $table->decimal('cod_amount', 12, 2)->nullable()->after('is_cod');
            $table->string('cod_currency', 3)->nullable()->after('cod_amount');
            $table->enum('cod_status', ['pending', 'collected', 'remitted'])->nullable()->after('cod_currency');
            $table->timestamp('cod_collected_at')->nullable()->after('cod_status');
            $table->foreignId('cod_collected_by')->nullable()->constrained('users')->nullOnDelete()->after('cod_collected_at');
            $table->index(['organization_id', 'is_cod', 'cod_status']);
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['cod_collected_by']);
            $table->dropIndex(['organization_id', 'is_cod', 'cod_status']);
            $table->dropColumn(['is_cod', 'cod_amount', 'cod_currency', 'cod_status', 'cod_collected_at', 'cod_collected_by']);
        });
    }
};
