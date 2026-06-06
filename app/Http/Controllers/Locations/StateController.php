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
use App\Models\State;
use App\Models\Country;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StateController extends Controller
{
    public function index(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $query = State::query()->visibleToOrganization($orgId)->with('country');

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('country_id') && $request->country_id !== 'all') {
            $query->where('country_id', $request->country_id);
        }

        $states = $query->orderBy('name')->paginate($request->per_page ?? 15)->withQueryString();

        return Inertia::render('Locations/States', [
            'items' => $states->items(),
            'meta' => [
                'current_page' => $states->currentPage(),
                'last_page' => $states->lastPage(),
                'per_page' => $states->perPage(),
                'total' => $states->total(),
                'from' => $states->firstItem(),
                'to' => $states->lastItem(),
            ],
            'query' => $request->all(),
            'countries' => Country::query()->visibleToOrganization($orgId)->select('id', 'name')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'country_id']),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $data = $request->validate([
            'country_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('countries', 'id')->where(function ($query) use ($user) {
                    $query->whereNull('organization_id')->orWhere('organization_id', $user->organization_id);
                })
            ],
            'name' => 'required|string',
            'code' => 'nullable|string',
            'iso2' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        // Unique check
        if (State::byOrganization()->where('country_id', $data['country_id'])->where('name', $data['name'])->exists()) {
            return redirect()->back()->withErrors(['name' => __('locations.validation.name_exists_state')]);
        }

        $data['organization_id'] = $user->organization_id;
        State::create($data);
        return redirect()->back()->with('success', __('locations.state_created'));
    }

    public function update(Request $request, State $state)
    {
        $this->authorizeUpdateState($state);

        $user = auth()->user();
        $data = $request->validate([
            'country_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('countries', 'id')->where(function ($query) use ($user) {
                    $query->whereNull('organization_id')->orWhere('organization_id', $user->organization_id);
                })
            ],
            'name' => 'required|string',
            'code' => 'nullable|string',
            'iso2' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        // Unique check exclusion
        if (
            State::byOrganization()
                ->where('country_id', $data['country_id'])
                ->where('name', $data['name'])
                ->where('id', '!=', $state->id)
                ->exists()
        ) {
            return redirect()->back()->withErrors(['name' => __('locations.validation.name_exists_state')]);
        }

        $state->update($data);
        return redirect()->back()->with('success', __('locations.state_updated'));
    }

    public function destroy(State $state)
    {
        $this->authorizeUpdateState($state);
        $state->delete();
        return redirect()->back()->with('success', __('locations.state_deleted'));
    }

    private function authorizeUpdateState(State $state): void
    {
        if ($state->organization_id !== null && $state->organization_id !== auth()->user()->organization_id) {
            abort(403);
        }
    }
}
