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
use App\Models\Currency;
use App\Models\RateCard;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RateCardController extends Controller
{
    public function index(Request $request)
    {
        $orgId = $request->user()?->organization_id;
        $cfg = $orgId ? app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($orgId) : [];

        $perPage = min((int) $request->input('per_page', 10), 50);
        $cards = RateCard::withCount('rules')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $currencies = Currency::where('is_active', true)
            ->orderByDesc('is_primary')
            ->orderBy('code')
            ->get(['code', 'name', 'symbol']);

        return Inertia::render('Rates/Cards/Index', [
            'cards' => $cards,
            'currencies' => $currencies,
            'filters' => $request->all(['search']),
            'defaultVolumetricDivisor' => (int) ($cfg['volumetric_divisor'] ?? 5000),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'currency' => 'required|string|size:3',
            'chargeable_weight_rule' => 'required|in:actual,volumetric,max',
            'volumetric_divisor' => 'nullable|integer|min:1',
        ]);

        RateCard::create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id
        ]));

        return redirect()->back()->with('success', 'Rate Card created successfully.');
    }

    public function update(Request $request, RateCard $card)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'currency' => 'required|string|size:3',
            'chargeable_weight_rule' => 'required|in:actual,volumetric,max',
            'volumetric_divisor' => 'nullable|integer|min:1',
            'active' => 'boolean'
        ]);

        $card->update($validated);

        return redirect()->back()->with('success', 'Rate Card updated successfully.');
    }

    public function destroy(RateCard $card)
    {
        $card->delete();
        return redirect()->back()->with('success', 'Rate Card deleted successfully.');
    }
}
