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

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Manifest;
use App\Models\Shipment;
use App\Enums\ShipmentStatus;
use App\Services\SettingsService;
use App\Services\GeocodingService;
use App\Services\DirectionsService;
use App\Services\GeneticAlgorithm\GeneticAlgorithmService;

class DispatchController extends Controller
{
    public function index()
    {
        $orgId = \Illuminate\Support\Facades\Auth::user()->organization_id;
        $isDriver = \Illuminate\Support\Facades\Auth::user()->hasRole('Driver');

        // Map config is stored in the integrations table by IntegrationsController::updateMaps()
        $mapsIntegration = \Illuminate\Support\Facades\DB::table('integrations')
            ->where('organization_id', $orgId)
            ->where('type', 'maps')
            ->first();
        $mapsRaw = $mapsIntegration ? (json_decode($mapsIntegration->config, true) ?? []) : [];

        $mapConfig = [
            'default_provider'   => $mapsRaw['default_provider']   ?? 'osm',
            'mapbox_token'       => $mapsRaw['mapbox_token']        ?? '',
            'google_maps_key'    => $mapsRaw['google_maps_key']     ?? '',
            'mapbox_enabled'     => (bool) ($mapsRaw['mapbox_enabled']  ?? false),
            'google_enabled'     => (bool) ($mapsRaw['google_enabled']  ?? false),
            'default_center_lat' => isset($mapsRaw['default_center_lat']) ? (float) $mapsRaw['default_center_lat'] : null,
            'default_center_lng' => isset($mapsRaw['default_center_lng']) ? (float) $mapsRaw['default_center_lng'] : null,
            'default_zoom'       => (int) ($mapsRaw['default_zoom'] ?? 4),
        ];

        // 1. Get ALL Drivers (activos e idle) con manifests, shipments y última ubicación real
        $geocoding = app(GeocodingService::class)->forOrganization($orgId);
        $mapboxToken = $mapConfig['mapbox_token'];
        $directions = new DirectionsService($mapboxToken);

        // manifests table may not exist in all installations
        $manifestsAvailable = \Illuminate\Support\Facades\Schema::hasTable('manifests');

        try {
            $withRelations = ['latestDriverLocation'];
            if ($manifestsAvailable) {
                $withRelations['manifests'] = function ($q) {
                    $q->whereIn('status', ['open', 'dispatched'])->latest()->with('shipments');
                };
            }

            $driversQuery = User::role('Driver')
                ->where('organization_id', $orgId);
            if ($isDriver) {
                $driversQuery->where('id', \Illuminate\Support\Facades\Auth::id());
            }

            $drivers = $driversQuery
                ->with($withRelations)
                ->get()
                ->map(function ($driver) use ($geocoding, $directions, $manifestsAvailable) {
                    $activeManifest = $manifestsAvailable ? $driver->manifests->first() : null;
                    $loc = $driver->latestDriverLocation;

                    $base = [
                        'id' => $driver->id,
                        'name' => $driver->name,
                        'status' => $activeManifest ? 'online' : 'idle',
                        'current_location' => ($loc && $loc->lat !== null && $loc->lng !== null)
                            ? ['lat' => (float) $loc->lat, 'lng' => (float) $loc->lng]
                            : null,
                        'heading' => $loc?->heading,
                        'updated_at' => $loc?->captured_at?->toIso8601String(),
                        'active_manifest' => null,
                    ];

                    if (!$activeManifest || $activeManifest->shipments->isEmpty()) {
                        return $base;
                    }

                    $stops = [];
                    $waypoints = [];
                    foreach ($activeManifest->shipments as $s) {
                        $senderDetails = $s->sender_details ?? [];
                        $receiverDetails = $s->receiver_details ?? [];
                        $pickupAddr = GeocodingService::buildAddressFromDetails($senderDetails);
                        $deliveryAddr = GeocodingService::buildAddressFromDetails($receiverDetails);

                        if ($pickupAddr) {
                            $pickupCoords = $geocoding->geocode($pickupAddr);
                            if ($pickupCoords) {
                                $stops[] = ['type' => 'pickup', 'lat' => $pickupCoords['lat'], 'lng' => $pickupCoords['lng'], 'address_text' => $pickupAddr, 'shipment_id' => $s->id, 'tracking_number' => $s->tracking_number];
                                $waypoints[] = $pickupCoords;
                            }
                        }
                        if ($deliveryAddr) {
                            $deliveryCoords = $geocoding->geocode($deliveryAddr);
                            if ($deliveryCoords) {
                                $stops[] = ['type' => 'delivery', 'lat' => $deliveryCoords['lat'], 'lng' => $deliveryCoords['lng'], 'address_text' => $deliveryAddr, 'shipment_id' => $s->id, 'tracking_number' => $s->tracking_number];
                                $waypoints[] = $deliveryCoords;
                            }
                        }
                    }

                    $routeGeometry = null;
                    if (count($waypoints) >= 2) {
                        $routeGeometry = $directions->getRoute($waypoints) ?? DirectionsService::polylineFromWaypoints($waypoints);
                    } elseif (count($waypoints) === 1) {
                        $routeGeometry = [[$waypoints[0]['lat'], $waypoints[0]['lng']]];
                    }

                    $base['active_manifest'] = [
                        'id' => $activeManifest->id,
                        'manifest_number' => $activeManifest->manifest_number,
                        'shipments' => $activeManifest->shipments->map(fn ($s) => [
                            'id' => $s->id,
                            'tracking_number' => $s->tracking_number,
                            'sender_details' => $s->sender_details,
                            'receiver_details' => $s->receiver_details,
                        ])->toArray(),
                        'stops' => $stops,
                        'route_geometry' => $routeGeometry,
                    ];
                    return $base;
                });
        } catch (\Throwable) {
            $drivers = collect();
        }

        // 2. Get Unassigned Shipments (Ready for Dispatch) — hidden from drivers
        if ($isDriver) {
            $unassigned = collect();
        } else {
            try {
                $unassigned = Shipment::whereIn('status', [
                        ShipmentStatus::PENDING->value,
                        ShipmentStatus::PROCESSED->value,
                        ShipmentStatus::PICKED_UP->value,
                    ])
                    ->when($manifestsAvailable, fn ($q) => $q->whereNull('manifest_id'))
                    ->where('organization_id', $orgId)
                    ->get();
            } catch (\Throwable) {
                $unassigned = collect();
            }
        }

        return Inertia::render('Dispatch/Index', [
            'drivers' => $drivers,
            'unassigned_shipments' => $unassigned,
            'mapConfig' => $mapConfig,
            'is_driver_view' => $isDriver,
        ]);
    }

