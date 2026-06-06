<?php

namespace App\Http\Controllers\Settings\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiClient;
use App\Models\ApiRequestLog;
use App\Models\ApiWebhookSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ApiManagementController extends Controller
{
    public function index(Request $request)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        $user = Auth::user();

        $stats = [
            'token_count'    => $user->tokens()->whereNull('revoked_at')->count(),
            'client_count'   => ApiClient::where('organization_id', $orgId)->where('is_active', true)->count(),
            'webhook_count'  => ApiWebhookSubscription::where('organization_id', $orgId)->where('is_active', true)->count(),
            'requests_today' => ApiRequestLog::where('organization_id', $orgId)
                ->where('created_at', '>=', now()->startOfDay())
                ->count(),
            'errors_today'   => ApiRequestLog::where('organization_id', $orgId)
                ->where('created_at', '>=', now()->startOfDay())
                ->where('status_code', '>=', 400)
                ->count(),
            'base_url'       => url('/api/v1'),
        ];

        return Inertia::render('Settings/API/Index', ['stats' => $stats]);
    }
}
