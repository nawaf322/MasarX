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

namespace App\Http\Controllers;

use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class TrackingController extends Controller
{
    public function index(Request $request)
    {
        // Validar input público para evitar inyección SQL, ataques y código malicioso
        $validator = Validator::make($request->only('tracking_number'), [
            'tracking_number' => [
                'nullable',
                'string',
                'max:50',
                'regex:/^[A-Za-z0-9\-]+$/',
            ],
        ]);

        if ($validator->fails()) {
            $trackingNumber = $request->input('tracking_number');
            return Inertia::render('Tracking/Index', [
                'shipment' => null,
                'trackingNumber' => $trackingNumber ? substr($trackingNumber, 0, 50) : null,
                'isAuthenticated' => Auth::check(),
                'queryStatus' => 'invalid',
            ]);
        }

        $trackingNumber = $validator->validated()['tracking_number'] ?? null;
        $shipment = null;
        $isAuthenticated = Auth::check();

        if ($trackingNumber) {
            // withoutGlobalScope('tenant') is required for public tracking:
            // BelongsToTenant applies whereRaw('1=0') for unauthenticated requests,
            // blocking all queries. Authenticated requests add their own org filter below.
            $query = Shipment::withoutGlobalScope('tenant')
                ->where('tracking_number', $trackingNumber)
                ->with([
                    'history' => function ($q) {
                        $q->withoutGlobalScope('tenant')->latest();
                    },
                    'returnRequest' => function ($q) {
                        $q->withoutGlobalScope('tenant');
                    },
                    'proofOfDelivery' => function ($q) {
                        $q->withoutGlobalScope('tenant');
                    },
                ]);

            if ($isAuthenticated) {
                $query->where('organization_id', Auth::user()->organization_id);
            }

            $found = $query->first();

            if ($found) {
                // Public: limited data (no sensitive info). Internal: full data.
                if ($isAuthenticated) {
                    $shipment = $found;
                } else {
                    $shipment = $this->publicShipmentData($found);
                }
            }
        }

        $queryStatus = $trackingNumber
            ? ($shipment ? 'success' : 'not_found')
            : null;

        return Inertia::render('Tracking/Index', [
            'shipment' => $shipment,
            'trackingNumber' => $trackingNumber,
            'isAuthenticated' => $isAuthenticated,
            'queryStatus' => $queryStatus,
        ]);
    }

    /** Return limited shipment data for public tracking (no sensitive info). */
    private function publicShipmentData(Shipment $s): array
    {
        $receiver = is_array($s->receiver_details) ? $s->receiver_details : [];
        $city = $receiver['city'] ?? $receiver['address_line1'] ?? '';
        $country = $receiver['country'] ?? '';

        $pkg = is_array($s->package_details) ? $s->package_details : [];
        $weight = $pkg['weight'] ?? $pkg['label_weight'] ?? ($pkg['summary']['total_weight'] ?? null) ?? (isset($pkg[0]) && is_array($pkg[0]) ? ($pkg[0]['weight'] ?? null) : null);
        $pieces = $pkg['pieces'] ?? $pkg['label_pieces'] ?? ($pkg['summary']['total_pieces'] ?? null) ?? (isset($pkg[0]) && is_array($pkg[0]) ? ($pkg[0]['pieces'] ?? 1) : 1);

        return [
            'id' => $s->id,
            'tracking_number' => $s->tracking_number,
            'status' => $s->shipmentStatus?->code ?? $s->status ?? 'pending',
            'service_type' => $s->service_type ?? '—',
            'expected_delivery_date' => $s->estimated_delivery_date?->toIso8601String() ?? $s->delivered_at?->toIso8601String(),
            'history' => $s->history,
            'return_status' => $s->returnRequest?->status,
            'receiver_details' => ['city' => $city, 'country' => $country],
            'package_details' => ['weight' => $weight, 'pieces' => $pieces],
            'proof_of_delivery' => $s->proofOfDelivery ? [
                'recipient_name' => $s->proofOfDelivery->recipient_name,
                'delivered_at'   => $s->proofOfDelivery->delivered_at?->toIso8601String(),
                'photos'         => $s->proofOfDelivery->photos ?? [],
                'signature'      => $s->proofOfDelivery->signature,
                'notes'          => $s->proofOfDelivery->notes,
            ] : null,
        ];
    }
}
