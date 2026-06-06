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

namespace App\Http\Controllers\Locations;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\State;
use App\Models\Country;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CityController extends Controller
{
    public function index(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $query = City::query()->visibleToOrganization($orgId)->with(['state.country']);

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('state_id') && $request->state_id !== 'all') {
            $query->where('state_id', $request->state_id);
        }

        $cities = $query->orderBy('name')->paginate($request->per_page ?? 15)->withQueryString();

        // Países y estados para el modal Crear/Editar (sin depender de API)
        $countries = Country::query()
            ->visibleToOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'iso2']);
        $countryIds = $countries->pluck('id')->all();

        $states = State::query()
            ->where('is_active', true)
            ->where(function ($q) use ($orgId, $countryIds) {
                $q->visibleToOrganization($orgId)
                    ->when(count($countryIds) > 0, fn ($q2) => $q2->orWhereIn('country_id', $countryIds));
            })
            ->orderBy('name')
            ->get(['id', 'country_id', 'name', 'iso2'])
            ->map(fn ($s) => [
                'id' => (int) $s->id,
                'country_id' => (int) $s->country_id,
                'name' => $s->name,
                'iso2' => $s->iso2,
            ])
            ->values()
            ->all();

        return Inertia::render('Locations/Cities', [
            'items' => $cities->items(),
            'meta' => [
                'current_page' => $cities->currentPage(),
                'last_page' => $cities->lastPage(),
                'per_page' => $cities->perPage(),
                'total' => $cities->total(),
                'from' => $cities->firstItem(),
                'to' => $cities->lastItem(),
            ],
            'query' => $request->all(),
            'filters' => $request->only(['search', 'state_id']),
            'countries' => $countries,
            'states' => $states,
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $data = $request->validate([
            'state_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('states', 'id')->where(function ($query) use ($user) {
                    $query->whereNull('organization_id')->orWhere('organization_id', $user->organization_id);
                })
            ],
            'name' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'timezone' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        // Unique check
        if (City::byOrganization()->where('state_id', $data['state_id'])->where('name', $data['name'])->exists()) {
            return redirect()->back()->withErrors(['name' => __('locations.validation.name_exists_city')]);
        }

        $state = State::find($data['state_id']);
        $data['country_id'] = $state->country_id;
        $data['organization_id'] = $user->organization_id;

        City::create($data);
        return redirect()->back()->with('success', __('locations.city_created'));
    }

    public function update(Request $request, City $city)
    {
        $this->authorizeUpdateCity($city);

        $user = auth()->user();
        $data = $request->validate([
            'state_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('states', 'id')->where(function ($query) use ($user) {
                    $query->whereNull('organization_id')->orWhere('organization_id', $user->organization_id);
                })
            ],
            'name' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'timezone' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        // Unique check
        if (
            City::byOrganization()
                ->where('state_id', $data['state_id'])
                ->where('name', $data['name'])
                ->where('id', '!=', $city->id)
                ->exists()
        ) {
            return redirect()->back()->withErrors(['name' => __('locations.validation.name_exists_city')]);
        }

        $state = State::find($data['state_id']);
        $data['country_id'] = $state->country_id;

        $city->update($data);
        return redirect()->back()->with('success', __('locations.city_updated'));
    }

    public function destroy(City $city)
    {
        $this->authorizeUpdateCity($city);
        $city->delete();
        return redirect()->back()->with('success', __('locations.city_deleted'));
    }

    private function authorizeUpdateCity(City $city): void
    {
        if ($city->organization_id !== null && $city->organization_id !== auth()->user()->organization_id) {
            abort(403);
        }
    }
}
