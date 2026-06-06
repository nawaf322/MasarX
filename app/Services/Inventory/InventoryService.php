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

namespace App\Services\Inventory;

use App\Models\InventoryMovement;
use App\Models\InventoryStock;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * Apply an inventory movement. Transaccional.
     *
     * @param  int  $organizationId
     * @param  int  $warehouseId
     * @param  int|null  $locationId
     * @param  int  $itemId
     * @param  string  $type  IN|OUT|ADJUST
     * @param  float  $qty  Positive amount. For ADJUST: new absolute qty_on_hand.
     * @param  string|null  $referenceType
     * @param  string|null  $referenceId
     * @param  string|null  $notes
     * @param  int|null  $createdByUserId
     * @param  string|null  $requestId
     * @return InventoryStock
     *
     * @throws \App\Services\Inventory\InsufficientStockException  when OUT and qty_on_hand < qty
     */
    public function applyMovement(
        int $organizationId,
        int $warehouseId,
        ?int $locationId,
        int $itemId,
        string $type,
        float $qty,
        ?string $referenceType = null,
        ?string $referenceId = null,
        ?string $notes = null,
        ?int $createdByUserId = null,
        ?string $requestId = null
    ): InventoryStock {
        if ($qty <= 0) {
            throw new \InvalidArgumentException('Qty must be positive.');
        }

        return DB::transaction(function () use (
            $organizationId,
            $warehouseId,
            $locationId,
            $itemId,
            $type,
            $qty,
            $referenceType,
            $referenceId,
            $notes,
            $createdByUserId,
            $requestId
        ) {
            $stock = InventoryStock::where('organization_id', $organizationId)
                ->where('warehouse_id', $warehouseId)
                ->where('item_id', $itemId)
                ->where(function ($q) use ($locationId) {
                    if ($locationId === null) {
                        $q->whereNull('location_id');
                    } else {
                        $q->where('location_id', $locationId);
                    }
                })
                ->lockForUpdate()
                ->first();

            if (! $stock) {
                $stock = InventoryStock::create([
                    'organization_id' => $organizationId,
                    'warehouse_id' => $warehouseId,
                    'location_id' => $locationId,
                    'item_id' => $itemId,
                    'qty_on_hand' => 0,
                ]);
            }

            $currentQty = (float) $stock->qty_on_hand;

            switch (strtoupper($type)) {
                case 'IN':
                    $newQty = $currentQty + $qty;
                    break;
                case 'OUT':
                    if ($currentQty < $qty) {
                        throw new InsufficientStockException(
                            "Insufficient stock. Available: {$currentQty}, requested: {$qty}"
                        );
                    }
                    $newQty = $currentQty - $qty;
                    break;
                case 'ADJUST':
                    $newQty = $qty;
                    break;
                default:
                    throw new \InvalidArgumentException("Invalid type: {$type}. Use IN, OUT, or ADJUST.");
            }

            $stock->update(['qty_on_hand' => $newQty]);

            InventoryMovement::create([
                'organization_id' => $organizationId,
                'warehouse_id' => $warehouseId,
                'location_id' => $locationId,
                'item_id' => $itemId,
                'type' => strtoupper($type),
                'qty' => $qty,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'created_by_user_id' => $createdByUserId,
                'request_id' => $requestId,
            ]);

            return $stock->fresh();
        });
    }
}
