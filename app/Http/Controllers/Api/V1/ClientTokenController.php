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

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApiClient;
use App\Models\User;
use Illuminate\Http\Request;

class ClientTokenController extends Controller
{
    public function issue(Request $request)
    {
        $request->validate([
            'client_id'     => 'required|string',
            'client_secret' => 'required|string',
        ]);

        $client = ApiClient::where('client_id', $request->client_id)->first();

        if (!$client) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        if (hash('sha256', $request->client_secret) !== $client->client_secret_hash) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        if (!$client->is_active) {
            return response()->json(['error' => 'Client inactive or revoked'], 403);
        }

        // Find a representative user for the organization
        $user = User::where('organization_id', $client->organization_id)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'super-admin']))
            ->first();

        if (!$user) {
            $user = User::where('organization_id', $client->organization_id)->first();
        }

        if (!$user) {
            // Create a system/machine user for the organization to attach the token to
            $user = User::create([
                'name'            => 'API System User',
                'email'           => 'api-system-' . $client->organization_id . '@system.internal',
                'password'        => bcrypt(\Illuminate\Support\Str::random(32)),
                'organization_id' => $client->organization_id,
            ]);
        }

        $scopes    = $client->allowed_scopes ?? ['*'];
        $expiresAt = now()->addHours(24);

        $token = $user->createToken('client:' . $client->client_id, $scopes, $expiresAt);

        // Stamp extra fields on the PAT
        $token->accessToken->forceFill([
            'organization_id'    => $client->organization_id,
            'scopes'             => $scopes,
            'rate_limit_per_minute' => $client->rate_limit_per_minute ?? 60,
            'ip_whitelist'       => $client->ip_whitelist ?? [],
        ])->save();

        return response()->json([
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $expiresAt->toIso8601String(),
            'scopes'       => $scopes,
        ]);
    }
}
