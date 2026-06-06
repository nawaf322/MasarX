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
use App\Models\NumberingSequence;
use App\Services\AuditService;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ShippingConfigController extends Controller
{
    protected SettingsService $settings;
    protected AuditService $audit;

    public function __construct(SettingsService $settings, AuditService $audit)
    {
        $this->settings = $settings;
        $this->audit = $audit;
    }

    public function show()
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        $this->settings->forOrganization($orgId);

        $shippingConfig = $this->settings->getGroup('shipping_config');
        $sequences = NumberingSequence::where('organization_id', $orgId)
            ->whereIn('type', ['invoice', 'tracking'])
            ->get()
            ->keyBy('type');

        $invoiceSequence = $sequences->get('invoice');
        $trackingSequence = $sequences->get('tracking');

        return Inertia::render('Settings/ShippingConfig', [
            'settings' => [
                'tax_name' => $shippingConfig['tax_name'] ?? null,
                'tax_rate' => $shippingConfig['tax_rate'] ?? null,
                'weight_unit' => $shippingConfig['weight_unit'] ?? null,
                'dimension_unit' => $shippingConfig['dimension_unit'] ?? null,
                'volumetric_divisor' => $shippingConfig['volumetric_divisor'] ?? null,
                'base_surcharge' => $shippingConfig['base_surcharge'] ?? null,
                'fuel_surcharge_percent' => $shippingConfig['fuel_surcharge_percent'] ?? null,
                'insurance_percent' => $shippingConfig['insurance_percent'] ?? null,
                'default_base_price' => $shippingConfig['default_base_price'] ?? null,
                'default_price_per_kg' => $shippingConfig['default_price_per_kg'] ?? null,
            ],
            'invoice_sequence' => $invoiceSequence ? [
                'prefix' => $invoiceSequence->prefix,
                'suffix' => $invoiceSequence->suffix,
                'padding' => $invoiceSequence->padding,
                'next_number' => $invoiceSequence->next_number,
                'reset_rule' => $invoiceSequence->reset_rule ?? 'never',
            ] : ['prefix' => 'INV', 'suffix' => '', 'padding' => 6, 'next_number' => 1, 'reset_rule' => 'never'],
            'tracking_sequence' => $trackingSequence ? [
                'prefix' => $trackingSequence->prefix,
                'suffix' => $trackingSequence->suffix,
                'padding' => $trackingSequence->padding,
                'next_number' => $trackingSequence->next_number,
                'reset_rule' => $trackingSequence->reset_rule ?? 'never',
            ] : ['prefix' => 'TRK', 'suffix' => '', 'padding' => 8, 'next_number' => 1, 'reset_rule' => 'never'],
        ]);
    }

    public function update(Request $request)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        $this->settings->forOrganization($orgId);

        $data = $request->validate([
            'tax_name' => 'nullable|string|max:100',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'weight_unit' => 'nullable|string|in:kg,lb',
            'dimension_unit' => 'nullable|string|in:cm,in',
            'volumetric_divisor' => 'nullable|numeric|min:1',
            'base_surcharge' => 'nullable|numeric|min:0',
            'fuel_surcharge_percent' => 'nullable|numeric|min:0',
            'insurance_percent' => 'nullable|numeric|min:0',
            'default_base_price' => 'nullable|numeric|min:0',
            'default_price_per_kg' => 'nullable|numeric|min:0',
        ]);

        $oldValues = $this->settings->getGroup('shipping_config');

        foreach ($data as $key => $value) {
            if ($value !== null && $value !== '') {
                $this->settings->set('shipping_config', $key, $value);
            }
        }

        $this->audit?->log('updated', 'settings', 'Shipping Configuration', $oldValues, $data);

        return response()->json(['success' => true, 'message' => __('settings.shipping_config.saved')]);
    }

    public function updateSequence(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string|in:invoice,tracking',
            'prefix' => 'nullable|string|max:10',
            'suffix' => 'nullable|string|max:10',
            'padding' => 'required|integer|min:3|max:12',
            'next_number' => 'required|integer|min:1',
            'reset_rule' => 'nullable|string|in:never,daily,monthly,yearly',
        ]);

        $orgId = Auth::user()->organization_id;

        NumberingSequence::updateOrCreate(
            [
                'organization_id' => $orgId,
                'type' => $data['type'],
            ],
            [
                'prefix' => $data['prefix'] ?? '',
                'suffix' => $data['suffix'] ?? '',
                'padding' => (int) $data['padding'],
                'next_number' => (int) $data['next_number'],
                'reset_rule' => $data['reset_rule'] ?? 'never',
            ]
        );

        $this->audit?->log('updated', 'settings', "Shipping Config Sequence: {$data['type']}", null, $data);

        return response()->json(['success' => true, 'message' => __('settings.shipping_config.sequence_saved')]);
    }
}
