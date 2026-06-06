<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\SettingsService;
use App\Services\AuditService;
use App\Models\Currency;

class BillingController extends Controller
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
        $orgId = \Illuminate\Support\Facades\Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        $this->settings->forOrganization($orgId);
        $effective = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($orgId);

        $currencies = Currency::where('is_active', true)
            ->orderByDesc('is_primary')
            ->orderBy('code')
            ->get(['code', 'name', 'symbol']);

        return Inertia::render('Settings/Billing', [
            'settings' => $this->settings->getGroup('billing'),
            'effective_tax' => ['tax_name' => $effective['tax_name'], 'tax_rate' => $effective['tax_rate']],
            'invoice_sequence' => \App\Models\NumberingSequence::where('organization_id', $orgId)
                ->where('type', 'invoice')
                ->first(),
            'currencies' => $currencies,
        ]);
    }

    public function update(Request $request)
    {
        // tax_rate and tax_name are managed in Shipping Configuration; not updated here
        $rules = [
            'tax_number' => 'nullable|string',
            'currency' => 'required|string',
            'invoice_terms' => 'nullable|string',
            'footer_notes' => 'nullable|string',
            'invoice_theme' => 'nullable|string|in:fedex,dhl',
            'stripe_enabled' => 'nullable|boolean',
            'stripe_test_mode' => 'nullable|boolean',
            'stripe_key' => 'nullable|string',
            'stripe_secret' => 'nullable|string',
            'paypal_enabled' => 'nullable|boolean',
            'paypal_test_mode' => 'nullable|boolean',
            'paypal_client_id' => 'nullable|string',
            'paypal_secret' => 'nullable|string',
            'signature_file' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        ];

        $data = $request->validate($rules);

        $oldValues = $this->settings->getGroup('billing');

        // Handle file upload first so signature is saved even if other keys are missing from FormData
        if ($request->hasFile('signature_file') && $request->file('signature_file')->isValid()) {
            $file = $request->file('signature_file');
            $path = $file->store('signatures', 'public');
            $this->settings->set('billing', 'signature_url', '/storage/' . $path);
        }

        foreach ($data as $key => $value) {
            if ($key === 'signature_file') {
                continue;
            }
            $this->settings->set('billing', $key, $value);
        }

        $auditData = $data;
        unset($auditData['signature_file']);
        $this->audit?->log('updated', 'settings', 'Billing Settings', $oldValues, $auditData);

        // Invalidate settings cache so all subsequent requests use the new values immediately
        \App\Services\Settings\SettingsResolver::forgetCache(\Illuminate\Support\Facades\Auth::user()->organization_id);

        return response()->json(['success' => true, 'message' => 'Billing settings updated.']);
    }
}
