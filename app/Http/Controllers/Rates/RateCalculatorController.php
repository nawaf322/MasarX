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

namespace App\Http\Controllers\Rates;

use App\Http\Controllers\Controller;
use App\Models\Country;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Uses ShippingRateService.quoteRates (same as Wizard) to guarantee identical results.
 * Zone matching via shared RateZoneMatcher.
 */
class RateCalculatorController extends Controller
{
    public function index(Request $request)
    {
        $orgId = $request->user()?->organization_id;
        $cfg = $orgId ? app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($orgId) : [];
        return Inertia::render('Rates/Calculator', [
            'countries' => Country::select('id', 'name', 'iso2')->orderBy('name')->get(),
            'weight_unit' => $cfg['weight_unit'] ?? 'kg',
            'dimension_unit' => $cfg['dimension_unit'] ?? 'cm',
        ]);
    }

    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'origin_country_id' => 'required|exists:countries,id',
            'origin_state_id' => 'nullable|exists:states,id',
            'origin_city_id' => 'nullable|exists:cities,id',
            'dest_country_id' => 'required|exists:countries,id',
            'dest_state_id' => 'nullable|exists:states,id',
            'dest_city_id' => 'nullable|exists:cities,id',
            'weight' => 'required|numeric|min:0.1',
            'width' => 'nullable|numeric|min:0',
            'height' => 'nullable|numeric|min:0',
            'length' => 'nullable|numeric|min:0',
            'declared_value' => 'nullable|numeric|min:0',
        ]);

        $organizationId = $request->user()->organization_id;
        $cfg = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($organizationId);
        $origin = Country::find($validated['origin_country_id']);
        $dest = Country::find($validated['dest_country_id']);

        $length = (float) ($validated['length'] ?? 10);
        $width = (float) ($validated['width'] ?? 10);
        $height = (float) ($validated['height'] ?? 10);
        if ($length < 1) $length = 10;
        if ($width < 1) $width = 10;
        if ($height < 1) $height = 10;

        $payload = [
            'organization_id' => $organizationId,
            'sender_details' => [
                'country_code' => $origin->iso2 ?? $origin->name,
                'country' => $origin->name,
                'state_id' => $validated['origin_state_id'] ?? null,
                'city_id' => $validated['origin_city_id'] ?? null,
            ],
            'receiver_details' => [
                'country_code' => $dest->iso2 ?? $dest->name,
                'country' => $dest->name,
                'state_id' => $validated['dest_state_id'] ?? null,
                'city_id' => $validated['dest_city_id'] ?? null,
            ],
            'package_details' => [
                'weight' => (float) $validated['weight'],
                'length' => $length,
                'width' => $width,
                'height' => $height,
                'declared_value' => (float) ($validated['declared_value'] ?? 0),
                'pieces' => 1,
            ],
        ];

        $rateService = app(\App\Services\ShippingRateService::class);
        $allRates = $rateService->quoteRates($payload);

        // Include all local rates: rule-based (rate_card + zone) AND service-based (Settings > Services)
        $localRates = array_values(array_filter($allRates, fn ($r) =>
            ($r['carrier_code'] ?? '') === 'local' || isset($r['rate_rule_id'])
        ));
        $zoneName = $localRates[0]['zone_name'] ?? null;

        if (empty($localRates)) {
            return response()->json(['error' => 'No matching shipping zone or rate rules found for this route.'], 404);
        }

        $weight = (float) $validated['weight'];
        $volumetricDivisor = (float) ($cfg['volumetric_divisor'] ?? 5000);
        if ($volumetricDivisor < 1) $volumetricDivisor = 5000;
        $volumetricWeight = ($length * $width * $height) / $volumetricDivisor;

        $results = array_map(function ($r) {
            return [
                // Use human-readable name; service_code may carry internal prefix (svc_*)
                'service_type'    => $r['service_name'] ?? $r['service_code'] ?? 'Standard',
                'card_name'       => $r['carrier_name'] ?? $r['service_name'] ?? 'Local',
                'zone_name'       => $r['zone_name'] ?? null,
                'base_cost'       => $r['breakdown']['subtotal'] ?? $r['total_price'],
                'currency'        => $r['currency'] ?? 'USD',
                'total'           => $r['total_price'],
                'breakdown'       => $r['breakdown'] ?? [],
                'rate_rule_id'    => $r['rate_rule_id'] ?? null,
                'rate_card_id'    => $r['rate_card_id'] ?? null,
                'service_mode'    => $r['service_mode'] ?? null,
                'estimated_days'  => $r['estimated_days'] ?? null,
                'service_model_id' => $r['service_model_id'] ?? null,
            ];
        }, $localRates);

        return response()->json([
            'zone_name' => $zoneName ?? 'Internal',
            'inputs' => [
                'weight' => $weight,
                'length' => $length,
                'width' => $width,
                'height' => $height,
                'volumetric_weight' => round($volumetricWeight, 4),
                'declared_value' => (float) ($validated['declared_value'] ?? 0),
            ],
            'rates' => $results,
        ]);
    }
}
