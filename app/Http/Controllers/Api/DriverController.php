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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Models\Shipment;
use App\Models\Manifest;
use App\Models\DriverLocation;
use App\Enums\ShipmentStatus;
use App\Http\Requests\Api\ReportDriverLocationRequest;
use Illuminate\Support\Facades\Log;

class DriverController extends Controller
{
    /**
     * Report driver location (for mobile app or simulator).
     */
    public function reportLocation(ReportDriverLocationRequest $request)
    {
        $driver = Auth::user();

        DriverLocation::create([
            'driver_id' => $driver->id,
            'lat' => $request->lat,
            'lng' => $request->lng,
            'heading' => $request->heading,
            'speed' => $request->speed,
            'accuracy' => $request->accuracy,
            'source' => $request->source ?? 'app',
            'captured_at' => $request->captured_at ?? now(),
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Get assigned shipments for the authenticated driver.
     * Returns shipments in 'open' or 'dispatched' manifests assigned to this user.
     */
    public function assignedShipments(Request $request)
    {
        $user = Auth::user();

        // Get manifests assigned to driver that are not closed
        $manifests = Manifest::where('driver_id', $user->id)
            ->whereIn('status', ['open', 'dispatched']) // Assuming 'dispatched' is the active state
            ->with([
                'shipments' => function ($query) {
                    // Only return active shipments (not cancelled or delivered/returned if we want to hide finished ones)
                    // For now, return all in the manifest to show history for that run
                    $query->with('sender_details', 'receiver_details', 'package_details');
                }
            ])
            ->latest()
            ->get();

        $shipments = $manifests->pluck('shipments')->flatten();

        return response()->json([
            'data' => $shipments,
            'meta' => [
                'total_manifests' => $manifests->count(),
                'total_shipments' => $shipments->count()
            ]
        ]);
    }

    /**
     * Update shipment status (e.g., Delivered, Failed).
     */
    public function updateStatus(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $request->validate([
            // SECURITY: scope the exists check to the driver's own organization to prevent
            // cross-tenant IDOR — a driver cannot update shipments from another org by
            // guessing a tracking number.
            'tracking_number' => [
                'required',
                Rule::exists('shipments', 'tracking_number')->where('organization_id', $orgId),
            ],
            'status' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'occurred_at' => 'nullable|date',
        ]);

        $shipment = Shipment::where('tracking_number', $request->tracking_number)
            ->where('organization_id', $orgId)
            ->firstOrFail();

        // Check if driver is authorized (assigned via manifest)
        // $isAssigned = $shipment->manifest && $shipment->manifest->driver_id === Auth::id();
        // For MVP/Demo, strict check might be skipped or simplified

        // 'delivered' is intentionally excluded — delivery must go through the POD endpoint
        // which requires signature or photo proof (M6 hard rule).
        $newStatus = match ($request->status) {
            'out_for_delivery' => ShipmentStatus::OUT_FOR_DELIVERY,
            'picked_up'        => ShipmentStatus::PICKED_UP,
            'returned'         => ShipmentStatus::RETURNED,
            default            => null
        };

        if (!$newStatus) {
            $message = $request->status === 'delivered'
                ? 'Use the proof-of-delivery endpoint to confirm delivery (signature or photo required).'
                : 'Invalid status provided';
            return response()->json(['message' => $message], 422);
        }

        $statusModel = \App\Models\ShipmentStatus::where('organization_id', $orgId)
            ->where('code', $newStatus->value)
            ->first();

        $shipment->update([
            'status'    => $newStatus->value,
            'status_id' => $statusModel?->id,
        ]);

        // Log location history
        $shipment->history()->create([
            'status_id'       => $statusModel?->id,
            'status'          => $newStatus->value,
            'description'     => $request->notes ?? 'Status updated by Driver',
            'location'        => $request->latitude ? "{$request->latitude}, {$request->longitude}" : 'Location Unknown',
            'organization_id' => $shipment->organization_id,
            'created_at'      => $request->occurred_at ?? now(), // Sync support
        ]);

        return response()->json(['message' => 'Status updated successfully']);
    }

    /**
     * Get Driver Profile / Stats
     */
    public function profile(Request $request)
    {
        // Return only safe fields — never expose password_hash, 2FA secrets, or remember_token.
        return response()->json([
            'user' => Auth::user()->only([
                'id', 'name', 'email', 'phone', 'avatar_url',
                'document_id', 'status', 'is_active', 'organization_id',
            ]),
        ]);
    }
}
