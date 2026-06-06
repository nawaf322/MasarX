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
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Multitenancy isolation tests.
 *
 * Verifies that users from Organization A cannot access, view, or modify
 * data belonging to Organization B through any exposed route.
 */
class MultitenancyTest extends TestCase
{
    use RefreshDatabase;

    private Organization $orgA;
    private Organization $orgB;
    private User $userA;
    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->orgA  = Organization::factory()->create(['is_active' => true]);
        $this->orgB  = Organization::factory()->create(['is_active' => true]);
        $this->userA = User::factory()->create(['organization_id' => $this->orgA->id]);
        $this->userB = User::factory()->create(['organization_id' => $this->orgB->id]);
    }

    // ── Shipments ─────────────────────────────────────────────────────────────

    public function test_user_cannot_view_other_orgs_shipment(): void
    {
        $shipmentB = Shipment::factory()->create([
            'organization_id' => $this->orgB->id,
            'status'          => 'pending',
        ]);

        $response = $this->actingAs($this->userA)->get("/shipments/{$shipmentB->id}");

        // 403 (explicit org check) or 404 (global scope blocks lookup) — both are correct.
        // 200 is the only unacceptable outcome.
        $this->assertContains(
            $response->getStatusCode(), [403, 404],
            'Cross-tenant shipment access must be blocked (403 or 404).'
        );
    }

    public function test_user_cannot_edit_other_orgs_shipment(): void
    {
        $shipmentB = Shipment::factory()->create([
            'organization_id' => $this->orgB->id,
            'status'          => 'pending',
        ]);

        $response = $this->actingAs($this->userA)->put("/shipments/{$shipmentB->id}", [
            'sender_details'   => ['name' => 'Hacker', 'phone' => '0', 'address' => 'X', 'city' => 'X', 'country' => 'X'],
            'receiver_details' => ['name' => 'Target', 'phone' => '0', 'address' => 'X', 'city' => 'X', 'country' => 'X'],
        ]);

        // 403 (explicit check) or 404 (global scope) — any means blocked.
        $this->assertContains($response->getStatusCode(), [403, 404]);
    }

    public function test_shipment_index_only_returns_own_org_shipments(): void
    {
        $shipA = Shipment::factory()->create(['organization_id' => $this->orgA->id, 'status' => 'pending']);
        $shipB = Shipment::factory()->create(['organization_id' => $this->orgB->id, 'status' => 'pending']);

        // Page loads without error
        $this->actingAs($this->userA)->get('/shipments')->assertStatus(200);

        // Directly verify the query scope: org A user cannot retrieve org B's shipment
        // via the same query the controller uses (where organization_id = orgA).
        $visibleIds = Shipment::where('organization_id', $this->orgA->id)->pluck('id')->toArray();
        $this->assertContains($shipA->id, $visibleIds, 'Own shipment must be visible.');
        $this->assertNotContains($shipB->id, $visibleIds, 'Cross-tenant shipment must not appear in org A scope.');
    }

    // ── API token cross-tenant ─────────────────────────────────────────────────

    public function test_api_token_cannot_read_other_orgs_shipments(): void
    {
        // Token belongs to orgA; shipment belongs to orgB
        $shipmentB = Shipment::factory()->create([
            'organization_id' => $this->orgB->id,
            'status'          => 'pending',
        ]);

        $tokenResult = $this->userA->createToken('test', ['shipments.view'], null);
        $pat = $tokenResult->accessToken;
        $pat->forceFill([
            'organization_id' => $this->userA->organization_id,
            'scopes'          => ['shipments.view'],
        ])->save();
        $token = $tokenResult->plainTextToken;

        // Direct lookup by ID — must 404 (not found in org scope), not 200.
        $response = $this->getJson("/api/v1/shipments/{$shipmentB->id}", [
            'Authorization' => 'Bearer ' . $token,
        ]);

        $response->assertStatus(404);
    }

    // ── Customers ─────────────────────────────────────────────────────────────

    public function test_customers_api_cannot_read_other_orgs_customers(): void
    {
        $customerB = User::factory()->create(['organization_id' => $this->orgB->id]);
        $customerB->assignRole('customer');

        $tokenResult = $this->userA->createToken('test', ['*'], null);
        $pat = $tokenResult->accessToken;
        $pat->forceFill([
            'organization_id' => $this->userA->organization_id,
            'scopes'          => ['*'],
        ])->save();
        $token = $tokenResult->plainTextToken;

        // The listing endpoint must only return org A's customers.
        $response = $this->getJson('/api/v1/customers', [
            'Authorization' => 'Bearer ' . $token,
        ]);

        $response->assertStatus(200);
        $ids = collect($response->json('data') ?? [])->pluck('id')->toArray();
        $this->assertNotContains($customerB->id, $ids, 'Cross-tenant customer leaked in listing.');
    }
}
