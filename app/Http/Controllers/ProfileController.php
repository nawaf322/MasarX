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
use App\Models\State;
use App\Models\City;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status'          => session('status'),
            'countries'       => Country::where('is_active', true)
                ->where(fn ($q) => $q->whereNull('organization_id')->orWhere('organization_id', $orgId))
                ->orderBy('name')
                ->get(['id', 'name', 'iso2', 'phone_code']),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $validated = $request->validate([
            'phone'         => 'nullable|string|max:30',
            'address'       => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'country_id'    => 'nullable|integer|exists:countries,id',
            'state_id'      => 'nullable|integer|exists:states,id',
            'city_id'       => 'nullable|integer|exists:cities,id',
            'zip_code'      => 'nullable|string|max:20',
        ]);

        // Resolve text names from IDs
        if (!empty($validated['country_id'])) {
            $c = Country::find($validated['country_id']);
            $validated['country'] = $c?->name ?? '';
        }
        if (!empty($validated['state_id'])) {
            $validated['state'] = State::find($validated['state_id'])?->name ?? '';
        }
        if (!empty($validated['city_id'])) {
            $validated['city'] = City::find($validated['city_id'])?->name ?? '';
        }

        $request->user()->fill($validated)->save();

        session()->flash('success', 'Profile updated successfully.');
        return Inertia::location(route('profile.edit'));
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
