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

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\CarrierAccount;
use App\Services\Carriers\CarrierFactory;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class IntegrationsController extends Controller
{
    public function index()
    {
        $orgId = auth()->user()->organization_id;

        $carrierAccounts = CarrierAccount::where('organization_id', $orgId)->get()
            ->keyBy('carrier_code');

        $settings = \DB::table('integrations')
            ->where('organization_id', $orgId)
            ->get()
            ->keyBy('type')
            ->map(fn($r) => json_decode($r->config, true) ?? []);

        // Merge public_calculator from SettingsService (stored separately from integrations table)
        $calcEnabled = (bool) app(SettingsService::class)
            ->forOrganization($orgId)
            ->get('public_calculator', 'enabled', false);

        $settings = $settings->toArray();
        $settings['public_calculator'] = ['enabled' => $calcEnabled];

        return Inertia::render('Settings/Integrations', [
            'settings'         => $settings,
            'carrier_accounts' => $carrierAccounts,
        ]);
    }

    public function update(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $data = $request->validate([
            'google_client_id'     => 'nullable|string',
            'google_client_secret' => 'nullable|string',
        ]);

        // Store google_oauth integration
        DB::table('integrations')->updateOrInsert(
            ['organization_id' => $orgId, 'type' => 'google_oauth'],
            [
                'config'     => json_encode($data),
                'is_active'  => true,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['success' => true, 'message' => 'Integration updated.']);
    }

    public function updateCarrier(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $data = $request->validate([
            'carrier_code'              => 'required|string',
            'mode'                      => 'required|string',
            'status'                    => 'boolean',
            'credentials'               => 'required|array',
            'credentials.api_key'       => 'required_if:status,true|string',
            'credentials.account_number'=> 'required_if:status,true|string',
        ]);

        CarrierAccount::updateOrCreate(
            ['organization_id' => $orgId, 'carrier_code' => $data['carrier_code']],
            [
                'credentials' => $data['credentials'],
                'mode'        => $data['mode'],
                'status'      => $data['status'] ?? false,
            ]
        );

        return response()->json(['success' => true, 'message' => 'Carrier account updated.']);
    }

    public function testCarrier(Request $request)
    {
        $orgId = auth()->user()->organization_id;
        $data = $request->validate(['carrier_code' => 'required|string']);

        $account = CarrierAccount::where('organization_id', $orgId)
            ->where('carrier_code', $data['carrier_code'])
            ->first();

        if (!$account) {
            return response()->json(['error' => 'No carrier account configured for ' . strtoupper($data['carrier_code']) . '.'], 422);
        }

        if (empty($account->credentials['api_key']) || empty($account->credentials['api_secret'])) {
            return response()->json(['error' => 'Carrier credentials incomplete. Please enter api_key and api_secret.'], 422);
        }

        try {
            $adapter = CarrierFactory::make(
                $account->carrier_code,
                $account->credentials ?? [],
                $account->mode ?? 'test'
            );

            // Test with a minimal dummy payload to verify credentials
            $testPayload = [
                'sender_details'   => ['country' => 'US', 'postal_code' => '90210', 'city' => 'Beverly Hills', 'address' => '1 Test St', 'name' => 'Test Sender', 'phone' => '3105551234'],
                'receiver_details' => ['country' => 'GB', 'postal_code' => 'SW1A1AA', 'city' => 'London', 'address' => '10 Downing St', 'name' => 'Test Recipient', 'phone' => '4471234567'],
                'package_details'  => ['packages' => [['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10, 'declared_value' => 10]]],
            ];

            $rates = $adapter->getRates($testPayload);
            $count = count($rates);

            return response()->json(['success' => true, 'message' => strtoupper($data['carrier_code']) . ' connection successful. ' . $count . ' rate(s) returned.']);
        } catch (\Throwable $e) {
            return response()->json(['error' => strtoupper($data['carrier_code']) . ' connection failed: ' . $e->getMessage()], 422);
        }
    }

    public function updateMercadolibre(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $data = $request->validate([
            'app_id'        => 'nullable|string|max:255',
            'client_secret' => 'nullable|string|max:255',
            'redirect_uri'  => 'nullable|string|max:500',
        ]);

        DB::table('integrations')->updateOrInsert(
            ['organization_id' => $orgId, 'type' => 'mercadolibre'],
            [
                'config'     => json_encode($data),
                'is_active'  => !empty($data['app_id']),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['success' => true, 'message' => 'MercadoLibre settings saved.']);
    }

    public function testMercadolibre(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $integration = DB::table('integrations')
            ->where('organization_id', $orgId)
            ->where('type', 'mercadolibre')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'MercadoLibre credentials not configured.'], 422);
        }

        $config = json_decode($integration->config, true) ?? [];
        $appId  = $config['app_id'] ?? '';

        if (empty($appId)) {
            return response()->json(['error' => 'MercadoLibre App ID not configured.'], 422);
        }

        try {
            $response = \Illuminate\Support\Facades\Http::get("https://api.mercadolibre.com/applications/{$appId}");

            if ($response->successful()) {
                $appName = $response->json('name') ?? $appId;
                return response()->json(['success' => true, 'message' => "MercadoLibre connection successful. App: {$appName}"]);
            }

            return response()->json(['error' => 'MercadoLibre verification failed: ' . ($response->json('message') ?? 'Unknown error')], 422);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'MercadoLibre connection failed: ' . $e->getMessage()], 422);
        }
    }

    public function updatePublicCalculator(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $data = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        app(SettingsService::class)
            ->forOrganization($orgId)
            ->set('public_calculator', 'enabled', (bool) $data['enabled']);

        return response()->json([
            'success' => true,
            'message' => $data['enabled'] ? 'Public rate calculator enabled.' : 'Public rate calculator disabled.',
        ]);
    }

    public function updateMaps(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $data = $request->validate([
            'default_provider'   => 'nullable|string|in:google,mapbox,leaflet,osm',
            'mapbox_token'       => 'nullable|string|max:500',
            'google_maps_key'    => 'nullable|string|max:500',
            'mapbox_enabled'     => 'nullable|boolean',
            'google_enabled'     => 'nullable|boolean',
            'default_center_lat' => 'nullable|numeric|min:-90|max:90',
            'default_center_lng' => 'nullable|numeric|min:-180|max:180',
            'default_zoom'       => 'nullable|integer|min:1|max:20',
        ]);

        DB::table('integrations')->updateOrInsert(
            ['organization_id' => $orgId, 'type' => 'maps'],
            [
                'config'     => json_encode($data),
                'is_active'  => true,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json(['success' => true, 'message' => 'Maps settings saved.']);
    }

    public function testGoogle(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $integration = DB::table('integrations')
            ->where('organization_id', $orgId)
            ->where('type', 'google_oauth')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Google OAuth credentials are not configured.'], 422);
        }

        $config       = json_decode($integration->config, true) ?? [];
        $clientId     = $config['google_client_id']     ?? '';
        $clientSecret = $config['google_client_secret'] ?? '';

        if (empty($clientId) || empty($clientSecret)) {
            return response()->json(['error' => 'Google OAuth credentials are not configured.'], 422);
        }

        // Validate client_id format: must end with .apps.googleusercontent.com
        if (!str_ends_with($clientId, '.apps.googleusercontent.com')) {
            return response()->json(['error' => 'Invalid Google Client ID format. It must end with .apps.googleusercontent.com'], 422);
        }

        // Make a real verification call to Google OAuth2 token endpoint.
        // Sending an intentionally invalid code: Google returns:
        //   'invalid_client' → credentials are wrong
        //   'invalid_grant'  → credentials are valid (code was fake, as expected)
        try {
            $response = \Illuminate\Support\Facades\Http::asForm()->post(
                'https://oauth2.googleapis.com/token',
                [
                    'client_id'     => $clientId,
                    'client_secret' => $clientSecret,
                    'grant_type'    => 'authorization_code',
                    'code'          => 'test_verification_probe',
                    'redirect_uri'  => 'http://localhost',
                ]
            );

            $error = $response->json('error');

            if ($error === 'invalid_client') {
                return response()->json(['error' => 'Google rejected the credentials. Check your Client ID and Client Secret in Google Cloud Console.'], 422);
            }

            if ($error === 'invalid_grant' || $error === 'redirect_uri_mismatch') {
                // Credentials are valid — Google recognized the client
                return response()->json(['success' => true, 'message' => 'Google OAuth credentials verified successfully. Client ID is valid.']);
            }

            return response()->json(['error' => 'Google verification returned unexpected response: ' . ($error ?? 'unknown')], 422);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Could not reach Google API: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Redirect the user to MercadoLibre OAuth authorization page.
     */
    public function mercadolibreRedirect(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $integration = DB::table('integrations')
            ->where('organization_id', $orgId)
            ->where('type', 'mercadolibre')
            ->first();

        if (!$integration) {
            return redirect()->route('settings.integrations')
                ->with('error', 'Configure MercadoLibre credentials (App ID, Client Secret, Redirect URI) before authorizing.');
        }

        $config      = json_decode($integration->config, true) ?? [];
        $appId       = $config['app_id']       ?? '';
        $redirectUri = $config['redirect_uri'] ?? route('integrations.mercadolibre.callback');

        if (empty($appId)) {
            return redirect()->route('settings.integrations')
                ->with('error', 'MercadoLibre App ID is not configured.');
        }

        $authUrl = 'https://auth.mercadolibre.com/authorization?' . http_build_query([
            'response_type' => 'code',
            'client_id'     => $appId,
            'redirect_uri'  => $redirectUri,
            'state'         => csrf_token(),
        ]);

        return redirect()->away($authUrl);
    }

    /**
     * Handle MercadoLibre OAuth callback and exchange code for access token.
     */
    public function mercadolibreCallback(Request $request)
    {
        $orgId = auth()->user()->organization_id;
        $code  = $request->get('code');

        if (!$code) {
            return redirect()->route('settings.integrations')
                ->with('error', 'MercadoLibre authorization was cancelled or failed.');
        }

        $integration = DB::table('integrations')
            ->where('organization_id', $orgId)
            ->where('type', 'mercadolibre')
            ->first();

        if (!$integration) {
            return redirect()->route('settings.integrations')
                ->with('error', 'MercadoLibre is not configured.');
        }

        $config       = json_decode($integration->config, true) ?? [];
        $appId        = $config['app_id']        ?? '';
        $clientSecret = $config['client_secret'] ?? '';
        $redirectUri  = $config['redirect_uri']  ?? route('integrations.mercadolibre.callback');

        try {
            $response = \Illuminate\Support\Facades\Http::asForm()->post(
                'https://api.mercadolibre.com/oauth/token',
                [
                    'grant_type'    => 'authorization_code',
                    'client_id'     => $appId,
                    'client_secret' => $clientSecret,
                    'code'          => $code,
                    'redirect_uri'  => $redirectUri,
                ]
            );

            if (!$response->successful()) {
                return redirect()->route('settings.integrations')
                    ->with('error', 'Failed to get MercadoLibre token: ' . ($response->json('message') ?? 'Unknown error'));
            }

            $token   = $response->json('access_token');
            $refresh = $response->json('refresh_token');
            $userId  = $response->json('user_id');
            $expires = now()->addSeconds($response->json('expires_in', 21600));

            \App\Models\ConnectedAccount::updateOrCreate(
                ['organization_id' => $orgId, 'provider' => 'mercadolibre', 'provider_id' => (string) $userId],
                [
                    'token'         => $token,
                    'refresh_token' => $refresh,
                    'expires_at'    => $expires,
                    'metadata'      => ['user_id' => $userId],
                ]
            );

            return redirect()->route('settings.integrations')
                ->with('success', 'MercadoLibre authorized successfully. User ID: ' . $userId);
        } catch (\Throwable $e) {
            return redirect()->route('settings.integrations')
                ->with('error', 'MercadoLibre OAuth error: ' . $e->getMessage());
        }
    }
}
