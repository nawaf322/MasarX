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

namespace App\Services;

use App\Models\Shipment;
use App\Models\ShipmentStatus as ShipmentStatusModel;

/**
 * Centralizes shipment status updates to keep status_id and status string in sync.
 * status_id is the source of truth when a ShipmentStatus record exists;
 * status string is maintained for legacy compatibility.
 */
class StatusResolver
{
    /**
     * Update shipment status by code. Sets status_id when a matching ShipmentStatus
     * exists for the organization; otherwise sets only status string (legacy).
     */
    public function setStatusByCode(Shipment $shipment, string $code): bool
    {
        $code = strtolower(trim($code));
        $orgId = $shipment->organization_id;

        $statusModel = ShipmentStatusModel::where('organization_id', $orgId)
            ->where('code', $code)
            ->first();

        $updates = ['status' => $code];
        if ($statusModel) {
            $updates['status_id'] = $statusModel->id;
        } else {
            $updates['status_id'] = null;
        }

        $shipment->update($updates);
        return true;
    }
}
