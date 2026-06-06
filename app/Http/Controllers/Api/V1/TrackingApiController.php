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
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TrackingApiController extends Controller
{
    /**
     * GET /api/v1/tracking/{tracking} - Get tracking info by tracking number (scope: tracking.view).
     */
    public function show(Request $request, string $tracking)
    {
        $orgId = Auth::user()->organization_id;
        $shipment = Shipment::where('organization_id', $orgId)
            ->where('tracking_number', $tracking)
            ->with(['history' => fn ($q) => $q->latest()])
            ->firstOrFail();

        return response()->json([
            'data' => [
                'shipment' => $shipment,
                'history' => $shipment->history,
            ],
        ]);
    }
}
