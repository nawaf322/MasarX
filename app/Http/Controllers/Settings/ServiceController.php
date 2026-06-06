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
use App\Models\Service;
use App\Models\Currency;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class ServiceController extends Controller
{
    public function index()
    {
        $orgId = Auth::user()->organization_id;

        $services = Service::where('organization_id', $orgId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $currencies = Currency::where('is_active', true)
            ->orderByDesc('is_primary')
            ->orderBy('code')
            ->get(['code', 'name', 'symbol'])
            ->map(fn ($c) => ['code' => $c->code, 'name' => $c->name, 'symbol' => $c->symbol]);

        return Inertia::render('Settings/Services', [
            'services' => $services,
            'currencies' => $currencies,
        ]);
    }

    public function store(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('services')->where(function ($query) use ($orgId) {
                    return $query->where('organization_id', $orgId);
                })
            ],
            'mode' => ['required', 'string', Rule::in(Service::MODES)],
            'description' => 'nullable|string|max:500',
            'base_price' => 'nullable|numeric|min:0|max:999999.99',
            'price_per_kg' => 'nullable|numeric|min:0|max:999999.99',
            'currency' => ['nullable', 'string', 'size:3', Rule::exists('currencies', 'code')->where('is_active', true)],
            'estimated_days' => 'nullable|integer|min:1|max:365',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        Service::create([
            'organization_id' => $orgId,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'mode' => $validated['mode'],
            'description' => $validated['description'] ?? null,
            'base_price' => $validated['base_price'] ?? 5.00,
            'price_per_kg' => $validated['price_per_kg'] ?? 2.00,
            'currency' => $validated['currency'] ?? 'USD',
            'estimated_days' => $validated['estimated_days'] ?? 3,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json(['success' => true, 'message' => __('services.created')]);
    }

    public function update(Request $request, Service $service)
    {
        if ($service->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('services')->where(function ($query) use ($orgId) {
                    return $query->where('organization_id', $orgId);
                })->ignore($service->id)
            ],
            'mode' => ['required', 'string', Rule::in(Service::MODES)],
            'description' => 'nullable|string|max:500',
            'base_price' => 'nullable|numeric|min:0|max:999999.99',
            'price_per_kg' => 'nullable|numeric|min:0|max:999999.99',
            'currency' => ['nullable', 'string', 'size:3', Rule::exists('currencies', 'code')->where('is_active', true)],
            'estimated_days' => 'nullable|integer|min:1|max:365',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $service->update($validated);

        return response()->json(['success' => true, 'message' => __('services.updated')]);
    }

    public function destroy(Service $service)
    {
        if ($service->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $service->delete();

        return response()->json(['success' => true, 'message' => __('services.deleted')]);
    }

    /**
     * Toggle active status (activar/desactivar).
     */
    public function toggleActive(Service $service)
    {
        if ($service->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $service->update(['is_active' => !$service->is_active]);

        return response()->json(['success' => true, 'message' => $service->is_active ? __('services.activated') : __('services.deactivated')]);
    }
}
