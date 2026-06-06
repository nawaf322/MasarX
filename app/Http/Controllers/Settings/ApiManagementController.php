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
use App\Models\ApiClient;
use App\Models\ApiWebhookSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ApiManagementController extends Controller
{
    public function index()
    {
        // Use existing Settings/Index page as a base
        return Inertia::render('Settings/Index');
    }

    public function clientsIndex()
    {
        $clients = ApiClient::where('organization_id', auth()->user()->organization_id)->paginate(20);
        return Inertia::render('Settings/Index', ['clients' => $clients]);
    }

    public function clientsCreate()
    {
        return Inertia::render('Settings/Index');
    }

    public function clientsStore(Request $request)
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:255',
            'type'                 => 'required|string',
            'allowed_scopes'       => 'nullable|array',
            'rate_limit_per_minute'=> 'nullable|integer',
            'is_active'            => 'boolean',
        ]);

        $plainSecret = 'sec_' . Str::random(32);
        ApiClient::create([
            'organization_id'    => auth()->user()->organization_id,
            'client_id'          => 'cli_' . Str::random(20),
            'client_secret_hash' => hash('sha256', $plainSecret),
            'name'               => $data['name'],
            'type'               => $data['type'],
            'status'             => 'active',
            'is_active'          => $data['is_active'] ?? true,
            'allowed_scopes'     => $data['allowed_scopes'] ?? [],
            'rate_limit_per_minute' => $data['rate_limit_per_minute'] ?? null,
        ]);

        return redirect()->route('settings.api.clients.index')->with('success', 'Client created.');
    }

    public function clientsEdit(ApiClient $client)
    {
        return Inertia::render('Settings/Index', ['client' => $client]);
    }

    public function clientsUpdate(Request $request, ApiClient $client)
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:255',
            'type'                 => 'required|string',
            'status'               => 'required|string',
            'allowed_scopes'       => 'nullable|array',
            'rate_limit_per_minute'=> 'nullable|integer',
            'is_active'            => 'boolean',
        ]);
        $client->update($data);
        return redirect()->route('settings.api.clients.index')->with('success', 'Client updated.');
    }

    public function clientsDestroy(ApiClient $client)
    {
        $client->delete();
        return redirect()->route('settings.api.clients.index')->with('success', 'Client deleted.');
    }

    public function webhooksIndex()
    {
        $webhooks = ApiWebhookSubscription::where('organization_id', auth()->user()->organization_id)->paginate(20);
        return Inertia::render('Settings/Index', ['webhooks' => $webhooks]);
    }

    public function webhooksStore(Request $request)
    {
        $data = $request->validate([
            'provider'     => 'required|string',
            'event'        => 'required|string',
            'callback_url' => 'required|url',
            'is_active'    => 'boolean',
        ]);
        ApiWebhookSubscription::create([
            'organization_id' => auth()->user()->organization_id,
            'provider'        => $data['provider'],
            'event'           => $data['event'],
            'callback_url'    => $data['callback_url'],
            'secret'          => Str::random(32),
            'is_active'       => $data['is_active'] ?? true,
        ]);
        return redirect()->route('settings.api.webhooks.index')->with('success', 'Webhook created.');
    }

    public function logsIndex()
    {
        return Inertia::render('Settings/Index');
    }
}
