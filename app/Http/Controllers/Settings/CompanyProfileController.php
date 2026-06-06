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
use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\SettingsService;
use App\Services\AuditService;
use Illuminate\Support\Facades\Auth;

class CompanyProfileController extends Controller
{
    protected $settings;
    protected $audit;

    public function __construct(SettingsService $settings, AuditService $audit)
    {
        $this->settings = $settings;
        $this->audit = $audit;
    }

    public function show()
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        $this->settings->forOrganization($orgId);
        $organization = Auth::user()->organization;
        $settings = $this->settings->getGroup('company');

        // Merge Organization Model data acting as Source of Truth
        // Priority: Model Columns > Settings JSON (fallback to settings when org is null)
        $settings['name'] = $organization?->name ?? $settings['name'] ?? '';
        $settings['legal_name'] = $organization?->legal_name ?? $settings['legal_name'] ?? '';
        $settings['tax_id'] = $organization?->tax_id ?? $settings['tax_id'] ?? '';
        $settings['email'] = $organization?->email ?? $settings['email'] ?? '';
        $settings['phone'] = $organization?->phone ?? $settings['phone'] ?? '';
        $settings['address'] = $organization?->address ?? $settings['address'] ?? '';
        $settings['city'] = $organization?->city ?? $settings['city'] ?? '';
        $settings['state'] = $organization?->state ?? $settings['state'] ?? '';
        $settings['country'] = $organization?->country ?? $settings['country'] ?? '';
        $settings['country_id'] = $organization?->country_id ?? null;
        $settings['state_id'] = $organization?->state_id ?? null;
        $settings['city_id'] = $organization?->city_id ?? null;

        $countries = Country::query()
            ->visibleToOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'iso2']);
        $countryIds = $countries->pluck('id')->all();

        // Estados: visibles para la org O que pertenezcan a un país visible (para que Colombia tenga estados)
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

        // Ciudades: visibles para la org O que pertenezcan a un estado ya cargado
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

        $portalUrl = $organization?->slug
            ? url(route('customer.portal.register', ['slug' => $organization->slug], false))
            : null;

        return Inertia::render('Settings/Company', [
            'settings'            => $settings,
            'countries'           => $countries,
            'states'              => $states,
            'cities'              => $cities,
            'customer_portal_url' => $portalUrl,
        ]);
    }

    public function update(Request $request)
    {
        // 1. Strict Validation
        $data = $request->validate([
            'name' => 'required|string|max:255', // Commercial Name
            'legal_name' => 'nullable|string|max:255', // Legal Identity
            'tax_id' => 'nullable|string|max:50', // NIT/RUC
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'address' => 'required|string|max:500',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:100',
            'country' => 'required|string|max:100',
            'country_id' => 'nullable|integer|exists:countries,id',
            'state_id' => 'nullable|integer|exists:states,id',
            'city_id' => 'nullable|integer|exists:cities,id',
        ]);

        $user  = Auth::user();
        $orgId = $user->organization_id;
        $organization = $user->organization;

        if (!$orgId || !$organization) {
            return response()->json(['error' => 'No organization assigned. Please contact support.'], 422);
        }

        $this->settings->forOrganization($orgId);
        $oldValues = $this->settings->getGroup('company');

        // 2. Sync Core Identity to Organization Model
        // We now have dedicated columns for these fields, so we save them directly to the model.
        // This makes the 'settings' JSON redundant for these specfic fields, but accurate.
        $organization->update([
            'name' => $data['name'],
            'legal_name' => $data['legal_name'],
            'tax_id' => $data['tax_id'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'website' => $data['website'],
            'address' => $data['address'],
            'city' => $data['city'],
            'state' => $data['state'],
            'country' => $data['country'],
            'country_id' => $data['country_id'] ?? null,
            'state_id' => $data['state_id'] ?? null,
            'city_id' => $data['city_id'] ?? null,
        ]);

        // 3. Save Extended Profile to Settings (Hybrid Storage)
        // We ensure 'website' is saved here since it's not in the main table yet (checked migration).
        // Also keeping others for backward compatibility if needed, or redundancy.
        foreach ($data as $key => $value) {
            $this->settings->set('company', $key, $value);
        }

        // 4. Audit Log
        $this->audit?->log(
            'updated',
            'settings',
            "Company Profile updated by {$user->name}",
            $oldValues,
            $data
        );

        return response()->json(['success' => true, 'message' => 'Perfil de la compañía actualizado exitosamente.']);
    }
}
