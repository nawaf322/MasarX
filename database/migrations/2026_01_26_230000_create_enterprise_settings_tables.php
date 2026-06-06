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
    public function up(): void
    {
        // 2.5 Notification Channels
        Schema::create('notification_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('channel_type'); // smtp/webhook/whatsapp/push/ses
            $table->string('name');
            $table->string('status')->default('active');
            $table->json('config'); // encrypted
            $table->timestamps();

            $table->index(['organization_id', 'channel_type']);
        });

        // 2.8 Notification Logs
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('channel_type');
            $table->string('event_key');
            $table->text('to')->nullable();
            $table->json('payload');
            $table->string('status'); // sent/failed/queued
            $table->json('provider_response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
        });

        // 2.9.2 Ecommerce Stores
        Schema::create('ecommerce_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('platform'); // shopify/woocommerce
            $table->string('store_name');
            $table->text('store_url');
            $table->string('status')->default('active');
            $table->json('credentials'); // encrypted
            $table->json('scopes')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        // 2.10 Integration Request Logs
        Schema::create('integration_request_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('integration_type'); // carrier/ecommerce
            $table->unsignedBigInteger('integration_id');
            $table->string('action'); // test_rates/test_label/sync_now
            $table->json('request')->nullable(); // masked
            $table->json('response')->nullable(); // masked
            $table->integer('status_code')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_request_logs');
        Schema::dropIfExists('ecommerce_stores');
        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('notification_channels');
    }
};
