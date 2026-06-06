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
use App\Models\ShipmentStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class ShipmentStatusController extends Controller
{
    public function index()
    {
        $orgId = Auth::user()->organization_id;

        $statuses = ShipmentStatus::where('organization_id', $orgId)
            ->withCount('shipments')
            ->orderBy('order')
            ->orderBy('name')
            ->get();

        return Inertia::render('Settings/ShipmentStatuses', [
            'statuses' => $statuses,
        ]);
    }

    public function store(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('shipment_statuses')->where(function ($query) use ($orgId) {
                    return $query->where('organization_id', $orgId);
                })
            ],
            'icon' => 'required|string|max:50',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        ShipmentStatus::create([
            'organization_id' => $orgId,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'icon' => $validated['icon'],
            'color' => $validated['color'],
            'order' => $validated['order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json(['success' => true, 'message' => __('shipment_statuses.created')]);
    }

    public function update(Request $request, ShipmentStatus $shipmentStatus)
    {
        if ($shipmentStatus->organization_id !== Auth::user()->organization_id) {
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
                Rule::unique('shipment_statuses')->where(function ($query) use ($orgId) {
                    return $query->where('organization_id', $orgId);
                })->ignore($shipmentStatus->id)
            ],
            'icon' => 'required|string|max:50',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $shipmentStatus->update($validated);

        return response()->json(['success' => true, 'message' => __('shipment_statuses.updated')]);
    }

    public function destroy(ShipmentStatus $shipmentStatus)
    {
        if ($shipmentStatus->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $shipmentsCount = $shipmentStatus->shipments()->count();
        
        if ($shipmentsCount > 0) {
            return response()->json(['error' => __('shipment_statuses.cannot_delete', ['count' => $shipmentsCount])], 422);
        }

        $shipmentStatus->delete();

        return response()->json(['success' => true, 'message' => __('shipment_statuses.deleted')]);
    }
}
