<?php

namespace App\Http\Controllers;

use App\Models\OriginPickup;
use App\Models\Shipment;
use App\Models\User;
use App\Services\InAppNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PickupController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;
        $isDriver = Auth::user()->hasRole('Driver');

        $query = OriginPickup::with(['shipment', 'requestedBy', 'confirmedBy', 'driver'])
            ->where('origin_pickups.organization_id', $orgId);

        // Drivers see only their own assigned pickups
        if ($isDriver) {
            $query->where('driver_id', Auth::id());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('shipment', function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 15);
        $pickups = $query->orderByDesc('scheduled_for')->paginate($perPage)->withQueryString();

        $summary = [
            'total'       => OriginPickup::where('organization_id', $orgId)->count(),
            'pending'     => OriginPickup::where('organization_id', $orgId)->where('status', 'pending')->count(),
            'confirmed'   => OriginPickup::where('organization_id', $orgId)->where('status', 'confirmed')->count(),
            'completed'   => OriginPickup::where('organization_id', $orgId)->where('status', 'completed')->count(),
            'cancelled'   => OriginPickup::where('organization_id', $orgId)->where('status', 'cancelled')->count(),
            'unassigned'  => OriginPickup::where('organization_id', $orgId)
                                ->whereIn('status', ['pending', 'confirmed'])
                                ->whereNull('driver_id')
                                ->count(),
        ];

        return Inertia::render('Pickups/Index', [
            'pickups' => $pickups,
            'filters' => $request->only(['status', 'search']),
            'summary' => $summary,
            'is_driver_view' => $isDriver,
        ]);
    }

    public function create(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $shipment = null;
        if ($request->filled('shipment_id')) {
            $shipment = Shipment::where('organization_id', $orgId)
                ->where('id', $request->shipment_id)
                ->first();
        }

        // Available drivers: only users with Driver role in this org
        $drivers = User::role('Driver')
            ->where('organization_id', $orgId)
            ->where('is_active', true)
            ->with('latestDriverLocation')
            ->orderBy('name')
            ->get(['id', 'name', 'phone'])
            ->map(fn ($u) => [
                'id'             => $u->id,
                'name'           => $u->name,
                'phone'          => $u->phone ?? null,
                'last_seen_lat'  => $u->latestDriverLocation?->lat,
                'last_seen_lng'  => $u->latestDriverLocation?->lng,
                'last_seen_at'   => $u->latestDriverLocation?->captured_at,
                'gps_active'     => $u->latestDriverLocation &&
                                    $u->latestDriverLocation->captured_at?->gt(now()->subHours(2)),
            ]);

        return Inertia::render('Pickups/Create', [
            'preselectedShipment' => $shipment,
            'availableDrivers'    => $drivers,
        ]);
    }

    public function searchShipment(Request $request): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $q     = trim($request->get('q', ''));

        if (strlen($q) < 3) {
            return response()->json(['shipment' => null]);
        }

        $shipment = Shipment::where('organization_id', $orgId)
            ->where('tracking_number', 'like', "%{$q}%")
            ->whereNotIn('status', ['delivered', 'cancelled', 'returned'])
            ->orderByDesc('created_at')
            ->first(['id', 'tracking_number', 'sender_details', 'receiver_details', 'status']);

        if (!$shipment) {
            return response()->json(['shipment' => null]);
        }

        $sender = is_array($shipment->sender_details)
            ? $shipment->sender_details
            : (json_decode($shipment->sender_details, true) ?? []);

        $addressParts = array_filter([
            $sender['address'] ?? null,
            $sender['city']    ?? null,
            $sender['state']   ?? null,
            $sender['country'] ?? null,
        ]);

        return response()->json([
            'shipment' => [
                'id'              => $shipment->id,
                'tracking_number' => $shipment->tracking_number,
                'status'          => $shipment->status,
                'sender_name'     => $sender['name']  ?? '',
                'sender_phone'    => $sender['phone'] ?? '',
                'sender_address'  => implode(', ', $addressParts),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'shipment_id'          => 'required|integer|exists:shipments,id',
            'driver_id'            => 'nullable|integer|exists:users,id',
            'scheduled_for'        => 'required|date|after:now',
            'contact_name'         => 'required|string|max:255',
            'contact_phone'        => 'required|string|max:50',
            'pickup_address'       => 'required|string|max:1000',
            'special_instructions' => 'nullable|string|max:1000',
            'notes'                => 'nullable|string|max:1000',
        ]);

        // Ensure shipment belongs to this org
        $shipment = Shipment::where('id', $validated['shipment_id'])
            ->where('organization_id', $orgId)
            ->firstOrFail();

        // Validate driver belongs to same org and has Driver role
        $driverId = null;
        if (!empty($validated['driver_id'])) {
            $driver = User::role('Driver')
                ->where('id', $validated['driver_id'])
                ->where('organization_id', $orgId)
                ->where('is_active', true)
                ->first();
            $driverId = $driver?->id;
        }

        $pickup = OriginPickup::create([
            'organization_id'      => $orgId,
            'shipment_id'          => $shipment->id,
            'requested_by'         => Auth::id(),
            'driver_id'            => $driverId,
            'assigned_at'          => $driverId ? now() : null,
            'scheduled_for'        => $validated['scheduled_for'],
            'contact_name'         => $validated['contact_name'],
            'contact_phone'        => $validated['contact_phone'],
            'pickup_address'       => $validated['pickup_address'],
            'special_instructions' => $validated['special_instructions'] ?? null,
            'notes'                => $validated['notes'] ?? null,
            'status'               => 'pending',
        ]);

        event(new \App\Events\PickupScheduled($shipment, $pickup));

        // Notify assigned driver in-app
        if ($driverId) {
            $this->notifyDriver($pickup, $driverId);
        }

        return redirect()->route('pickups.show', $pickup)
            ->with('success', __('pickups.created'));
    }

    /**
     * Assign or reassign a driver to an existing pickup.
     * POST /pickups/{pickup}/assign
     */
    public function assign(Request $request, OriginPickup $pickup): RedirectResponse
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);
        abort_if($pickup->status === 'completed', 422, 'Cannot reassign a completed pickup.');

        $validated = $request->validate([
            'driver_id' => 'nullable|integer|exists:users,id',
        ]);

        $driverId = null;
        if (!empty($validated['driver_id'])) {
            $driver = User::role('Driver')
                ->where('id', $validated['driver_id'])
                ->where('organization_id', Auth::user()->organization_id)
                ->where('is_active', true)
                ->first();
            $driverId = $driver?->id;
        }

        $pickup->update([
            'driver_id'   => $driverId,
            'assigned_at' => $driverId ? now() : null,
        ]);

        if ($driverId) {
            $this->notifyDriver($pickup, $driverId);
        }

        return redirect()->route('pickups.show', $pickup)
            ->with('success', __('pickups.driver_assigned'));
    }

    public function show(OriginPickup $pickup): Response
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);

        $pickup->load(['shipment', 'requestedBy', 'confirmedBy', 'driver.latestDriverLocation']);

        $orgId = Auth::user()->organization_id;

        // Available drivers for reassignment: only Driver role
        $drivers = User::role('Driver')
            ->where('organization_id', $orgId)
            ->where('is_active', true)
            ->with('latestDriverLocation')
            ->orderBy('name')
            ->get(['id', 'name', 'phone'])
            ->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'phone'      => $u->phone ?? null,
                'gps_active' => $u->latestDriverLocation &&
                                $u->latestDriverLocation->captured_at?->gt(now()->subHours(2)),
                'last_seen_at' => $u->latestDriverLocation?->captured_at,
            ]);

        $isDriver = Auth::user()->hasRole('Driver');

        return Inertia::render('Pickups/Show', [
            'pickup'           => $pickup,
            'availableDrivers' => $isDriver ? [] : $drivers,
            'is_driver_view'   => $isDriver,
        ]);
    }

    public function confirm(Request $request, OriginPickup $pickup): RedirectResponse
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);
        abort_if(!in_array($pickup->status, ['pending']), 422, 'Pickup cannot be confirmed in current status.');

        $request->validate([
            'photos'   => 'required|array|min:1',
            'photos.*' => 'image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'notes'    => 'nullable|string|max:1000',
        ]);

        $orgId = Auth::user()->organization_id;
        $photoPaths = [];

        foreach ($request->file('photos') as $photo) {
            $path = $photo->store("pickup-photos/{$orgId}", 'public');
            $photoPaths[] = $path;
        }

        $pickup->update([
            'status'       => 'confirmed',
            'photos'       => $photoPaths,
            'confirmed_by' => Auth::id(),
            'confirmed_at' => now(),
            'notes'        => $request->notes ?? $pickup->notes,
        ]);

        return redirect()->route('pickups.show', $pickup)
            ->with('success', __('pickups.confirmed'));
    }

    public function complete(Request $request, OriginPickup $pickup): RedirectResponse
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);
        abort_if(!in_array($pickup->status, ['pending', 'confirmed']), 422, 'Pickup cannot be completed in current status.');

        $request->validate([
            'photos'   => 'required|array|min:1',
            'photos.*' => 'image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'notes'    => 'nullable|string|max:1000',
        ]);

        $orgId = Auth::user()->organization_id;
        $photoPaths = $pickup->photos ?? [];

        foreach ($request->file('photos') as $photo) {
            $path = $photo->store("pickup-photos/{$orgId}", 'public');
            $photoPaths[] = $path;
        }

        $pickup->update([
            'status'       => 'completed',
            'photos'       => $photoPaths,
            'confirmed_by' => $pickup->confirmed_by ?? Auth::id(),
            'confirmed_at' => $pickup->confirmed_at ?? now(),
            'completed_at' => now(),
            'notes'        => $request->notes ?? $pickup->notes,
        ]);

        // Update shipment status to picked_up — now enters the billable/processable flow.
        // Only AFTER this status change can the shipment be added to a delivery manifest.
        $shipment = $pickup->shipment;
        if (in_array($shipment->status, ['pending', 'processed'])) {
            $shipment->update(['status' => 'picked_up']);
        }

        return redirect()->route('pickups.show', $pickup)
            ->with('success', __('pickups.completed'));
    }

    public function uploadPhotos(Request $request, OriginPickup $pickup): RedirectResponse
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);

        // Drivers can only upload to their own assigned pickups
        if (Auth::user()->hasRole('Driver') && $pickup->driver_id !== Auth::id()) {
            abort(403, 'You can only upload photos to your own pickups.');
        }

        $request->validate([
            'photos'   => 'required|array|min:1|max:10',
            'photos.*' => 'image|mimes:jpeg,jpg,png,gif,webp|max:5120',
        ]);

        $orgId = Auth::user()->organization_id;
        $photoPaths = $pickup->photos ?? [];

        foreach ($request->file('photos') as $photo) {
            $path = $photo->store("pickup-photos/{$orgId}", 'public');
            $photoPaths[] = $path;
        }

        $pickup->update(['photos' => $photoPaths]);

        return redirect()->route('pickups.show', $pickup)
            ->with('success', count($request->file('photos')) . ' photo(s) uploaded.');
    }

    public function printView(OriginPickup $pickup): Response
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);
        $pickup->load(['shipment', 'requestedBy', 'confirmedBy', 'driver']);

        $org = Auth::user()->organization;
        $orgData = [
            'name'       => $org->name,
            'legal_name' => $org->legal_name ?? $org->name,
            'phone'      => $org->phone ?? '',
            'email'      => $org->email ?? '',
            'address'    => $org->address ?? '',
            'logo_url'   => $org->logo_url ? Storage::url($org->logo_url) : null,
        ];

        $pickupRef  = 'PKP-' . str_pad($pickup->id, 6, '0', STR_PAD_LEFT);
        $trackingUrl = route('tracking.index', [], true) . '?tracking=' . ($pickup->shipment?->tracking_number ?? '');

        return Inertia::render('Pickups/Print', [
            'pickup'      => $pickup,
            'org'         => $orgData,
            'pickupRef'   => $pickupRef,
            'trackingUrl' => $trackingUrl,
        ]);
    }

    public function cancel(Request $request, OriginPickup $pickup): RedirectResponse
    {
        abort_if($pickup->organization_id !== Auth::user()->organization_id, 403);
        abort_if($pickup->status === 'completed', 422, 'Completed pickups cannot be cancelled.');

        $pickup->update(['status' => 'cancelled']);

        return redirect()->route('pickups.index')
            ->with('success', __('pickups.cancelled'));
    }

    /**
     * Cancel multiple pickups in a single operation.
     * POST /pickups/bulk-cancel
     */
    public function bulkCancel(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1|max:200',
            'ids.*' => 'required|integer',
        ]);

        $orgId = Auth::user()->organization_id;

        $cancelled = OriginPickup::whereIn('id', $request->ids)
            ->where('organization_id', $orgId)
            ->whereNot('status', 'completed')
            ->update(['status' => 'cancelled']);

        return redirect()->route('pickups.index')
            ->with('success', __('pickups.bulk_cancelled', ['count' => $cancelled]));
    }

    /**
     * Delete multiple pickups in a single operation.
     * POST /pickups/bulk-destroy
     */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1|max:200',
            'ids.*' => 'required|integer',
        ]);

        $orgId = Auth::user()->organization_id;

        $pickups = OriginPickup::whereIn('id', $request->ids)
            ->where('organization_id', $orgId)
            ->get();

        $deleted = 0;

        \DB::transaction(function () use ($pickups, &$deleted) {
            foreach ($pickups as $pickup) {
                // Delete associated photos from storage
                if (!empty($pickup->photos)) {
                    foreach ($pickup->photos as $photo) {
                        if (Storage::disk('public')->exists($photo)) {
                            Storage::disk('public')->delete($photo);
                        }
                    }
                }
                $pickup->forceDelete();
                $deleted++;
            }
        });

        return redirect()->route('pickups.index')
            ->with('success', __('pickups.bulk_deleted', ['count' => $deleted]));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function notifyDriver(OriginPickup $pickup, int $driverId): void
    {
        try {
            $trackingNumber = $pickup->shipment?->tracking_number ?? "PKP-{$pickup->id}";
            app(InAppNotificationService::class)->notify(
                orgId:   $pickup->organization_id,
                userId:  $driverId,
                type:    'pickup_assigned',
                title:   __('pickups.notification_title'),
                body:    __('pickups.notification_body', [
                    'tracking' => $trackingNumber,
                    'address'  => $pickup->pickup_address,
                    'date'     => $pickup->scheduled_for->format('d/m/Y H:i'),
                ]),
                icon:    'truck',
                url:     "/pickups/{$pickup->id}",
            );
            $pickup->updateQuietly(['driver_notified_at' => now()]);
        } catch (\Throwable) {
            // Notification failure never blocks the pickup flow
        }
    }
}