    public function driverLocations(Request $request)
    {
        $orgId = \Illuminate\Support\Facades\Auth::user()->organization_id;
        $isDriver = \Illuminate\Support\Facades\Auth::user()->hasRole('Driver');
        $search = $request->input('search', '');

        $settings = app(SettingsService::class)->forOrganization($orgId);
        $geocoding = app(GeocodingService::class)->forOrganization($orgId);
        $mapboxToken = $settings->get('maps', 'mapbox_token', '');
        $directions = new DirectionsService($mapboxToken);

        $manifestsAvailable = \Illuminate\Support\Facades\Schema::hasTable('manifests');

        $query = User::role('Driver')
            ->where('organization_id', $orgId);

        if ($isDriver) {
            $query->where('id', \Illuminate\Support\Facades\Auth::id());
        }

        if ($manifestsAvailable) {
            $query->with([
                'manifests' => function ($q) {
                    $q->whereIn('status', ['open', 'dispatched'])->latest()->with('shipments');
                }
            ]);
        }

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        $drivers = $query->with('latestDriverLocation')->get()->map(function ($driver) use ($geocoding, $directions, $manifestsAvailable) {
            $activeManifest = $manifestsAvailable ? $driver->manifests->first() : null;
            $loc = $driver->latestDriverLocation;

            $base = [
                'driver_id' => $driver->id,
                'name' => $driver->name,
                'lat' => ($loc && $loc->lat !== null) ? (float) $loc->lat : null,
                'lng' => ($loc && $loc->lng !== null) ? (float) $loc->lng : null,
                'heading' => $loc?->heading,
                'updated_at' => $loc?->captured_at?->toIso8601String() ?? null,
                'status' => $activeManifest ? 'online' : 'idle',
                'active_shipment_id' => $activeManifest?->id,
                'active_manifest' => null,
            ];

            if (!$activeManifest || $activeManifest->shipments->isEmpty()) {
                return $base;
            }

            // DoD Parte 3: paradas desde sender_details/receiver_details; stops = markers + ruta
            $stops = [];
            $waypoints = [];
            foreach ($activeManifest->shipments as $s) {
                $senderDetails = $s->sender_details ?? [];
                $receiverDetails = $s->receiver_details ?? [];
                $pickupAddr = GeocodingService::buildAddressFromDetails($senderDetails);
                $deliveryAddr = GeocodingService::buildAddressFromDetails($receiverDetails);

                if ($pickupAddr) {
                    $pickupCoords = $geocoding->geocode($pickupAddr);
                    if ($pickupCoords) {
                        $stops[] = ['type' => 'pickup', 'lat' => $pickupCoords['lat'], 'lng' => $pickupCoords['lng'], 'address_text' => $pickupAddr, 'shipment_id' => $s->id, 'tracking_number' => $s->tracking_number];
                        $waypoints[] = $pickupCoords;
                    }
                }
                if ($deliveryAddr) {
                    $deliveryCoords = $geocoding->geocode($deliveryAddr);
                    if ($deliveryCoords) {
                        $stops[] = ['type' => 'delivery', 'lat' => $deliveryCoords['lat'], 'lng' => $deliveryCoords['lng'], 'address_text' => $deliveryAddr, 'shipment_id' => $s->id, 'tracking_number' => $s->tracking_number];
                        $waypoints[] = $deliveryCoords;
                    }
                }
            }

            // Ruta: Mapbox Directions si token; si no, polyline simple (DoD Parte 3)
            $routeGeometry = null;
            if (count($waypoints) >= 2) {
                $routeGeometry = $directions->getRoute($waypoints) ?? DirectionsService::polylineFromWaypoints($waypoints);
            } elseif (count($waypoints) === 1) {
                $routeGeometry = [[$waypoints[0]['lat'], $waypoints[0]['lng']]];
            }

            $base['active_manifest'] = [
                'id' => $activeManifest->id,
                'manifest_number' => $activeManifest->manifest_number,
                'shipments' => $activeManifest->shipments->map(fn ($s) => [
                    'id' => $s->id,
                    'tracking_number' => $s->tracking_number,
                    'sender_details' => $s->sender_details,
                    'receiver_details' => $s->receiver_details,
                ])->toArray(),
                'stops' => $stops,
                'route_geometry' => $routeGeometry,
            ];
            return $base;
        });

        return response()->json($drivers);
    }

