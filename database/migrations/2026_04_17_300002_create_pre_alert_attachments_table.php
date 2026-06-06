<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pre_alert_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pre_alert_id')->constrained('pre_alerts')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['purchase_invoice', 'product_photo', 'other'])->default('purchase_invoice');
            $table->string('path');
            $table->string('original_name', 500)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size')->nullable()->comment('File size in bytes');
            $table->boolean('invoice_parsed')->default(false)->comment('True if invoice_data was extracted from this file');
            $table->timestamps();

            $table->index(['pre_alert_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pre_alert_attachments');
    }
};
