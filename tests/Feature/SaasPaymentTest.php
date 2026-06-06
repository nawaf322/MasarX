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

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SaasWallet;
use App\Models\SaasWalletTransaction;
use App\Models\User;
use App\Services\SaasPaymentService;
use App\Services\SaasWalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SaasPaymentTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->org  = Organization::factory()->create(['is_active' => true]);
        $this->user = User::factory()->create(['organization_id' => $this->org->id]);
        $this->user->givePermissionTo('view saas billing');

        app(SaasWalletService::class)->getOrCreate($this->org);
    }

    // ─── Route access tests ───────────────────────────────────────────────────

    public function test_recharge_form_requires_auth(): void
    {
        $this->get(route('tenant.billing.recharge'))->assertRedirect(route('login'));
    }

    public function test_recharge_form_accessible_with_permission(): void
    {
        $this->actingAs($this->user)
            ->get(route('tenant.billing.recharge'))
            ->assertOk();
    }

    public function test_stripe_session_requires_auth(): void
    {
        $this->post(route('tenant.billing.recharge.stripe'), ['amount' => 25])
            ->assertRedirect(route('login'));
    }

    public function test_paypal_order_requires_auth(): void
    {
        $this->post(route('tenant.billing.recharge.paypal'), ['amount' => 25])
            ->assertRedirect(route('login'));
    }

    // ─── Validation tests ─────────────────────────────────────────────────────

    public function test_stripe_session_validates_amount(): void
    {
        $this->actingAs($this->user)
            ->post(route('tenant.billing.recharge.stripe'), ['amount' => 0])
            ->assertSessionHasErrors('amount');
    }

    public function test_paypal_order_validates_amount(): void
    {
        $this->actingAs($this->user)
            ->post(route('tenant.billing.recharge.paypal'), ['amount' => -10])
            ->assertSessionHasErrors('amount');
    }

    public function test_stripe_session_rejects_excessive_amount(): void
    {
        $this->actingAs($this->user)
            ->post(route('tenant.billing.recharge.stripe'), ['amount' => 99999])
            ->assertSessionHasErrors('amount');
    }

    // ─── Wallet credit idempotency tests ─────────────────────────────────────

    public function test_stripe_success_is_idempotent(): void
    {
        $walletService = app(SaasWalletService::class);

        // Credit the wallet once via the service (this sets balance to 50 and records reference)
        $walletService->credit(
            org: $this->org,
            amount: 50.00,
            description: 'Wallet recharge via Stripe',
            reference: 'cs_test_existing123',
            paymentMethod: 'stripe',
        );

        $this->assertEquals(50.00, $walletService->balance($this->org));

        // Now simulate handleStripeSuccess being called again with the same session_id.
        // It should detect the existing transaction and return true without double-crediting.
        $paymentService = app(SaasPaymentService::class);
        $result = $paymentService->handleStripeSuccess('cs_test_existing123', $this->org->id);

        $this->assertTrue($result);
        $this->assertEquals(50.00, $walletService->balance($this->org)); // Balance unchanged
        $this->assertDatabaseCount('saas_wallet_transactions', 1); // No duplicate transaction
    }

    public function test_paypal_capture_is_idempotent(): void
    {
        $paymentService = app(SaasPaymentService::class);
        $walletService  = app(SaasWalletService::class);

        $wallet = SaasWallet::where('organization_id', $this->org->id)->first();
        SaasWalletTransaction::create([
            'wallet_id'       => $wallet->id,
            'organization_id' => $this->org->id,
            'type'            => 'credit',
            'amount'          => 25.00,
            'balance_before'  => 0,
            'balance_after'   => 25.00,
            'description'     => 'Wallet recharge via PayPal',
            'reference'       => 'PAYPAL_ORDER_123',
            'payment_method'  => 'paypal',
        ]);

        // Should return true immediately without making HTTP calls
        Http::fake(); // No HTTP should be called
        $result = $paymentService->capturePayPalOrder('PAYPAL_ORDER_123', $this->org->id);

        $this->assertTrue($result);
        Http::assertNothingSent();
    }

    // ─── Webhook tests ────────────────────────────────────────────────────────

    public function test_stripe_webhook_accepts_valid_event(): void
    {
        $payload = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id'             => 'cs_test_webhook_001',
                    'payment_status' => 'paid',
                    'amount_total'   => 5000,
                    'metadata'       => [
                        'organization_id' => (string) $this->org->id,
                        'type'            => 'saas_wallet_recharge',
                        'amount'          => '50.00',
                        'currency'        => 'USD',
                    ],
                ],
            ],
        ];

        // Webhook route has no CSRF and no auth
        $this->postJson(route('webhooks.saas.stripe'), $payload)
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_paypal_webhook_accepts_valid_event(): void
    {
        $payload = [
            'event_type' => 'PAYMENT.CAPTURE.COMPLETED',
            'resource'   => [
                'supplementary_data' => [
                    'related_ids' => ['order_id' => 'PAYPAL_WEBHOOK_ORDER_001'],
                ],
                'purchase_units' => [[
                    'custom_id' => json_encode([
                        'organization_id' => $this->org->id,
                        'type'            => 'saas_wallet_recharge',
                    ]),
                ]],
            ],
        ];

        $this->postJson(route('webhooks.saas.paypal'), $payload)
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
