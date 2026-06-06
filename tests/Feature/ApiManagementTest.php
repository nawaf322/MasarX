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

use App\Models\ApiClient;
use App\Models\ApiWebhookSubscription;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApiManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $adminUser;
    protected User $noPermUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->org = Organization::factory()->create(['is_active' => true]);
        $this->adminUser = User::factory()->create(['organization_id' => $this->org->id]);
        $this->adminUser->assignRole('admin');

        $this->noPermUser = User::factory()->create(['organization_id' => $this->org->id]);
        $employeeRole = Role::findByName('Employee', 'web');
        $this->noPermUser->assignRole($employeeRole);
    }

    public function test_api_management_index_returns_200_with_permission(): void
    {
        $response = $this->actingAs($this->adminUser)->get(route('settings.api.index'));
        $response->assertStatus(200);
    }

    public function test_api_management_index_returns_403_without_permission(): void
    {
        $response = $this->actingAs($this->noPermUser)->get(route('settings.api.index'));
        $response->assertStatus(403);
    }

    public function test_api_clients_index_returns_200_with_permission(): void
    {
        $response = $this->actingAs($this->adminUser)->get(route('settings.api.clients.index'));
        $response->assertStatus(200);
    }

    public function test_api_clients_create_returns_200_with_permission(): void
    {
        $response = $this->actingAs($this->adminUser)->get(route('settings.api.clients.create'));
        $response->assertStatus(200);
    }

    public function test_api_clients_store_creates_client(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.api.clients.store'), [
            'name' => 'Test Client',
            'type' => 'custom',
            'allowed_scopes' => ['shipments.view'],
            'rate_limit_per_minute' => 60,
            'is_active' => true,
        ]);

        $response->assertRedirect(route('settings.api.clients.index'));
        $this->assertDatabaseHas('api_clients', [
            'organization_id' => $this->org->id,
            'name' => 'Test Client',
            'type' => 'custom',
        ]);
    }

    public function test_api_clients_edit_and_update(): void
    {
        $client = ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => 'cli_test123',
            'client_secret_hash' => hash('sha256', 'secret'),
            'name' => 'Edit Me',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => true,
        ]);

        $editResponse = $this->actingAs($this->adminUser)->get(route('settings.api.clients.edit', $client));
        $editResponse->assertStatus(200);

        $updateResponse = $this->actingAs($this->adminUser)->put(route('settings.api.clients.update', $client), [
            'name' => 'Updated Name',
            'type' => 'custom',
            'status' => 'active',
            'allowed_scopes' => [],
            'rate_limit_per_minute' => 100,
            'is_active' => true,
        ]);

        $updateResponse->assertRedirect(route('settings.api.clients.index'));
        $this->assertDatabaseHas('api_clients', [
            'id' => $client->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_api_clients_destroy(): void
    {
        $client = ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => 'cli_del123',
            'client_secret_hash' => hash('sha256', 'sec'),
            'name' => 'Delete Me',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->delete(route('settings.api.clients.destroy', $client));
        $response->assertRedirect(route('settings.api.clients.index'));
        $this->assertDatabaseMissing('api_clients', ['id' => $client->id]);
    }

    public function test_api_webhooks_index_returns_200_with_permission(): void
    {
        $response = $this->actingAs($this->adminUser)->get(route('settings.api.webhooks.index'));
        $response->assertStatus(200);
    }

    public function test_api_webhooks_store_creates_webhook(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.api.webhooks.store'), [
            'provider' => 'shipment',
            'event' => 'created',
            'callback_url' => 'https://example.com/webhook',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('settings.api.webhooks.index'));
        $this->assertDatabaseHas('api_webhook_subscriptions', [
            'organization_id' => $this->org->id,
            'provider' => 'shipment',
            'event' => 'created',
        ]);
    }

    public function test_api_logs_index_returns_200_with_permission(): void
    {
        $response = $this->actingAs($this->adminUser)->get(route('settings.api.logs.index'));
        $response->assertStatus(200);
    }

    public function test_user_without_org_redirects_to_onboarding(): void
    {
        $userNoOrg = User::factory()->create(['organization_id' => null]);
        $userNoOrg->assignRole('admin');

        $response = $this->actingAs($userNoOrg)->get(route('settings.api.index'));
        $response->assertRedirect(route('onboarding.index'));
    }
}
