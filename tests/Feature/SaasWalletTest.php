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

use App\Exceptions\InsufficientBalanceException;
use App\Models\Organization;
use App\Models\SaasWallet;
use App\Models\User;
use App\Services\SaasWalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaasWalletTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private SaasWalletService $walletService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->org           = Organization::factory()->create(['is_active' => true]);
        $this->walletService = app(SaasWalletService::class);
    }

    public function test_wallet_created_on_first_get_or_create(): void
    {
        $wallet = $this->walletService->getOrCreate($this->org);

        $this->assertNotNull($wallet);
        $this->assertEquals($this->org->id, $wallet->organization_id);
        $this->assertEquals(0.0, (float) $wallet->balance);
    }

    public function test_get_or_create_is_idempotent(): void
    {
        $wallet1 = $this->walletService->getOrCreate($this->org);
        $wallet2 = $this->walletService->getOrCreate($this->org);

        $this->assertEquals($wallet1->id, $wallet2->id);
        $this->assertDatabaseCount('saas_wallets', 1);
    }

    public function test_credit_increases_balance(): void
    {
        $this->walletService->getOrCreate($this->org);

        $tx = $this->walletService->credit(
            org: $this->org,
            amount: 50.00,
            description: 'Test credit',
            reference: 'test-ref-001',
            paymentMethod: 'stripe',
        );

        $this->assertEquals(50.00, (float) $tx->balance_after);
        $this->assertEquals(0.00, (float) $tx->balance_before);
        $this->assertEquals('credit', $tx->type);

        $wallet = SaasWallet::where('organization_id', $this->org->id)->first();
        $this->assertEquals(50.00, (float) $wallet->balance);
    }

    public function test_debit_reduces_balance(): void
    {
        $this->walletService->getOrCreate($this->org);
        $this->walletService->credit($this->org, 100.00, 'Initial credit');

        $tx = $this->walletService->debit(
            org: $this->org,
            amount: 30.00,
            description: 'Subscription charge',
            reference: 'sub-ref-001',
        );

        $this->assertEquals(70.00, (float) $tx->balance_after);
        $this->assertEquals('debit', $tx->type);
    }

    public function test_debit_throws_when_insufficient_balance(): void
    {
        $this->walletService->getOrCreate($this->org);
        $this->walletService->credit($this->org, 10.00, 'Small credit');

        $this->expectException(InsufficientBalanceException::class);

        $this->walletService->debit($this->org, 50.00, 'Too much');
    }

    public function test_balance_returns_current_amount(): void
    {
        $this->walletService->getOrCreate($this->org);
        $this->walletService->credit($this->org, 75.00, 'Credit');

        $this->assertEquals(75.00, $this->walletService->balance($this->org));
    }

    public function test_balance_returns_zero_without_wallet(): void
    {
        $this->assertEquals(0.0, $this->walletService->balance($this->org));
    }
}
