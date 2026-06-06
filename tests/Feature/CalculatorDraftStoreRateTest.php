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

use App\Models\Country;
use App\Models\Organization;
use App\Models\RateCard;
use App\Models\RateRule;
use App\Models\RateZone;
use App\Models\ShipmentStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P0: Calculator → Draft → Create → Store flow.
 * Validates: draft restore, rate_rule_id/rate_card_id matching, store always recalculates.
 */
class CalculatorDraftStoreRateTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private Country $originCountry;
    private Country $destCountry;
    private RateCard $rateCard;
    private RateZone $rateZone;
    private RateRule $rateRule;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->org = Organization::factory()->create(['is_active' => true]);
        $this->user = User::factory()->create(['organization_id' => $this->org->id]);
        $this->user->assignRole('super-admin');

        ShipmentStatus::firstOrCreate(
            ['organization_id' => $this->org->id, 'code' => 'pending'],
            ['organization_id' => $this->org->id, 'name' => 'Pending', 'icon' => 'Clock', 'color' => '#F39C12', 'order' => 1, 'is_active' => true]
        );

        $this->originCountry = Country::firstOrCreate(['iso2' => 'US'], ['name' => 'United States', 'iso2' => 'US', 'is_active' => true]);
        $this->destCountry = Country::firstOrCreate(['iso2' => 'CO'], ['name' => 'Colombia', 'iso2' => 'CO', 'is_active' => true]);

        $this->rateCard = RateCard::create([
            'organization_id' => $this->org->id,
            'name' => 'Express Test',
            'currency' => 'USD',
            'chargeable_weight_rule' => 'max',
            'volumetric_divisor' => 5000,
            'active' => true,
        ]);
        $this->rateZone = RateZone::create([
            'organization_id' => $this->org->id,
            'name' => 'US-CO',
            'origin_country_id' => $this->originCountry->id,
            'dest_country_id' => $this->destCountry->id,
            'origin_any' => false,
            'dest_any' => false,
            'active' => true,
        ]);
        $this->rateRule = RateRule::create([
            'organization_id' => $this->org->id,
            'rate_card_id' => $this->rateCard->id,
            'rate_zone_id' => $this->rateZone->id,
            'service_type' => 'Standard',
            'min_weight' => 0,
            'max_weight' => 50,
            'flat_price' => 15,
            'price_per_kg' => 3,
            'min_charge' => 20,
            'active' => true,
        ]);
    }

    public function test_store_accepts_valid_rate_rule_id_from_draft(): void
    {
        $payload = [
            'sender_details' => [
                'name' => 'John Sender',
                'phone' => '+15551234567',
                'address' => '123 Main St',
                'city' => 'Miami',
                'state' => 'FL',
                'country' => 'United States',
                'country_code' => 'US',
                'country_id' => $this->originCountry->id,
            ],
            'receiver_details' => [
                'name' => 'Jane Receiver',
                'phone' => '+573001234567',
                'address' => '456 Calle 10',
                'city' => 'Bogota',
                'state' => 'Bogota',
                'country' => 'Colombia',
                'country_code' => 'CO',
                'country_id' => $this->destCountry->id,
            ],
            'packages' => [[
                'weight' => 1,
                'length' => 10,
                'width' => 10,
                'height' => 10,
                'pieces' => 1,
                'declared_value' => 0,
                'content_description' => 'Test package',
            ]],
            'service_type' => 'Standard',
            'payment_status' => 'unpaid',
            'payment_method' => 'manual',
            'rate_data' => [
                'rate_rule_id' => $this->rateRule->id,
                'rate_card_id' => $this->rateCard->id,
                'service_code' => 'Standard',
                'total_price' => 20.00, // server calculates: flat_price(15) + price_per_kg(3)*1kg = 18, min_charge=20 → 20.00
                'breakdown' => ['subtotal' => 18, 'tax' => 0],
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('shipments.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('shipments', [
            'organization_id' => $this->org->id,
            'rate_rule_id' => $this->rateRule->id,
            'rate_card_id' => $this->rateCard->id,
        ]);
    }

    public function test_store_rejects_manipulated_total_via_h17(): void
    {
        // H17: submitting a total_price that deviates > $0.01 from server recalculation must be rejected.
        // Server calculates 20.00 (flat_price=15, price_per_kg=3*1kg=3, min_charge=20).
        // Submitting 999.99 must result in no shipment being created.
        $payload = [
            'sender_details' => [
                'name' => 'John Sender',
                'phone' => '+15551234567',
                'address' => '123 Main St',
                'city' => 'Miami',
                'state' => 'FL',
                'country' => 'United States',
                'country_code' => 'US',
                'country_id' => $this->originCountry->id,
            ],
            'receiver_details' => [
                'name' => 'Jane Receiver',
                'phone' => '+573001234567',
                'address' => '456 Calle 10',
                'city' => 'Bogota',
                'state' => 'Bogota',
                'country' => 'Colombia',
                'country_code' => 'CO',
                'country_id' => $this->destCountry->id,
            ],
            'packages' => [[
                'weight' => 1,
                'length' => 10,
                'width' => 10,
                'height' => 10,
                'pieces' => 1,
                'declared_value' => 0,
                'content_description' => 'Test package',
            ]],
            'service_type' => 'Standard',
            'payment_status' => 'unpaid',
            'payment_method' => 'manual',
            'rate_data' => [
                'rate_rule_id' => $this->rateRule->id,
                'rate_card_id' => $this->rateCard->id,
                'service_code' => 'Standard',
                'total_price' => 999.99,
            ],
        ];

        $this->actingAs($this->user)->post(route('shipments.store'), $payload);

        // H17 must block the manipulated price — no shipment should exist in DB.
        $this->assertDatabaseMissing('shipments', ['organization_id' => $this->org->id]);
    }

    public function test_store_fallback_to_service_code_when_rate_rule_id_missing(): void
    {
        $payload = [
            'sender_details' => [
                'name' => 'John Sender',
                'phone' => '+15551234567',
                'address' => '123 Main St',
                'city' => 'Miami',
                'state' => 'FL',
                'country' => 'United States',
                'country_code' => 'US',
                'country_id' => $this->originCountry->id,
            ],
            'receiver_details' => [
                'name' => 'Jane Receiver',
                'phone' => '+573001234567',
                'address' => '456 Calle 10',
                'city' => 'Bogota',
                'state' => 'Bogota',
                'country' => 'Colombia',
                'country_code' => 'CO',
                'country_id' => $this->destCountry->id,
            ],
            'packages' => [[
                'weight' => 1,
                'length' => 10,
                'width' => 10,
                'height' => 10,
                'pieces' => 1,
                'declared_value' => 0,
                'content_description' => 'Test package',
            ]],
            'service_type' => 'Standard',
            'payment_status' => 'unpaid',
            'payment_method' => 'manual',
            'rate_data' => [
                'service_code' => 'Standard',
                'rate_rule_id' => null,
                'rate_card_id' => null,
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('shipments.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('shipments', ['organization_id' => $this->org->id]);
    }
}
