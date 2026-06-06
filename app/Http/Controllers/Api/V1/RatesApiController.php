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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RatesApiController extends Controller
{
    /**
     * POST /api/v1/rates/quote - Quote shipping rates (scope: rates.quote).
     * Reuses ShippingRateService::quoteRates with same normalization as web.
     */
    public function quote(Request $request)
    {
        $request->validate([
            'sender_details' => 'required|array',
            'receiver_details' => 'required|array',
            'package_details' => 'nullable|array',
            'packages' => 'nullable|array',
            'packages.*.weight' => 'nullable|numeric|min:0',
            'packages.*.length' => 'nullable|numeric|min:0',
            'packages.*.width' => 'nullable|numeric|min:0',
            'packages.*.height' => 'nullable|numeric|min:0',
            'packages.*.declared_value' => 'nullable|numeric|min:0',
        ]);

        $payload = $request->only(['sender_details', 'receiver_details', 'package_details', 'packages']);
        $payload['organization_id'] = Auth::user()->organization_id;

        if (empty($payload['package_details']) && !empty($payload['packages'])) {
            // Frontend sent multiple packages; ShippingRateService will aggregate
        } elseif (empty($payload['package_details'])) {
            $payload['package_details'] = ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10];
        }

        $rateService = app(\App\Services\ShippingRateService::class);
        $rates = $rateService->quoteRates($payload);

        return response()->json(['data' => $rates]);
    }
}
