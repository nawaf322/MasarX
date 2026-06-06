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

use App\Services\LicenseVerificationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        $installedFile = storage_path('framework/.installed');
        $isInstalled   = is_file($installedFile);
        $isInstallRoute = $request->routeIs('install.*');

        // Not installed and not on install route → redirect to wizard
        if (!$isInstalled && !$isInstallRoute) {
            return redirect()->route('install.step1');
        }

        // Already installed and trying to access install route → 404
        if ($isInstalled && $isInstallRoute) {
            abort(404);
        }

        // Installed — verify license is active (fail silently on install routes)
        if ($isInstalled && !$isInstallRoute) {
            try {
                /** @var LicenseVerificationService $licSvc */
                $licSvc = app(LicenseVerificationService::class);
                if ($licSvc->getHash() === '') {
                    abort(503, 'License file not found or is corrupt. Please restore storage/framework/license.php from your backup or contact support at soporte@coddingpro.com.');
                }
            } catch (\Throwable) {
                // Do not block on service container issues during boot
            }
        }

        return $next($request);
    }
}
