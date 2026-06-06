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

use App\Enums\ShipmentStatus;
use App\Models\ApiClient;
use App\Models\Country;
use App\Models\Manifest;
use App\Models\Organization;
use App\Models\Shipment;
use App\Models\State;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CustomersWarehouseApiTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected int $countryId;
    protected int $stateId;
    protected int $cityId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->org = Organization::factory()->create(['is_active' => true]);

        $country = Country::create([
            'name' => 'Colombia',
            'iso2' => 'CO',
            'organization_id' => null,
            'is_active' => true,
        ]);
        $this->countryId = $country->id;

        $state = State::create([
            'name' => 'Antioquia',
            'code' => 'ANT',
            'country_id' => $this->countryId,
            'organization_id' => null,
            'is_active' => true,
        ]);
        $this->stateId = $state->id;

        $city = \App\Models\City::create([
            'name' => 'Medellín',
            'state_id' => $this->stateId,
            'country_id' => $this->countryId,
            'organization_id' => null,
            'is_active' => true,
        ]);
        $this->cityId = $city->id;
    }

    protected function getToken(array $scopes = ['customers.view', 'customers.create']): string
    {
        $plainSecret = 'sec_test_' . Str::random(32);
        $clientId = 'cli_' . Str::random(20);
        ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => $clientId,
            'client_secret_hash' => hash('sha256', $plainSecret),
            'name' => 'Test Client',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => true,
            'allowed_scopes' => $scopes,
            'rate_limit_per_minute' => 60,
        ]);

        $res = $this->postJson('/api/v1/auth/client-token', [
            'client_id' => $clientId,
            'client_secret' => $plainSecret,
        ]);
        $res->assertStatus(200);

        return $res->json('access_token');
    }

    public function test_customers_index_returns_200_with_scope(): void
    {
        $token = $this->getToken(['customers.view']);
        $res = $this->getJson('/api/v1/customers', ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(200);
        $res->assertJsonStructure(['data', 'current_page']);
    }

    public function test_customers_store_returns_201_with_scope(): void
    {
        $token = $this->getToken(['customers.create']);
        $res = $this->postJson('/api/v1/customers', [
            'name' => 'Test Customer',
            'email' => 'customer@test.com',
            'phone' => '+573001234567',
            'address' => 'Calle 123',
            'country_id' => $this->countryId,
            'state_id' => $this->stateId,
            'city_id' => $this->cityId,
        ], ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(201);
        $res->assertJsonStructure(['id', 'name', 'email', 'phone']);
        $res->assertJson(['name' => 'Test Customer', 'email' => 'customer@test.com']);
    }

    public function test_customers_index_returns_403_without_scope(): void
    {
        $token = $this->getToken(['shipments.view']);
        $res = $this->getJson('/api/v1/customers', ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(403);
        $res->assertJson(['error' => 'Insufficient permissions']);
    }

    public function test_customers_store_returns_403_without_scope(): void
    {
        $token = $this->getToken(['customers.view']);
        $res = $this->postJson('/api/v1/customers', [
            'name' => 'Test',
            'email' => 'a@b.com',
            'phone' => '123',
            'address' => 'Addr',
            'country_id' => $this->countryId,
            'state_id' => $this->stateId,
            'city_id' => $this->cityId,
        ], ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(403);
    }

    public function test_warehouse_manifests_index_returns_200_with_scope(): void
    {
        $token = $this->getToken(['warehouse.view']);
        $res = $this->getJson('/api/v1/warehouse/manifests', ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(200);
        $res->assertJsonStructure(['data', 'current_page']);
    }

    public function test_warehouse_manifests_store_returns_201_with_scope(): void
    {
        $token = $this->getToken(['warehouse.manage', 'warehouse.view']);

        $driver = User::factory()->create([
            'organization_id' => $this->org->id,
        ]);
        $driver->assignRole('Driver');

        $shipment = Shipment::withoutGlobalScopes()->create([
            'uuid' => Str::uuid(),
            'tracking_number' => 'TRK-' . Str::random(8),
            'organization_id' => $this->org->id,
            'sender_details' => ['name' => 'S', 'address' => 'A'],
            'receiver_details' => ['name' => 'R', 'address' => 'B'],
            'package_details' => ['weight' => 1],
            'status' => ShipmentStatus::PROCESSED->value,
            'manifest_id' => null,
        ]);

        $res = $this->postJson('/api/v1/warehouse/manifests', [
            'driver_id' => $driver->id,
            'shipment_ids' => [$shipment->id],
        ], ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(201);
        $res->assertJsonStructure(['id', 'manifest_number', 'driver_id', 'status', 'shipment_count']);
    }

    public function test_warehouse_manifests_store_returns_404_on_org_mismatch(): void
    {
        $token = $this->getToken(['warehouse.manage']);

        $otherOrg = Organization::factory()->create();
        $driver = User::factory()->create(['organization_id' => $otherOrg->id]);
        $driver->assignRole('Driver');

        $shipment = Shipment::withoutGlobalScopes()->create([
            'uuid' => Str::uuid(),
            'tracking_number' => 'TRK-' . Str::random(8),
            'organization_id' => $this->org->id,
            'sender_details' => ['name' => 'S', 'address' => 'A'],
            'receiver_details' => ['name' => 'R', 'address' => 'B'],
            'package_details' => ['weight' => 1],
            'status' => ShipmentStatus::PROCESSED->value,
            'manifest_id' => null,
        ]);

        $res = $this->postJson('/api/v1/warehouse/manifests', [
            'driver_id' => $driver->id,
            'shipment_ids' => [$shipment->id],
        ], ['Authorization' => 'Bearer ' . $token]);
        // 422 = validation rejects cross-org driver_id; 404 = explicit org check — both block the attack.
        $this->assertContains($res->status(), [404, 422], 'Cross-org driver must be rejected.');
    }

    public function test_warehouse_manifests_index_returns_403_without_scope(): void
    {
        $token = $this->getToken(['shipments.view']);
        $res = $this->getJson('/api/v1/warehouse/manifests', ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(403);
    }
}
