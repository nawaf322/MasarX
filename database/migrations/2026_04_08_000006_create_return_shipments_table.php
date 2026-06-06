<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('original_shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->foreignId('return_shipment_id')->nullable()->constrained('shipments')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('return_number')->unique();
            $table->string('reason');
            $table->text('reason_notes')->nullable();
            $table->string('status')->default('requested');
            $table->decimal('refund_amount', 12, 2)->default(0);
            $table->string('refund_method')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'status']);
            $table->index('original_shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_shipments');
    }
};
