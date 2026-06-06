<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->decimal('balance', 12, 2)->default(0.00);
            $table->string('currency', 3)->default('SAR');
            $table->timestamp('last_recharged_at')->nullable();
            $table->timestamp('last_debited_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->index('organization_id');
        });

        Schema::create('customer_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('customer_wallets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['credit', 'debit', 'refund', 'hold']);
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_before', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->string('description');
            $table->string('reference')->nullable();
            $table->string('payment_method')->nullable(); // mada, apple_pay, bank_transfer, stripe, manual, system
            $table->foreignId('shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_wallet_transactions');
        Schema::dropIfExists('customer_wallets');
    }
};
