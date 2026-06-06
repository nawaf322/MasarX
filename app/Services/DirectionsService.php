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

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DirectionsService
{
    protected ?string $mapboxToken = null;

    public function __construct(?string $mapboxToken = null)
    {
        $this->mapboxToken = $mapboxToken;
    }

    /**
     * Get route geometry (polyline) from Mapbox Directions API.
     * $waypoints = array of ['lat' => float, 'lng' => float]
     * Returns array of [lat, lng] points or null.
     */
    public function getRoute(array $waypoints): ?array
    {
        if (empty($this->mapboxToken) || count($waypoints) < 2) {
            return null;
        }

        $coords = array_map(fn ($w) => ($w['lng'] ?? $w[1]) . ',' . ($w['lat'] ?? $w[0]), $waypoints);
        $coordsStr = implode(';', $coords);

        try {
            $url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' . $coordsStr;
            $response = Http::timeout(10)->get($url, [
                'access_token' => $this->mapboxToken,
                'geometries' => 'geojson',
                'overview' => 'full',
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();
            $routes = $data['routes'] ?? [];
            if (empty($routes)) {
                return null;
            }

            $coordsRaw = $routes[0]['geometry']['coordinates'] ?? [];
            if (empty($coordsRaw)) {
                return null;
            }

            // Mapbox returns [lng, lat]; we need [lat, lng] for consistency
            return array_map(fn ($c) => [(float) $c[1], (float) $c[0]], $coordsRaw);
        } catch (\Throwable $e) {
            Log::debug('DirectionsService error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Build a simple polyline connecting waypoints in order (no real routing).
     */
    public static function polylineFromWaypoints(array $waypoints): array
    {
        $points = [];
        foreach ($waypoints as $w) {
            $lat = $w['lat'] ?? $w[0] ?? null;
            $lng = $w['lng'] ?? $w[1] ?? null;
            if ($lat !== null && $lng !== null) {
                $points[] = [(float) $lat, (float) $lng];
            }
        }
        return $points;
    }
}
