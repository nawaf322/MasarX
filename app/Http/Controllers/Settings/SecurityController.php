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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Services\SettingsService;
use App\Services\AuditService;

class SecurityController extends Controller
{
    protected $settings;
    protected $audit;

    public function __construct(SettingsService $settings, AuditService $audit)
    {
        $this->settings = $settings;
        $this->audit = $audit;
    }

    public function show()
    {
        $orgId = Auth::user()->organization_id;
        return Inertia::render('Settings/Security', [
            'settings' => $this->settings->forOrganization($orgId)->getGroup('security'),
        ]);
    }

    public function update(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $this->settings->forOrganization($orgId);

        $data = $request->validate([
            'require_2fa_admin' => 'boolean',
            'password_expiry_days' => 'nullable|integer|min:0',
            'session_timeout_minutes' => 'required|integer|min:5',
            'ip_whitelist' => 'nullable|string',
            'allow_google_login' => 'boolean',
        ]);

        $oldValues = $this->settings->getGroup('security');

        if ($request->filled('ip_whitelist')) {
            $currentIp = $request->ip();
            $ips = array_values(array_filter(
                array_map('trim', explode(',', $request->ip_whitelist)),
                fn($ip) => filter_var($ip, FILTER_VALIDATE_IP) !== false
            ));

            if (!empty($ips) && !in_array($currentIp, $ips)) {
                return response()->json(['error' => "Security Protocol Error: You cannot exclude your current IP Address ({$currentIp}) from the whitelist. It has been retained for your safety."], 422);
            }

            // Save only valid IPs as a clean comma-separated string
            $data['ip_whitelist'] = empty($ips) ? null : implode(', ', $ips);
        }

        foreach ($data as $key => $value) {
            $this->settings->set('security', $key, $value);
        }

        $this->audit?->log('updated', 'settings', 'Security Settings', $oldValues, $data);

        return response()->json(['success' => true, 'message' => 'Security protocols enforced immediately.']);
    }
}
