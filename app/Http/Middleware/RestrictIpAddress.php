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
use App\Services\SettingsService;
use Illuminate\Support\Facades\Log;

class RestrictIpAddress
{
    protected $settings;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
    }

    public function handle(Request $request, Closure $next)
    {
        $raw = $this->settings->getGroup('security')['ip_whitelist'] ?? '';

        // Normalize: handle null, arrays, or the literal string "null"
        if (is_array($raw)) {
            $raw = implode(',', $raw);
        }
        $whitelist = trim((string) $raw);

        // If empty or only contains the placeholder/null literal, allow all
        if ($whitelist === '' || $whitelist === 'null') {
            return $next($request);
        }

        // Parse and keep only valid IP addresses (filter out garbage/private placeholder values)
        $ips = array_values(array_filter(
            array_map('trim', explode(',', $whitelist)),
            fn($ip) => filter_var($ip, FILTER_VALIDATE_IP) !== false
        ));

        // If no valid IPs remain after filtering, allow all
        if (empty($ips)) {
            return $next($request);
        }

        $clientIp = $request->ip();

        if (!in_array($clientIp, $ips)) {
            Log::warning("Unauthorized Access Attempt blocked from IP: {$clientIp}");

            // NOTIFY ADMINS / SECURITY OFFICER
            $orgId = $request->user()?->organization_id;
            if ($orgId) {
                $admins = \App\Models\User::role(['admin', 'super-admin'])
                    ->where('organization_id', $orgId)
                    ->get();
                foreach ($admins as $admin) {
                    $admin->notify(new \App\Notifications\SecurityAlertNotification($clientIp, $request->header('User-Agent')));
                }
            } elseif ($request->user()) {
                $request->user()->notify(new \App\Notifications\SecurityAlertNotification($clientIp, $request->header('User-Agent')));
            }

            abort(403, 'Access Denied: Your IP address is not authorized to access this system. Use the VPN.');
        }

        return $next($request);
    }
}
