<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirects admin/super-admin users to their profile when
 * require_2fa_admin is enabled but they haven't set up 2FA.
 *
 * Complements the UI `security_locked` branding flag with a server-side
 * enforcement guard so the lock cannot be bypassed by navigating directly.
 */
class Enforce2faLock
{
    public function __construct(private readonly SettingsService $settings) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user) {
            return $next($request);
        }

        // Allow profile/logout routes so the user can actually set up 2FA
        if ($request->routeIs('profile.*', 'logout', 'settings.security', 'settings.security.update')) {
            return $next($request);
        }

        try {
            $this->settings->forOrganization($user->organization_id);
            $require2fa = (bool) ($this->settings->get('security', 'require_2fa_admin') ?? false);
        } catch (\Throwable) {
            return $next($request);
        }

        if ($require2fa
            && $user->hasRole(['admin', 'super-admin'])
            && ! $user->two_factor_enabled
        ) {
            return redirect()->route('profile.edit')
                ->with('error', __('security.2fa_required'));
        }

        return $next($request);
    }
}
