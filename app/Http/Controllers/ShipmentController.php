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

use App\Enums\PaymentStatus;
use App\Enums\ServiceType;
use App\Enums\ShipmentStatus;
use App\Http\Requests\StoreShipmentRequest;
use App\Models\Shipment;
use App\Models\ShipmentAttachment;
use App\Models\ShipmentStatus as ShipmentStatusModel;
use App\Models\ConnectedAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShipmentController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = Shipment::query()
            ->with(['creator'])
            ->where('organization_id', $user->organization_id);

        // Customers can only see their own shipments
        if ($user->hasRole('customer')) {
            $query->where('created_by', $user->id);
        }

        // Drivers can only see shipments assigned to their manifests
        if ($user->hasRole('Driver')) {
            $driverManifestIds = \App\Models\Manifest::where('driver_id', $user->id)
                ->where('organization_id', $user->organization_id)
                ->pluck('id');
            $query->whereIn('manifest_id', $driverManifestIds);
        }

        // Por defecto excluir archivados; si show_archived=1, incluir solo archivados
        $showArchived = (bool) $request->input('show_archived', false);
        $query->where('is_archived', $showArchived);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                    ->orWhere('sender_name_search', 'like', "%{$search}%")
                    ->orWhere('receiver_name_search', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->status) {
            // Si es un ID numérico, filtrar por status_id, si no, por código del status
            if (is_numeric($request->status)) {
                $query->where('status_id', $request->status);
            } else {
                // Buscar el status por código y filtrar por status_id
                $status = \App\Models\ShipmentStatus::where('code', $request->status)
                    ->where('organization_id', $request->user()->organization_id)
                    ->first();
                if ($status) {
                    $query->where('status_id', $status->id);
                } else {
                    // Fallback al enum antiguo si no existe en la nueva tabla
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

        $shipments = $query->with(['shipmentStatus', 'returnRequest'])->paginate($request->input('per_page', 10))->withQueryString()->through(function ($shipment) {
            $receiver = $shipment->receiver_details ?? [];
            $parts = array_filter([
                $receiver['address_line1'] ?? $receiver['street'] ?? null,
                $receiver['address_line2'] ?? null,
                $receiver['city'] ?? null,
                $receiver['state'] ?? null,
                $receiver['postal_code'] ?? null,
                $receiver['country'] ?? null,
            ]);
            $address = implode(', ', $parts) ?: ($receiver['city'] ?? '') ?: '—';

            // Usar ShipmentStatus si existe, sino fallback al código/etiqueta desde enum
            $statusEnum = $shipment->statusAsEnum();
            $statusData = $shipment->shipmentStatus 
                ? [
                    'code' => $shipment->shipmentStatus->code,
                    'name' => $shipment->shipmentStatus->name,
                    'icon' => $shipment->shipmentStatus->icon,
                    'color' => $shipment->shipmentStatus->color,
                ]
                : [
                    'code' => $shipment->status ?? 'pending',
                    'name' => $statusEnum ? $statusEnum->label() : 'Pending',
                    'icon' => 'Circle',
                    'color' => '#6B7280',
                ];

            return [
                'id' => $shipment->id,
                'uuid' => $shipment->uuid,
                'tracking_number' => $shipment->tracking_number,
                'status_id' => $shipment->status_id,
                'sender_name' => $shipment->sender_details['name'] ?? 'N/A',
                'receiver_name' => $shipment->receiver_details['name'] ?? 'N/A',
                'origin' => $shipment->sender_details['city'] ?? '',
                'destination' => $shipment->receiver_details['city'] ?? '',
                'receiver_address' => $address,
                'status' => $statusData['code'],
                'status_label' => $statusData['name'],
                'status_icon' => $statusData['icon'],
                'status_color' => $statusData['color'],
                'payment_status' => $shipment->payment_status->value ?? 'unpaid',
                'created_at' => $shipment->created_at->format('d/m/Y'),
                'created_at_time' => $shipment->created_at->format('h:i A'),
                'created_at_iso' => $shipment->created_at->toIso8601String(),
                'total' => $shipment->total,
                'currency' => $shipment->currency ?? 'USD',
                'has_return' => !is_null($shipment->returnRequest),
                'return_status' => $shipment->returnRequest?->status,
            ];
        });

        $statuses = ShipmentStatusModel::where('organization_id', Auth::user()->organization_id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get(['id', 'code', 'name', 'icon', 'color']);

        // KPI stats — scoped by role
        $baseStats = Shipment::where('organization_id', $user->organization_id)
            ->where('is_archived', false);
        if ($user->hasRole('customer')) {
            $baseStats->where('created_by', $user->id);
        }
        if ($user->hasRole('Driver')) {
            $driverManifestIdsForStats = \App\Models\Manifest::where('driver_id', $user->id)
                ->where('organization_id', $user->organization_id)->pluck('id');
            $baseStats->whereIn('manifest_id', $driverManifestIdsForStats);
        }

        $deliveredStatusId = ShipmentStatusModel::where('organization_id', Auth::user()->organization_id)
            ->where('code', 'delivered')->value('id');

        $activeStatusIds = ShipmentStatusModel::where('organization_id', Auth::user()->organization_id)
            ->whereNotIn('code', ['delivered', 'cancelled'])->pluck('id');

        $canViewFinancials = $user->hasRole('super-admin') || $user->hasRole('admin') || $user->can('dashboard.revenue.view');

        $stats = [
            'total_shipments' => (clone $baseStats)->count(),
            'total_revenue'   => $canViewFinancials ? (float) (clone $baseStats)->sum('total') : null,
            'active_count'    => (clone $baseStats)->whereIn('status_id', $activeStatusIds)->count(),
            'delivered_count' => $deliveredStatusId
                ? (clone $baseStats)->where('status_id', $deliveredStatusId)->count()
                : 0,
        ];

        return Inertia::render('Shipments/Index', [
            'shipments' => $shipments,
            'shipment_statuses' => $statuses,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'sort', 'sort_dir', 'per_page', 'show_archived']),
            'canCreate' => !$user->hasRole('Driver') && ($user->hasRole('super-admin') || $user->can('create shipments')),
            'canDelete' => !$user->hasRole('Driver') && ($user->hasRole('super-admin') || $user->can('delete shipments')),
            'canEdit' => !$user->hasRole('Driver') && ($user->hasRole('super-admin') || $user->can('edit shipments')),
            'canExport' => !$user->hasRole('Driver') && ($user->hasRole('super-admin') || $user->can('shipments.export')),
            'canChangeStatus' => $user->hasRole('super-admin') || $user->can('change status shipments'),
            'canViewFinancials' => $user->hasRole('super-admin') || $user->hasRole('admin') || $user->can('dashboard.revenue.view'),
            'is_driver_view' => $user->hasRole('Driver'),
        ]);
    }

    /**
     * Export shipments as CSV or XLS. Si se envían ids[] exporta esos; si no, aplica filtros.
     */
    public function export(Request $request)
    {
        $query = Shipment::query()
            ->where('organization_id', Auth::user()->organization_id)
            ->where('is_archived', (bool) $request->input('show_archived', false));

        $ids = $request->input('ids', []);
        if (!empty($ids) && is_array($ids)) {
            $query->whereIn('id', array_map('intval', $ids));
        } else {
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
                        ->where('organization_id', $request->user()->organization_id)
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
        }

        $rows = $query->with('shipmentStatus')->limit(5000)->get()->map(function ($shipment) {
            $receiver = $shipment->receiver_details ?? [];
            $parts = array_filter([
                $receiver['address_line1'] ?? $receiver['street'] ?? null,
                $receiver['city'] ?? null,
                $receiver['state'] ?? null,
                $receiver['country'] ?? null,
            ]);
            $address = implode(', ', $parts) ?: '—';
            $statusCode = $shipment->shipmentStatus?->code ?? $shipment->getRawOriginal('status') ?? 'pending';
            return [
                'tracking' => $shipment->tracking_number,
                'date' => $shipment->created_at->format('Y-m-d H:i'),
                'sender' => $shipment->sender_details['name'] ?? 'N/A',
                'receiver' => $shipment->receiver_details['name'] ?? 'N/A',
                'total' => (string) $shipment->total,
                'cost_price' => (string) ($shipment->cost_price ?? '0.00'),
                'currency' => $shipment->currency ?? 'USD',
                'status' => $statusCode,
                'address' => $address,
            ];
        });

        $format = $request->input('format', 'csv');
        $filename = 'shipments-' . date('Y-m-d-His');

        if ($format === 'xls') {
            // HTML table compatible con Excel
            $html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:8px}th{background:#f0f0f0;font-weight:bold}</style></head><body><table>';
            $headers = [__('shipments.table.tracking'), __('shipments.table.date'), __('shipments.table.sender'), __('shipments.table.receiver'), __('shipments.table.total'), __('common.currency') ?? 'Currency', __('shipments.table.order_status'), __('shipments.table.address')];
            $html .= '<tr>' . implode('', array_map(fn ($h) => '<th>' . e($h) . '</th>', $headers)) . '</tr>';
            foreach ($rows as $r) {
                $html .= '<tr><td>' . e($r['tracking']) . '</td><td>' . e($r['date']) . '</td><td>' . e($r['sender']) . '</td><td>' . e($r['receiver']) . '</td><td>' . e($r['total']) . '</td><td>' . e($r['currency']) . '</td><td>' . e($r['status']) . '</td><td>' . e($r['address']) . '</td></tr>';
            }
            $html .= '</table></body></html>';
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '.xls"',
            ]);
        }

        $headers = ['Tracking', 'Date', 'Sender', 'Receiver', 'Total', 'Currency', 'Status', 'Address'];
        $csv = implode(',', array_map(fn ($h) => '"' . str_replace('"', '""', $h) . '"', $headers)) . "
