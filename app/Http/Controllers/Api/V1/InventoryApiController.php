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
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\InventoryStock;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryApiController extends Controller
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
            return true; // Session-based auth
        }
        return $token->hasScope($scope);
    }

    public function index(Request $request)
    {
        if (!$this->hasScope('inventory.view')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }

        $orgId   = $this->orgId();
        $perPage = min((int) $request->input('per_page', 15), 100);

        $stocks = InventoryStock::with(['item', 'warehouse'])
            ->where('organization_id', $orgId)
            ->paginate($perPage);

        return response()->json($stocks);
    }

    public function storeMovement(Request $request)
    {
        if (!$this->hasScope('inventory.manage')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }

        $orgId = $this->orgId();

        $data = $request->validate([
            'warehouse_id' => 'required|integer',
            'sku'          => 'required|string',
            'type'         => 'required|in:IN,OUT,ADJUST',
            'qty'          => 'required|numeric|min:0.01',
            'notes'        => 'nullable|string',
        ]);

        // Verify warehouse belongs to same org
        $warehouse = Warehouse::where('id', $data['warehouse_id'])
            ->where('organization_id', $orgId)
            ->first();

        if (!$warehouse) {
            return response()->json(['error' => 'Warehouse not found'], 404);
        }

        // Find inventory item by SKU
        $item = InventoryItem::where('organization_id', $orgId)
            ->where('sku', $data['sku'])
            ->first();

        if (!$item) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        return DB::transaction(function () use ($data, $orgId, $warehouse, $item) {
            // Get or create stock record
            $stock = InventoryStock::firstOrCreate(
                [
                    'organization_id' => $orgId,
                    'warehouse_id'    => $warehouse->id,
                    'location_id'     => null,
                    'item_id'         => $item->id,
                ],
                ['qty_on_hand' => 0]
            );

            $qty = (float) $data['qty'];

            // Check stock for OUT movements
            if ($data['type'] === 'OUT') {
                if ((float) $stock->qty_on_hand < $qty) {
                    return response()->json(['error' => 'Insufficient stock'], 409);
                }
                $newQty = (float) $stock->qty_on_hand - $qty;
            } elseif ($data['type'] === 'IN') {
                $newQty = (float) $stock->qty_on_hand + $qty;
            } else {
                // ADJUST
                $newQty = $qty;
            }

            $stock->update(['qty_on_hand' => $newQty]);

            $movement = InventoryMovement::create([
                'organization_id' => $orgId,
                'warehouse_id'    => $warehouse->id,
                'location_id'     => null,
                'item_id'         => $item->id,
                'type'            => $data['type'],
                'qty'             => $qty,
                'notes'           => $data['notes'] ?? null,
            ]);

            return response()->json([
                'movement' => [
                    'id'   => $movement->id,
                    'type' => $movement->type,
                    'qty'  => (float) $movement->qty,
                ],
                'stock' => [
                    'qty_on_hand' => (float) $stock->fresh()->qty_on_hand,
                ],
            ], 201);
        });
    }
}
