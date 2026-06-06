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
use App\Models\RateZone;
use App\Models\Country;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RateZoneController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 10), 50);
        $zones = RateZone::with(['originCountry', 'destCountry', 'originState', 'destState'])
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Rates/Zones/Index', [
            'zones' => $zones,
            'filters' => $request->all(['search']),
            'countries' => Country::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'origin_country_id' => 'required|exists:countries,id',
            'origin_state_id' => 'nullable|exists:states,id',
            'origin_city_id' => 'nullable|exists:cities,id',
            'dest_country_id' => 'required|exists:countries,id',
            'dest_state_id' => 'nullable|exists:states,id',
            'dest_city_id' => 'nullable|exists:cities,id',
        ]);

        RateZone::create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id
        ]));

        return redirect()->back()->with('success', 'Zone created successfully.');
    }

    public function update(Request $request, RateZone $zone)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'origin_country_id' => 'required|exists:countries,id',
            'origin_state_id' => 'nullable|exists:states,id',
            'origin_city_id' => 'nullable|exists:cities,id',
            'dest_country_id' => 'required|exists:countries,id',
            'dest_state_id' => 'nullable|exists:states,id',
            'dest_city_id' => 'nullable|exists:cities,id',
            'active' => 'boolean'
        ]);

        $zone->update($validated);

        return redirect()->back()->with('success', 'Zone updated successfully.');
    }

    public function destroy(RateZone $zone)
    {
        $zone->delete();
        return redirect()->back()->with('success', 'Zone deleted successfully.');
    }
}
