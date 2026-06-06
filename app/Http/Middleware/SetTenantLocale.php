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
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use App\Services\SettingsService;

class SetTenantLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            if (Auth::check()) {
                $user = Auth::user();

                // 1. User's personal preference (persists across logout)
                if (!empty($user->language)) {
                    App::setLocale($user->language);
                    return $next($request);
                }

                // 2. Organization settings (organization_settings table)
                $settings = app(SettingsService::class);
                $savedLocale = $settings->get('locale', 'language', null);

                if ($savedLocale) {
                    App::setLocale($savedLocale);
                } else {
                    // 3. Fallback: English — never use browser language so the
                    //    admin-configured locale is always respected.
                    App::setLocale('en');
                }
            }
        } catch (\Throwable) {
            // DB not available yet (e.g. during installation wizard) — skip locale detection
        }

        return $next($request);
    }
}
