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

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Manifest;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class WarehouseApiController extends Controller
{
    private function orgId(): int
    {
        $token = request()->attributes->get('api_token');
        return $token?->organization_id ?? Auth::user()->organization_id;
    }

    private function hasScope(string $scope): bool
    {
        $token = request()->user()?->currentAccessToken();
        if (!$token || !method_exists($token, 'hasScope')) {
            return true; // Session-based auth: allow
        }
        return $token->hasScope($scope);
    }

    public function indexManifests(Request $request)
    {
        if (!$this->hasScope('warehouse.view')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }

        $orgId     = $this->orgId();
        $manifests = Manifest::where('organization_id', $orgId)
            ->with('shipments')
            ->paginate(20);

        return response()->json($manifests);
    }

    public function storeManifest(Request $request)
    {
        if (!$this->hasScope('warehouse.manage')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }

        $orgId = $this->orgId();

        $data = $request->validate([
            'driver_id'   => 'nullable|exists:users,id',
            'shipment_ids'=> 'nullable|array',
            'shipment_ids.*' => 'integer',
            'notes'       => 'nullable|string',
        ]);

        // Verify driver belongs to same org if provided
        if (!empty($data['driver_id'])) {
            $driver = User::where('id', $data['driver_id'])
                ->where('organization_id', $orgId)
                ->first();

            if (!$driver) {
                return response()->json(['error' => 'Driver not found in organization'], 404);
            }
        }

        // Generate manifest number
        $manifestNumber = 'MNF-' . strtoupper(Str::random(8));

        $manifest = Manifest::create([
            'uuid'            => Str::uuid(),
            'manifest_number' => $manifestNumber,
            'organization_id' => $orgId,
            'driver_id'       => $data['driver_id'] ?? null,
            'status'          => 'open',
            'notes'           => $data['notes'] ?? null,
        ]);

        // Attach shipments if provided
        $shipmentCount = 0;
        if (!empty($data['shipment_ids'])) {
            $shipments = Shipment::withoutGlobalScopes()
                ->whereIn('id', $data['shipment_ids'])
                ->where('organization_id', $orgId)
                ->get();

            $shipmentCount = $shipments->count();
            foreach ($shipments as $shipment) {
                $shipment->update(['manifest_id' => $manifest->id]);
            }
        }

        return response()->json([
            'id'              => $manifest->id,
            'uuid'            => $manifest->uuid,
            'manifest_number' => $manifest->manifest_number,
            'driver_id'       => $manifest->driver_id,
            'status'          => $manifest->status,
            'shipment_count'  => $shipmentCount,
            'notes'           => $manifest->notes,
        ], 201);
    }
}
