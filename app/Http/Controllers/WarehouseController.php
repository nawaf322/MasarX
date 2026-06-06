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

use App\Enums\ShipmentStatus;
use App\Http\Requests\CreateManifestRequest;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class WarehouseController extends Controller
{
    public function index()
    {
        $orgId       = Auth::user()->organization_id;
        $agingCutoff = now()->subHours(24);

        $inventoryCount     = Shipment::where('organization_id', $orgId)->where('status', ShipmentStatus::PROCESSED->value)->whereNull('manifest_id')->count();
        $agingCount         = Shipment::where('organization_id', $orgId)->where('status', ShipmentStatus::PROCESSED->value)->whereNull('manifest_id')->where('updated_at', '<', $agingCutoff)->count();
        $openManifests      = \App\Models\Manifest::where('organization_id', $orgId)->where('status', 'open')->count();
        $dispatchedToday    = \App\Models\Manifest::where('organization_id', $orgId)->where('status', 'dispatched')->whereDate('updated_at', today())->count();

        $recentScans = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::PROCESSED->value)
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get(['id', 'tracking_number', 'receiver_details', 'updated_at']);

        return Inertia::render('Warehouse/Index', [
            'stats' => [
                'inventory_count'  => $inventoryCount,
                'aging_count'      => $agingCount,
                'open_manifests'   => $openManifests,
                'dispatched_today' => $dispatchedToday,
            ],
            'recent_scans' => $recentScans,
        ]);
    }

    public function receive()
    {
        return Inertia::render('Warehouse/Receive');
    }

    public function scan(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $request->validate([
            'tracking_number' => [
                'required', 'string',
                Rule::exists('shipments', 'tracking_number')
                    ->where('organization_id', $orgId),
            ],
        ]);

        $shipment = Shipment::where('tracking_number', $request->tracking_number)
            ->where('organization_id', $orgId)
            ->first();

        if (!$shipment) {
            return response()->json(['error' => true, 'message' => 'Shipment not found.'], 404);
        }

        $currentStatus = $shipment->status;

        // Already received at hub — idempotency guard
        if ($currentStatus === ShipmentStatus::PROCESSED->value) {
            return response()->json([
                'warning'  => true,
                'code'     => 'already_received',
                'message'  => 'Este paquete ya fue recibido en el hub.',
                'shipment' => $shipment,
            ], 409);
        }

        // Already dispatched / beyond hub stage
        $beyondHub = [
            ShipmentStatus::PICKED_UP->value ?? 'picked_up',
            ShipmentStatus::IN_TRANSIT->value ?? 'in_transit',
            ShipmentStatus::OUT_FOR_DELIVERY->value ?? 'out_for_delivery',
            ShipmentStatus::DELIVERED->value ?? 'delivered',
        ];

        if (in_array($currentStatus, $beyondHub)) {
            return response()->json([
                'warning'  => true,
                'code'     => 'already_dispatched',
                'message'  => 'Este paquete ya fue despachado (estado: ' . $currentStatus . ').',
                'shipment' => $shipment,
            ], 409);
        }

        // Update status to PROCESSED (Received at Hub)
        $processedModel = \App\Models\ShipmentStatus::where('organization_id', $shipment->organization_id)
            ->where('code', ShipmentStatus::PROCESSED->value)
            ->first();

        $shipment->update([
            'status'    => ShipmentStatus::PROCESSED->value,
            'status_id' => $processedModel?->id,
        ]);

        // 1. Audit Log
        $statusModel = \App\Models\ShipmentStatus::where('organization_id', $shipment->organization_id)
            ->where('code', ShipmentStatus::PROCESSED->value)->first();
        \App\Models\ShipmentHistory::create([
            'shipment_id'     => $shipment->id,
            'status_id'       => $statusModel?->id,
            'status'          => ShipmentStatus::PROCESSED->value,
            'location'        => 'Warehouse Hub',
            'description'     => 'Package received at Hub',
            'organization_id' => $shipment->organization_id,
            'user_id'         => Auth::id(),
        ]);

        // 2. Real-Time Broadcast
        event(new \App\Events\PackageStatusUpdated($shipment));

        // 3. Domain event — triggers HandleWarehouseReceiving listener
        event(new \App\Events\ShipmentReceivedAtWarehouse($shipment, null, Auth::user()?->name));

        return response()->json([
            'message'  => 'Shipment received successfully',
            'shipment' => $shipment,
        ]);
    }

    public function manifests(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $query = \App\Models\Manifest::with('driver')->withCount('shipments')->latest();

        if ($request->filled('search')) {
            $q = '%' . $request->search . '%';
            $query->where(function ($qb) use ($q) {
                $qb->where('manifest_number', 'like', $q)
                    ->orWhereHas('driver', fn ($d) => $d->where('name', 'like', $q));
            });
        }

        $manifests = $query->paginate($request->per_page ?? 15)->withQueryString();

        $drivers = \App\Models\User::role('Driver')
            ->where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Warehouse/Manifests/Index', [
            'manifests' => $manifests->items(),
            'drivers'   => $drivers,
            'meta' => [
                'current_page' => $manifests->currentPage(),
                'last_page'    => $manifests->lastPage(),
                'per_page'     => $manifests->perPage(),
                'total'        => $manifests->total(),
                'from'         => $manifests->firstItem(),
                'to'           => $manifests->lastItem(),
            ],
            'query' => $request->all(),
        ]);
    }

    public function exportPdf(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $org   = \App\Models\Organization::find($orgId);

        $query = \App\Models\Manifest::with(['driver', 'shipments'])
            ->where('organization_id', $orgId)
            ->latest();

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }
        if ($request->filled('driver_id') && $request->driver_id !== 'all') {
            $query->where('driver_id', $request->driver_id);
        }

        $manifests = $query->get();

        $driverName = 'Todos los conductores';
        if ($request->filled('driver_id') && $request->driver_id !== 'all') {
            $driver     = \App\Models\User::find($request->driver_id);
            $driverName = $driver?->name ?? $driverName;
        }

        // Read i18n labels from the frontend JSON (single source of truth)
        $locale  = app()->getLocale();
        $i18nPath = resource_path("js/i18n/{$locale}.json");
        $i18nFallback = resource_path('js/i18n/es.json');
        $i18nRaw = file_exists($i18nPath) ? file_get_contents($i18nPath) : file_get_contents($i18nFallback);
        $i18n    = json_decode($i18nRaw, true) ?? [];
        $wh      = $i18n['warehouse'] ?? [];
        $common  = $i18n['common']    ?? [];

        $labels = [
            'title'           => $wh['pdf_title']            ?? 'Manifiestos de Despacho',
            'generated'       => $wh['pdf_generated']        ?? 'Generado',
            'period'          => $wh['pdf_period']           ?? 'Período',
            'period_to'       => $wh['pdf_to']               ?? 'al',
            'period_today'    => $wh['pdf_today']            ?? 'hoy',
            'driver'          => $wh['driver']               ?? 'Conductor',
            'all_drivers'     => $wh['all_drivers']          ?? 'Todos los conductores',
            'manifests_lbl'   => $wh['manifests_title']      ?? 'Manifiestos',
            'total_shipments' => $wh['pdf_total_shipments']  ?? 'Envíos Totales',
            'open_lbl'        => $wh['pdf_open']             ?? 'Abiertos',
            'dispatched_lbl'  => $wh['pdf_dispatched']       ?? 'Despachados',
            'status_open'     => $wh['manifest_status_open']       ?? 'Abierto',
            'status_closed'   => $wh['manifest_status_closed']     ?? 'Cerrado',
            'status_dispatched' => $wh['manifest_status_dispatched'] ?? 'Despachado',
            'unassigned'      => $wh['unassigned']           ?? 'Sin asignar',
            'created'         => $wh['created']              ?? 'Fecha',
            'shipments_count' => $wh['shipments_count']      ?? 'Envíos',
            'tracking_col'    => $wh['tracking_col']         ?? 'Seguimiento',
            'destination'     => $wh['destination']          ?? 'Destino',
            'recipient'       => $wh['pdf_recipient']        ?? 'Destinatario',
            'status_lbl'      => $common['status']           ?? 'Estado',
            'no_shipments'    => $wh['pdf_no_shipments']     ?? 'Sin envíos registrados',
            'no_results'      => $wh['pdf_no_results']       ?? 'No se encontraron manifiestos.',
            'footer'          => $wh['pdf_footer']           ?? 'Manifiestos de Despacho — Generado el',
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.manifests', [
            'manifests'    => $manifests,
            'org'          => $org,
            'from_date'    => $request->from_date,
            'to_date'      => $request->to_date,
            'driver_name'  => $driverName,
            'generated_at' => now()->format('d/m/Y H:i'),
            'labels'       => $labels,
        ])->setPaper('a4', 'portrait');

        $filename = 'manifiestos-' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function showManifest(\App\Models\Manifest $manifest)
    {
        $manifest->load(['driver', 'shipments']);

        return Inertia::render('Warehouse/Manifests/Show', [
            'manifest' => $manifest,
        ]);
    }

    public function inventory(Request $request)
    {
        $query = Shipment::where('status', ShipmentStatus::PROCESSED->value)
            ->whereNull('manifest_id')
            ->orderBy('updated_at', 'asc');

        if ($request->filled('search')) {
            $q = '%' . $request->search . '%';
            $query->where(function ($qb) use ($q) {
                $qb->where('tracking_number', 'like', $q)
                    ->orWhere('receiver_details->city', 'like', $q)
                    ->orWhere('receiver_details->country', 'like', $q);
            });
        }

        $inventory = $query->paginate($request->per_page ?? 15)->withQueryString();

        // Summary counts for the header cards
        $totalInHub   = Shipment::where('status', ShipmentStatus::PROCESSED->value)->whereNull('manifest_id')->count();
        $agingCutoff  = now()->subHours(24);
        $agingCount   = Shipment::where('status', ShipmentStatus::PROCESSED->value)->whereNull('manifest_id')->where('updated_at', '<', $agingCutoff)->count();

        return Inertia::render('Warehouse/Inventory/Index', [
            'inventory'   => $inventory->items(),
            'total_in_hub' => $totalInHub,
            'aging_count'  => $agingCount,
            'meta' => [
                'current_page' => $inventory->currentPage(),
                'last_page'    => $inventory->lastPage(),
                'per_page'     => $inventory->perPage(),
                'total'        => $inventory->total(),
                'from'         => $inventory->firstItem(),
                'to'           => $inventory->lastItem(),
            ],
            'query' => $request->all(),
        ]);
    }

    public function exportInventoryPdf(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $org   = \App\Models\Organization::find($orgId);

        $query = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::PROCESSED->value)
            ->whereNull('manifest_id')
            ->orderBy('updated_at', 'asc');

        if ($request->filled('from_date')) {
            $query->whereDate('updated_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('updated_at', '<=', $request->to_date);
        }

        $items = $query->get();

        // Build labels from frontend i18n JSON
        $locale   = app()->getLocale();
        $i18nPath = resource_path("js/i18n/{$locale}.json");
        $i18nFallback = resource_path('js/i18n/es.json');
        $i18nRaw  = file_exists($i18nPath) ? file_get_contents($i18nPath) : file_get_contents($i18nFallback);
        $i18n     = json_decode($i18nRaw, true) ?? [];
        $wh       = $i18n['warehouse'] ?? [];
        $common   = $i18n['common']    ?? [];

        $agingCutoff = now()->subHours(24);
        $agingCount  = $items->filter(fn($s) => \Carbon\Carbon::parse($s->updated_at)->lt($agingCutoff))->count();

        $labels = [
            'title'          => $wh['inv_pdf_title']        ?? 'Inventario del Hub',
            'generated'      => $wh['pdf_generated']        ?? 'Generado',
            'period'         => $wh['pdf_period']           ?? 'Período',
            'period_to'      => $wh['pdf_to']               ?? 'al',
            'period_today'   => $wh['pdf_today']            ?? 'hoy',
            'total'          => $wh['inv_total']            ?? 'Total en Bodega',
            'aging_count'    => $wh['inv_aging_count']      ?? 'Antigüedad >24h',
            'tracking_col'   => $wh['tracking_col']         ?? 'Seguimiento',
            'recipient'      => $wh['pdf_recipient']        ?? 'Destinatario',
            'destination'    => $wh['destination']          ?? 'Destino',
            'received_at'    => $wh['received_at']          ?? 'Recibido En',
            'aging_lbl'      => $wh['aging']                ?? 'Antigüedad',
            'status_lbl'     => $common['status']           ?? 'Estado',
            'received_hub'   => $wh['inv_received_hub']     ?? 'Recibido en Hub',
            'aging_warning'  => $wh['aging_warning']        ?? 'Antigüedad',
            'no_results'     => $wh['inv_pdf_no_results']   ?? 'No se encontraron paquetes.',
            'footer'         => $wh['inv_pdf_footer']       ?? 'Inventario del Hub — Generado el',
            'hours_lbl'      => $wh['aging_hours']          ?? 'h en bodega',
            'weight'         => $wh['weight']               ?? 'Peso',
            'pieces'         => $wh['pieces']               ?? 'Piezas',
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.inventory', [
            'items'        => $items,
            'org'          => $org,
            'from_date'    => $request->from_date,
            'to_date'      => $request->to_date,
            'generated_at' => now()->format('d/m/Y H:i'),
            'aging_count'  => $agingCount,
            'labels'       => $labels,
        ])->setPaper('a4', 'portrait');

        $filename = 'inventario-' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * Lookup shipment by tracking (read-only, for manifest add).
     * Returns shipment if exists, PROCESSED, and not yet manifested.
     */
    public function lookupShipment(Request $request)
    {
        $request->validate([
            'tracking_number' => 'required|string',
        ]);

        $shipment = Shipment::where('tracking_number', $request->tracking_number)
            ->where('status', ShipmentStatus::PROCESSED->value)
            ->whereNull('manifest_id')
            ->where('organization_id', Auth::user()->organization_id)
            ->first();

        if (!$shipment) {
            return response()->json(['error' => true, 'message' => 'Tracking not found'], 404);
        }

        return response()->json(['shipment' => $shipment]);
    }

    public function createManifest(CreateManifestRequest $request)
    {
        $orgId = Auth::user()->organization_id;

        // Validation is handled by CreateManifestRequest (org-scoped Rule::exists).

        $manifest = \App\Models\Manifest::create([
            'uuid' => \Illuminate\Support\Str::uuid(),
            'manifest_number' => 'MAN-' . strtoupper(\Illuminate\Support\Str::random(8)),
            'organization_id' => $orgId,
            'driver_id' => $request->driver_id,
            'status' => 'open'
        ]);

        // Scope the shipment query to the org even after validation — defense in depth.
        // Also re-enforce status=processed and manifest_id=null to prevent race conditions.
        $shipments = Shipment::whereIn('id', $request->shipment_ids)
            ->where('organization_id', $orgId)
            ->where('status', ShipmentStatus::PROCESSED->value)
            ->whereNull('manifest_id')
            ->get();

        foreach ($shipments as $shipment) {
            $shipment->update([
                'manifest_id' => $manifest->id,
                'status' => ShipmentStatus::IN_TRANSIT->value
            ]);

            // Audit
            $statusModel = \App\Models\ShipmentStatus::where('organization_id', $shipment->organization_id)->where('code', ShipmentStatus::IN_TRANSIT->value)->first();
            \App\Models\ShipmentHistory::create([
                'shipment_id' => $shipment->id,
                'status_id' => $statusModel?->id,
                'status' => ShipmentStatus::IN_TRANSIT->value,
                'location' => 'Warehouse Hub -> Truck',
                'description' => 'Assigned to Manifest ' . $manifest->manifest_number,
                'organization_id' => $shipment->organization_id,
                'user_id' => Auth::id()
            ]);

            // Real-time
            event(new \App\Events\PackageStatusUpdated($shipment));
        }

        // In-app notification for manifest creation
        try {
            app(\App\Services\InAppNotificationService::class)->broadcast(
                orgId: $orgId,
                type: 'manifest_created',
                title: "Manifiesto creado: {$manifest->manifest_number}",
                body: count($shipments) . ' envíos asignados',
                icon: 'warehouse',
                url: "/warehouse/manifests/{$manifest->id}",
            );
        } catch (\Throwable) {}

        return redirect()->back()->with('success', 'Manifest created.');
    }

    // M4 — List inventory items with photos
    public function items(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $query = \App\Models\InventoryItem::where('organization_id', $orgId);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('sku', 'like', "%{$s}%");
            });
        }

        $items = $query->orderBy('name')->paginate(20)->withQueryString();

        return Inertia::render('Warehouse/Items/Index', [
            'items'   => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    // M4 — List inventory locations with photos
    public function locations(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $query = \App\Models\InventoryLocation::where('organization_id', $orgId)
            ->with('warehouse:id,name');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%");
            });
        }

        $locations = $query->orderBy('code')->paginate(20)->withQueryString();

        return Inertia::render('Warehouse/Locations/Index', [
            'locations' => $locations,
            'filters'   => $request->only(['search']),
        ]);
    }

    // M4 — Upload photos for an inventory item
    public function uploadItemPhotos(Request $request, \App\Models\InventoryItem $item): \Illuminate\Http\JsonResponse
    {
        abort_if($item->organization_id !== Auth::user()->organization_id, 403);

        $request->validate([
            'photos'   => 'required|array|min:1',
            'photos.*' => 'image|mimes:jpeg,jpg,png,gif,webp|max:5120',
        ]);

        $orgId = Auth::user()->organization_id;
        $paths = $item->photos ?? [];

        foreach ($request->file('photos') as $photo) {
            $paths[] = $photo->store("inventory-photos/{$orgId}/items", 'public');
        }

        $item->update(['photos' => $paths]);

        return response()->json(['photos' => $paths]);
    }

    // M4 — Upload photos for an inventory location
    public function uploadLocationPhotos(Request $request, \App\Models\InventoryLocation $location): \Illuminate\Http\JsonResponse
    {
        abort_if($location->organization_id !== Auth::user()->organization_id, 403);

        $request->validate([
            'photos'   => 'required|array|min:1',
            'photos.*' => 'image|mimes:jpeg,jpg,png,gif,webp|max:5120',
        ]);

        $orgId = Auth::user()->organization_id;
        $paths = $location->photos ?? [];

        foreach ($request->file('photos') as $photo) {
            $paths[] = $photo->store("inventory-photos/{$orgId}/locations", 'public');
        }

        $location->update(['photos' => $paths]);

        return response()->json(['photos' => $paths]);
    }
}
