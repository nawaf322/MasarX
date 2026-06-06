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

use App\Models\ApiWebhookSubscription;
use App\Models\Organization;
use App\Models\Shipment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WebhookEnterpriseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_shipment_created_dispatches_webhook_with_hmac(): void
    {
        Http::fake([
            '*' => Http::response('OK', 200),
        ]);

        $org = Organization::factory()->create(['is_active' => true]);
        $secret = 'my_webhook_secret_123';
        ApiWebhookSubscription::create([
            'organization_id' => $org->id,
            'provider' => 'masarx',
            'event' => 'shipment.created',
            'callback_url' => 'https://example.com/webhook',
            'secret' => Crypt::encryptString($secret),
            'is_active' => true,
        ]);

        $shipment = Shipment::withoutGlobalScopes()->create([
            'uuid' => \Illuminate\Support\Str::uuid(),
            'tracking_number' => 'TRK-TEST123',
            'organization_id' => $org->id,
            'sender_details' => ['name' => 'S', 'address' => 'A'],
            'receiver_details' => ['name' => 'R', 'address' => 'B'],
            'package_details' => ['weight' => 1],
            'status' => 'pending',
        ]);

        // Job runs sync in test by default; wait for it
        $this->artisan('queue:work', ['--once' => true, '--queue' => 'default']);

        Http::assertSent(function ($request) use ($secret) {
            $body = $request->body();
            $timestamp = $request->header('X-MasarX-Timestamp')[0] ?? '';
            $sigHeader = $request->header('X-MasarX-Signature')[0] ?? '';
            $expectedSig = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
            return str_starts_with($sigHeader, 'sha256=')
                && hash_equals($expectedSig, $sigHeader)
                && $request->url() === 'https://example.com/webhook'
                && str_contains($body, 'shipment.created')
                && str_contains($body, 'TRK-TEST123');
        });
    }

    public function test_tracking_updated_dispatches_webhook(): void
    {
        Http::fake(['*' => Http::response('OK', 200)]);

        $org = Organization::factory()->create(['is_active' => true]);
        ApiWebhookSubscription::create([
            'organization_id' => $org->id,
            'provider' => 'masarx',
            'event' => 'tracking.updated',
            'callback_url' => 'https://example.com/tracking',
            'secret' => Crypt::encryptString('sec'),
            'is_active' => true,
        ]);

        $shipment = Shipment::withoutGlobalScopes()->create([
            'uuid' => \Illuminate\Support\Str::uuid(),
            'tracking_number' => 'TRK-456',
            'organization_id' => $org->id,
            'sender_details' => ['name' => 'S'],
            'receiver_details' => ['name' => 'R'],
            'package_details' => ['weight' => 1],
            'status' => 'pending',
        ]);

        $shipment->update(['status' => 'in_transit']);
        event(new \App\Events\PackageStatusUpdated($shipment));

        $this->artisan('queue:work', ['--once' => true, '--queue' => 'default']);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://example.com/tracking'
                && str_contains($request->body(), 'tracking.updated')
                && str_contains($request->body(), 'TRK-456');
        });
    }
}