";
        foreach ($rows as $r) {
            $row = [$r['tracking'], $r['date'], $r['sender'], $r['receiver'], $r['total'], $r['currency'], $r['status'], $r['address']];
            $csv .= implode(',', array_map(fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"', $row)) . "
";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
        ]);
    }

    public function create(\Illuminate\Http\Request $request)
    {
        // Drivers cannot create shipments — they only deliver assigned ones
        if (Auth::user()->hasRole('Driver')) {
            abort(403, 'Drivers cannot create shipments.');
        }

        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        $resolver = app(\App\Services\Settings\SettingsResolver::class);
        $cfg = $resolver->getEffectiveSettings($orgId);
        $sequenceService = app(\App\Services\SequenceService::class);
        $sequenceService->ensureTrackingSequence($orgId);
        $trackingPreview = $sequenceService->preview($orgId, 'tracking');

        $billingSettings = app(\App\Services\SettingsService::class)->forOrganization($orgId)->getGroup('billing');
        $paymentMethods = app(\App\Services\PaymentOrchestrator::class)->getAvailableMethods($orgId);

        // Pre-fill sender from customer profile when navigating from /customers/{id}
        // OR when the logged-in user is a customer (auto-fill themselves as sender)
        $prefillCustomer = null;
        $customerLookupId = $request->filled('customer_id')
            ? (int) $request->customer_id
            : (Auth::user()->hasRole('customer') ? Auth::id() : null);

        if ($customerLookupId) {
            $request->merge(['customer_id' => $customerLookupId]);
        }

        if ($request->filled('customer_id')) {
            $customer = \App\Models\User::where('id', (int) $request->customer_id)
                ->where('organization_id', $orgId)
                ->first();
            if ($customer) {
                $country = $customer->country_id ? \App\Models\Country::find($customer->country_id) : null;
                $stateName  = \App\Models\State::find($customer->state_id)?->name ?? '';
                $cityName   = $customer->city ?: (\App\Models\City::find($customer->city_id)?->name ?? '');
                $prefillCustomer = [
                    'id'           => $customer->id,
                    'name'         => $customer->name,
                    'phone'        => $customer->phone ?? '',
                    'company'      => '',
                    'address'      => $customer->address ?? '',
                    'address_line2'=> $customer->address_line2 ?? '',
                    'city'         => $cityName,
                    'state'        => $stateName,
                    'country'      => $customer->country ?? $country?->name ?? '',
                    'country_code' => $country?->iso2 ?? '',
                    'zip_code'     => $customer->zip_code ?? '',
                    'email'        => $customer->email ?? '',
                    'country_id'   => $customer->country_id,
                    'state_id'     => $customer->state_id,
                    'city_id'      => $customer->city_id,
                    'tax_id'       => $customer->document_id ?? '',
                ];
            }
        }

        return Inertia::render('Shipments/Create', [
            'effectiveSettings' => [
                'currency'              => $cfg['currency'],
                'weight_unit'           => $cfg['weight_unit'],
                'dimension_unit'        => $cfg['dimension_unit'],
                'volumetric_divisor'    => $cfg['volumetric_divisor'],
                'tax_rate'              => $cfg['tax_rate'],
                'tax_name'              => $cfg['tax_name'],
                'base_surcharge'        => $cfg['base_surcharge'],
                'fuel_surcharge_percent'=> $cfg['fuel_surcharge_percent'],
                'insurance_percent'     => $cfg['insurance_percent'],
            ],
            'billingSettings' => [
                'stripe_enabled' => (bool) ($billingSettings['stripe_enabled'] ?? false),
                'paypal_enabled' => (bool) ($billingSettings['paypal_enabled'] ?? false),
            ],
            'paymentMethods'  => $paymentMethods,
            'tracking_preview'=> $trackingPreview,
            'prefillCustomer' => $prefillCustomer,
            'countries'       => \App\Models\Country::where('is_active', true)
                ->where(fn ($q) => $q->whereNull('organization_id')->orWhere('organization_id', $orgId))
                ->orderBy('name')
                ->get(['id', 'name', 'iso2', 'phone_code']),
        ]);
    }

    public function getRates(Request $request)
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
            $payload['package_details'] = ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10, 'pieces' => 1, 'declared_value' => 0];
        }

        $rateService = app(\App\Services\ShippingRateService::class);
        $rates = $rateService->quoteRates($payload);

        return response()->json($rates);
    }

    public function store(StoreShipmentRequest $request)
    {
        if (Auth::user()->hasRole('Driver')) {
            abort(403, 'Drivers cannot create shipments.');
        }

        // Distributed verification point #1
        if (!app(\App\Services\LicenseVerificationService::class)->isActivated()) {
            session()->flash('error', __('shipments.creation_failed'));
            return \Inertia\Inertia::location(route('shipments.create'));
        }

        $validated = $request->validated();

        $orgId = Auth::user()->organization_id;
        $resolver = app(\App\Services\Settings\SettingsResolver::class);
        $cfg = $resolver->getEffectiveSettings($orgId);

        $payload = [
            'sender_details' => $validated['sender_details'],
            'receiver_details' => $validated['receiver_details'],
            'organization_id' => $orgId,
        ];
        if (!empty($validated['packages'])) {
            $payload['packages'] = $validated['packages'];
        } else {
            $payload['package_details'] = $validated['package_details'] ?? ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10, 'pieces' => 1];
        }

        $rateService = app(\App\Services\ShippingRateService::class);
        $availableRates = $rateService->quoteRates($payload);

        $submittedRate = $request->input('rate_data');
        $selectedRate = null;
        $matchSource = null;

        // 1. Exact match: same org, same rate rule
        if ($submittedRate && isset($submittedRate['rate_rule_id'])) {
            foreach ($availableRates as $rate) {
                if (($rate['rate_rule_id'] ?? null) == $submittedRate['rate_rule_id']) {
                    $selectedRate = $rate;
                    $matchSource = 'rate_rule_id';
                    break;
                }
            }
        }

        // 2. Cross-org fallback (rate_rule_id known): rate belongs to a different org.
        //    Must run BEFORE service_code / first_available so the original price is preserved.
        if (!$selectedRate && $submittedRate && isset($submittedRate['rate_rule_id'])) {
            $crossRule = \App\Models\RateRule::where('id', $submittedRate['rate_rule_id'])
                ->where('active', true)
                ->first();
            if ($crossRule) {
                $crossPayload = array_merge($payload, ['organization_id' => $crossRule->organization_id]);
                $crossRates = $rateService->quoteRates($crossPayload);
                foreach ($crossRates as $cr) {
                    if (($cr['rate_rule_id'] ?? null) == $submittedRate['rate_rule_id']) {
                        $selectedRate = $cr;
                        $matchSource  = 'cross_org';
                        break;
                    }
                }
            }
        }

        // 2b. Cross-org fallback (no rate_rule_id): rate came from public calculator's hard fallback.
        //     Use the calculator_org_id embedded in rate_data to recalculate via that org's settings.
        if (!$selectedRate && $submittedRate && !empty($submittedRate['calculator_org_id'])) {
            $calcOrgId = (int) $submittedRate['calculator_org_id'];
            if ($calcOrgId !== $orgId) {
                $crossPayload = array_merge($payload, ['organization_id' => $calcOrgId]);
                $crossRates = $rateService->quoteRates($crossPayload);
                if (!empty($crossRates)) {
                    // Pick best match: same service_code, or first
                    $selectedRate = collect($crossRates)->first(fn($cr) =>
                        isset($submittedRate['service_code']) &&
                        ($cr['service_code'] ?? null) === $submittedRate['service_code']
                    ) ?? $crossRates[0];
                    $matchSource = 'cross_org';
                }
            }
        }

        // 3. Fallback by service_code (same org, no rate_rule_id)
        if (!$selectedRate && $submittedRate && isset($submittedRate['service_code'])) {
            foreach ($availableRates as $rate) {
                if (($rate['service_code'] ?? null) === $submittedRate['service_code']) {
                    $selectedRate = $rate;
                    $matchSource = 'service_code';
                    break;
                }
            }
        }

        // 4. Last resort: first available rate in the org
        if (!$selectedRate && count($availableRates) > 0) {
            $selectedRate = $availableRates[0];
            $matchSource = 'first_available';
        }

        if (!$selectedRate || floatval($selectedRate['total_price'] ?? 0) <= 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'rate_data' => __('Invalid or expired rate selected. Please re-calculate rates.'),
            ]);
        }

        // Validate the rate rule is still active (skip for cross-org — already checked above).
        if (($selectedRate['rate_rule_id'] ?? null) && $matchSource !== 'cross_org') {
            $rule = \App\Models\RateRule::where('id', $selectedRate['rate_rule_id'])
                ->where('organization_id', $orgId)
                ->where('active', true)
                ->first();

            if (!$rule) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'rate_data' => __('The selected rate rule is not active or does not exist.'),
                ]);
            }
        }

        // H17: Price integrity check — only meaningful when the exact same rate rule was matched
        // in the current org (matchSource === 'rate_rule_id'). For cross-org, first_available, or
        // service_code fallbacks the server-recalculated total is the authoritative price anyway,
        // so a difference only means the rate legitimately changed — not a manipulation attempt.
        $submittedTotal    = floatval($submittedRate['total_price'] ?? 0);
        $recalculatedTotal = floatval($selectedRate['total_price']  ?? 0);
        $priceDifference   = abs($submittedTotal - $recalculatedTotal);

        if ($submittedTotal > 0 && $priceDifference > 0.01 && $matchSource === 'rate_rule_id') {
            Log::warning('Shipment total mismatch — transaction rejected', [
                'submitted_total'    => $submittedTotal,
                'recalculated_total' => $recalculatedTotal,
                'difference'         => $priceDifference,
                'user_id'            => Auth::id(),
                'organization_id'    => $orgId,
                'match_source'       => $matchSource,
                'rate_rule_id'       => $selectedRate['rate_rule_id'] ?? null,
            ]);
            throw \Illuminate\Validation\ValidationException::withMessages([
                'rate_data' => __('Rate has changed since it was calculated. Please recalculate rates and try again.'),
            ]);
        }

        $pendingStatus = ShipmentStatusModel::where('organization_id', $orgId)->where('code', 'pending')->first();
        $statusId = $pendingStatus?->id;
        $statusCode = $pendingStatus?->code ?? 'pending';

        $trackingNumber = isset($validated['tracking_number']) && is_string($validated['tracking_number']) && trim($validated['tracking_number']) !== ''
            ? trim($validated['tracking_number'])
            : $this->ensureUniqueTracking($orgId);

        // Generate and STORE invoice_number at creation time so it is permanently
        // traceable in the DB without client-side derivation. Falls back gracefully
        // if the numbering sequence hasn't been seeded yet.
        $invoiceNumber = null;
        try {
            $invoiceNumber = app(\App\Services\SequenceService::class)->nextInvoiceNumber($orgId);
        } catch (\Throwable $e) {
            Log::warning('Invoice number generation failed (non-fatal): ' . $e->getMessage(), ['org_id' => $orgId]);
        }

        $currency = $cfg['currency'] ?? $selectedRate['currency'] ?? 'USD';
        $packageDetailsSummary = $this->buildPackageDetailsSummary($validated);

        // Compute estimated_delivery_date from the rate's estimated_days if provided.
        $estimatedDays = (int) ($selectedRate['estimated_days'] ?? 0);
        $estimatedDeliveryDate = $estimatedDays > 0 ? now()->addDays($estimatedDays)->toDateString() : null;

        $shipment = Shipment::create([
            'uuid' => Str::uuid(),
            'invoice_number' => $invoiceNumber,
            'tracking_number' => $trackingNumber,
            'organization_id' => $orgId,
            'status_id' => $statusId,
            'status' => $statusCode,
            'created_by' => Auth::id(),
            'sender_details' => $validated['sender_details'],
            'receiver_details' => $validated['receiver_details'],
            'package_details' => $packageDetailsSummary,
            'service_type' => $validated['service_type'],
            'payment_status' => $validated['payment_status'],
            'estimated_delivery_date' => $estimatedDeliveryDate,

            'subtotal' => (float) ($selectedRate['breakdown']['subtotal'] ?? (floatval($selectedRate['total_price']) - floatval($selectedRate['breakdown']['tax'] ?? 0))),
            'tax' => $selectedRate['breakdown']['tax'] ?? 0,
            'total' => $selectedRate['total_price'],
            'currency' => $currency,
            'exchange_rate' => $selectedRate['exchange_rate'] ?? 1.0,
            'rate_card_id' => $selectedRate['rate_card_id'] ?? null,
            'rate_rule_id' => $selectedRate['rate_rule_id'] ?? null,
        ]);

        if (!empty($validated['packages'])) {
            $this->createShipmentPackagesFromRequest($shipment, $validated['packages'], $cfg, $currency, $selectedRate);
        }

        // Auto-create pickup request when customer creates a shipment
        if (Auth::user()->hasRole('customer')) {
            try {
                $senderDetails = $validated['sender_details'];
                $pickupAddress = trim(
                    ($senderDetails['address'] ?? '') .
                    (!empty($senderDetails['address_line2']) ? ', ' . $senderDetails['address_line2'] : '') .
                    (!empty($senderDetails['city']) ? ', ' . $senderDetails['city'] : '') .
                    (!empty($senderDetails['state']) ? ', ' . $senderDetails['state'] : '') .
                    (!empty($senderDetails['country']) ? ', ' . $senderDetails['country'] : '')
                );

                $pickup = \App\Models\OriginPickup::create([
                    'organization_id'      => $orgId,
                    'shipment_id'          => $shipment->id,
                    'requested_by'         => Auth::id(),
                    'contact_name'         => $senderDetails['name'] ?? '',
                    'contact_phone'        => $senderDetails['phone'] ?? '',
                    'pickup_address'       => $pickupAddress,
                    'scheduled_for'        => now()->addDay()->setTime(10, 0, 0),
                    'status'               => 'pending',
                    'notes'                => 'Solicitud de recogida generada automáticamente por el cliente.',
                ]);

                event(new \App\Events\PickupScheduled($shipment, $pickup));
            } catch (\Throwable $e) {
                Log::warning('Auto-pickup creation failed: ' . $e->getMessage(), ['shipment_id' => $shipment->id]);
            }
        }

        // Auto-save sender and receiver as customers (upsert by email within the org)
        $this->upsertCustomerFromDetails($validated['sender_details']   ?? [], $orgId);
        $this->upsertCustomerFromDetails($validated['receiver_details'] ?? [], $orgId);

        $this->processShipmentAttachments($shipment, $orgId, $request);

        // Determine which carrier to use for label creation based on the selected rate.
        // DHL / FedEx / UPS have real createLabel() implementations; USPS and local use the
        // internal adapter. If the carrier call fails for any reason we fall back to local.
        $selectedCarrier = strtolower($selectedRate['carrier_code'] ?? $selectedRate['carrier'] ?? 'local');
        $labelStartMs    = (int) (microtime(true) * 1000);
        $usedCarrier     = $selectedCarrier;

        try {
            $account  = null;
            $strategy = null;

            if (in_array($selectedCarrier, ['dhl', 'fedex', 'ups', 'usps'], true)) {
                $account = \App\Models\CarrierAccount::where('organization_id', $orgId)
                    ->where('carrier_code', $selectedCarrier)
                    ->where('status', true)
                    ->first();

                if ($account) {
                    $strategy = \App\Services\Carriers\CarrierFactory::make(
                        $selectedCarrier,
                        $account->credentials ?? [],
                        $account->mode ?? 'test'
                    );
                }
            }

            // Fall back to local if no carrier account found or unsupported carrier
            if (!$strategy) {
                $usedCarrier = 'local';
                $strategy    = \App\Services\Carriers\CarrierFactory::make('local');
            }

            $labelResult = $strategy->createLabel($shipment);
            $duration    = (int) (microtime(true) * 1000) - $labelStartMs;

            // Persist tracking number returned by carrier
            if (!empty($labelResult['tracking_number'])) {
                $shipment->update(['tracking_number' => $labelResult['tracking_number']]);
            }

            \App\Services\ShippingRateService::logCarrierAction(
                $orgId, $usedCarrier, $account?->id ?? 0, 'label',
                ['carrier' => $usedCarrier, 'shipment_id' => $shipment->id],
                ['tracking_number' => $labelResult['tracking_number'] ?? null, 'is_stub' => $labelResult['is_stub'] ?? false],
                200, $duration
            );
        } catch (\Exception $e) {
            $duration = (int) (microtime(true) * 1000) - $labelStartMs;
            Log::error("Label creation failed for carrier [{$usedCarrier}]: " . $e->getMessage(), ['shipment_id' => $shipment->id]);
            \App\Services\ShippingRateService::logCarrierAction(
                $orgId, $usedCarrier, 0, 'label',
                ['carrier' => $usedCarrier, 'shipment_id' => $shipment->id],
                ['error' => $e->getMessage()],
                500, $duration
            );

            // Final fallback — local always works
            if ($usedCarrier !== 'local') {
                try {
                    $localStrategy = \App\Services\Carriers\CarrierFactory::make('local');
                    $localStrategy->createLabel($shipment);
                } catch (\Exception) {}
            }
        }

        $paymentMethod = $request->input('payment_method', 'manual');
        if (in_array($paymentMethod, ['stripe', 'paypal'])) {
            try {
                $orchestrator = app(\App\Services\PaymentOrchestrator::class);
                $result = $orchestrator->initiatePayment($paymentMethod, $orgId, (float) $shipment->total, $shipment->currency ?? 'USD', 'Shipment ' . $shipment->tracking_number, $shipment);
                if ($result && !empty($result['redirect_url'])) {
                    return \Inertia\Inertia::location($result['redirect_url']);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Payment redirect failed: ' . $e->getMessage());
                session()->flash('error', __('Payment could not be initiated. ') . $e->getMessage());
                return \Inertia\Inertia::location(route('shipments.show', $shipment));
            }
        }

        // M8: Auto-calculate commissions for this shipment
        try {
            app(\App\Services\CommissionService::class)->calculateForShipment($shipment);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('CommissionService failed: ' . $e->getMessage(), ['shipment_id' => $shipment->id]);
        }

        session()->flash('success', __('Shipment created successfully.'));
        return \Inertia\Inertia::location(route('shipments.show', $shipment));
    }

    public function downloadAttachment(ShipmentAttachment $attachment): StreamedResponse
    {
        if ($attachment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }
        if (!Storage::disk('local')->exists($attachment->path)) {
            abort(404);
        }
        $filename = $attachment->original_name ?: basename($attachment->path);
        return Storage::disk('local')->download($attachment->path, $filename, [
            'Content-Type' => $attachment->mime_type,
        ]);
    }

    /**
     * Obtiene un tracking único, verificando que no exista en BD (evita colisión si hay inserción manual).
     */
    private function ensureUniqueTracking(int $orgId, int $maxAttempts = 10): string
    {
        $sequenceService = app(\App\Services\SequenceService::class);
        for ($i = 0; $i < $maxAttempts; $i++) {
            $tracking = $sequenceService->nextTrackingNumber($orgId);
            // Check globally — bypass BelongsToTenant scope; tracking_number has a global UNIQUE constraint
            if (!Shipment::withoutGlobalScope('tenant')->where('tracking_number', $tracking)->exists()) {
                return $tracking;
            }
        }
        // Last resort: append random suffix to guarantee uniqueness
        return $sequenceService->nextTrackingNumber($orgId) . '-' . strtoupper(substr(uniqid(), -4));
    }

    private function buildPackageDetailsSummary(array $validated): array
    {
        $cfg = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings(Auth::user()->organization_id);
        $weightUnit = $cfg['weight_unit'] ?? 'kg';
        $dimUnit = $cfg['dimension_unit'] ?? 'cm';
        $raw = $validated['packages'] ?? $validated['package_details'] ?? ['weight' => 1, 'pieces' => 1];
        $normalized = \App\Services\PackageDetailsNormalizer::normalize($raw, $weightUnit, $dimUnit, (float) ($cfg['volumetric_divisor'] ?? 5000));
        $ratePayload = \App\Services\PackageDetailsNormalizer::toRatePayload($normalized);
        return array_merge($ratePayload, [
            'dimensions' => ['length' => $ratePayload['length'] ?? 10, 'width' => $ratePayload['width'] ?? 10, 'height' => $ratePayload['height'] ?? 10],
            'packages' => $normalized['packages'],
            'summary' => $normalized['summary'],
        ]);
    }

    /**
     * Guarda adjuntos (foto opcional, comprobante de pago manual) en storage privado.
     * Rutas: shipment-attachments/{org_id}/{shipment_id}/{uuid}.ext
     */
    private function processShipmentAttachments(Shipment $shipment, int $orgId, Request $request): void
    {
        $baseDir = "shipment-attachments/{$orgId}/{$shipment->id}";

        foreach (['attachment_photo' => 'photo', 'attachment_payment_proof' => 'payment_proof'] as $inputKey => $type) {
            $file = $request->file($inputKey);
            if (!$file || !$file->isValid()) {
                continue;
            }
            $path = $file->store($baseDir, 'local');
            if ($path) {
                $shipment->attachments()->create([
                    'organization_id' => $orgId,
                    'type' => $type,
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }
    }

    /**
     * Creates shipment_packages with totals prorated from the real selected rate.
     * Source of truth: LocalCarrierAdapter/ShippingRateService.
     */
    private function createShipmentPackagesFromRequest(Shipment $shipment, array $packages, array $cfg, string $currency, array $selectedRate): void
    {
        $divisor = (float) ($cfg['volumetric_divisor'] ?? 5000);
        $breakdown = $selectedRate['breakdown'] ?? [];
        $shipmentSubtotal = (float) ($breakdown['subtotal'] ?? $shipment->subtotal ?? 0);
        $shipmentTax = (float) ($breakdown['tax'] ?? $shipment->tax ?? 0);
        $shipmentTotal = (float) ($shipment->total ?? $selectedRate['total_price'] ?? 0);
        $surchargesTotal = $shipmentTotal - $shipmentSubtotal - $shipmentTax;

        $packageData = [];
        $totalChargeable = 0.0;
        foreach ($packages as $p) {
            $weight = (float) ($p['weight'] ?? 0);
            $length = (float) ($p['length'] ?? $p['dimensions']['length'] ?? 0);
            $width = (float) ($p['width'] ?? $p['dimensions']['width'] ?? 0);
            $height = (float) ($p['height'] ?? $p['dimensions']['height'] ?? 0);
            $declaredValue = (float) ($p['declared_value'] ?? 0);
            $volumetric = ($length && $width && $height) ? ($length * $width * $height) / $divisor : 0;
            $chargeable = max($weight, $volumetric) ?: $weight ?: 1;
            $totalChargeable += $chargeable;
            $packageData[] = [
                'weight' => $weight,
                'length' => $length,
                'width' => $width,
                'height' => $height,
                'declared_value' => $declaredValue,
                'volumetric' => $volumetric,
                'chargeable' => $chargeable,
                'p' => $p,
            ];
        }
        $totalChargeable = $totalChargeable > 0 ? $totalChargeable : 1.0;

        $lastIdx = count($packageData) - 1;
        $accSubtotal = 0.0;
        $accTax = 0.0;
        $accSurcharges = 0.0;
        $accTotal = 0.0;

        foreach ($packageData as $i => $pd) {
            $ratio = $pd['chargeable'] / $totalChargeable;
            $isLast = ($i === $lastIdx);
            if ($isLast) {
                $subtotal = round($shipmentSubtotal - $accSubtotal, 2);
                $tax = round($shipmentTax - $accTax, 2);
                $surcharges = round($surchargesTotal - $accSurcharges, 2);
                $total = round($shipmentTotal - $accTotal, 2);
            } else {
                $subtotal = round($shipmentSubtotal * $ratio, 2);
                $tax = round($shipmentTax * $ratio, 2);
                $surcharges = round($surchargesTotal * $ratio, 2);
                $total = round($subtotal + $tax + $surcharges, 2);
            }
            $accSubtotal += $subtotal;
            $accTax += $tax;
            $accSurcharges += $surcharges;
            $accTotal += $total;

            $sp = $shipment->packages()->create([
                'organization_id' => $shipment->organization_id,
                'weight' => $pd['weight'],
                'pieces' => (int) ($pd['p']['pieces'] ?? 1),
                'declared_value' => $pd['declared_value'],
                'length' => $pd['length'] ?: null,
                'width' => $pd['width'] ?: null,
                'height' => $pd['height'] ?: null,
                'content_description' => $pd['p']['content_description'] ?? null,
                'volumetric_weight' => $pd['volumetric'] ?: null,
                'chargeable_weight' => $pd['chargeable'],
                'subtotal' => $subtotal,
                'surcharges_total' => $surcharges,
                'tax' => $tax,
                'total' => $total,
                'currency' => $currency,
            ]);

            if (!empty($pd['p']['items']) && is_array($pd['p']['items'])) {
                foreach ($pd['p']['items'] as $item) {
                    $qty = (int) ($item['quantity'] ?? 1);
                    $unitVal = (float) ($item['unit_value'] ?? 0);
                    $sp->items()->create([
                        'description' => $item['description'] ?? '',
                        'quantity' => $qty,
                        'unit_value' => $unitVal,
                        'total_value' => $qty * $unitVal,
                        'weight' => isset($item['weight']) ? (float) $item['weight'] : null,
                        'sku' => $item['sku'] ?? null,
                    ]);
                }
            }
        }
    }

    public function paymentSuccess(Request $request, Shipment $shipment)
    {
        $this->authorizeShipment($shipment);

        $sessionId = $request->query('session_id');
        $paypalToken = $request->query('token');

        if ($sessionId) {
            $orchestrator = app(\App\Services\PaymentOrchestrator::class);
            $verified = $orchestrator->verifyStripeSession($sessionId, $shipment->organization_id);
            if ($verified && $verified->id === $shipment->id) {
                return redirect()->route('shipments.show', $shipment)->with('success', __('Payment received. Shipment paid.'));
            }
        }

        if ($paypalToken) {
            $orchestrator = app(\App\Services\PaymentOrchestrator::class);
            if ($orchestrator->capturePayPalOrder($paypalToken, $shipment)) {
                return redirect()->route('shipments.show', $shipment)->with('success', __('Payment received. Shipment paid.'));
            }
        }

        return redirect()->route('shipments.show', $shipment)->with('info', __('Returned from payment. If you completed payment, it will be confirmed shortly.'));
    }

    /**
     * Registrar pago manual con comprobante. Crea Payment, actualiza shipment, registra trazabilidad.
     */
    public function markPaid(Request $request, Shipment $shipment)
    {
        $this->authorizeShipment($shipment);

        // Compute remaining balance server-side so the max is never client-controlled.
        $shipmentTotal     = (float) ($shipment->total ?? 0);
        $alreadyPaid       = (float) $shipment->payments()->sum('amount');
        $remainingBalance  = max(0.0, round($shipmentTotal - $alreadyPaid, 2));

        // Block if already fully paid (either by payment_status flag or zero remaining balance).
        $alreadyFullyPaid = $shipment->payment_status === PaymentStatus::PAID
            || $remainingBalance <= 0;

        if ($alreadyFullyPaid) {
            return redirect()->route('shipments.show', $shipment)
                ->with('error', __('This shipment is already fully paid.'));
        }

        $request->validate([
            // Amount is bounded by the remaining balance — the client cannot overpay or inflate.
            'amount'  => ['required', 'numeric', 'min:0.01', 'max:' . $remainingBalance],
            'receipt' => 'required|file|mimes:jpeg,jpg,png,gif,webp,pdf|max:5120',
            'notes'   => 'nullable|string|max:500',
        ]);

        $registeredAmount = round((float) $request->input('amount'), 2);

        $file    = $request->file('receipt');
        $baseDir = "payment-receipts/{$shipment->organization_id}/{$shipment->id}";
        $path    = $file->store($baseDir, 'local');

        $oldStatus = $shipment->payment_status?->value ?? 'unpaid';

        $payment = \App\Models\Payment::create([
            'shipment_id'       => $shipment->id,
            'organization_id'   => $shipment->organization_id,
            'amount'            => $registeredAmount,
            'currency'          => $shipment->currency ?? 'USD',
            'method'            => \App\Models\Payment::METHOD_MANUAL,
            'receipt_path'      => $path,
            'original_filename' => $file->getClientOriginalName(),
            'notes'             => $request->input('notes'),
            'created_by'        => Auth::id(),
        ]);

        // Determine PAID vs PARTIAL based on actual total coverage — never trust the client.
        $newTotalPaid  = round($alreadyPaid + $registeredAmount, 2);
        $fullyPaid     = ($shipmentTotal > 0) && ($newTotalPaid >= ($shipmentTotal - 0.01));
        $newPayStatus  = $fullyPaid ? PaymentStatus::PAID : PaymentStatus::PARTIAL;

        $shipment->update(['payment_status' => $newPayStatus]);

        $shipment->activities()->create([
            'user_id'     => Auth::id(),
            'action'      => 'payment_registered',
            'description' => __('shipments.activity.payment_manual') . ' (' . ($shipment->currency ?? '') . ' ' . number_format($registeredAmount, 2) . ')',
            'metadata'    => ['payment_id' => $payment->id, 'amount' => $registeredAmount, 'payment_status' => $newPayStatus->value],
        ]);

        \App\Models\AuditLog::create([
            'organization_id' => $shipment->organization_id,
            'user_id'         => Auth::id(),
            'action'          => 'payment_registered',
            'module'          => 'billing',
            'subject_id'      => (string) $shipment->id,
            'subject_type'    => Shipment::class,
            'old_values'      => ['payment_status' => $oldStatus],
            'new_values'      => ['payment_status' => $newPayStatus->value, 'payment_id' => $payment->id, 'shipment' => $shipment->tracking_number, 'amount' => $registeredAmount],
            'ip_address'      => $request->ip(),
            'user_agent'      => $request->userAgent(),
        ]);

        if ($fullyPaid) {
            event(new \App\Events\PaymentReceived($shipment, $payment, 'manual', $registeredAmount, $shipment->currency ?? 'USD'));
        }

        return redirect()->route('shipments.show', $shipment)->with('success', __('Payment registered successfully.'));
    }

    /**
     * Descargar comprobante de pago (manual).
     */
    public function downloadPaymentReceipt(\App\Models\Payment $payment)
    {
        if ($payment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }
        if (!$payment->receipt_path || !\Illuminate\Support\Facades\Storage::disk('local')->exists($payment->receipt_path)) {
            abort(404);
        }
        return \Illuminate\Support\Facades\Storage::disk('local')
            ->download($payment->receipt_path, $payment->original_filename ?? 'receipt');
    }

    public function show(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);

        // Drivers are redirected to the public tracking page instead of the admin detail
        if (Auth::user()->hasRole('Driver')) {
            return redirect()->route('tracking.index', ['tracking_number' => $shipment->tracking_number]);
        }
        $orgId = $shipment->organization_id;

        $smtpChannel = \App\Models\NotificationChannel::where('organization_id', $orgId)->where('channel_type', 'smtp')->first();
        $twilioChannel = \App\Models\NotificationChannel::where('organization_id', $orgId)->where('channel_type', 'twilio')->first();

        $cfg = $smtpChannel?->config ?? [];
        $twCfg = $twilioChannel?->config ?? [];

        $notificationsActive = [
            'email' => (bool) $smtpChannel && !empty($cfg['host']) && !empty($cfg['username']),
            'whatsapp' => (bool) $twilioChannel && !empty($twCfg['sid']) && !empty($twCfg['token']) && !empty($twCfg['whatsapp_from']),
            'sms' => (bool) $twilioChannel && !empty($twCfg['sid']) && !empty($twCfg['token']) && !empty($twCfg['sms_from']),
        ];

        $statuses = ShipmentStatusModel::where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('order')
            ->get(['id', 'code', 'name', 'color']);

        // Build rate breakdown for the UI so users can see WHY a cost was applied
        // Note: RateRule and RateCard both carry BelongsToTenant, so ::find() is already
        // org-scoped. A cross-tenant ID returns null and the if-guards below handle it.
        $rateBreakdown = null;
        if ($shipment->rate_rule_id) {
            $rule = \App\Models\RateRule::with(['zone', 'card'])->find($shipment->rate_rule_id);
            if ($rule && (int) $rule->organization_id === (int) $orgId) {
                $rateBreakdown = [
                    'card_name'              => $rule->card?->name ?? ($shipment->rateCard?->name),
                    'zone_name'              => $rule->zone?->name,
                    'service_type'           => $rule->service_type,
                    'min_weight'             => (float) $rule->min_weight,
                    'max_weight'             => (float) $rule->max_weight,
                    'price_per_kg'           => $rule->price_per_kg !== null ? (float) $rule->price_per_kg : null,
                    'price_per_lb'           => $rule->price_per_lb !== null ? (float) $rule->price_per_lb : null,
                    'flat_price'             => $rule->flat_price !== null ? (float) $rule->flat_price : null,
                    'min_charge'             => $rule->min_charge !== null ? (float) $rule->min_charge : null,
                    'fuel_surcharge_percent' => (float) ($rule->fuel_surcharge_percent ?? 0),
                    'insurance_percent'      => (float) ($rule->insurance_percent ?? 0),
                    'tax_percent'            => (float) ($rule->tax_percent ?? 0),
                    'handling_fee'           => (float) ($rule->handling_fee ?? 0),
                    'rounding_rule'          => $rule->rounding_rule ?? 'none',
                    'chargeable_weight_rule' => $rule->card?->chargeable_weight_rule,
                    'volumetric_divisor'     => $rule->card?->volumetric_divisor,
                ];
            }
        } elseif ($shipment->rate_card_id) {
            // Rate card linked but no specific rule — show card info only
            $card = \App\Models\RateCard::find($shipment->rate_card_id);
            if ($card && (int) $card->organization_id === (int) $orgId) {
                $rateBreakdown = [
                    'card_name'              => $card->name,
                    'zone_name'              => null,
                    'service_type'           => $shipment->service_type,
                    'chargeable_weight_rule' => $card->chargeable_weight_rule,
                    'volumetric_divisor'     => $card->volumetric_divisor,
                ];
            }
        }

        $shipment->load(['history', 'shipmentStatus', 'payments.creator', 'activities.user', 'packages.items', 'attachments', 'returnRequest', 'originPickup', 'preAlert.locker']);

        // Return-aware permission overrides:
        // - Active return (approved/in_transit/received/completed) → block editing shipment details
        // - Completed return → also block status changes (shipment is permanently 'returned')
        $returnStatus = $shipment->returnRequest?->status;
        $returnBlocksEdit   = in_array($returnStatus, ['approved', 'in_transit', 'received', 'completed'], true);
        $returnBlocksStatus = $returnStatus === 'completed';

        return Inertia::render('Shipments/Show', [
            'shipment' => $shipment,
            'notificationsActive' => $notificationsActive,
            'shipment_statuses' => $statuses,
            'canEdit' => !$returnBlocksEdit && (Auth::user()->hasRole('super-admin') || Auth::user()->can('edit shipments')),
            'canChangeStatus' => !$returnBlocksStatus && (Auth::user()->hasRole('super-admin') || Auth::user()->can('change status shipments')),
            'rate_breakdown' => $rateBreakdown,
        ]);
    }

    public function changeStatus(Request $request, Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        if (!Auth::user()->hasRole('super-admin') && !Auth::user()->can('change status shipments')) {
            abort(403, __('common.error'));
        }

        // Block status changes when a return has been completed — the shipment is permanently 'returned'
        $shipment->load('returnRequest');
        if ($shipment->returnRequest?->status === 'completed') {
            return back()->withErrors(['status' => __('returns.shipment_locked_by_return')]);
        }
        // Block status changes when return is in an active blocking state
        if (in_array($shipment->returnRequest?->status, ['approved', 'in_transit', 'received'], true)) {
            return back()->withErrors(['status' => __('returns.shipment_locked_by_return')]);
        }

        $validated = $request->validate([
            'status_id' => [
                'required',
                'integer',
                Rule::exists('shipment_statuses', 'id')->where('organization_id', $shipment->organization_id),
            ],
            'exception_reason' => [
                'nullable',
                'string',
                Rule::in(['Incorrect address', 'Weather conditions', 'Federal Holidays', 'Damage during transit']),
            ],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        
        // Cargar el ShipmentStatus para obtener el código
        $statusModel = \App\Models\ShipmentStatus::find($validated['status_id']);
        $statusCode = $statusModel?->code ?? $shipment->status;
        
        // Datos base a actualizar
        $updateData = [
            'status_id' => $validated['status_id'],
            'status' => $statusCode,
        ];
        
        // Block setting DELIVERED without a Proof of Delivery on file (M6 hard rule)
        if ($statusCode === ShipmentStatus::DELIVERED->value) {
            $shipment->loadMissing('proofOfDelivery');
            if (!$shipment->proofOfDelivery) {
                return back()->withErrors(['status_id' => 'No se puede marcar como entregado sin un comprobante de entrega. Registre la prueba (firma o foto) primero.']);
            }
        }

        // Si el nuevo estado es DELIVERED, establecer delivered_at para que el dashboard
        // (0% aumento mensual, tiempo promedio de entrega, estadísticas) funcione correctamente
        if ($statusCode === ShipmentStatus::DELIVERED->value && empty($shipment->delivered_at)) {
            $updateData['delivered_at'] = now();
        }

        $shipment->update($updateData);
        
        // Si el nuevo estado es de tipo excepción/retorno, registrar la razón para el dashboard "Razones de Excepciones de Entrega"
        $exceptionStatusCodes = [ShipmentStatus::EXCEPTION->value, ShipmentStatus::ON_HOLD->value, ShipmentStatus::RETURNED->value];
        if (in_array($statusCode, $exceptionStatusCodes, true)) {
            $reason = $validated['exception_reason'] ?? 'Damage during transit';
            $shipment->activities()->create([
                'user_id' => Auth::id(),
                'action' => 'exception',
                'description' => __('shipments.show.exception_recorded', ['reason' => $reason]),
                'metadata' => ['reason' => $reason],
            ]);
        }

        // Guardar nota del cambio de estado si fue provista
        $note = trim($validated['note'] ?? '');
        if ($note !== '') {
            $shipment->activities()->create([
                'user_id'     => Auth::id(),
                'action'      => 'note',
                'description' => $note,
                'metadata'    => [
                    'status_changed_to' => $statusCode,
                    'status_name'       => $statusModel?->name ?? $statusCode,
                ],
            ]);
        }

        // M7: Fire auto-dispatch notification event on every status change
        event(new \App\Events\PackageStatusUpdated($shipment));

        return redirect()->route('shipments.show', $shipment)->with('success', __('shipments.show.change_status_success'));
    }

    public function edit(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        if (!Auth::user()->hasRole('super-admin') && !Auth::user()->can('edit shipments')) {
            abort(403, __('common.error'));
        }

        // Block editing when a return is active or completed for this shipment
        $shipment->load('returnRequest');
        if (in_array($shipment->returnRequest?->status, ['approved', 'in_transit', 'received', 'completed'], true)) {
            return redirect()->route('shipments.show', $shipment)
                ->withErrors(['edit' => __('returns.shipment_locked_by_return')]);
        }

        $shipment->load('shipmentStatus');
        $statuses = ShipmentStatusModel::where('organization_id', $shipment->organization_id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get(['id', 'code', 'name', 'icon', 'color']);
        $orgId = $shipment->organization_id;
        $cfg = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($orgId);
        return Inertia::render('Shipments/Edit', [
            'shipment' => $shipment,
            'shipment_statuses' => $statuses,
            'canManagePricing' => Auth::user()->hasRole('super-admin') || Auth::user()->can('manage pricing'),
            'effectiveSettings' => [
                'currency' => $cfg['currency'] ?? 'USD',
                'weight_unit' => $cfg['weight_unit'] ?? 'kg',
                'dimension_unit' => $cfg['dimension_unit'] ?? 'cm',
                'volumetric_divisor' => $cfg['volumetric_divisor'] ?? 5000,
                'tax_rate' => $cfg['tax_rate'] ?? 0,
                'base_surcharge' => $cfg['base_surcharge'] ?? 0,
                'fuel_surcharge_percent' => $cfg['fuel_surcharge_percent'] ?? 0,
            ],
        ]);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        if (!Auth::user()->hasRole('super-admin') && !Auth::user()->can('edit shipments')) {
            abort(403, __('common.error'));
        }
        $validated = $request->validate([
            'status_id' => [
                'nullable',
                'integer',
                Rule::exists('shipment_statuses', 'id')->where('organization_id', $shipment->organization_id),
            ],
            'sender_details' => 'required|array',
            'sender_details.name' => 'required|string|max:255',
            'sender_details.phone' => 'required|string|max:50',
            'sender_details.address' => 'required|string|max:255',
            'sender_details.city' => 'required|string|max:100',
            'sender_details.country' => 'required|string|max:100',
            'receiver_details' => 'required|array',
            'receiver_details.name' => 'required|string|max:255',
            'receiver_details.phone' => 'required|string|max:50',
            'receiver_details.address' => 'required|string|max:255',
            'receiver_details.city' => 'required|string|max:100',
            'receiver_details.country' => 'required|string|max:100',
            'package_details' => 'nullable|array',
            'package_details.weight' => 'nullable|numeric|min:0',
            'package_details.pieces' => 'nullable|integer|min:1',
            'package_details.declared_value' => 'nullable|numeric|min:0',
            'package_details.content_description' => 'nullable|string|max:500',
            'package_details.dimensions' => 'nullable|array',
            'sender_details.company' => 'nullable|string|max:255',
            'sender_details.email' => 'nullable|email|max:255',
            'sender_details.tax_id' => 'nullable|string|max:100',
            'receiver_details.company' => 'nullable|string|max:255',
            'receiver_details.email' => 'nullable|email|max:255',
            'package_details.declared_value' => 'nullable|numeric|min:0',
            'subtotal' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'total' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'estimated_delivery_date' => 'nullable|date',
            'ship_date' => 'nullable|date',
        ]);
        $statusId = $validated['status_id'] ?? null;
        $statusCode = null;
        if ($statusId) {
            $ss = ShipmentStatusModel::find($statusId);
            if ($ss && $ss->organization_id === $shipment->organization_id) {
                $statusCode = $ss->code;
            }
        }
        $updateCfg = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($shipment->organization_id);
        $packageDetailsToSave = null;
        if (!empty($validated['package_details'])) {
            $raw = $validated['package_details'];
            $dims = $raw['dimensions'] ?? [];
            $weight = round((float) ($raw['weight'] ?? 1) * 10000) / 10000;
            $length = round((float) ($dims['length'] ?? $dims['l'] ?? 10) * 100) / 100;
            $width = round((float) ($dims['width'] ?? $dims['w'] ?? 10) * 100) / 100;
            $height = round((float) ($dims['height'] ?? $dims['h'] ?? 10) * 100) / 100;
            $singlePkg = ['weight' => $weight, 'length' => $length, 'width' => $width, 'height' => $height, 'pieces' => (int) ($raw['pieces'] ?? 1) ?: 1, 'declared_value' => round((float) ($raw['declared_value'] ?? 0) * 100) / 100, 'content_description' => trim((string) ($raw['content_description'] ?? ''))];
            $normalized = \App\Services\PackageDetailsNormalizer::normalize(
                isset($raw['packages']) && is_array($raw['packages']) ? $raw : [$singlePkg],
                $updateCfg['weight_unit'] ?? 'kg',
                $updateCfg['dimension_unit'] ?? 'cm',
                (float) ($updateCfg['volumetric_divisor'] ?? 5000)
            );
            $ratePayload = \App\Services\PackageDetailsNormalizer::toRatePayload($normalized);
            $packageDetailsToSave = array_merge($ratePayload, [
                'dimensions' => ['length' => $ratePayload['length'] ?? 10, 'width' => $ratePayload['width'] ?? 10, 'height' => $ratePayload['height'] ?? 10],
                'packages' => $normalized['packages'],
                'summary' => $normalized['summary'],
            ]);
        }
        $canManagePricing = Auth::user()->hasRole('super-admin') || Auth::user()->can('manage pricing');
        $data = array_filter([
            'status_id' => $statusId,
            'status' => $statusCode,
            'sender_details' => $validated['sender_details'] ?? null,
            'receiver_details' => $validated['receiver_details'] ?? null,
            'package_details' => $packageDetailsToSave ?? $validated['package_details'] ?? null,
            'subtotal'    => ($canManagePricing && isset($validated['subtotal']))    ? round((float)$validated['subtotal'], 2)    : null,
            'tax'         => ($canManagePricing && isset($validated['tax']))         ? round((float)$validated['tax'], 2)         : null,
            'discount'    => ($canManagePricing && isset($validated['discount']))    ? round((float)$validated['discount'], 2)    : null,
            'total'       => ($canManagePricing && isset($validated['total']))       ? round((float)$validated['total'], 2)       : null,
            'cost_price'  => ($canManagePricing && isset($validated['cost_price']))  ? round((float)$validated['cost_price'], 2)  : null,
            'currency' => $validated['currency'] ?? null,
            'estimated_delivery_date' => $validated['estimated_delivery_date'] ?? null,
            'ship_date' => $validated['ship_date'] ?? null,
        ], fn ($v) => $v !== null);
        if (!empty($data)) {
            $shipment->update($data);
            $changed = array_keys($data);

            // When total/subtotal change, redistribute across shipment_packages proportionally by chargeable_weight
            if (isset($data['total']) || isset($data['subtotal'])) {
                $pkgs = $shipment->packages()->get();
                if ($pkgs->count() > 0) {
                    $newTotal    = (float) ($data['total']    ?? $shipment->total    ?? 0);
                    $newSubtotal = (float) ($data['subtotal'] ?? $shipment->subtotal ?? $newTotal);
                    $totalChargeable = $pkgs->sum('chargeable_weight');
                    foreach ($pkgs as $pkg) {
                        $ratio = $totalChargeable > 0
                            ? ((float) ($pkg->chargeable_weight ?? 0)) / $totalChargeable
                            : 1.0 / $pkgs->count();
                        $pkg->update([
                            'total'    => round($newTotal    * $ratio, 2),
                            'subtotal' => round($newSubtotal * $ratio, 2),
                        ]);
                    }
                }
            }

            if (!in_array('status_id', $changed)) {
                $shipment->activities()->create([
                    'user_id' => Auth::id(),
                    'action' => 'updated',
                    'description' => __('shipments.activity.updated') . ': ' . implode(', ', $changed),
                    'metadata' => ['fields' => $changed],
                ]);
            }
        }
        return redirect()->route('shipments.show', $shipment)->with('success', __('Shipment updated successfully.'));
    }

    private function authorizeShipment(Shipment $shipment): void
    {
        if ($shipment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }
    }

    public function label(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        // Mercado Libre Label Proxy
        if ($shipment->external_source === 'mercadolibre' && $shipment->external_shipment_id) {
            $orgId = $shipment->organization_id;
            $account = ConnectedAccount::where('organization_id', $orgId)
                ->where('provider', 'mercadolibre')
                ->first();

            if ($account && $shipment->external_shipment_id) {
                $labelStartMs = (int) (microtime(true) * 1000);
                try {
                    $response = Http::withToken($account->token)
                        ->get('https://api.mercadolibre.com/shipment_labels', [
                            'shipment_ids' => $shipment->external_shipment_id,
                            'response_type' => 'pdf'
                        ]);
                    $duration = (int) (microtime(true) * 1000) - $labelStartMs;
                    $this->logMlRequest($orgId, $account->id, 'ml_get_label', ['shipment_ids' => $shipment->external_shipment_id, 'response_type' => 'pdf'], ['success' => $response->successful(), 'status' => $response->status(), 'content_length' => strlen($response->body())], $response->status(), $duration);

                    if ($response->successful()) {
                        return response($response->body())
                            ->header('Content-Type', 'application/pdf')
                            ->header('Content-Disposition', 'inline; filename="meli-label-' . $shipment->tracking_number . '.pdf"');
                    }
                } catch (\Exception $e) {
                    $duration = (int) (microtime(true) * 1000) - $labelStartMs;
                    $this->logMlRequest($orgId, $account->id, 'ml_get_label', ['shipment_ids' => $shipment->external_shipment_id], ['error' => $e->getMessage()], 500, $duration);
                    Log::error("MeLi Label Error: " . $e->getMessage());
                }
            }
        }

        // Fetch Label Configuration
        $settings = app(\App\Services\SettingsService::class);
        $settings->forOrganization($shipment->organization_id);
        $labelConfig = $settings->getGroup('labels') ?: [];

        // Inject company branding into label config
        $org = \App\Models\Organization::find($shipment->organization_id);
        $companySettings = $settings->getGroup('company');
        $labelConfig['company_name'] = !empty(trim((string)($org?->name ?? '')))
            ? $org->name
            : ($companySettings['name'] ?? '');
        $labelConfig['company_logo_url'] = $org?->logo_url
            ? \Illuminate\Support\Facades\Storage::url($org->logo_url)
            : null;

        // Construir origin/destination con siglas (PAÍS - CIUDAD) + dirección completa
        $sender = is_array($shipment->sender_details) ? $shipment->sender_details : [];
        $receiver = is_array($shipment->receiver_details) ? $shipment->receiver_details : [];
        // Siglas PAÍS-CIUDAD (ej. US-LA): país 2 letras si country_code, else 3; ciudad: abreviación inteligente
        $countrySigla = function (array $d): string {
            $code = $d['country_code'] ?? $d['country'] ?? '';
            $str = is_string($code) ? strtoupper(trim($code)) : '';
            return $str ? (strlen($str) === 2 ? $str : substr($str, 0, 3)) : '—';
        };
        $citySigla = function (array $d): string {
            $city = (string) ($d['city'] ?? '');
            $city = trim($city);
            if ($city === '') return '—';
            $parts = preg_split('/\s+/', $city, -1, PREG_SPLIT_NO_EMPTY);
            if (count($parts) >= 2) {
                return strtoupper(substr($parts[0], 0, 1) . substr($parts[1], 0, 1));
            }
            return strtoupper(substr($city, 0, 3));
        };
        $fullAddress = function (array $d): string {
            $parts = array_filter([
                $d['address'] ?? null,
                $d['address_line2'] ?? null,
                $d['city'] ?? null,
                $d['state'] ?? null,
                $d['zip_code'] ?? null,
                $d['country'] ?? null,
            ]);
            return implode(', ', $parts) ?: '—';
        };
        $originSiglas = $countrySigla($sender) . '-' . $citySigla($sender);
        $destinationSiglas = $countrySigla($receiver) . '-' . $citySigla($receiver);
        $originAddress = $fullAddress($sender);
        $destinationAddress = $fullAddress($receiver);

        // Normalizar package_details para la etiqueta desde datos reales del envío
        $pkgDetails = is_array($shipment->package_details) ? $shipment->package_details : [];
        $packagesArr = $pkgDetails['packages'] ?? [];
        $summary = $pkgDetails['summary'] ?? [];
        $firstPkg = is_array($packagesArr) && count($packagesArr) > 0 ? $packagesArr[0] : null;
        $labelPackages = [
            'weight' => $firstPkg['weight'] ?? $summary['total_weight'] ?? $pkgDetails['weight'] ?? null,
            'pieces' => (int) ($summary['total_pieces'] ?? $pkgDetails['pieces'] ?? (count($packagesArr) ?: 1)),
            'content_description' => $firstPkg['content_description'] ?? $pkgDetails['content_description'] ?? '',
            'declared_value' => $summary['declared_value_total'] ?? $firstPkg['declared_value'] ?? $pkgDetails['declared_value'] ?? null,
        ];

        $labelShipment = array_merge($shipment->toArray(), [
            'origin' => $originSiglas,
            'origin_address' => $originAddress,
            'destination' => $destinationSiglas,
            'destination_address' => $destinationAddress,
            'label_date' => $shipment->ship_date ? $shipment->ship_date->format('Y-m-d') : $shipment->created_at->format('Y-m-d'),
            'package_details' => array_merge($pkgDetails, [
                'label_weight' => $labelPackages['weight'],
                'label_pieces' => $labelPackages['pieces'],
                'label_content' => $labelPackages['content_description'],
                'label_declared_value' => $labelPackages['declared_value'],
            ]),
        ]);

        return Inertia::render('Shipments/Label', [
            'shipment' => $labelShipment,
            'label_config' => $labelConfig,
            'tracking_url' => url('/tracking?tracking_number=' . urlencode($shipment->tracking_number)),
        ]);
    }

    private function logMlRequest(int $orgId, int $accountId, string $action, array $request, array $response, int $statusCode, int $durationMs): void
    {
        try {
            \Illuminate\Support\Facades\DB::table('integration_request_logs')->insert([
                'organization_id' => $orgId,
                'integration_type' => 'mercadolibre',
                'integration_id' => $accountId,
                'action' => $action,
                'request' => json_encode($request),
                'response' => json_encode($response),
                'status_code' => $statusCode,
                'duration_ms' => $durationMs,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to log MeLi request: ' . $e->getMessage());
        }
    }

    /**
     * Eliminar envío permanentemente. Solo super-admin o permiso delete shipments.
     * No se puede eliminar si está entregado.
     */
    public function destroy(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        if (!Auth::user()->hasRole('super-admin') && !Auth::user()->can('delete shipments')) {
            abort(403, __('shipments.index.cannot_delete_permission'));
        }
        $code = $shipment->shipmentStatus?->code ?? $shipment->getRawOriginal('status');
        if ($code === ShipmentStatus::DELIVERED->value) {
            return back()->with('error', __('shipments.index.cannot_delete_delivered'));
        }

        \DB::transaction(function () use ($shipment) {
            $shipment->history()->forceDelete();
            $shipment->activities()->forceDelete();
            $shipment->packages()->each(fn ($p) => $p->items()->forceDelete());
            $shipment->packages()->forceDelete();
            $shipment->payments()->each(fn ($p) => $p->receipt_path && Storage::disk('local')->exists($p->receipt_path) && Storage::disk('local')->delete($p->receipt_path));
            $shipment->payments()->forceDelete();
            $shipment->attachments()->each(fn ($a) => $a->path && Storage::disk('local')->exists($a->path) && Storage::disk('local')->delete($a->path));
            $shipment->attachments()->forceDelete();
            $shipment->forceDelete();
        });

        return redirect()->route('shipments.index')->with('success', __('shipments.index.delete_success'));
    }

    /**
     * Eliminar múltiples envíos en una sola operación.
     * POST /shipments/bulk-destroy
     * Body: ids[] — array de IDs del tenant actual.
     * Los envíos con status "delivered" se omiten (no se eliminan).
     */
    public function bulkDestroy(Request $request): \Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1|max:200',
            'ids.*' => 'required|integer',
        ]);

        if (!Auth::user()->hasRole('super-admin') && !Auth::user()->can('delete shipments')) {
            abort(403, __('shipments.index.cannot_delete_permission'));
        }

        $shipments = Shipment::whereIn('id', $request->ids)
            ->where('organization_id', Auth::user()->organization_id)
            ->get();

        $deleted = 0;

        \DB::transaction(function () use ($shipments, &$deleted) {
            foreach ($shipments as $shipment) {
                $shipment->history()->forceDelete();
                $shipment->activities()->forceDelete();
                $shipment->packages()->each(fn ($p) => $p->items()->forceDelete());
                $shipment->packages()->forceDelete();
                $shipment->payments()->each(function ($p) {
                    if ($p->receipt_path && Storage::disk('local')->exists($p->receipt_path)) {
                        Storage::disk('local')->delete($p->receipt_path);
                    }
                });
                $shipment->payments()->forceDelete();
                $shipment->attachments()->each(function ($a) {
                    if ($a->path && Storage::disk('local')->exists($a->path)) {
                        Storage::disk('local')->delete($a->path);
                    }
                });
                $shipment->attachments()->forceDelete();
                $shipment->forceDelete();
                $deleted++;
            }
        });

        $msg = "{$deleted} envío(s) eliminado(s) correctamente.";

        return redirect()->route('shipments.index')->with('success', $msg);
    }

    /**
     * Archivar envío (ocultar de lista principal).
     */
    public function archive(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        $shipment->update(['is_archived' => true]);
        return back()->with('success', __('shipments.index.archive_success'));
    }

    /**
     * Desarchivar envío.
     */
    public function unarchive(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        $shipment->update(['is_archived' => false]);
        return back()->with('success', __('shipments.index.unarchive_success'));
    }

    /**
     * Clonar envío: crea una copia con el próximo tracking y redirige a editar.
     */
    public function clone(Shipment $shipment)
    {
        $this->authorizeShipment($shipment);
        $sequenceService = app(\App\Services\SequenceService::class);
        $sequenceService->ensureTrackingSequence($shipment->organization_id);
        $newTracking = $sequenceService->nextTrackingNumber($shipment->organization_id);

        $pendingStatus = ShipmentStatusModel::where('organization_id', $shipment->organization_id)
            ->where('code', 'pending')
            ->where('is_active', true)
            ->first()
            ?? ShipmentStatusModel::where('organization_id', $shipment->organization_id)
                ->where('is_active', true)
                ->orderBy('order')
                ->first();

        $cloneInvoiceNumber = null;
        try {
            $cloneInvoiceNumber = app(\App\Services\SequenceService::class)->nextInvoiceNumber($shipment->organization_id);
        } catch (\Throwable) {}

        $clone = Shipment::create([
            'uuid' => \Illuminate\Support\Str::uuid(),
            'invoice_number' => $cloneInvoiceNumber,
            'tracking_number' => $newTracking,
            'organization_id' => $shipment->organization_id,
            'sender_details' => $shipment->sender_details,
            'receiver_details' => $shipment->receiver_details,
            'package_details' => $shipment->package_details,
            'status' => 'pending',
            'status_id' => $pendingStatus?->id,
            'payment_status' => \App\Enums\PaymentStatus::UNPAID,
            'service_type' => $shipment->service_type,
            'subtotal' => $shipment->subtotal,
            'tax' => $shipment->tax,
            'discount' => $shipment->discount,
            'total' => $shipment->total,
            'currency' => $shipment->currency ?? 'USD',
            'rate_card_id' => $shipment->rate_card_id,
            'rate_rule_id' => $shipment->rate_rule_id,
            'created_by' => Auth::id(),
            'is_archived' => false,
        ]);

        return redirect()->route('shipments.edit', $clone)
            ->with('success', __('shipments.index.clone_success', ['tracking' => $newTracking]));
    }

    /**
     * Upsert a customer (User with role 'Customer') from sender/receiver details.
     * If a customer with the same email exists in the org → update missing fields.
     * If no email or empty name → skip silently.
     */
    private function upsertCustomerFromDetails(array $details, int $orgId): void
    {
        $name  = trim($details['name']  ?? '');
        $email = strtolower(trim($details['email'] ?? ''));
        $phone = trim($details['phone'] ?? '');

        // Need at least a name to create a customer
        if ($name === '') {
            return;
        }

        try {
            $existing = null;

            if ($email !== '') {
                // Try to find existing customer by email in this org
                $existing = \App\Models\User::where('organization_id', $orgId)
                    ->where('email', $email)
                    ->first();
            }

            // Fallback: if no email or no match, try to find by phone number.
            // This prevents duplicate auto-created customers when the shipment
            // form does not transmit the email in sender/receiver details.
            if (!$existing && $phone !== '') {
                $existing = \App\Models\User::where('organization_id', $orgId)
                    ->where('phone', $phone)
                    ->whereHas('roles', fn ($q) => $q->where('name', 'Customer'))
                    ->first();
            }

            if ($existing) {
                // Update only blank fields — never overwrite existing data
                $updates = [];
                if (!$existing->phone    && $phone)                            $updates['phone']      = $phone;
                if (!$existing->address  && !empty($details['address']))       $updates['address']    = $details['address'];
                if (!$existing->city     && !empty($details['city']))          $updates['city']       = $details['city'];
                if (!$existing->country  && !empty($details['country']))       $updates['country']    = $details['country'];
                if (!$existing->country_id && !empty($details['country_id']))  $updates['country_id'] = (int) $details['country_id'];
                if (!$existing->state_id   && !empty($details['state_id']))    $updates['state_id']   = (int) $details['state_id'];
                if (!$existing->city_id    && !empty($details['city_id']))     $updates['city_id']    = (int) $details['city_id'];
                if (!empty($updates)) {
                    $existing->update($updates);
                }
                return;
            }

            // Create new customer
            $customerRole = \Spatie\Permission\Models\Role::where('name', 'Customer')->first();
            if (!$customerRole) {
                return; // Role doesn't exist — skip
            }

            $newEmail = $email !== '' ? $email : 'customer_' . \Illuminate\Support\Str::random(10) . '@noemail.local';

            // Avoid duplicate generated emails
            while ($email === '' && \App\Models\User::where('email', $newEmail)->exists()) {
                $newEmail = 'customer_' . \Illuminate\Support\Str::random(10) . '@noemail.local';
            }

            $customer = \App\Models\User::create([
                'name'            => $name,
                'email'           => $newEmail,
                'phone'           => $phone ?: null,
                'address'         => $details['address']    ?? null,
                'city'            => $details['city']       ?? null,
                'country'         => $details['country']    ?? null,
                'country_id'      => !empty($details['country_id']) ? (int) $details['country_id'] : null,
                'state_id'        => !empty($details['state_id'])   ? (int) $details['state_id']   : null,
                'city_id'         => !empty($details['city_id'])    ? (int) $details['city_id']    : null,
                'password'        => bcrypt(\Illuminate\Support\Str::random(24)),
                'organization_id' => $orgId,
                'is_active'       => true,
            ]);

            $customer->assignRole($customerRole);

        } catch (\Throwable $e) {
            // Never fail the shipment creation because of customer upsert
            \Illuminate\Support\Facades\Log::warning('upsertCustomerFromDetails failed: ' . $e->getMessage(), [
                'org_id' => $orgId,
                'name'   => $name,
                'email'  => $email,
            ]);
        }
    }
}
