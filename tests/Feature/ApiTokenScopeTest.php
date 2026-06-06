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
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ApiTokenScopeTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create(['is_active' => true]);
        $this->user = User::factory()->create(['organization_id' => $this->org->id]);
    }

    protected function createToken(array $scopes = ['*'], ?array $ipWhitelist = null, ?int $rateLimit = 60, ?\DateTime $expiresAt = null): string
    {
        $token = $this->user->createToken('test', $scopes, $expiresAt);
        $pat = $token->accessToken;
        $pat->forceFill([
            'organization_id' => $this->user->organization_id,
            'scopes' => $scopes,
            'rate_limit_per_minute' => $rateLimit,
            'ip_whitelist' => $ipWhitelist ?? [],
        ])->save();
        return $token->plainTextToken;
    }

    public function test_token_with_correct_scope_returns_200(): void
    {
        $token = $this->createToken(['shipments.view']);
        $response = $this->getJson('/api/v1/shipments', [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $response->assertStatus(200);
    }

    public function test_token_without_scope_returns_403(): void
    {
        $token = $this->createToken(['rates.quote']);
        $response = $this->getJson('/api/v1/shipments', [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $response->assertStatus(403);
        $response->assertJson(['error' => 'Insufficient permissions']);
    }

    public function test_token_expired_returns_401(): void
    {
        $token = $this->createToken(
            ['shipments.view'],
            null,
            60,
            now()->subHour()
        );
        $response = $this->getJson('/api/v1/shipments', [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $response->assertStatus(401);
    }

    public function test_ip_outside_whitelist_returns_403(): void
    {
        $token = $this->createToken(['shipments.view'], ['192.168.99.99']);
        $response = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->getJson('/api/v1/shipments', [
                'Authorization' => 'Bearer ' . $token,
            ]);
        $response->assertStatus(403);
        $response->assertJson(['error' => 'IP not allowed']);
    }

    public function test_rate_limit_exceeded_returns_429(): void
    {
        $tokenResult = $this->user->createToken('test', ['shipments.view'], null);
        $pat = $tokenResult->accessToken;
        $pat->forceFill([
            'organization_id' => $this->user->organization_id,
            'scopes' => ['shipments.view'],
            'rate_limit_per_minute' => 2,
            'ip_whitelist' => [],
        ])->save();
        $plainToken = $tokenResult->plainTextToken;
        RateLimiter::clear('api_token:' . $pat->id);

        $headers = ['Authorization' => 'Bearer ' . $plainToken];
        $this->getJson('/api/v1/shipments', $headers)->assertStatus(200);
        $this->getJson('/api/v1/shipments', $headers)->assertStatus(200);
        $response = $this->getJson('/api/v1/shipments', $headers);
        $response->assertStatus(429);
        $response->assertJson(['error' => 'Rate limit exceeded']);
    }

    public function test_token_with_wildcard_scope_has_access(): void
    {
        $token = $this->createToken(['*']);
        $response = $this->getJson('/api/v1/shipments', [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $response->assertStatus(200);
    }

    public function test_rates_quote_requires_rates_quote_scope(): void
    {
        $token = $this->createToken(['rates.quote']);
        $payload = [
            'sender_details' => ['country' => 'US', 'country_code' => 'US'],
            'receiver_details' => ['country' => 'US', 'country_code' => 'US'],
            'package_details' => ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10],
        ];
        $response = $this->postJson('/api/v1/rates/quote', $payload, [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $response->assertStatus(200);
    }

    public function test_rates_quote_denied_without_scope(): void
    {
        $token = $this->createToken(['shipments.view']);
        $payload = [
            'sender_details' => ['country' => 'US'],
            'receiver_details' => ['country' => 'US'],
            'package_details' => ['weight' => 1],
        ];
        $response = $this->postJson('/api/v1/rates/quote', $payload, [
            'Authorization' => 'Bearer ' . $token,
        ]);
        $response->assertStatus(403);
    }
}
