<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('tracking_number')->unique(); // e.g., DEP-123456

            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

            // JSON Columns for Address Snapshots (Historical Immutability)
            $table->json('sender_details'); // {name, phone, company, address, city, country, tax_id}
            $table->json('receiver_details'); // {name, phone, company, address, city, country}
            $table->json('package_details'); // {weight, dimensions, pieces, content_description}

            // Enums stored as string
            $table->string('status')->default('pending');
            $table->string('payment_status')->default('unpaid');
            $table->string('service_type')->default('economy');

            // Financials
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->decimal('profit', 10, 2)->default(0); // Added for analytics
            $table->string('currency', 3)->default('USD');

            // Dates
            $table->timestamp('ship_date')->nullable();
            $table->timestamp('estimated_delivery_date')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for searching
            $table->index(['tracking_number', 'organization_id']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
