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

use App\Models\CarrierAccount;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class IntegrationsSettingsTest extends TestCase
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

    public function test_integrations_index_returns_200_with_permission(): void
    {
        $response = $this->actingAs($this->adminUser)->get(route('settings.integrations'));
        $response->assertStatus(200);
    }

    public function test_integrations_index_returns_403_without_permission(): void
    {
        $response = $this->actingAs($this->noPermUser)->get(route('settings.integrations'));
        $response->assertStatus(403);
    }

    public function test_google_oauth_update_succeeds(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.integrations.update'), [
            'google_client_id' => '123.apps.googleusercontent.com',
            'google_client_secret' => 'secret123',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('integrations', [
            'organization_id' => $this->org->id,
            'type' => 'google_oauth',
        ]);
    }

    public function test_carrier_update_creates_or_updates_account(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.carrier.update'), [
            'carrier_code' => 'dhl',
            'mode' => 'test',
            'status' => true,
            'credentials' => [
                'api_key' => 'test-key',
                'account_number' => '123456',
            ],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('carrier_accounts', [
            'organization_id' => $this->org->id,
            'carrier_code' => 'dhl',
        ]);
    }

    public function test_carrier_update_rejects_empty_credentials_when_enabled(): void
    {
        foreach (['dhl', 'fedex', 'ups', 'usps'] as $carrier) {
            $response = $this->actingAs($this->adminUser)->post(route('settings.carrier.update'), [
                'carrier_code' => $carrier,
                'mode' => 'test',
                'status' => true,
                'credentials' => [
                    'api_key' => '',
                    'account_number' => '',
                ],
            ]);

            $response->assertSessionHasErrors(['credentials.api_key', 'credentials.account_number']);
            $this->assertDatabaseMissing('carrier_accounts', [
                'organization_id' => $this->org->id,
                'carrier_code' => $carrier,
            ]);
        }
    }

    public function test_carrier_test_connection_requires_existing_account(): void
    {
        CarrierAccount::create([
            'organization_id' => $this->org->id,
            'carrier_code' => 'dhl',
            'credentials' => ['api_key' => 'x', 'account_number' => '123'],
            'mode' => 'test',
            'status' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->post(route('settings.carrier.test'), [
            'carrier_code' => 'dhl',
        ]);

        $response->assertRedirect();
    }

    public function test_carrier_test_connection_fails_without_account(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.carrier.test'), [
            'carrier_code' => 'dhl',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_mercadolibre_update_succeeds(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.mercadolibre.update'), [
            'app_id' => '123456',
            'client_secret' => 'secret',
        ]);

        $response->assertRedirect();
    }

    public function test_maps_update_succeeds(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.maps.update'), [
            'default_provider' => 'osm',
            'mapbox_token' => '',
            'google_maps_key' => '',
            'mapbox_enabled' => false,
            'google_enabled' => false,
        ]);

        $response->assertRedirect();
    }

    public function test_google_test_requires_configured_credentials(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('settings.google.test'));

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }
}
