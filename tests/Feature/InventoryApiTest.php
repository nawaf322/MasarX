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
use App\Models\InventoryItem;
use App\Models\InventoryStock;
use App\Models\Organization;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;

    protected Warehouse $warehouse;

    protected InventoryItem $item;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->org = Organization::factory()->create(['is_active' => true]);
        $this->warehouse = Warehouse::create([
            'organization_id' => $this->org->id,
            'name' => 'Main WH',
            'code' => 'WH01',
            'is_active' => true,
        ]);
        $this->item = InventoryItem::create([
            'organization_id' => $this->org->id,
            'sku' => 'SKU-TEST-001',
            'name' => 'Test Product',
            'unit' => 'pcs',
            'is_active' => true,
        ]);
    }

    protected function getToken(array $scopes): string
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

    public function test_token_with_inventory_view_returns_200(): void
    {
        $token = $this->getToken(['inventory.view']);
        $res = $this->getJson('/api/v1/warehouse/inventory', ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(200);
        $res->assertJsonStructure(['data', 'current_page']);
    }

    public function test_token_without_inventory_view_returns_403(): void
    {
        $token = $this->getToken(['shipments.view']);
        $res = $this->getJson('/api/v1/warehouse/inventory', ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(403);
        $res->assertJson(['error' => 'Insufficient permissions']);
    }

    public function test_post_movement_with_inventory_manage_returns_201(): void
    {
        $token = $this->getToken(['inventory.manage']);
        $res = $this->postJson('/api/v1/warehouse/inventory/movements', [
            'warehouse_id' => $this->warehouse->id,
            'sku' => $this->item->sku,
            'type' => 'IN',
            'qty' => 10,
        ], ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(201);
        $res->assertJsonStructure(['movement' => ['id', 'type', 'qty'], 'stock' => ['qty_on_hand']]);
        $res->assertJsonPath('movement.type', 'IN');
        $res->assertJsonPath('stock.qty_on_hand', 10);
    }

    public function test_out_without_stock_returns_409(): void
    {
        $token = $this->getToken(['inventory.manage']);
        $res = $this->postJson('/api/v1/warehouse/inventory/movements', [
            'warehouse_id' => $this->warehouse->id,
            'sku' => $this->item->sku,
            'type' => 'OUT',
            'qty' => 5,
        ], ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(409);
        $res->assertJsonFragment(['error' => 'Insufficient stock']);
    }

    public function test_org_mismatch_returns_404(): void
    {
        $otherOrg = Organization::factory()->create();
        $otherWh = Warehouse::create([
            'organization_id' => $otherOrg->id,
            'name' => 'Other WH',
            'code' => 'WH02',
            'is_active' => true,
        ]);
        $token = $this->getToken(['inventory.manage']);
        $res = $this->postJson('/api/v1/warehouse/inventory/movements', [
            'warehouse_id' => $otherWh->id,
            'sku' => $this->item->sku,
            'type' => 'IN',
            'qty' => 5,
        ], ['Authorization' => 'Bearer ' . $token]);
        $res->assertStatus(404);
    }

    public function test_token_expired_returns_401(): void
    {
        $res = $this->getJson('/api/v1/warehouse/inventory', [
            'Authorization' => 'Bearer invalid-token-xyz',
        ]);
        $res->assertStatus(401);
    }
}
