<?php

namespace App\Http\Controllers\Settings\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiClient;
use App\Models\ApiRequestLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ApiClientsController extends Controller
{
    public function index(Request $request)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        $search = $request->search;
        $clients = ApiClient::where('organization_id', $orgId)
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->when($request->status !== null && $request->status !== '', fn ($q) => $q->where('status', $request->status))
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'client_id' => $c->client_id,
                'type' => $c->type,
                'status' => $c->status,
                'is_active' => $c->is_active ?? true,
                'rate_limit_per_minute' => $c->rate_limit_per_minute,
                'created_at' => $c->created_at?->toIso8601String(),
            ]);

        $scopeOptions = $this->scopeOptions();

        return Inertia::render('Settings/API/Clients', [
            'clients' => $clients,
            'scopeOptions' => $scopeOptions,
            'filters' => ['search' => $request->search],
        ]);
    }

    public function create()
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        return Inertia::render('Settings/API/ClientsForm', [
            'client' => null,
            'scopeOptions' => $this->scopeOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:zapier,n8n,make,custom,mobile',
            'callback_url' => 'nullable|url|max:500',
            'allowed_scopes' => 'nullable|array',
            'allowed_scopes.*' => 'string',
            'rate_limit_per_minute' => 'nullable|integer|min:1|max:1000',
            'ip_whitelist' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $clientId = 'cli_' . Str::random(24);
        $plainSecret = 'sec_' . Str::random(40);
        $secretHash = hash('sha256', $plainSecret);

        $ipWhitelist = [];
        if (!empty($validated['ip_whitelist'])) {
            $ipWhitelist = array_values(array_filter(array_map('trim', explode("\n", $validated['ip_whitelist']))));
        }

        $client = ApiClient::create([
            'organization_id' => $orgId,
            'client_id' => $clientId,
            'client_secret_hash' => $secretHash,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'status' => 'active',
            'callback_url' => $validated['callback_url'] ?? null,
            'allowed_scopes' => $validated['allowed_scopes'] ?? [],
            'rate_limit_per_minute' => $validated['rate_limit_per_minute'] ?? 60,
            'ip_whitelist' => $ipWhitelist,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('settings.api.clients.index')
            ->with('flash', [
                'show_secret_once' => true,
                'client_id' => $clientId,
                'client_secret' => $plainSecret,
                'message' => __('Client created. Save the secret now—it will not be shown again.'),
            ]);
    }

    public function edit(ApiClient $client)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($client->organization_id !== $orgId) {
            abort(404);
        }

        return Inertia::render('Settings/API/ClientsForm', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'client_id' => $client->client_id,
                'type' => $client->type,
                'status' => $client->status,
                'callback_url' => $client->callback_url,
                'allowed_scopes' => $client->allowed_scopes ?? [],
                'rate_limit_per_minute' => $client->rate_limit_per_minute,
                'ip_whitelist' => $client->ip_whitelist ? implode("\n", $client->ip_whitelist) : '',
                'is_active' => $client->is_active ?? true,
            ],
            'scopeOptions' => $this->scopeOptions(),
        ]);
    }

    public function update(Request $request, ApiClient $client)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($client->organization_id !== $orgId) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:zapier,n8n,make,custom,mobile',
            'status' => 'required|string|in:active,inactive,revoked',
            'callback_url' => 'nullable|url|max:500',
            'allowed_scopes' => 'nullable|array',
            'allowed_scopes.*' => 'string',
            'rate_limit_per_minute' => 'nullable|integer|min:1|max:1000',
            'ip_whitelist' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $ipWhitelist = [];
        if (!empty($validated['ip_whitelist'])) {
            $ipWhitelist = array_values(array_filter(array_map('trim', explode("\n", $validated['ip_whitelist']))));
        }

        $client->update([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'status' => $validated['status'],
            'callback_url' => $validated['callback_url'] ?? null,
            'allowed_scopes' => $validated['allowed_scopes'] ?? [],
            'rate_limit_per_minute' => $validated['rate_limit_per_minute'] ?? 60,
            'ip_whitelist' => $ipWhitelist,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('settings.api.clients.index')
            ->with('success', __('Client updated.'));
    }

    public function destroy(ApiClient $client)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($client->organization_id !== $orgId) {
            abort(404);
        }
        $client->delete();
        return redirect()->route('settings.api.clients.index')
            ->with('success', __('Client deleted.'));
    }

    public function rotateSecret(ApiClient $client)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($client->organization_id !== $orgId) {
            abort(404);
        }

        $plainSecret = 'sec_' . Str::random(40);
        $secretHash = hash('sha256', $plainSecret);

        $client->update(['client_secret_hash' => $secretHash]);

        ApiRequestLog::create([
            'token_id' => null,
            'organization_id' => $orgId,
            'method' => 'POST',
            'endpoint' => 'internal:api_client.secret_rotated',
            'request_headers' => [],
            'request_body' => ['api_client_id' => $client->id, 'api_client_name' => $client->name],
            'status_code' => 200,
            'response_body' => null,
            'error_message' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'duration_ms' => 0,
        ]);

        return redirect()->route('settings.api.clients.index')
            ->with('flash', [
                'show_secret_once' => true,
                'client_id' => $client->client_id,
                'client_secret' => $plainSecret,
                'message' => __('Secret rotated. Save the new secret now—it will not be shown again.'),
            ]);
    }

    private function scopeOptions(): array
    {
        $routeScopes = config('api_scopes.route_scopes', []);
        $scopes = [];
        foreach ($routeScopes as $route => $required) {
            foreach ((array) $required as $s) {
                if ($s && $s !== '*' && !in_array($s, $scopes)) {
                    $scopes[] = $s;
                }
            }
        }
        sort($scopes);
        return array_values(array_unique($scopes));
    }
}
