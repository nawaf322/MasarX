<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pre_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('locker_id')->nullable()->constrained('lockers')->nullOnDelete();

            // Store / purchase info
            $table->string('store_name')->comment('Name of the online store, e.g. Amazon, eBay');
            $table->string('store_tracking_number')->comment('Tracking number provided by the store');
            $table->string('store_url', 500)->nullable();

            // Package info declared by customer
            $table->decimal('declared_value', 12, 2)->default(0);
            $table->string('declared_currency', 3)->default('USD');
            $table->decimal('declared_weight_kg', 8, 2)->nullable();
            $table->text('description')->nullable()->comment('Product/content description');
            $table->text('notes')->nullable();

            // PDF invoice parsing
            $table->json('invoice_data')->nullable()
                ->comment('Data extracted from purchase invoice PDF: items[], total, currency, store');

            // Lifecycle
            $table->enum('status', ['pending', 'received', 'processing', 'converted', 'cancelled'])
                ->default('pending');
            $table->timestamp('received_at')->nullable()->comment('When physically received at warehouse');
            $table->timestamp('converted_at')->nullable()->comment('When converted to a real Shipment');

            // Bridge to Shipment core — set when PreAlertService::convertToShipment() runs
            $table->foreignId('shipment_id')->nullable()->constrained('shipments')->nullOnDelete();

            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'customer_id']);
            $table->index(['organization_id', 'locker_id']);
            $table->index('store_tracking_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pre_alerts');
    }
};
