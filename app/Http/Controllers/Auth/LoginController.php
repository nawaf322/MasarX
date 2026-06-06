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

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest; // Need to create this request or use standard Request
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Route;
use App\Models\Organization;
use App\Services\SettingsService;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(Request $request): Response
    {
        // Only set url.intended when NOT already set (e.g. by public calculator saveIntent).
        if ($request->get('from') === 'rates' && !$request->session()->has('url.intended')) {
            $request->session()->put('url.intended', route('rates.calculator'));
        }

        // Check if ANY active org has the public calculator enabled
        $calculatorEnabled = false;
        try {
            $svc = app(SettingsService::class);
            foreach (Organization::where('is_active', true)->get(['id']) as $org) {
                if ((bool) $svc->forOrganization($org->id)->get('public_calculator', 'enabled', false)) {
                    $calculatorEnabled = true;
                    break;
                }
            }
        } catch (\Throwable) {}

        // Build customer portal registration URL from first active org
        $customerRegisterUrl = null;
        try {
            $org = Organization::where('is_active', true)->first();
            if ($org && $org->slug) {
                $customerRegisterUrl = route('customer.portal.register', ['slug' => $org->slug]);
            }
        } catch (\Throwable) {}

        return Inertia::render('Auth/Login', [
            'canResetPassword'       => Route::has('password.request'),
            'status'                 => session('status'),
            'publicCalculatorEnabled' => $calculatorEnabled,
            'customerRegisterUrl'    => $customerRegisterUrl,
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request): RedirectResponse|\Symfony\Component\HttpFoundation\Response
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            $request->session()->regenerate();

            // UI says "Remember for 30 days" — enforce that exactly.
            // Laravel's default remember cookie is 5 years; override to 30 days (43200 min).
            if ($remember) {
                $cookieName = Auth::guard('web')->getRecallerName();
                $cookieValue = Cookie::get($cookieName);
                if ($cookieValue) {
                    Cookie::queue(
                        Cookie::make($cookieName, $cookieValue, 43200, '/', null, true, true, false, 'lax')
                    );
                }
            }

            // Customers must use Inertia::location() to avoid the raw-302 → modal iframe error.
            // Inertia::location() sends 409 + X-Inertia-Location for XHR (full-page reload via
            // window.location.href), preventing handleNonInertiaResponse() from being called.
            // Staff/driver → dashboard; everyone else (customers, no-role users) → customer portal
            $user = Auth::user();
            $isStaff = $user->hasRole('super-admin') || $user->hasRole('admin') || $user->hasRole('Employee') || $user->hasRole('Driver');
            if (!$isStaff) {
                return Inertia::location(route('my-locker.index'));
            }

            return redirect()->intended(route('dashboard', absolute: false));
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Inertia::location() sends a 409 + X-Inertia-Location header which
        // forces the browser to do window.location.href (full-page reload),
        // bypassing the stale CSRF / session that causes "A server error occurred".
        return Inertia::location(route('login'));
    }
}
