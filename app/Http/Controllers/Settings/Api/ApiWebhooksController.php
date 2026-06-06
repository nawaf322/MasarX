<?php

namespace App\Http\Controllers\Settings\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiWebhookSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;

class ApiWebhooksController extends Controller
{
    public function index(Request $request)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        $webhooks = ApiWebhookSubscription::where('organization_id', $orgId)
            ->when($request->provider, fn ($q) => $q->where('provider', $request->provider))
            ->when($request->is_active !== null && $request->is_active !== '', fn ($q) => $q->where('is_active', $request->is_active === '1' || $request->is_active === true))
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($w) => [
                'id' => $w->id,
                'provider' => $w->provider,
                'event' => $w->event,
                'callback_url' => $w->callback_url,
                'is_active' => $w->is_active,
                'created_at' => $w->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Settings/API/Webhooks', [
            'webhooks' => $webhooks,
        ]);
    }

    public function create()
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        return Inertia::render('Settings/API/WebhooksForm', [
            'webhook' => null,
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
            'provider' => 'required|string|max:64',
            'event' => 'required|string|max:64',
            'callback_url' => 'required|url|max:500',
            'secret' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $secret = $validated['secret'] ?? null;
        if ($secret) {
            $secret = Crypt::encryptString($secret);
        }

        ApiWebhookSubscription::create([
            'organization_id' => $orgId,
            'provider' => $validated['provider'],
            'event' => $validated['event'],
            'callback_url' => $validated['callback_url'],
            'secret' => $secret,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('settings.api.webhooks.index')
            ->with('success', __('Webhook subscription created.'));
    }

    public function edit(ApiWebhookSubscription $webhook)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($webhook->organization_id !== $orgId) {
            abort(404);
        }

        return Inertia::render('Settings/API/WebhooksForm', [
            'webhook' => [
                'id' => $webhook->id,
                'provider' => $webhook->provider,
                'event' => $webhook->event,
                'callback_url' => $webhook->callback_url,
                'secret' => $webhook->secret ? '********' : '',
                'is_active' => $webhook->is_active,
            ],
        ]);
    }

    public function update(Request $request, ApiWebhookSubscription $webhook)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($webhook->organization_id !== $orgId) {
            abort(404);
        }

        $validated = $request->validate([
            'provider' => 'required|string|max:64',
            'event' => 'required|string|max:64',
            'callback_url' => 'required|url|max:500',
            'secret' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $secret = $webhook->secret;
        if (!empty($validated['secret']) && $validated['secret'] !== '********') {
            $secret = Crypt::encryptString($validated['secret']);
        }

        $webhook->update([
            'provider' => $validated['provider'],
            'event' => $validated['event'],
            'callback_url' => $validated['callback_url'],
            'secret' => $secret,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('settings.api.webhooks.index')
            ->with('success', __('Webhook subscription updated.'));
    }

    public function destroy(ApiWebhookSubscription $webhook)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        if ($webhook->organization_id !== $orgId) {
            abort(404);
        }
        $webhook->delete();
        return redirect()->route('settings.api.webhooks.index')
            ->with('success', __('Webhook subscription deleted.'));
    }
}
