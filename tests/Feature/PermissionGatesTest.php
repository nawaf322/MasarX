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
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Permission gate tests.
 *
 * Verifies that sensitive routes return 403 for users lacking the required
 * permission, and 200 (or redirect) for users who have it.
 */
class PermissionGatesTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->org = Organization::factory()->create(['is_active' => true]);
    }

    private function userWith(array $permissions): User
    {
        $user = User::factory()->create(['organization_id' => $this->org->id]);
        foreach ($permissions as $perm) {
            $user->givePermissionTo($perm);
        }
        return $user;
    }

    private function userWithout(): User
    {
        return User::factory()->create(['organization_id' => $this->org->id]);
    }

    // ── Finance ───────────────────────────────────────────────────────────────

    public function test_finance_dashboard_requires_finance_view_permission(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/finance')->assertStatus(403);
    }

    public function test_finance_dashboard_accessible_with_permission(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('FinanceController uses MySQL-specific queries (DATE_FORMAT). Run against MySQL.');
        }
        $user = $this->userWith(['finance.view']);
        $this->actingAs($user)->get('/finance')->assertStatus(200);
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    public function test_financial_report_requires_reports_financial_view(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/reports/financial')->assertStatus(403);
    }

    public function test_financial_report_accessible_with_permission(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('ReportController uses MySQL-specific queries (DATE_FORMAT). Run against MySQL.');
        }
        $user = $this->userWith(['reports.financial.view']);
        $this->actingAs($user)->get('/reports/financial')->assertStatus(200);
    }

    // ── Billing / Invoices ────────────────────────────────────────────────────

    public function test_billing_index_requires_billing_view_permission(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/billing')->assertStatus(403);
    }

    public function test_billing_accessible_with_permission(): void
    {
        $user = $this->userWith(['settings.billing.view']);
        $this->actingAs($user)->get('/billing')->assertStatus(200);
    }

    // ── API Tokens ────────────────────────────────────────────────────────────

    public function test_api_tokens_index_requires_token_manage_permission(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/api-tokens')->assertStatus(403);
    }

    public function test_api_tokens_accessible_with_permission(): void
    {
        $user = $this->userWith(['settings.api.tokens.manage']);
        $this->actingAs($user)->get('/api-tokens')->assertStatus(200);
    }

    // ── Rates ─────────────────────────────────────────────────────────────────

    public function test_rates_index_requires_pricing_view_permission(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/rates')->assertStatus(403);
    }

    public function test_rates_zone_create_requires_pricing_update(): void
    {
        // Has view but not update — must be blocked for write ops
        $readOnly = $this->userWith(['settings.pricing.view']);
        $this->actingAs($readOnly)->post('/rates/zones', ['name' => 'Zone X'])->assertStatus(403);
    }

    public function test_rates_accessible_with_pricing_view(): void
    {
        $user = $this->userWith(['settings.pricing.view']);
        $this->actingAs($user)->get('/rates')->assertStatus(200);
    }

    // ── Warehouse ─────────────────────────────────────────────────────────────

    public function test_warehouse_requires_warehouse_access(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/warehouse')->assertStatus(403);
    }

    public function test_warehouse_accessible_with_permission(): void
    {
        $user = $this->userWith(['warehouse.access']);
        $this->actingAs($user)->get('/warehouse')->assertStatus(200);
    }

    // ── Dispatch / GA ─────────────────────────────────────────────────────────

    public function test_dispatch_requires_dispatch_access(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->get('/dispatch')->assertStatus(403);
    }

    public function test_ga_optimize_requires_dispatch_access(): void
    {
        $noAccess = $this->userWithout();
        $this->actingAs($noAccess)->post('/ga/optimize-routes', [])->assertStatus(403);
    }
}
