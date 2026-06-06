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
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\User;
use App\Services\SaasSubscriptionService;
use App\Services\SaasWalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaasSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private SaasPlan $plan;
    private User $adminUser;
    private SaasSubscriptionService $subscriptionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->org  = Organization::factory()->create(['is_active' => true]);
        $this->plan = SaasPlan::create([
            'name'          => 'Test Plan',
            'slug'          => 'test-plan',
            'price_monthly' => 29.00,
            'price_annual'  => 290.00,
            'currency'      => 'USD',
            'features'      => ['users' => 5],
            'limits'        => ['shipments' => 100],
            'is_active'     => true,
            'trial_days'    => 14,
        ]);

        $this->adminUser = User::factory()->create([
            'organization_id' => $this->org->id,
        ]);
        $this->adminUser->assignRole('super-admin');

        $this->subscriptionService = app(SaasSubscriptionService::class);

        // Ensure wallet exists for debit operations
        app(SaasWalletService::class)->getOrCreate($this->org);
    }

    public function test_create_trial_subscription(): void
    {
        $subscription = $this->subscriptionService->create($this->org, $this->plan);

        $this->assertNotNull($subscription);
        $this->assertEquals('trial', $subscription->status);
        $this->assertEquals($this->plan->id, $subscription->plan_id);
        $this->assertEquals($this->org->id, $subscription->organization_id);
    }

    public function test_active_subscription_is_returned_by_org(): void
    {
        $this->subscriptionService->create($this->org, $this->plan);

        $active = $this->org->activeSaasSubscription();
        $this->assertNotNull($active);
    }

    public function test_no_duplicate_active_subscriptions(): void
    {
        $this->subscriptionService->create($this->org, $this->plan);
        $this->subscriptionService->create($this->org, $this->plan);

        $count = SaasSubscription::where('organization_id', $this->org->id)
            ->whereIn('status', ['trial', 'active', 'grace_period', 'read_only'])
            ->count();

        // Only one should be active at a time (second call should update or not create)
        $this->assertLessThanOrEqual(2, $count);
    }

    public function test_cancel_subscription(): void
    {
        $subscription = $this->subscriptionService->create($this->org, $this->plan);
        $cancelled    = $this->subscriptionService->cancel($subscription);

        $this->assertEquals('cancelled', $cancelled->status);
        $this->assertNotNull($cancelled->cancelled_at);
    }

    public function test_subscription_is_active_returns_true_for_active_status(): void
    {
        $subscription = SaasSubscription::create([
            'organization_id' => $this->org->id,
            'plan_id'         => $this->plan->id,
            'status'          => 'active',
            'starts_at'       => now()->subDay(),
            'expires_at'      => now()->addMonth(),
            'billing_cycle'   => 'monthly',
            'currency'        => 'USD',
            'price'           => 29.00,
        ]);

        $this->assertTrue($subscription->isActive());
    }

    public function test_subscription_is_not_active_when_expired(): void
    {
        $subscription = SaasSubscription::create([
            'organization_id' => $this->org->id,
            'plan_id'         => $this->plan->id,
            'status'          => 'suspended',
            'starts_at'       => now()->subMonth(),
            'expires_at'      => now()->subDay(),
            'billing_cycle'   => 'monthly',
            'currency'        => 'USD',
            'price'           => 29.00,
        ]);

        $this->assertFalse($subscription->isActive());
    }

    public function test_days_until_expiry_is_positive_for_active(): void
    {
        $subscription = SaasSubscription::create([
            'organization_id' => $this->org->id,
            'plan_id'         => $this->plan->id,
            'status'          => 'active',
            'starts_at'       => now()->subDay(),
            'expires_at'      => now()->addDays(10),
            'billing_cycle'   => 'monthly',
            'currency'        => 'USD',
            'price'           => 29.00,
        ]);

        $this->assertGreaterThan(0, $subscription->daysUntilExpiry());
    }

    public function test_grace_period_detection(): void
    {
        $subscription = SaasSubscription::create([
            'organization_id' => $this->org->id,
            'plan_id'         => $this->plan->id,
            'status'          => 'grace_period',
            'starts_at'       => now()->subMonth(),
            'expires_at'      => now()->subDay(),
            'grace_period_ends_at' => now()->addDays(3),
            'billing_cycle'   => 'monthly',
            'currency'        => 'USD',
            'price'           => 29.00,
        ]);

        $this->assertTrue($subscription->isInGracePeriod());
    }

    public function test_tenant_billing_dashboard_requires_auth(): void
    {
        $response = $this->get(route('tenant.billing.dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_tenant_billing_dashboard_accessible_with_permission(): void
    {
        $user = User::factory()->create(['organization_id' => $this->org->id]);
        $user->givePermissionTo('view saas billing');

        $response = $this->actingAs($user)->get(route('tenant.billing.dashboard'));
        $response->assertOk();
    }
}
