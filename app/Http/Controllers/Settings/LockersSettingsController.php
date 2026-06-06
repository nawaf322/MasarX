<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\LockerCodeService;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LockersSettingsController extends Controller
{
    public function __construct(
        protected SettingsService   $settings,
        protected LockerCodeService $lockerCode,
    ) {}

    public function show()
    {
        $orgId = Auth::user()->organization_id;
        $cfg   = $this->lockerCode->getSettings($orgId);

        return Inertia::render('Settings/Lockers', [
            'settings' => $cfg,
            'preview'  => $this->lockerCode->preview($orgId),
        ]);
    }

    public function update(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'code_prefix' => 'required|string|max:10|regex:/^[A-Z0-9]+$/i',
            'code_format' => 'required|in:random,sequential',
            'code_length' => 'required|integer|min:4|max:12',
        ]);

        $this->settings->forOrganization($orgId);
        $this->settings->set('lockers', 'code_prefix', strtoupper($validated['code_prefix']));
        $this->settings->set('lockers', 'code_format', $validated['code_format']);
        $this->settings->set('lockers', 'code_length', (int) $validated['code_length']);

        return response()->json(['success' => true, 'message' => __('settings.lockers.saved')]);
    }

    /**
     * JSON endpoint: return a fresh code preview.
     * GET /settings/lockers/preview
     */
    public function previewCode()
    {
        $orgId = Auth::user()->organization_id;
        return response()->json([
            'code'    => $this->lockerCode->generate($orgId),
            'preview' => $this->lockerCode->preview($orgId),
        ]);
    }
}
