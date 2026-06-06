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
use App\Services\UpdateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UpdateController extends Controller
{
    public function __construct(private UpdateService $updater) {}

    /** Show update page */
    public function index()
    {
        $cached    = Cache::get('update.available');
        $lastCheck = Cache::get('update.last_check');

        return Inertia::render('Settings/Updates', [
            'current_version'  => config('version.current'),
            'has_license'      => $this->updater->hasLicense(),
            'cached_update'    => $cached,
            'last_check'       => $lastCheck,
            'license_expired'  => (bool) session('license_expired'),
        ]);
    }

    /** Activate license (purchase code + client name) */
    public function activate(Request $request)
    {
        $request->validate([
            'license_code' => 'required|string|min:10|max:80',
            'client_name'  => 'required|string|min:2|max:120',
        ]);

        $result = $this->updater->activateLicense(
            trim($request->license_code),
            trim($request->client_name)
        );

        if (empty($result['status'])) {
            return response()->json(['error' => $result['message'] ?? 'Activation failed.'], 422);
        }

        return response()->json(['success' => true, 'message' => 'License activated successfully!']);
    }

    /** Check for available updates */
    public function check()
    {
        if (!$this->updater->hasLicense()) {
            return response()->json(['error' => 'Please activate your license first.'], 422);
        }

        $result = $this->updater->checkForUpdate();

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 422);
        }

        Cache::put('update.last_check', now()->toIso8601String(), now()->addHours(12));

        if ($result['has_update']) {
            Cache::put('update.available', $result, now()->addHours(12));
        } else {
            Cache::forget('update.available');
        }

        // License expired: client can SEE the notification but cannot download
        if (!empty($result['license_expired'])) {
            return response()->json(['success' => true, 'update_info' => $result, 'license_expired' => true]);
        }

        return response()->json(['success' => true, 'update_info' => $result]);
    }

    /** Apply the update */
    public function apply(Request $request)
    {
        if (!Auth::user()->hasRole(['super-admin', 'admin'])) {
            abort(403, 'Only admins can apply updates.');
        }

        $request->validate([
            'update_id'   => 'required|string',
            'new_version' => 'required|string|regex:/^v?\d+\.\d+\.\d+$/',
            'has_sql'     => 'boolean',
        ]);

        Log::info('[Update] Applying v' . $request->new_version . ' — user #' . Auth::id());

        $result = $this->updater->applyUpdate(
            $request->update_id,
            ltrim($request->new_version, 'v'),
            (bool) $request->has_sql
        );

        if (!$result['success']) {
            return response()->json(['error' => $result['error'] ?? 'Update failed.'], 500);
        }

        return response()->json(['success' => true, 'new_version' => $result['new_version']]);
    }

    /** Progress polling endpoint */
    public function progress()
    {
        return response()->json($this->updater->getProgress());
    }

    /** Deactivate license */
    public function deactivate()
    {
        if (!Auth::user()->hasRole('super-admin')) abort(403);

        $result = $this->updater->deactivateLicense();

        Cache::forget('update.available');
        Cache::forget('update.last_check');

        if ($result['status']) {
            return response()->json(['success' => true, 'message' => $result['message'] ?? 'License deactivated.']);
        }
        return response()->json(['error' => $result['message'] ?? 'Deactivation failed.'], 422);
    }
}
