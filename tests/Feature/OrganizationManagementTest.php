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
use App\Services\OrganizationOnboardingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tests for the Super-Admin Organization Management panel (Feature 1).
 */
class OrganizationManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        // Create the super-admin's own org (required by CheckTenant middleware)
        $adminOrg = Organization::factory()->create(['is_active' => true]);
        $this->superAdmin = User::factory()->create(['organization_id' => $adminOrg->id]);
        $this->superAdmin->assignRole('super-admin');

        // A second org for testing management actions
        $this->org = Organization::factory()->create(['is_active' => true, 'name' => 'Test Org']);
    }

    // ── Access control ────────────────────────────────────────────────────────

    public function test_super_admin_can_access_organizations_index(): void
    {
        $response = $this->actingAs($this->superAdmin)->get('/admin/organizations');
        $response->assertStatus(200);
    }

    public function test_admin_cannot_access_organizations_index(): void
    {
        $admin = User::factory()->create(['organization_id' => $this->org->id]);
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)->get('/admin/organizations');
        $response->assertStatus(403);
    }

    public function test_employee_cannot_access_organizations_index(): void
    {
        $employee = User::factory()->create(['organization_id' => $this->org->id]);
        $employee->assignRole('Employee');

        $response = $this->actingAs($employee)->get('/admin/organizations');
        $response->assertStatus(403);
    }

    // ── Create / Provisioning ─────────────────────────────────────────────────

    public function test_super_admin_can_create_organization_with_provisioning(): void
    {
        $response = $this->actingAs($this->superAdmin)->post('/admin/organizations', [
            'name'           => 'New Tenant Corp',
            'email'          => 'contact@newtenant.com',
            'admin_name'     => 'Admin User',
            'admin_email'    => 'admin@newtenant.com',
            'admin_password' => 'password123',
        ]);

        $response->assertRedirect(route('admin.organizations.index'));
        $this->assertDatabaseHas('organizations', ['name' => 'New Tenant Corp']);
    }

    public function test_organization_creation_creates_admin_user(): void
    {
        $this->actingAs($this->superAdmin)->post('/admin/organizations', [
            'name'           => 'Org Alpha',
            'email'          => 'alpha@org.com',
            'admin_name'     => 'Alpha Admin',
            'admin_email'    => 'admin@orgalpha.com',
            'admin_password' => 'securepass1',
        ]);

        $org  = Organization::where('name', 'Org Alpha')->firstOrFail();
        $user = User::where('email', 'admin@orgalpha.com')->firstOrFail();

        $this->assertEquals($org->id, $user->organization_id);
        $this->assertTrue($user->hasRole('admin'));
    }

    public function test_organization_creation_creates_default_settings(): void
    {
        $this->actingAs($this->superAdmin)->post('/admin/organizations', [
            'name'           => 'Org Beta',
            'email'          => 'beta@org.com',
            'admin_name'     => 'Beta Admin',
            'admin_email'    => 'admin@orgbeta.com',
            'admin_password' => 'securepass2',
        ]);

        $org = Organization::where('name', 'Org Beta')->firstOrFail();

        $this->assertDatabaseHas('organization_settings', [
            'organization_id' => $org->id,
            'group'           => 'locale',
            'key'             => 'currency',
        ]);
        $this->assertDatabaseHas('organization_settings', [
            'organization_id' => $org->id,
            'group'           => 'billing',
            'key'             => 'invoice_theme',
        ]);
    }

    public function test_organization_creation_creates_default_branch(): void
    {
        $this->actingAs($this->superAdmin)->post('/admin/organizations', [
            'name'           => 'Org Gamma',
            'email'          => 'gamma@org.com',
            'admin_name'     => 'Gamma Admin',
            'admin_email'    => 'admin@orggamma.com',
            'admin_password' => 'securepass3',
        ]);

        $org = Organization::where('name', 'Org Gamma')->firstOrFail();

        $this->assertDatabaseHas('branches', [
            'organization_id' => $org->id,
            'code'            => 'HQ',
        ]);
    }

    // ── Toggle status ─────────────────────────────────────────────────────────

    public function test_super_admin_can_toggle_organization_status(): void
    {
        $this->assertTrue($this->org->is_active);

        $this->actingAs($this->superAdmin)
            ->post(route('admin.organizations.toggle-status', $this->org->id));

        $this->assertFalse($this->org->fresh()->is_active);

        $this->actingAs($this->superAdmin)
            ->post(route('admin.organizations.toggle-status', $this->org->id));

        $this->assertTrue($this->org->fresh()->is_active);
    }

    public function test_deactivated_organization_users_cannot_login(): void
    {
        $orgUser = User::factory()->create(['organization_id' => $this->org->id]);
        $orgUser->assignRole('Employee');

        // Deactivate the org
        $this->org->update(['is_active' => false]);

        // User should be rejected by CheckTenant middleware
        $response = $this->actingAs($orgUser)->get('/dashboard');
        // Redirected to login (CheckTenant logs out + redirects)
        $this->assertContains($response->getStatusCode(), [302, 401, 403]);
    }

    // ── Edit ──────────────────────────────────────────────────────────────────

    public function test_super_admin_can_edit_organization(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->put(route('admin.organizations.update', $this->org->id), [
                'name'  => 'Updated Org Name',
                'email' => 'updated@org.com',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('organizations', ['id' => $this->org->id, 'name' => 'Updated Org Name']);
    }

    // ── Slug uniqueness ───────────────────────────────────────────────────────

    public function test_organization_slug_is_unique(): void
    {
        // Create first org with slug "my-company"
        $this->actingAs($this->superAdmin)->post('/admin/organizations', [
            'name'           => 'My Company',
            'email'          => 'a@mycompany.com',
            'admin_name'     => 'Admin A',
            'admin_email'    => 'admina@mycompany.com',
            'admin_password' => 'password123',
        ]);

        // Create second org with same name — must get a different slug
        $this->actingAs($this->superAdmin)->post('/admin/organizations', [
            'name'           => 'My Company',
            'email'          => 'b@mycompany.com',
            'admin_name'     => 'Admin B',
            'admin_email'    => 'adminb@mycompany.com',
            'admin_password' => 'password123',
        ]);

        $slugs = Organization::where('name', 'My Company')->pluck('slug')->toArray();
        $this->assertCount(2, array_unique($slugs), 'Each organization must have a unique slug.');
    }
}
