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
use App\Models\ShipmentStatus as ShipmentStatusModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ShipmentApiController extends Controller
{
    /**
     * GET /api/v1/shipments - List shipments (scope: shipments.view).
     */
    public function index(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $query = Shipment::query()
            ->with(['creator', 'shipmentStatus'])
            ->where('organization_id', $orgId);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                    ->orWhere('sender_name_search', 'like', "%{$search}%")
                    ->orWhere('receiver_name_search', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            if (is_numeric($request->status)) {
                $query->where('status_id', $request->status);
            } else {
                $status = ShipmentStatusModel::where('code', $request->status)
                    ->where('organization_id', $orgId)
                    ->first();
                if ($status) {
                    $query->where('status_id', $status->id);
                } else {
                    $query->where('status', $request->status);
                }
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $sortCol = $request->input('sort', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        if (in_array($sortCol, ['tracking_number', 'created_at', 'total'])) {
            $query->orderBy($sortCol, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest();
        }

        $perPage = min((int) ($request->per_page ?? 15), 100);
        $shipments = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $shipments->items(),
            'meta' => [
                'current_page' => $shipments->currentPage(),
                'last_page' => $shipments->lastPage(),
                'per_page' => $shipments->perPage(),
                'total' => $shipments->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/shipments - Create shipment (scope: shipments.create).
     */
    public function store(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'sender_details' => 'required|array',
            'receiver_details' => 'required|array',
            'package_details' => 'nullable|array',
            'packages' => 'nullable|array',
            'tracking_number' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('shipments', 'tracking_number')->where('organization_id', $orgId)->whereNull('deleted_at'),
            ],
            'packages.*.weight' => 'nullable|numeric|min:0',
            'packages.*.length' => 'nullable|numeric|min:0',
            'packages.*.width' => 'nullable|numeric|min:0',
            'packages.*.height' => 'nullable|numeric|min:0',
            'packages.*.declared_value' => 'nullable|numeric|min:0',
            'packages.*.pieces' => 'nullable|integer|min:1',
            'service_type' => 'required|string',
            'payment_status' => 'required|string|in:unpaid,paid,partial',
            'rate_data' => 'nullable|array',
        ]);

        $payload = [
            'sender_details' => $validated['sender_details'],
            'receiver_details' => $validated['receiver_details'],
            'organization_id' => $orgId,
        ];
        $payload['packages'] = $validated['packages'] ?? null;
        $payload['package_details'] = $validated['package_details'] ?? ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10, 'pieces' => 1];

        $rateService = app(\App\Services\ShippingRateService::class);
        $availableRates = $rateService->quoteRates($payload);

        $submittedRate = $request->input('rate_data');
        $selectedRate = null;
        if ($submittedRate && isset($submittedRate['rate_rule_id'])) {
            foreach ($availableRates as $rate) {
                if (($rate['rate_rule_id'] ?? null) == $submittedRate['rate_rule_id']) {
                    $selectedRate = $rate;
                    break;
                }
            }
        }
        if (!$selectedRate && $submittedRate && isset($submittedRate['service_code'])) {
            foreach ($availableRates as $rate) {
                if (($rate['service_code'] ?? null) === $submittedRate['service_code']) {
                    $selectedRate = $rate;
                    break;
                }
            }
        }
        if (!$selectedRate && count($availableRates) > 0) {
            $selectedRate = $availableRates[0];
        }

        if (!$selectedRate || floatval($selectedRate['total_price'] ?? 0) <= 0) {
            return response()->json(['error' => 'Invalid or expired rate. Please re-calculate rates.'], 422);
        }

        $pendingStatus = ShipmentStatusModel::where('organization_id', $orgId)->where('code', 'pending')->first();
        $trackingNumber = !empty(trim($validated['tracking_number'] ?? ''))
            ? trim($validated['tracking_number'])
            : app(\App\Services\SequenceService::class)->nextTrackingNumber($orgId);

        $resolver = app(\App\Services\Settings\SettingsResolver::class);
        $cfg = $resolver->getEffectiveSettings($orgId);
        $currency = $cfg['currency'] ?? $selectedRate['currency'] ?? 'USD';

        $raw = $validated['packages'] ?? $validated['package_details'] ?? ['weight' => 1, 'pieces' => 1];
        $weightUnit = $cfg['weight_unit'] ?? 'kg';
        $dimUnit = $cfg['dimension_unit'] ?? 'cm';
        $normalized = \App\Services\PackageDetailsNormalizer::normalize($raw, $weightUnit, $dimUnit, (float) ($cfg['volumetric_divisor'] ?? 5000));
        $ratePayload = \App\Services\PackageDetailsNormalizer::toRatePayload($normalized);
        $packageDetailsSummary = array_merge($ratePayload, [
            'dimensions' => ['length' => $ratePayload['length'] ?? 10, 'width' => $ratePayload['width'] ?? 10, 'height' => $ratePayload['height'] ?? 10],
            'packages' => $normalized['packages'],
            'summary' => $normalized['summary'],
        ]);

        $apiInvoiceNumber = null;
        try {
            $apiInvoiceNumber = app(\App\Services\SequenceService::class)->nextInvoiceNumber($orgId);
        } catch (\Throwable) {}

        $shipment = Shipment::create([
            'uuid' => Str::uuid(),
            'invoice_number' => $apiInvoiceNumber,
            'tracking_number' => $trackingNumber,
            'organization_id' => $orgId,
            'status_id' => $pendingStatus?->id,
            'created_by' => Auth::id(),
            'sender_details' => $validated['sender_details'],
            'receiver_details' => $validated['receiver_details'],
            'package_details' => $packageDetailsSummary,
            'service_type' => $validated['service_type'],
            'payment_status' => $validated['payment_status'],
            'subtotal' => (float) ($selectedRate['breakdown']['subtotal'] ?? (floatval($selectedRate['total_price']) - floatval($selectedRate['breakdown']['tax'] ?? 0))),
            'tax' => $selectedRate['breakdown']['tax'] ?? 0,
            'total' => $selectedRate['total_price'],
            'currency' => $currency,
            'exchange_rate' => $selectedRate['exchange_rate'] ?? 1.0,
            'rate_card_id' => $selectedRate['rate_card_id'] ?? null,
            'rate_rule_id' => $selectedRate['rate_rule_id'] ?? null,
        ]);

        return response()->json(['data' => $shipment->fresh()], 201);
    }

    /**
     * GET /api/v1/shipments/{shipment} - Show shipment (scope: shipments.view).
     */
    public function show(Request $request, $shipment)
    {
        $orgId = Auth::user()->organization_id;
        $model = Shipment::where('organization_id', $orgId)
            ->where(fn ($q) => $q->where('id', $shipment)->orWhere('uuid', $shipment)->orWhere('tracking_number', $shipment))
            ->with(['creator', 'shipmentStatus', 'history'])
            ->firstOrFail();

        return response()->json(['data' => $model]);
    }

    /**
     * PUT /api/v1/shipments/{shipment} - Update shipment (scope: shipments.edit).
     */
    public function update(Request $request, $shipment)
    {
        $orgId = Auth::user()->organization_id;
        $model = Shipment::where('organization_id', $orgId)
            ->where(fn ($q) => $q->where('id', $shipment)->orWhere('uuid', $shipment)->orWhere('tracking_number', $shipment))
            ->firstOrFail();

        $validated = $request->validate([
            'sender_details' => 'sometimes|array',
            'receiver_details' => 'sometimes|array',
            'package_details' => 'sometimes|array',
        ]);

        $model->update(array_filter($validated));

        return response()->json(['data' => $model->fresh()]);
    }
}
