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

namespace App\Http\Controllers\Shipments;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Services\Settings\SettingsResolver;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CreateFromCalculatorController extends Controller
{
    public function show(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        // Consume session prefill set by PublicCalculatorController::saveIntent()
        $sessionPrefill = $request->session()->pull('calculator_prefill');

        $cfg = app(SettingsResolver::class)->getEffectiveSettings($orgId);

        $billingSettings = app(SettingsService::class)
            ->forOrganization($orgId)
            ->getGroup('billing');

        $methods = [['id' => 'manual', 'label' => 'Manual', 'enabled' => true]];
        if (! empty($billingSettings['stripe_enabled']))  {
            $methods[] = ['id' => 'stripe',  'label' => 'Stripe',  'enabled' => true];
        }
        if (! empty($billingSettings['paypal_enabled'])) {
            $methods[] = ['id' => 'paypal',  'label' => 'PayPal',  'enabled' => true];
        }

        return Inertia::render('Shipments/CreateFromCalculator', [
            'countries' => Country::where('is_active', true)
                ->where(fn($q) => $q->whereNull('organization_id')->orWhere('organization_id', $orgId))
                ->orderBy('name')
                ->get(['id', 'name', 'iso2', 'phone_code']),
            'session_prefill'   => $sessionPrefill,
            'effectiveSettings' => [
                'currency'       => $cfg['currency']       ?? 'USD',
                'weight_unit'    => $cfg['weight_unit']    ?? 'kg',
                'dimension_unit' => $cfg['dimension_unit'] ?? 'cm',
            ],
            'paymentMethods' => $methods,
        ]);
    }
}
