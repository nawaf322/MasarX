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
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Database\UniqueConstraintViolationException;
use Inertia\Inertia;

class CountryController extends Controller
{
    public function index(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $query = Country::query()->visibleToOrganization($orgId);

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('iso2', 'like', '%' . $request->search . '%');
            });
        }

        $countries = $query->orderBy('name')->paginate($request->per_page ?? 15)->withQueryString();

        return Inertia::render('Locations/Countries', [
            'items' => $countries->items(),
            'meta' => [
                'current_page' => $countries->currentPage(),
                'last_page' => $countries->lastPage(),
                'per_page' => $countries->perPage(),
                'total' => $countries->total(),
                'from' => $countries->firstItem(),
                'to' => $countries->lastItem(),
            ],
            'query' => $request->all(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                \Illuminate\Validation\Rule::unique('countries')->where(function ($query) use ($user) {
                    return $query->where('organization_id', $user->organization_id);
                })
            ],
            'iso2' => [
                'required',
                'string',
                'size:2',
                \Illuminate\Validation\Rule::unique('countries')->where(function ($query) use ($user) {
                    return $query->where('organization_id', $user->organization_id);
                })
            ],
            'phone_code' => 'nullable|string',
            'currency' => 'nullable|string|size:3',
            'region' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $data['organization_id'] = $user->organization_id;
        try {
            Country::create($data);
        } catch (UniqueConstraintViolationException $e) {
            return redirect()->back()->withErrors([
                'iso2' => __('locations.validation.iso2_exists', ['code' => $data['iso2']]),
            ])->withInput();
        }
        return redirect()->back()->with('success', __('locations.country_created'));
    }

    public function update(Request $request, Country $country)
    {
        $this->authorizeUpdateCountry($country);

        $user = auth()->user();
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                \Illuminate\Validation\Rule::unique('countries')->where(function ($query) use ($country) {
                    return $query->where('organization_id', $country->organization_id);
                })->ignore($country->id)
            ],
            'iso2' => [
                'required',
                'string',
                'size:2',
                \Illuminate\Validation\Rule::unique('countries')->where(function ($query) use ($country) {
                    return $query->where('organization_id', $country->organization_id);
                })->ignore($country->id)
            ],
            'phone_code' => 'nullable|string',
            'currency' => 'nullable|string|size:3',
            'region' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $country->update($data);
        return redirect()->back()->with('success', __('locations.country_updated'));
    }

    public function destroy(Country $country)
    {
        $this->authorizeUpdateCountry($country);
        $country->delete();
        return redirect()->back()->with('success', __('locations.country_deleted'));
    }

    private function authorizeUpdateCountry(Country $country): void
    {
        // Solo bloquear si el país pertenece a otra organización
        if ($country->organization_id !== null && $country->organization_id !== auth()->user()->organization_id) {
            abort(403);
        }
    }
}
