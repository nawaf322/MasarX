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
use App\Models\Branch;
use App\Models\Country;
use App\Models\City;
use App\Models\State;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    public function index()
    {
        // BelongsToTenant global scope filters branches by current org automatically
        $branches = Branch::withCount('users')->latest()->get();
        $orgId = auth()->user()->organization_id;

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
        $stateIds = array_unique(array_column($states, 'id'));

        $cities = City::query()
            ->where('is_active', true)
            ->where(function ($q) use ($orgId, $stateIds) {
                $q->visibleToOrganization($orgId)
                    ->when(count($stateIds) > 0, fn ($q2) => $q2->orWhereIn('state_id', $stateIds));
            })
            ->orderBy('name')
            ->get(['id', 'state_id', 'name'])
            ->map(fn ($c) => [
                'id' => (int) $c->id,
                'state_id' => (int) $c->state_id,
                'name' => $c->name,
            ])
            ->values()
            ->all();

        return Inertia::render('Settings/Branches', [
            'branches' => $branches,
            'countries' => $countries,
            'states' => $states,
            'cities' => $cities,
        ]);
    }

    public function store(Request $request)
    {
        $orgId = auth()->user()->organization_id;

        $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('branches')->where('organization_id', $orgId)],
            'code' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);

        // organization_id set explicitly; BelongsToTenant also sets it on creating event
        Branch::create(array_merge(
            $request->only(['name', 'code', 'address', 'city', 'state', 'country']),
            ['organization_id' => $orgId]
        ));

        return response()->json(['success' => true, 'message' => 'Branch created successfully.']);
    }

    public function update(Request $request, Branch $branch)
    {
        $orgId = auth()->user()->organization_id;

        // IDOR protection: verify this branch belongs to the current tenant
        if ($branch->organization_id !== null && $branch->organization_id !== $orgId) {
            abort(403);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('branches')->ignore($branch->id)->where('organization_id', $orgId)],
            'code' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);

        $branch->update($request->only(['name', 'code', 'address', 'city', 'state', 'country']));

        return response()->json(['success' => true, 'message' => 'Branch updated successfully.']);
    }

    public function destroy(Branch $branch)
    {
        $orgId = auth()->user()->organization_id;

        // IDOR protection: verify this branch belongs to the current tenant
        if ($branch->organization_id !== null && $branch->organization_id !== $orgId) {
            abort(403);
        }

        // Strict Integrity Check
        if ($branch->users()->exists()) {
            return response()->json(['error' => 'Cannot delete branch: It has ' . $branch->users()->count() . ' active users assigned. Please reassign them first.'], 422);
        }

        $branch->delete();

        return response()->json(['success' => true, 'message' => 'Branch deleted successfully.']);
    }
}
