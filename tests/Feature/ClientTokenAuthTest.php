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
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientTokenAuthTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create(['is_active' => true]);
    }

    public function test_client_token_returns_200_with_valid_credentials(): void
    {
        $plainSecret = 'sec_test123456789012345678901234567890';
        $client = ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => 'cli_test' . substr(md5('1'), 0, 20),
            'client_secret_hash' => hash('sha256', $plainSecret),
            'name' => 'Test Client',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => true,
            'allowed_scopes' => ['shipments.view'],
            'rate_limit_per_minute' => 60,
        ]);

        $response = $this->postJson('/api/v1/auth/client-token', [
            'client_id' => $client->client_id,
            'client_secret' => $plainSecret,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['access_token', 'token_type', 'expires_at', 'scopes']);
        $response->assertJson(['token_type' => 'Bearer']);
        $response->assertJson(['scopes' => ['shipments.view']]);

        // Token works on protected endpoint
        $token = $response->json('access_token');
        $shipmentsResponse = $this->getJson('/api/v1/shipments', [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $shipmentsResponse->assertStatus(200);
    }

    public function test_client_token_returns_401_with_invalid_credentials(): void
    {
        $client = ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => 'cli_invalid',
            'client_secret_hash' => hash('sha256', 'correct_secret'),
            'name' => 'Test',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/client-token', [
            'client_id' => $client->client_id,
            'client_secret' => 'wrong_secret',
        ]);

        $response->assertStatus(401);
        $response->assertJson(['error' => 'Invalid credentials']);
    }

    public function test_client_token_returns_401_with_unknown_client(): void
    {
        $response = $this->postJson('/api/v1/auth/client-token', [
            'client_id' => 'cli_nonexistent',
            'client_secret' => 'any',
        ]);

        $response->assertStatus(401);
        $response->assertJson(['error' => 'Invalid credentials']);
    }

    public function test_client_token_returns_403_when_client_inactive(): void
    {
        $plainSecret = 'sec_inactive12345678901234567890123456789';
        $client = ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => 'cli_inactive',
            'client_secret_hash' => hash('sha256', $plainSecret),
            'name' => 'Inactive',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => false,
            'allowed_scopes' => ['shipments.view'],
        ]);

        $response = $this->postJson('/api/v1/auth/client-token', [
            'client_id' => $client->client_id,
            'client_secret' => $plainSecret,
        ]);

        $response->assertStatus(403);
        $response->assertJson(['error' => 'Client inactive or revoked']);
    }

    public function test_client_token_respects_scopes(): void
    {
        $plainSecret = 'sec_scope1234567890123456789012345678901';
        $client = ApiClient::create([
            'organization_id' => $this->org->id,
            'client_id' => 'cli_scopes',
            'client_secret_hash' => hash('sha256', $plainSecret),
            'name' => 'Scoped Client',
            'type' => 'custom',
            'status' => 'active',
            'is_active' => true,
            'allowed_scopes' => ['rates.quote'],
            'rate_limit_per_minute' => 60,
        ]);

        $response = $this->postJson('/api/v1/auth/client-token', [
            'client_id' => $client->client_id,
            'client_secret' => $plainSecret,
        ]);

        $response->assertStatus(200);
        $token = $response->json('access_token');

        // Has rates.quote - should work
        $quoteRes = $this->postJson('/api/v1/rates/quote', [
            'sender_details' => ['country' => 'US', 'country_code' => 'US'],
            'receiver_details' => ['country' => 'US', 'country_code' => 'US'],
            'package_details' => ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10],
        ], ['Authorization' => 'Bearer ' . $token]);
        $quoteRes->assertStatus(200);

        // Does NOT have shipments.view - should 403
        $shipRes = $this->getJson('/api/v1/shipments', ['Authorization' => 'Bearer ' . $token]);
        $shipRes->assertStatus(403);
        $shipRes->assertJson(['error' => 'Insufficient permissions']);
    }
}
