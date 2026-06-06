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

/**
 * Creates all enterprise module tables that have models but no migrations:
 *  - personal_access_tokens  (Sanctum base + extended columns)
 *  - api_clients
 *  - api_webhook_subscriptions
 *  - api_webhook_delivery_logs
 *  - api_request_logs
 *  - saas_plans
 *  - saas_subscriptions
 *  - saas_wallets
 *  - saas_wallet_transactions
 *  - saas_invoices
 *  - warehouses
 *  - inventory_items
 *  - inventory_locations
 *  - inventory_stocks
 *  - inventory_movements
 *  - manifests
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── personal_access_tokens (Sanctum + extended) ──────────────────────
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->json('abilities')->nullable();
                $table->json('scopes')->nullable();
                $table->unsignedBigInteger('organization_id')->nullable()->index();
                $table->integer('rate_limit_per_minute')->nullable();
                $table->integer('rate_limit_per_hour')->nullable();
                $table->integer('rate_limit_per_day')->nullable();
                $table->json('ip_whitelist')->nullable();
                $table->unsignedBigInteger('request_count')->default(0);
                $table->json('metadata')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('last_request_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamp('revoked_at')->nullable();
                $table->unsignedBigInteger('revoked_by')->nullable();
                $table->timestamps();
            });
        }

        // ─── api_clients ──────────────────────────────────────────────────────
        if (!Schema::hasTable('api_clients')) {
            Schema::create('api_clients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('client_id')->unique();
                $table->string('client_secret_hash');
                $table->string('name');
                $table->string('type')->default('custom'); // custom|system
                $table->string('status')->default('active'); // active|suspended|revoked
                $table->boolean('is_active')->default(true);
                $table->timestamp('expires_at')->nullable();
                $table->text('callback_url')->nullable();
                $table->string('webhook_secret')->nullable();
                $table->json('allowed_scopes')->nullable();
                $table->integer('rate_limit_per_minute')->nullable();
                $table->json('ip_whitelist')->nullable();
                $table->string('request_id_prefix')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'is_active']);
            });
        }

        // ─── api_webhook_subscriptions ────────────────────────────────────────
        if (!Schema::hasTable('api_webhook_subscriptions')) {
            Schema::create('api_webhook_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->unsignedBigInteger('api_client_id')->nullable();
                $table->string('provider'); // masarx|shipment|etc
                $table->string('event');    // shipment.created|tracking.updated|etc
                $table->text('callback_url');
                $table->text('secret')->nullable();
                $table->json('headers')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('retry_count')->default(3);
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'is_active']);
                $table->index(['organization_id', 'provider', 'event']);
            });
        }

        // ─── api_webhook_delivery_logs ────────────────────────────────────────
        if (!Schema::hasTable('api_webhook_delivery_logs')) {
            Schema::create('api_webhook_delivery_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('api_webhook_subscription_id')
                      ->constrained('api_webhook_subscriptions')
                      ->cascadeOnDelete();
                $table->string('event');
                $table->text('callback_url');
                $table->unsignedSmallInteger('http_status')->nullable();
                $table->unsignedSmallInteger('attempt')->default(1);
                $table->boolean('success')->default(false);
                $table->text('response_body')->nullable();
                $table->text('error_message')->nullable();
                $table->unsignedInteger('duration_ms')->nullable();
                $table->timestamps();

                $table->index(['api_webhook_subscription_id', 'success'], 'awdl_subscription_success_idx');
            });
        }

        // ─── api_request_logs ─────────────────────────────────────────────────
        if (!Schema::hasTable('api_request_logs')) {
            Schema::create('api_request_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('token_id')->nullable(); // PAT id
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('method', 10);
                $table->string('endpoint');
                $table->json('request_headers')->nullable();
                $table->json('request_body')->nullable();
                $table->unsignedSmallInteger('status_code')->nullable();
                $table->json('response_body')->nullable();
                $table->text('error_message')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent')->nullable();
                $table->unsignedInteger('duration_ms')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'created_at']);
                $table->index(['token_id', 'created_at']);
            });
        }

        // ─── saas_plans ───────────────────────────────────────────────────────
        if (!Schema::hasTable('saas_plans')) {
            Schema::create('saas_plans', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->decimal('price_monthly', 10, 2)->default(0);
                $table->decimal('price_quarterly', 10, 2)->nullable();
                $table->decimal('price_semiannual', 10, 2)->nullable();
                $table->decimal('price_annual', 10, 2)->nullable();
                $table->string('currency', 3)->default('USD');
                $table->json('features')->nullable();
                $table->json('limits')->nullable();
                $table->unsignedSmallInteger('trial_days')->default(14);
                $table->unsignedSmallInteger('grace_period_days')->default(7);
                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['is_active', 'sort_order']);
            });
        }

        // ─── saas_subscriptions ───────────────────────────────────────────────
        if (!Schema::hasTable('saas_subscriptions')) {
            Schema::create('saas_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('plan_id')->constrained('saas_plans');
                $table->string('billing_cycle')->default('monthly'); // monthly|quarterly|semiannual|annual
                $table->string('status')->default('trial');
                // status values: trial|active|grace_period|suspended|cancelled|read_only
                $table->decimal('price', 10, 2)->default(0);
                $table->string('currency', 3)->default('USD');
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('grace_period_ends_at')->nullable();
                $table->timestamp('trial_ends_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('last_renewed_at')->nullable();
                $table->boolean('auto_renew')->default(true);
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
                $table->index(['expires_at', 'status']);
            });
        }

        // ─── saas_wallets ─────────────────────────────────────────────────────
        if (!Schema::hasTable('saas_wallets')) {
            Schema::create('saas_wallets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
                $table->decimal('balance', 12, 2)->default(0);
                $table->string('currency', 3)->default('USD');
                $table->timestamp('last_recharged_at')->nullable();
                $table->timestamp('last_debited_at')->nullable();
                $table->timestamps();
            });
        }

        // ─── saas_wallet_transactions ─────────────────────────────────────────
        if (!Schema::hasTable('saas_wallet_transactions')) {
            Schema::create('saas_wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('wallet_id')->constrained('saas_wallets')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('type'); // credit|debit
                $table->decimal('amount', 12, 2);
                $table->decimal('balance_before', 12, 2);
                $table->decimal('balance_after', 12, 2);
                $table->string('description')->nullable();
                $table->string('reference')->nullable();
                $table->string('payment_method')->nullable(); // stripe|paypal|demo|manual
                $table->json('metadata')->nullable();
                $table->unsignedBigInteger('performed_by')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();

                $table->index(['wallet_id', 'type']);
                $table->index(['organization_id', 'created_at']);
            });
        }

        // ─── saas_invoices ────────────────────────────────────────────────────
        if (!Schema::hasTable('saas_invoices')) {
            Schema::create('saas_invoices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('subscription_id')->nullable()->constrained('saas_subscriptions')->nullOnDelete();
                $table->string('invoice_number')->unique();
                $table->string('type')->default('subscription'); // subscription|addon|recharge
                $table->string('status')->default('draft'); // draft|issued|paid|overdue|cancelled|void
                $table->decimal('subtotal', 10, 2)->default(0);
                $table->decimal('tax_rate', 5, 2)->default(0);
                $table->decimal('tax_amount', 10, 2)->default(0);
                $table->decimal('total', 10, 2)->default(0);
                $table->string('currency', 3)->default('USD');
                $table->string('description')->nullable();
                $table->date('billing_period_start')->nullable();
                $table->date('billing_period_end')->nullable();
                $table->timestamp('issued_at')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->timestamp('due_at')->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
            });
        }

        // ─── warehouses ───────────────────────────────────────────────────────
        if (!Schema::hasTable('warehouses')) {
            Schema::create('warehouses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('code')->nullable();
                $table->text('address')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['organization_id', 'is_active']);
            });
        }

        // ─── inventory_items ──────────────────────────────────────────────────
        if (!Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('sku');
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('unit')->default('unit');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['organization_id', 'sku']);
                $table->index(['organization_id', 'is_active']);
            });
        }

        // ─── inventory_locations ──────────────────────────────────────────────
        if (!Schema::hasTable('inventory_locations')) {
            Schema::create('inventory_locations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
                $table->string('code');
                $table->string('name');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['warehouse_id', 'code']);
                $table->index(['organization_id', 'warehouse_id']);
            });
        }

        // ─── inventory_stocks ─────────────────────────────────────────────────
        if (!Schema::hasTable('inventory_stocks')) {
            Schema::create('inventory_stocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
                $table->foreignId('location_id')->nullable()->constrained('inventory_locations')->nullOnDelete();
                $table->foreignId('item_id')->constrained('inventory_items')->cascadeOnDelete();
                $table->decimal('qty_on_hand', 12, 2)->default(0);
                $table->timestamps();

                $table->unique(['warehouse_id', 'location_id', 'item_id']);
                $table->index(['organization_id', 'warehouse_id']);
            });
        }

        // ─── manifests ────────────────────────────────────────────────────────
        if (!Schema::hasTable('manifests')) {
            Schema::create('manifests', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('manifest_number')->nullable();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->unsignedBigInteger('driver_id')->nullable();
                $table->string('status')->default('open'); // open|closed|dispatched
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'status']);
                $table->index(['driver_id', 'status']);
            });
        }

        // ─── integrations ─────────────────────────────────────────────────────
        if (!Schema::hasTable('integrations')) {
            Schema::create('integrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('type'); // google_oauth|mercadolibre|maps|etc
                $table->json('config')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->unique(['organization_id', 'type']);
            });
        }

        // ─── inventory_movements ──────────────────────────────────────────────
        if (!Schema::hasTable('inventory_movements')) {
            Schema::create('inventory_movements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
                $table->foreignId('location_id')->nullable()->constrained('inventory_locations')->nullOnDelete();
                $table->foreignId('item_id')->constrained('inventory_items')->cascadeOnDelete();
                $table->string('type', 10); // IN|OUT|ADJUST
                $table->decimal('qty', 12, 2);
                $table->string('reference_type')->nullable(); // shipment|purchase_order|etc
                $table->unsignedBigInteger('reference_id')->nullable();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by_user_id')->nullable();
                $table->string('request_id')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'warehouse_id', 'created_at'], 'inv_mov_org_wh_created_idx');
                $table->index(['item_id', 'type', 'created_at'], 'inv_mov_item_type_created_idx');
            });
        }
    }

    public function down(): void
    {
        // Drop in reverse dependency order
        Schema::dropIfExists('integrations');
        Schema::dropIfExists('manifests');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_stocks');
        Schema::dropIfExists('inventory_locations');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('saas_invoices');
        Schema::dropIfExists('saas_wallet_transactions');
        Schema::dropIfExists('saas_wallets');
        Schema::dropIfExists('saas_subscriptions');
        Schema::dropIfExists('saas_plans');
        Schema::dropIfExists('api_request_logs');
        Schema::dropIfExists('api_webhook_delivery_logs');
        Schema::dropIfExists('api_webhook_subscriptions');
        Schema::dropIfExists('api_clients');
        Schema::dropIfExists('personal_access_tokens');
    }
};