    /**
     * Get driver location history (trail points) for map polyline.
     * GET /dispatch/driver-locations/{driver}/history?minutes=30&limit=100
     */
    public function driverLocationHistory(Request $request, User $driver)
    {
        $orgId = \Illuminate\Support\Facades\Auth::user()->organization_id;

        // Ensure driver belongs to org and has Driver role
        if ($driver->organization_id !== $orgId || !$driver->hasRole('Driver')) {
            abort(404);
        }

        // Drivers can only view their own location history
        if (\Illuminate\Support\Facades\Auth::user()->hasRole('Driver') && $driver->id !== \Illuminate\Support\Facades\Auth::id()) {
            abort(403);
        }

        $minutes = (int) $request->input('minutes', 30);
        $limit = min((int) $request->input('limit', 100), 500);

        $since = now()->subMinutes($minutes);

        $points = \App\Models\DriverLocation::where('driver_id', $driver->id)
            ->where('captured_at', '>=', $since)
            ->orderBy('captured_at', 'asc')
            ->limit($limit)
            ->get(['lat', 'lng', 'captured_at'])
            ->map(fn ($p) => [
                'lat' => (float) $p->lat,
                'lng' => (float) $p->lng,
                'captured_at' => $p->captured_at?->toIso8601String(),
            ])
            ->values()
            ->toArray();

        return response()->json(['points' => $points]);
    }

