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

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Http\Request;

class LocationsController extends Controller
{
    public function countries(Request $request)
    {
        $orgId = $request->user()->organization_id;
        $query = Country::query()->visibleToOrganization($orgId);

        if ($request->has('q')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->q . '%')
                    ->orWhere('iso2', 'like', '%' . $request->q . '%');
            });
        }

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json(
            $query->orderBy('name')
                ->paginate($request->per_page ?? 100)
        );
    }

    public function states(Request $request)
    {
        $orgId = $request->user()->organization_id;
        $query = State::query()->visibleToOrganization($orgId);

        if ($request->has('country_id')) {
            $query->where('country_id', $request->country_id);
        }

        if ($request->has('q')) {
            $query->where('name', 'like', '%' . $request->q . '%');
        }

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json(
            $query->orderBy('name')
                ->paginate($request->per_page ?? 100)
        );
    }

    public function cities(Request $request)
    {
        $orgId = $request->user()->organization_id;
        $query = City::query()->visibleToOrganization($orgId);

        if ($request->has('state_id')) {
            $query->where('state_id', $request->state_id);
        }

        if ($request->has('q')) {
            $query->where('name', 'like', '%' . $request->q . '%');
        }

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json(
            $query->orderBy('name')
                ->paginate($request->per_page ?? 50)
        );
    }

    // Keeping Store methods compatible with route definitions just in case, 
    // but typically management is done via Web Controllers now.
    public function storeCountry(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|unique:countries,name',
            'iso2' => 'required|string|size:2|unique:countries,iso2',
            'phone_code' => 'nullable|string',
            'currency' => 'nullable|string|size:3',
            'region' => 'nullable|string'
        ]);
        return response()->json(Country::create($data), 201);
    }

    public function storeState(Request $request)
    {
        $data = $request->validate([
            'country_id' => 'required|exists:countries,id',
            'name' => 'required|string',
            'iso2' => 'nullable|string'
        ]);
        return response()->json(State::create($data), 201);
    }

    public function storeCity(Request $request)
    {
        $data = $request->validate([
            'state_id' => 'required|exists:states,id',
            'name' => 'required|string'
        ]);
        return response()->json(City::create($data), 201);
    }
}
