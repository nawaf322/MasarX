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

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\SettingsService;
use Carbon\Carbon;

class EnforceSecurityPolicy
{
    protected $settings;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
    }

    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();

        if (!$user) {
            return $next($request);
        }

        $security = $this->settings->getGroup('security');
        $isExempt = $request->routeIs('profile.*') || $request->routeIs('logout');

        // 1. Enforce session timeout (idle logout)
        $timeoutMinutes = (int) ($security['session_timeout_minutes'] ?? 120);
        if ($timeoutMinutes > 0 && !$isExempt) {
            $lastActivity = $request->session()->get('_last_activity_at');
            if ($lastActivity && Carbon::createFromTimestamp($lastActivity)->addMinutes($timeoutMinutes)->isPast()) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                return redirect()->route('login')
                    ->with('error', 'Your session has expired due to inactivity. Please log in again.');
            }
        }
        // Always refresh last activity timestamp
        $request->session()->put('_last_activity_at', now()->timestamp);

        // 2. Enforce forced password change (must_change_password flag)
        if ($user->must_change_password && !$isExempt) {
            return redirect()->route('profile.edit')
                ->with('error', 'You must change your password before continuing.');
        }

        // 3. Enforce Password Expiry
        $expiryDays = (int) ($security['password_expiry_days'] ?? 0);
        if ($expiryDays > 0 && !$isExempt) {
            $lastChange = $user->password_changed_at ?? $user->created_at;
            if (Carbon::parse($lastChange)->addDays($expiryDays)->isPast()) {
                return redirect()->route('profile.edit')
                    ->with('error', 'Your password has expired. Please update it to continue.');
            }
        }

        return $next($request);
    }
}