    public function autoOptimize(Request $request)
    {
        // Drivers cannot run route optimization
        if (\Illuminate\Support\Facades\Auth::user()->hasRole('Driver')) {
            abort(403);
        }

        $orgId  = \Illuminate\Support\Facades\Auth::user()->organization_id;
        $userId = \Illuminate\Support\Facades\Auth::id();

        // 1. Get Unassigned Shipments
        $shipments = Shipment::whereIn('status', [
                ShipmentStatus::PENDING->value,
                ShipmentStatus::PROCESSED->value,
                ShipmentStatus::PICKED_UP->value,
            ])
            ->whereNull('manifest_id')
            ->where('organization_id', $orgId)
            ->get();

        if ($shipments->isEmpty()) {
            return back()->with('message', __('dispatch.no_shipments_to_optimize'));
        }

        // 2. Run GA Load Balancer to distribute shipments across available drivers
        $gaResult       = null;
        $optimizationMethod = 'city_grouping';

        try {
            $gaService = new GeneticAlgorithmService(
                app(SettingsService::class),
                app(GeocodingService::class)
            );
            $gaResult = $gaService->balanceWorkload();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('GA balanceWorkload failed in autoOptimize', ['error' => $e->getMessage()]);
        }

        // 3. If GA returned valid assignments with drivers, use them
        $createdManifests = 0;

        if (
            isset($gaResult['assignments']) &&
            count($gaResult['assignments']) > 0 &&
            !isset($gaResult['error'])
        ) {
            // GA path: group assignments by driver
            $optimizationMethod = 'ga_load_balancer';
            $balanceScore = round(($gaResult['balance_score'] ?? 0) * 100, 1);
            $variance     = $gaResult['variance'] ?? 0;

            $byDriver = [];
            foreach ($gaResult['assignments'] as $assignment) {
                $byDriver[$assignment['agent_id']] = $byDriver[$assignment['agent_id']] ?? [
                    'driver_name' => $assignment['agent_name'],
                    'shipment_ids' => [],
                ];
                $byDriver[$assignment['agent_id']]['shipment_ids'][] = $assignment['shipment_id'];
            }

            $shipmentIndex = $shipments->keyBy('id');

            foreach ($byDriver as $driverId => $group) {
                $manifest = Manifest::create([
                    'uuid'            => \Illuminate\Support\Str::uuid(),
                    'manifest_number' => 'MAN-GA-' . strtoupper(\Illuminate\Support\Str::random(6)),
                    'organization_id' => $orgId,
                    'status'          => 'open',
                    'driver_id'       => $driverId,
                    'notes'           => "GA Load Balancer · balance_score={$balanceScore}% · variance={$variance} · shipments=" . count($group['shipment_ids']),
                ]);

                $statusModel = \App\Models\ShipmentStatus::where('organization_id', $orgId)
                    ->where('code', ShipmentStatus::IN_TRANSIT->value)
                    ->first();

                foreach ($group['shipment_ids'] as $shipmentId) {
                    $shipment = $shipmentIndex->get($shipmentId);
                    if (!$shipment) continue;

                    $shipment->update([
                        'manifest_id' => $manifest->id,
                        'status'      => ShipmentStatus::IN_TRANSIT->value,
                    ]);

                    \App\Models\ShipmentHistory::create([
                        'shipment_id'     => $shipment->id,
                        'status_id'       => $statusModel?->id,
                        'status'          => ShipmentStatus::IN_TRANSIT->value,
                        'location'        => 'Dispatch Center',
                        'description'     => "GA-assigned to driver {$group['driver_name']} (Manifest {$manifest->manifest_number}) · balance_score={$balanceScore}%",
                        'organization_id' => $orgId,
                        'user_id'         => $userId,
                    ]);

                    event(new \App\Events\PackageStatusUpdated($shipment->fresh()));
                }

                $createdManifests++;
            }
        } else {
            // Fallback: group by destination city when no drivers available
            $grouped = $shipments->groupBy(function ($shipment) {
                $details = $shipment->receiver_details;
                if (is_string($details)) $details = json_decode($details, true);
                return $details['city'] ?? 'Unspecified';
            });

            $statusModel = \App\Models\ShipmentStatus::where('organization_id', $orgId)
                ->where('code', ShipmentStatus::IN_TRANSIT->value)
                ->first();

            foreach ($grouped as $city => $cityShipments) {
                $manifest = Manifest::create([
                    'uuid'            => \Illuminate\Support\Str::uuid(),
                    'manifest_number' => 'MAN-' . strtoupper(\Illuminate\Support\Str::random(6)),
                    'organization_id' => $orgId,
                    'status'          => 'open',
                    'driver_id'       => null,
                    'notes'           => "Auto-grouped by city: {$city} (no drivers available for GA assignment)",
                ]);

                foreach ($cityShipments as $shipment) {
                    $shipment->update([
                        'manifest_id' => $manifest->id,
                        'status'      => ShipmentStatus::IN_TRANSIT->value,
                    ]);

                    \App\Models\ShipmentHistory::create([
                        'shipment_id'     => $shipment->id,
                        'status_id'       => $statusModel?->id,
                        'status'          => ShipmentStatus::IN_TRANSIT->value,
                        'location'        => 'Dispatch Center',
                        'description'     => "Grouped by destination city: {$city} (Manifest {$manifest->manifest_number})",
                        'organization_id' => $shipment->organization_id,
                        'user_id'         => $userId,
                    ]);

                    event(new \App\Events\PackageStatusUpdated($shipment->fresh()));
                }

                $createdManifests++;
            }
        }

        $methodLabel = $optimizationMethod === 'ga_load_balancer'
            ? __('dispatch.optimization_method_ga')
            : __('dispatch.optimization_method_city');

        return back()->with('success', __('dispatch.optimization_complete', ['count' => $createdManifests]) . " ({$methodLabel})");
    }

    /**
     * M6 GPS — POST /dispatch/driver-locations/update
     * Driver app or frontend sends real-time location updates.
     */
    public function updateDriverLocation(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $user = \Illuminate\Support\Facades\Auth::user();

        $validated = $request->validate([
            'lat'      => 'required|numeric|between:-90,90',
            'lng'      => 'required|numeric|between:-180,180',
            'heading'  => 'nullable|numeric|between:0,360',
            'speed'    => 'nullable|numeric|min:0',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        \App\Models\DriverLocation::create([
            'driver_id'    => $user->id,
            'lat'          => $validated['lat'],
            'lng'          => $validated['lng'],
            'heading'      => $validated['heading'] ?? null,
            'speed'        => $validated['speed'] ?? null,
            'accuracy'     => $validated['accuracy'] ?? null,
            'source'       => 'app',
            'captured_at'  => now(),
        ]);

        return response()->json(['status' => 'ok', 'captured_at' => now()->toIso8601String()]);
    }
}
