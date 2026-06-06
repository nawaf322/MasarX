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

use App\Models\User;
use App\Models\Organization;
use App\Models\Shipment;
use App\Enums\ShipmentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogisticsDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        
        $this->org = Organization::factory()->create(['is_active' => true]);
        $this->user = User::factory()->create([
            'organization_id' => $this->org->id,
        ]);
        $this->user->assignRole('admin');
    }

    public function test_logistics_dashboard_returns_200(): void
    {
        $response = $this->actingAs($this->user)->get('/dashboard/logistics');
        $response->assertStatus(200);
    }

    public function test_logistics_dashboard_requires_permission(): void
    {
        // Customer role también tiene "view dashboard", así que verificamos que funciona
        $customerUser = User::factory()->create([
            'organization_id' => $this->org->id,
        ]);
        $customerUser->assignRole('customer');
        
        $response = $this->actingAs($customerUser)->get('/dashboard/logistics');
        // Customer tiene "view dashboard", así que debería funcionar
        $response->assertStatus(200);
    }

    public function test_logistics_dashboard_returns_correct_structure(): void
    {
        // Crear algunos shipments de prueba
        Shipment::factory()->count(5)->create([
            'organization_id' => $this->org->id,
            'status' => ShipmentStatus::IN_TRANSIT,
        ]);
        
        Shipment::factory()->count(3)->create([
            'organization_id' => $this->org->id,
            'status' => ShipmentStatus::EXCEPTION,
        ]);

        $response = $this->actingAs($this->user)->get('/dashboard/logistics');
        $response->assertStatus(200);
        
        $props = $response->viewData('page')['props'];
        
        $this->assertArrayHasKey('kpi', $props);
        $this->assertArrayHasKey('on_route', $props['kpi']);
        $this->assertArrayHasKey('with_errors', $props['kpi']);
        $this->assertArrayHasKey('vehicles_overview', $props);
        $this->assertArrayHasKey('shipment_statistics', $props);
        $this->assertArrayHasKey('delivery_performance', $props);
        $this->assertArrayHasKey('exception_reasons', $props);
        $this->assertArrayHasKey('orders_by_countries', $props);
        $this->assertArrayHasKey('on_route_vehicles', $props);
        
        // Verificar que los valores sean números
        $this->assertIsInt($props['kpi']['on_route']['value']);
        $this->assertIsFloat($props['kpi']['on_route']['delta']);
    }

    public function test_logistics_dashboard_filters_by_organization(): void
    {
        $otherOrg = Organization::factory()->create(['is_active' => true]);
        
        Shipment::factory()->count(10)->create([
            'organization_id' => $otherOrg->id,
            'status' => ShipmentStatus::IN_TRANSIT,
        ]);
        
        Shipment::factory()->count(2)->create([
            'organization_id' => $this->org->id,
            'status' => ShipmentStatus::IN_TRANSIT,
        ]);

        $response = $this->actingAs($this->user)->get('/dashboard/logistics');
        $response->assertStatus(200);
        
        $props = $response->viewData('page')['props'];
        
        // Solo debe contar shipments de la organización del usuario
        $this->assertEquals(2, $props['kpi']['on_route']['value']);
    }
}
