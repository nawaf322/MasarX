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

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\Organization;
use App\Services\Settings\SettingsResolver;
use App\Services\SettingsService;
use App\Services\ShippingRateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PublicCalculatorController extends Controller
{
    private function activeOrg(): ?Organization
    {
        // If the user is authenticated, always use their own organization.
        if (Auth::check()) {
            return Auth::user()->organization ?? null;
        }

        // For public (unauthenticated) access: prefer an org with the calculator
        // explicitly enabled; fall back to the first active org.
        $svc = app(SettingsService::class);
        $orgs = Organization::where('is_active', true)->get();
        foreach ($orgs as $org) {
            if ((bool) $svc->forOrganization($org->id)->get('public_calculator', 'enabled', false)) {
                return $org;
            }
        }

        // Fallback: return the first active org so the page is always reachable
        return $orgs->first();
    }

    private function isEnabled(int $orgId): bool
    {
        return (bool) app(SettingsService::class)
            ->forOrganization($orgId)
            ->get('public_calculator', 'enabled', false);
    }

    public function show()
    {
        $org = $this->activeOrg();
        if (! $org) {
            abort(404);
        }

        // Block unauthenticated access when feature is disabled
        if (! Auth::check() && ! $this->isEnabled($org->id)) {
            abort(404);
        }

        $cfg = app(SettingsResolver::class)->getEffectiveSettings($org->id);

        return Inertia::render('PublicCalculator/Index', [
            'countries'      => Country::select('id', 'name', 'iso2')->orderBy('name')->get(),
            'weight_unit'    => $cfg['weight_unit']    ?? 'kg',
            'dimension_unit' => $cfg['dimension_unit'] ?? 'cm',
            'org_name'       => $org->name,
            'org_logo'       => $org->logo_url ? Storage::url($org->logo_url) : null,
        ]);
    }

    public function calculate(Request $request)
    {
        $org = $this->activeOrg();
        if (! $org || (! Auth::check() && ! $this->isEnabled($org->id))) {
            return response()->json(['error' => 'Service not available.'], 403);
        }

        $validated = $request->validate([
            'origin_country_id' => 'required|exists:countries,id',
            'origin_state_id'   => 'nullable|exists:states,id',
            'origin_city_id'    => 'nullable|exists:cities,id',
            'dest_country_id'   => 'required|exists:countries,id',
            'dest_state_id'     => 'nullable|exists:states,id',
            'dest_city_id'      => 'nullable|exists:cities,id',
            'weight'            => 'required|numeric|min:0.1',
            'width'             => 'nullable|numeric|min:0',
            'height'            => 'nullable|numeric|min:0',
            'length'            => 'nullable|numeric|min:0',
            'declared_value'    => 'nullable|numeric|min:0',
        ]);

        $origin = Country::find($validated['origin_country_id']);
        $dest   = Country::find($validated['dest_country_id']);

        $length = max(1.0, (float)($validated['length'] ?? 10));
        $width  = max(1.0, (float)($validated['width']  ?? 10));
        $height = max(1.0, (float)($validated['height'] ?? 10));

        $payload = [
            'organization_id' => $org->id,
            'sender_details'  => [
                'country_code' => $origin->iso2  ?? $origin->name,
                'country'      => $origin->name,
                'state_id'     => $validated['origin_state_id'] ?? null,
                'city_id'      => $validated['origin_city_id']  ?? null,
            ],
            'receiver_details' => [
                'country_code' => $dest->iso2 ?? $dest->name,
                'country'      => $dest->name,
                'state_id'     => $validated['dest_state_id'] ?? null,
                'city_id'      => $validated['dest_city_id']  ?? null,
            ],
            'package_details' => [
                'weight'         => (float)$validated['weight'],
                'length'         => $length,
                'width'          => $width,
                'height'         => $height,
                'declared_value' => (float)($validated['declared_value'] ?? 0),
                'pieces'         => 1,
            ],
        ];

        $rates = app(ShippingRateService::class)->quoteRates($payload);

        $local = array_values(array_filter($rates, fn($r) =>
            ($r['carrier_code'] ?? '') === 'local' || isset($r['rate_rule_id'])
        ));

        if (empty($local)) {
            return response()->json(['error' => 'No shipping rates available for this route.'], 404);
        }

        $vol = ($length * $width * $height) / 5000;

        return response()->json([
            'zone_name' => $local[0]['zone_name'] ?? 'Standard',
            'inputs'    => [
                'weight'            => (float)$validated['weight'],
                'length'            => $length,
                'width'             => $width,
                'height'            => $height,
                'volumetric_weight' => round($vol, 4),
                'declared_value'    => (float)($validated['declared_value'] ?? 0),
            ],
            'rates' => array_map(fn($r) => [
                'service_type'     => $r['service_name']     ?? $r['service_code']  ?? 'Standard',
                'service_code'     => $r['service_code']     ?? null,
                'card_name'        => $r['carrier_name']     ?? $r['service_name']  ?? 'Standard',
                'zone_name'        => $r['zone_name']        ?? null,
                'currency'         => $r['currency']         ?? 'USD',
                'total'            => $r['total_price'],
                'total_price'      => $r['total_price'],
                'breakdown'        => $r['breakdown']        ?? [],
                'rate_rule_id'     => $r['rate_rule_id']     ?? null,
                'rate_card_id'     => $r['rate_card_id']     ?? null,
                'service_mode'     => $r['service_mode']     ?? null,
                'estimated_days'   => $r['estimated_days']   ?? null,
                'service_model_id' => $r['service_model_id'] ?? null,
                'carrier_code'      => $r['carrier_code']     ?? 'local',
                'carrier_name'      => $r['carrier_name']     ?? null,
                // Always embed the org that priced this rate so ShipmentController
                // can recalculate via the correct context even when rate_rule_id is null.
                'calculator_org_id' => $org->id,
            ], $local),
        ]);
    }

    /**
     * Store calculator selection in session so that after login the user is taken
     * to the Create-From-Calculator form pre-filled with the chosen rate.
     */
    public function saveIntent(Request $request)
    {
        $request->validate([
            'rate_data'   => 'required|array',
            'calc_inputs' => 'required|array',
        ]);

        $request->session()->put('calculator_prefill', [
            'rate_data'   => $request->input('rate_data'),
            'calc_inputs' => $request->input('calc_inputs'),
            'saved_at'    => now()->timestamp,
        ]);
        $request->session()->put('url.intended', route('shipments.from-rate'));

        return response()->json(['redirect' => route('login')]);
    }
}
