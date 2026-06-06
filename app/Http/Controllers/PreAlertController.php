<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use App\Models\PreAlert;
use App\Models\PreAlertAttachment;
use App\Models\RateCard;
use App\Models\Warehouse;
use App\Services\InvoiceParserService;
use App\Services\PreAlertService;
use App\Services\ShippingRateService;
use App\Services\Settings\SettingsResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PreAlertController extends Controller
{
    public function index(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        // Customers can only see their own pre-alerts (defense-in-depth scoping)
        $isCustomer = $user->hasRole('customer');

        $query = PreAlert::with(['customer', 'locker', 'shipment'])
            ->where('organization_id', $orgId);

        if ($isCustomer) {
            $query->where('customer_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search') && !$isCustomer) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('store_tracking_number', 'like', "%{$search}%")
                  ->orWhere('store_name', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        } elseif ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('store_tracking_number', 'like', "%{$search}%")
                  ->orWhere('store_name', 'like', "%{$search}%");
            });
        }

        $perPage  = (int) $request->get('per_page', 15);
        $alerts   = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        $baseQuery = PreAlert::where('organization_id', $orgId);
        if ($isCustomer) {
            $baseQuery->where('customer_id', $user->id);
        }

        $summary  = [
            'total'     => (clone $baseQuery)->count(),
            'pending'   => (clone $baseQuery)->where('status', 'pending')->count(),
            'received'  => (clone $baseQuery)->where('status', 'received')->count(),
            'processing'=> (clone $baseQuery)->where('status', 'processing')->count(),
            'converted' => (clone $baseQuery)->where('status', 'converted')->count(),
            'cancelled' => (clone $baseQuery)->where('status', 'cancelled')->count(),
        ];

        return Inertia::render('PreAlerts/Index', [
            'preAlerts' => $alerts,
            'filters'   => $request->only(['search', 'status']),
            'summary'   => $summary,
        ]);
    }

    public function create(Request $request): Response
    {
        $user    = Auth::user();
        $orgId   = $user->organization_id;
        $isCustomer = $user->hasRole('customer');

        if ($isCustomer) {
            // Customer only sees their own locker
            $lockers = Locker::where('organization_id', $orgId)
                ->where('customer_id', $user->id)
                ->where('status', 'active')
                ->orderBy('code')
                ->get(['id', 'code', 'address', 'customer_id']);

            $prefillLockerId = $request->get('locker_id')
                ? (int) $request->get('locker_id')
                : ($lockers->first()?->id);

            return Inertia::render('PreAlerts/Create', [
                'lockers'           => $lockers,
                'customers'         => [],
                'prefillLockerId'   => $prefillLockerId,
                'currentCustomerId' => $user->id,
            ]);
        }

        $lockers = Locker::where('organization_id', $orgId)
            ->where('status', 'active')
            ->with('customer')
            ->orderBy('code')
            ->get(['id', 'code', 'address', 'customer_id']);

        $customers = \App\Models\User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->whereHas('roles', fn($q) => $q->where('name', 'Customer'))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $prefillLockerId = $request->get('locker_id');

        return Inertia::render('PreAlerts/Create', [
            'lockers'           => $lockers,
            'customers'         => $customers,
            'prefillLockerId'   => $prefillLockerId ? (int) $prefillLockerId : null,
            'currentCustomerId' => null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'locker_id'             => 'nullable|integer|exists:lockers,id',
            'customer_id'           => 'nullable|integer|exists:users,id',
            'store_name'            => 'required|string|max:255',
            'store_tracking_number' => 'required|string|max:255',
            'store_url'             => 'nullable|url|max:500',
            'declared_value'        => 'required|numeric|min:0',
            'declared_currency'     => 'required|string|size:3',
            'declared_weight_kg'    => 'nullable|numeric|min:0',
            'description'           => 'nullable|string|max:2000',
            'notes'                 => 'nullable|string|max:1000',
            'invoice_file'          => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);

        $isCustomer = Auth::user()->hasRole('customer');

        // Customers can only create pre-alerts for themselves and their own locker
        if ($isCustomer) {
            $validated['customer_id'] = Auth::id();
            if (empty($validated['locker_id'])) {
                $myLocker = Locker::where('organization_id', $orgId)
                    ->where('customer_id', Auth::id())
                    ->where('status', 'active')
                    ->first();
                if ($myLocker) {
                    $validated['locker_id'] = $myLocker->id;
                }
            }
        }

        // Verify locker belongs to org
        if (!empty($validated['locker_id'])) {
            $locker = Locker::where('id', $validated['locker_id'])
                ->where('organization_id', $orgId)
                ->firstOrFail();
        }

        $preAlert = PreAlert::create([
            'organization_id'       => $orgId,
            'customer_id'           => $validated['customer_id'] ?? Auth::id(),
            'locker_id'             => $validated['locker_id'] ?? null,
            'store_name'            => $validated['store_name'],
            'store_tracking_number' => $validated['store_tracking_number'],
            'store_url'             => $validated['store_url'] ?? null,
            'declared_value'        => $validated['declared_value'],
            'declared_currency'     => $validated['declared_currency'],
            'declared_weight_kg'    => $validated['declared_weight_kg'] ?? null,
            'description'           => $validated['description'] ?? null,
            'notes'                 => $validated['notes'] ?? null,
            'status'                => 'pending',
        ]);

        // Asignar número de pre-alerta único usando el ID garantizado de la BD
        $preAlert->pre_alert_number = 'PA-' . date('Y') . '-' . str_pad($preAlert->id, 5, '0', STR_PAD_LEFT);
        $preAlert->save();

        // Store invoice file if provided
        if ($request->hasFile('invoice_file')) {
            $file = $request->file('invoice_file');
            $path = $file->store("pre-alert-attachments/{$orgId}/{$preAlert->id}", 'public');
            PreAlertAttachment::create([
                'pre_alert_id'    => $preAlert->id,
                'organization_id' => $orgId,
                'type'            => 'purchase_invoice',
                'path'            => $path,
                'original_name'   => $file->getClientOriginalName(),
                'mime_type'       => $file->getMimeType(),
                'size'            => $file->getSize(),
            ]);
        }

        event(new \App\Events\PreAlertCreated($preAlert));

        return redirect()->route('pre-alerts.show', $preAlert)
            ->with('success', __('pre_alerts.created'));
    }

    public function show(PreAlert $preAlert): Response
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);

        $preAlert->load(['customer', 'locker', 'shipment', 'attachments']);

        // Add url to each attachment for the frontend
        $preAlert->attachments->transform(function ($att) {
            $att->setAttribute('url', $att->url());
            $att->setAttribute('file_name', $att->original_name);
            $att->setAttribute('file_size', $att->size);
            return $att;
        });

        $hasInvoiceAttachment = $preAlert->attachments
            ->contains('type', 'purchase_invoice');

        return Inertia::render('PreAlerts/Show', [
            'preAlert'        => $preAlert,
            'canReceive'      => in_array($preAlert->status, ['pending']),
            'canConvert'      => in_array($preAlert->status, ['received', 'processing']),
            'canCancel'       => in_array($preAlert->status, ['pending', 'received', 'processing']),
            'canParseInvoice' => $hasInvoiceAttachment && $preAlert->status !== 'converted',
        ]);
    }

    /**
     * Operator marks physical receipt of the package at the warehouse.
     * Creates InventoryMovement. Does NOT yet create Shipment.
     */
    public function receive(Request $request, PreAlert $preAlert): RedirectResponse
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'location_id'  => 'nullable|integer|exists:inventory_locations,id',
            'notes'        => 'nullable|string|max:500',
        ]);

        // If no warehouse provided, try to resolve from locker
        $warehouseId = $validated['warehouse_id']
            ?? $preAlert->locker?->warehouse_id
            ?? Warehouse::where('organization_id', $preAlert->organization_id)->value('id');

        app(PreAlertService::class)->markReceived(
            $preAlert,
            $warehouseId,
            $validated['location_id'] ?? null,
        );

        return redirect()->route('pre-alerts.show', $preAlert)
            ->with('success', __('pre_alerts.received'));
    }

    /**
     * Show the conversion form: weigh → quote → duty → total → confirm.
     */
    public function showConvert(PreAlert $preAlert): Response
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);
        abort_if(!in_array($preAlert->status, ['received', 'processing']), 422);

        $orgId = Auth::user()->organization_id;
        $preAlert->load(['customer', 'locker', 'attachments']);

        $rateCards = RateCard::where('organization_id', $orgId)
            ->where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'currency', 'chargeable_weight_rule', 'volumetric_divisor']);

        $cfg = app(SettingsResolver::class)->getEffectiveSettings($orgId);

        return Inertia::render('PreAlerts/Convert', [
            'preAlert'   => $preAlert,
            'rateCards'  => $rateCards,
            'currency'   => $cfg['currency'] ?? 'USD',
            'weightUnit' => $cfg['weight_unit'] ?? 'kg',
        ]);
    }

    /**
     * JSON endpoint: quote rates for given weight / dimensions (called from Convert.tsx).
     */
    public function rateQuote(Request $request, PreAlert $preAlert): JsonResponse
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'weight'      => 'required|numeric|min:0.01',
            'length'      => 'nullable|numeric|min:0',
            'width'       => 'nullable|numeric|min:0',
            'height'      => 'nullable|numeric|min:0',
            'rate_card_id'=> 'nullable|integer|exists:rate_cards,id',
        ]);

        $preAlert->load(['locker', 'customer']);

        $senderDetails   = ['name' => 'Warehouse', 'address' => $preAlert->locker?->address ?? '', 'city' => '', 'country' => ''];
        $receiverDetails = ['name' => $preAlert->customer?->name ?? '', 'address' => $preAlert->customer?->address ?? '', 'city' => '', 'country' => ''];

        $payload = [
            'organization_id'  => $preAlert->organization_id,
            'sender_details'   => $senderDetails,
            'receiver_details' => $receiverDetails,
            'package_details'  => [
                'weight'         => (float) $validated['weight'],
                'length'         => (float) ($validated['length'] ?? 0),
                'width'          => (float) ($validated['width']  ?? 0),
                'height'         => (float) ($validated['height'] ?? 0),
                'declared_value' => (float) $preAlert->declared_value,
                'pieces'         => 1,
            ],
        ];

        if (!empty($validated['rate_card_id'])) {
            $payload['rate_card_id'] = $validated['rate_card_id'];
        }

        try {
            $rates = app(ShippingRateService::class)->quoteRates($payload);
        } catch (\Throwable $e) {
            return response()->json(['rates' => [], 'error' => $e->getMessage()]);
        }

        return response()->json(['rates' => $rates]);
    }

    /**
     * Convert pre-alert into a real Shipment (the core bridge operation).
     */
    public function convert(Request $request, PreAlert $preAlert): RedirectResponse
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'actual_weight_kg'    => 'nullable|numeric|min:0',
            'length_cm'           => 'nullable|numeric|min:0',
            'width_cm'            => 'nullable|numeric|min:0',
            'height_cm'           => 'nullable|numeric|min:0',
            'service_type'        => 'nullable|string|max:100',
            'rate_card_id'        => 'nullable|integer|exists:rate_cards,id',
            'rate_rule_id'        => 'nullable|integer|exists:rate_rules,id',
            'shipping_rate'       => 'nullable|numeric|min:0',
            'customs_duty_percent'=> 'nullable|numeric|min:0|max:100',
            'customs_duty_amount' => 'nullable|numeric|min:0',
            'subtotal'            => 'nullable|numeric|min:0',
            'total'               => 'nullable|numeric|min:0',
            'currency'            => 'nullable|string|size:3',
            'notes'               => 'nullable|string|max:1000',
        ]);

        $shipment = app(PreAlertService::class)->convertToShipment($preAlert, $validated);

        return redirect()->route('shipments.show', $shipment)
            ->with('success', __('pre_alerts.converted'));
    }

    public function bulkCancel(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer']);
        $orgId = Auth::user()->organization_id;
        $count = PreAlert::where('organization_id', $orgId)
            ->whereIn('id', $request->ids)
            ->whereNotIn('status', ['cancelled', 'converted'])
            ->update(['status' => 'cancelled']);
        return back()->with('success', "{$count} pre-alert(s) cancelled.");
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer']);
        $orgId = Auth::user()->organization_id;
        $deleted = PreAlert::where('organization_id', $orgId)
            ->whereIn('id', $request->ids)
            ->delete();
        return back()->with('success', "{$deleted} pre-alert(s) deleted.");
    }

    public function cancel(Request $request, PreAlert $preAlert): RedirectResponse
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);
        abort_if($preAlert->isConverted(), 422, __('pre_alerts.cannot_cancel_converted'));

        $preAlert->update(['status' => 'cancelled']);

        return redirect()->route('pre-alerts.index')
            ->with('success', __('pre_alerts.cancelled'));
    }

    /**
     * Extract invoice data from the purchase invoice attachment (PDF or image).
     * Stores result in pre_alerts.invoice_data.
     */
    public function parseInvoice(PreAlert $preAlert): RedirectResponse
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);

        $parsed = app(InvoiceParserService::class)->parseForPreAlert($preAlert);

        if (isset($parsed['error'])) {
            return redirect()->route('pre-alerts.show', $preAlert)
                ->with('error', __('pre_alerts.parse_error') . ': ' . $parsed['error']);
        }

        $preAlert->update(['invoice_data' => $parsed]);

        // Mark the purchase invoice attachment as parsed
        $preAlert->attachments()
            ->where('type', 'purchase_invoice')
            ->update(['invoice_parsed' => true]);

        return redirect()->route('pre-alerts.show', $preAlert)
            ->with('success', __('pre_alerts.parse_success'));
    }

    /**
     * Import pre-alerts from MasarX Pro SQL dump (cdb_pre_alert + cdb_users).
     */
    public function importMasarXPro(Request $request)
    {
        $request->validate([
            'files'   => 'required|array|min:1|max:6',
            'files.*' => 'required|file|mimes:sql,txt|max:20480',
        ]);

        $sqlContent = '';
        foreach ($request->file('files') as $file) {
            $sqlContent .= "\n" . file_get_contents($file->getRealPath());
        }

        if (empty(trim($sqlContent))) {
            return response()->json(['success' => false, 'message' => 'SQL files are empty.'], 422);
        }

        // Dangerous SQL check (same as other importers)
        $dangerous = ['DROP ', 'TRUNCATE ', 'ALTER USER', 'ALTER DATABASE', 'GRANT ', 'REVOKE ', 'CREATE USER', 'DELETE FROM', 'UPDATE ', 'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE', 'BENCHMARK(', 'SLEEP('];
        $upperSql = strtoupper($sqlContent);
        foreach ($dangerous as $keyword) {
            if (str_contains($upperSql, $keyword)) {
                return response()->json(['success' => false, 'message' => 'SQL file contains forbidden operations (' . trim($keyword) . ').'], 422);
            }
        }

        if (stripos($sqlContent, 'cdb_pre_alert') === false) {
            return response()->json(['success' => false, 'message' => 'Table cdb_pre_alert not found in the SQL file.'], 422);
        }

        // cdb_users.sql is now optional — the importer handles both cases:
        // - If included: builds old_id→email map and auto-imports new customers
        // - If not included: uses existing DB customers (throws if none exist)

        try {
            $importer = new \App\Services\MasarXProPreAlertImporter($sqlContent, Auth::user()->organization_id);
            $result = $importer->import();
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Import error: ' . $e->getMessage()], 422);
        }

        return response()->json([
            'success'  => true,
            'imported' => $result['imported'],
            'skipped'  => $result['skipped'],
        ]);
    }

    /**
     * Upload additional attachment to existing pre-alert.
     */
    public function uploadAttachment(Request $request, PreAlert $preAlert): RedirectResponse
    {
        abort_if($preAlert->organization_id !== Auth::user()->organization_id, 403);

        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'type' => 'nullable|in:purchase_invoice,product_photo,other',
        ]);

        $orgId = Auth::user()->organization_id;
        $file  = $request->file('file');
        $path  = $file->store("pre-alert-attachments/{$orgId}/{$preAlert->id}", 'public');

        PreAlertAttachment::create([
            'pre_alert_id'    => $preAlert->id,
            'organization_id' => $orgId,
            'type'            => $request->input('type', 'other'),
            'path'            => $path,
            'original_name'   => $file->getClientOriginalName(),
            'mime_type'       => $file->getMimeType(),
            'size'            => $file->getSize(),
        ]);

        return redirect()->route('pre-alerts.show', $preAlert)
            ->with('success', __('pre_alerts.attachment_uploaded'));
    }
}
