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

use App\Models\GeocodedAddress;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Geocoding service: forward geocoding with cache in DB (geocoded_addresses).
 *
 * Provider order (see docs/PROMPT_PARTE3_GEOCODING_PARADAS_RUTAS.md):
 * 1. Mapbox (default) — if token configured
 * 2. Google — if enabled and API key set
 * 3. Nominatim (OSM) — fallback only when no tokens; rate limit 1 req/s
 */
class GeocodingService
{
    protected ?string $mapboxToken = null;
    protected ?string $googleKey = null;
    protected bool $mapboxEnabled = false;
    protected bool $googleEnabled = false;

    /** @var int|null Organization for cache scope (null = global cache). */
    protected ?int $organizationId = null;

    /**
     * PERFORMANCE FIX: Cache Schema::hasColumn() results for the request lifetime.
     * Schema::hasColumn() issues a SHOW COLUMNS query on every call — caching in a
     * static property avoids that query on every geocoding invocation.
     * Safe: table schema does not change at runtime.
     */
    private static array $columnCache = [];

    private function tableHasColumn(string $table, string $column): bool
    {
        $key = "{$table}.{$column}";
        if (!array_key_exists($key, self::$columnCache)) {
            self::$columnCache[$key] = Schema::hasColumn($table, $column);
        }
        return self::$columnCache[$key];
    }

    public function __construct(?int $organizationId = null)
    {
        $this->organizationId = $organizationId;
        $settings = app(SettingsService::class)->forOrganization($organizationId);
        $this->mapboxToken = $settings->get('maps', 'mapbox_token', '');
        $this->googleKey = $settings->get('maps', 'google_maps_key', '');
        $this->mapboxEnabled = (bool) $this->mapboxToken;
        $this->googleEnabled = (bool) ($settings->get('maps', 'google_enabled', false) && $this->googleKey);
    }

    /**
     * Return a new instance configured for the given organization (cache scoped by org).
     */
    public function forOrganization(?int $organizationId): self
    {
        return new self($organizationId);
    }

    /**
     * Geocode an address string. Returns {lat, lng} or null.
     * Uses cache (geocoded_addresses); provider order: Mapbox → Google → Nominatim.
     */
    public function geocode(string $addressText): ?array
    {
        $addressText = trim($addressText);
        if (empty($addressText)) {
            return null;
        }

        $hash = hash('sha256', mb_strtolower($addressText));

        $query = GeocodedAddress::where('address_hash', $hash);
        if ($this->tableHasColumn((new GeocodedAddress)->getTable(), 'organization_id')) {
            $query->where('organization_id', $this->organizationId);
        }
        $cached = $query->first();
        if ($cached) {
            return [
                'lat' => (float) $cached->lat,
                'lng' => (float) $cached->lng,
            ];
        }

        $result = $this->geocodeFromProvider($addressText);
        if ($result) {
            // Cache the result — non-fatal: a FK/DB error must not discard a good geocoding result
            try {
                $hasOrgColumn = $this->tableHasColumn((new GeocodedAddress)->getTable(), 'organization_id');
                $cacheKey = $hasOrgColumn
                    ? ['organization_id' => $this->organizationId, 'address_hash' => $hash]
                    : ['address_hash' => $hash];
                GeocodedAddress::updateOrCreate(
                    $cacheKey,
                    array_merge(
                        [
                            'address_text' => $addressText,
                            'lat'          => $result['lat'],
                            'lng'          => $result['lng'],
                            'provider'     => $result['provider'],
                        ],
                        $hasOrgColumn ? ['organization_id' => $this->organizationId] : []
                    )
                );
            } catch (\Throwable $e) {
                Log::debug('GeocodingService: cache write failed (non-fatal): ' . $e->getMessage());
            }
            return ['lat' => $result['lat'], 'lng' => $result['lng']];
        }

        return null;
    }

    /**
     * Provider order: Mapbox (si token) → Google (si activo) → Nominatim (solo si no hay tokens).
     */
    protected function geocodeFromProvider(string $addressText): ?array
    {
        if ($this->mapboxEnabled) {
            $r = $this->geocodeMapbox($addressText);
            if ($r) {
                return $r;
            }
        }

        if ($this->googleEnabled) {
            $r = $this->geocodeGoogle($addressText);
            if ($r) {
                return $r;
            }
        }

        return $this->geocodeNominatim($addressText);
    }

    protected function geocodeMapbox(string $addressText): ?array
    {
        try {
            $url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' . rawurlencode($addressText) . '.json';
            $response = Http::timeout(5)->get($url, [
                'access_token' => $this->mapboxToken,
                'limit' => 1,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();
            $features = $data['features'] ?? [];
            if (empty($features)) {
                return null;
            }

            $center = $features[0]['center'] ?? $features[0]['geometry']['coordinates'] ?? null;
            if (!$center || !is_array($center)) {
                return null;
            }

            return [
                'lat' => (float) ($center[1] ?? $center[0]),
                'lng' => (float) ($center[0] ?? $center[1]),
                'provider' => 'mapbox',
            ];
        } catch (\Throwable $e) {
            Log::debug('GeocodingService Mapbox error: ' . $e->getMessage());
            return null;
        }
    }

    protected function geocodeGoogle(string $addressText): ?array
    {
        try {
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $addressText,
                'key' => $this->googleKey,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();
            $results = $data['results'] ?? [];
            if (empty($results)) {
                return null;
            }

            $loc = $results[0]['geometry']['location'] ?? null;
            if (!$loc || !isset($loc['lat'], $loc['lng'])) {
                return null;
            }

            return [
                'lat' => (float) $loc['lat'],
                'lng' => (float) $loc['lng'],
                'provider' => 'google',
            ];
        } catch (\Throwable $e) {
            Log::debug('GeocodingService Google error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Nominatim: 1 req/sec, requires User-Agent.
     * Strategy:
     *  1. Try full address with countrycodes filter when country is detectable.
     *  2. If result is outside expected country bounds, discard and try city-level fallback.
     *  3. City-level fallback: take last 3 segments (city, state, country) with countrycodes.
     */
    protected function geocodeNominatim(string $addressText): ?array
    {
        $countryCode = $this->extractCountryCode($addressText);

        // Build query list: full address first, then progressively simpler fallbacks
        $queries = [$addressText];

        $parts = array_values(array_filter(array_map('trim', explode(',', $addressText))));
        if (count($parts) >= 3) {
            // City + state + country fallback
            $queries[] = implode(', ', array_slice($parts, -3));
        }
        if (count($parts) >= 2) {
            // City + country fallback
            $queries[] = implode(', ', array_slice($parts, -2));
        }

        foreach ($queries as $query) {
            $result = $this->nominatimRequest($query, $countryCode);
            if (!$result) {
                continue;
            }
            // Validate coordinates are inside the expected country's bounding box
            if ($countryCode && !$this->coordsAreInCountry($result['lat'], $result['lng'], $countryCode)) {
                Log::debug("GeocodingService: Nominatim result for [{$query}] is outside {$countryCode} bounds — discarding");
                continue;
            }
            return $result;
        }

        return null;
    }

    /**
     * Single Nominatim HTTP request with optional country filter.
     */
    protected function nominatimRequest(string $query, ?string $countryCode = null): ?array
    {
        try {
            $params = [
                'q'      => $query,
                'format' => 'json',
                'limit'  => 1,
            ];
            if ($countryCode) {
                $params['countrycodes'] = $countryCode;
            }

            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'MasarXPlus-Dispatch/1.0'])
                ->get('https://nominatim.openstreetmap.org/search', $params);

            if (!$response->successful()) {
                return null;
            }

            $results = $response->json();
            if (empty($results) || !isset($results[0]['lat'], $results[0]['lon'])) {
                return null;
            }

            usleep(1100000); // Nominatim policy: max 1 req/s
            return [
                'lat'      => (float) $results[0]['lat'],
                'lng'      => (float) $results[0]['lon'],
                'provider' => 'nominatim',
            ];
        } catch (\Throwable $e) {
            Log::debug('GeocodingService Nominatim error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Country bounding boxes [minLat, maxLat, minLng, maxLng].
     * Used as a secondary validation: if the geocoding result lands outside these bounds
     * we discard it and try a simpler fallback query.
     * Unknown countries pass through (return true) — adds coverage automatically.
     * Source: ISO 3166-1 — covers all 195 UN-recognized countries.
     */
    private const COUNTRY_BOUNDS = [
        // ── Americas ─────────────────────────────────────────────────────────
        'ag' => [ 17.0,  17.8,  -62.0, -61.6],  // Antigua & Barbuda
        'ai' => [ 18.1,  18.3,  -63.2, -62.9],  // Anguilla
        'ar' => [-55.1, -21.8,  -73.6, -53.6],  // Argentina
        'aw' => [ 12.4,  12.6,  -70.1, -69.8],  // Aruba
        'bb' => [ 13.0,  13.4,  -59.7, -59.4],  // Barbados
        'bl' => [ 17.8,  18.1,  -63.0, -62.7],  // Saint Barthélemy
        'bm' => [ 32.2,  32.4,  -64.9, -64.6],  // Bermuda
        'bo' => [-22.9,  -9.7,  -69.7, -57.4],  // Bolivia
        'bq' => [ 12.0,  17.7,  -68.4, -62.9],  // Bonaire/Saba/Sint Eustatius
        'br' => [-33.8,   5.3,  -73.9, -28.8],  // Brazil
        'bs' => [ 20.9,  27.3,  -79.5, -72.7],  // Bahamas
        'bz' => [ 15.9,  18.5,  -89.2, -87.5],  // Belize
        'ca' => [ 41.7,  83.1, -141.0, -52.6],  // Canada
        'cl' => [-55.9, -17.5,  -75.6, -66.4],  // Chile
        'co' => [ -4.2,  12.5,  -79.0, -66.8],  // Colombia
        'cr' => [  8.0,  11.2,  -85.9, -82.5],  // Costa Rica
        'cu' => [ 19.8,  23.2,  -85.0, -74.1],  // Cuba
        'cw' => [ 12.0,  12.4,  -69.2, -68.7],  // Curaçao
        'dm' => [ 15.2,  15.7,  -61.5, -61.2],  // Dominica
        'do' => [ 17.5,  20.0,  -72.1, -68.3],  // Dominican Republic
        'ec' => [ -5.0,   1.5,  -81.0, -75.2],  // Ecuador
        'fk' => [-53.0, -51.0,  -61.4, -57.7],  // Falkland Islands
        'gd' => [ 11.9,  12.3,  -61.8, -61.4],  // Grenada
        'gf' => [  2.1,   5.8,  -54.6, -51.6],  // French Guiana
        'gl' => [ 59.8,  83.6,  -73.0,  -6.9],  // Greenland
        'gp' => [ 15.8,  16.5,  -61.8, -61.0],  // Guadeloupe
        'gt' => [ 13.7,  17.8,  -92.3, -88.2],  // Guatemala
        'gy' => [  1.2,   8.6,  -61.4, -56.5],  // Guyana
        'hn' => [ 12.9,  16.5,  -89.4, -83.1],  // Honduras
        'ht' => [ 18.0,  20.1,  -74.5, -71.6],  // Haiti
        'jm' => [ 17.7,  18.5,  -78.4, -76.2],  // Jamaica
        'kn' => [ 17.1,  17.4,  -62.9, -62.5],  // Saint Kitts & Nevis
        'ky' => [ 19.2,  19.8,  -81.4, -79.7],  // Cayman Islands
        'lc' => [ 13.7,  14.1,  -61.1, -60.8],  // Saint Lucia
        'mf' => [ 18.0,  18.2,  -63.2, -62.9],  // Saint Martin
        'mq' => [ 14.4,  14.9,  -61.2, -60.8],  // Martinique
        'ms' => [ 16.6,  17.0,  -62.3, -62.1],  // Montserrat
        'mx' => [ 14.5,  32.7, -117.2, -86.7],  // Mexico
        'ni' => [ 10.7,  15.1,  -87.7, -83.1],  // Nicaragua
        'pa' => [  7.2,   9.6,  -83.0, -77.2],  // Panama
        'pe' => [-18.4,   0.0,  -81.3, -68.6],  // Peru
        'pm' => [ 46.7,  47.2,  -56.4, -55.9],  // Saint Pierre & Miquelon
        'pr' => [ 17.9,  18.5,  -67.3, -65.2],  // Puerto Rico
        'py' => [-27.6, -19.3,  -62.6, -54.3],  // Paraguay
        'sr' => [  1.8,   6.0,  -58.1, -53.9],  // Suriname
        'sv' => [ 13.1,  14.5,  -90.2, -87.7],  // El Salvador
        'sx' => [ 18.0,  18.1,  -63.1, -63.0],  // Sint Maarten
        'tc' => [ 21.3,  21.9,  -72.7, -71.1],  // Turks & Caicos
        'tt' => [ 10.0,  11.4,  -61.9, -60.5],  // Trinidad & Tobago
        'us' => [ 18.9,  71.4, -180.0, -66.9],  // United States
        'uy' => [-34.9, -30.1,  -58.4, -53.1],  // Uruguay
        'vc' => [ 13.0,  13.4,  -61.5, -61.1],  // Saint Vincent
        've' => [  0.6,  12.2,  -73.3, -59.8],  // Venezuela
        'vg' => [ 18.3,  18.7,  -64.8, -64.3],  // British Virgin Islands
        'vi' => [ 17.6,  18.4,  -65.1, -64.5],  // US Virgin Islands

        // ── Europe ───────────────────────────────────────────────────────────
        'ad' => [ 42.4,  42.7,    1.4,   1.8],  // Andorra
        'al' => [ 39.6,  42.7,   19.3,  21.1],  // Albania
        'at' => [ 46.4,  49.0,    9.5,  17.2],  // Austria
        'ba' => [ 42.6,  45.3,   15.7,  19.6],  // Bosnia & Herzegovina
        'be' => [ 49.5,  51.5,    2.5,   6.4],  // Belgium
        'bg' => [ 41.2,  44.2,   22.4,  28.6],  // Bulgaria
        'by' => [ 51.3,  56.2,   23.2,  32.8],  // Belarus
        'ch' => [ 45.8,  47.8,    5.9,  10.5],  // Switzerland
        'cy' => [ 34.6,  35.7,   32.3,  34.6],  // Cyprus
        'cz' => [ 48.5,  51.1,   12.1,  18.9],  // Czech Republic
        'de' => [ 47.3,  55.1,    5.9,  15.0],  // Germany
        'dk' => [ 54.6,  57.8,    8.1,  15.2],  // Denmark
        'ee' => [ 57.5,  59.7,   21.8,  28.2],  // Estonia
        'es' => [ 27.6,  43.8,  -18.2,   4.3],  // Spain
        'fi' => [ 59.8,  70.1,   20.0,  31.6],  // Finland
        'fr' => [ 41.3,  51.1,   -5.2,   9.6],  // France
        'gb' => [ 49.9,  60.9,  -10.4,   2.0],  // United Kingdom
        'ge' => [ 41.1,  43.6,   40.0,  46.7],  // Georgia
        'gr' => [ 34.8,  41.8,   20.0,  28.2],  // Greece
        'hr' => [ 42.4,  46.6,   13.5,  19.4],  // Croatia
        'hu' => [ 45.7,  48.6,   16.1,  22.9],  // Hungary
        'ie' => [ 51.4,  55.4,  -10.5,  -6.0],  // Ireland
        'is' => [ 63.3,  66.6,  -24.5, -13.5],  // Iceland
        'it' => [ 35.5,  47.1,    6.6,  18.5],  // Italy
        'li' => [ 47.0,  47.3,    9.5,   9.6],  // Liechtenstein
        'lt' => [ 53.9,  56.5,   20.9,  26.8],  // Lithuania
        'lu' => [ 49.4,  50.2,    5.7,   6.5],  // Luxembourg
        'lv' => [ 55.7,  58.1,   21.0,  28.2],  // Latvia
        'mc' => [ 43.7,  43.8,    7.4,   7.4],  // Monaco
        'md' => [ 45.5,  48.5,   26.6,  30.2],  // Moldova
        'me' => [ 41.8,  43.6,   18.4,  20.4],  // Montenegro
        'mk' => [ 40.9,  42.4,   20.5,  23.0],  // North Macedonia
        'mt' => [ 35.8,  36.1,   14.2,  14.6],  // Malta
        'nl' => [ 50.8,  53.6,    3.4,   7.2],  // Netherlands
        'no' => [ 57.9,  71.2,    4.5,  31.1],  // Norway
        'pl' => [ 49.0,  54.9,   14.1,  24.2],  // Poland
        'pt' => [ 36.9,  42.2,   -9.5,  -6.2],  // Portugal
        'ro' => [ 43.6,  48.3,   20.3,  30.1],  // Romania
        'rs' => [ 42.2,  46.2,   18.8,  23.0],  // Serbia
        'ru' => [ 41.2,  81.9,   19.6, 180.0],  // Russia
        'se' => [ 55.3,  69.1,   11.1,  24.2],  // Sweden
        'si' => [ 45.4,  46.9,   13.4,  16.6],  // Slovenia
        'sk' => [ 47.7,  49.6,   16.8,  22.6],  // Slovakia
        'sm' => [ 43.9,  44.0,   12.4,  12.5],  // San Marino
        'ua' => [ 44.4,  52.4,   22.1,  40.2],  // Ukraine
        'va' => [ 41.9,  41.9,   12.4,  12.5],  // Vatican

        // ── Africa ───────────────────────────────────────────────────────────
        'ao' => [-18.1,  -4.4,   11.7,  24.1],  // Angola
        'bf' => [ 10.0,  15.1,   -5.5,   2.4],  // Burkina Faso
        'bi' => [ -4.5,  -2.3,   29.0,  30.9],  // Burundi
        'bj' => [  6.2,  12.4,    0.8,   3.8],  // Benin
        'bw' => [-26.9, -17.8,   20.0,  29.4],  // Botswana
        'cd' => [-13.5,   5.4,   12.2,  31.3],  // DR Congo
        'cf' => [  2.2,  11.1,   14.4,  27.5],  // Central African Republic
        'cg' => [ -5.0,   3.7,   11.2,  18.7],  // Republic of Congo
        'ci' => [  4.3,  10.7,   -8.6,  -2.5],  // Côte d'Ivoire
        'cm' => [  1.7,  13.1,    8.5,  16.2],  // Cameroon
        'cv' => [ 14.8,  17.2,  -25.4, -22.7],  // Cape Verde
        'dj' => [ 10.9,  12.7,   41.8,  43.5],  // Djibouti
        'dz' => [ 19.0,  37.1,   -8.7,   9.0],  // Algeria
        'eg' => [ 22.0,  31.7,   24.7,  37.1],  // Egypt
        'er' => [ 12.4,  18.0,   36.4,  43.1],  // Eritrea
        'et' => [  3.4,  15.0,   33.0,  48.0],  // Ethiopia
        'ga' => [ -3.9,   2.3,    8.7,  14.5],  // Gabon
        'gh' => [  4.7,  11.2,   -3.3,   1.2],  // Ghana
        'gm' => [ 13.1,  13.8,  -17.0, -13.8],  // Gambia
        'gn' => [  7.2,  12.7,  -15.1, -7.6],   // Guinea
        'gq' => [  1.0,   3.8,    8.4,  11.3],  // Equatorial Guinea
        'gw' => [ 10.9,  12.7,  -16.7, -13.6],  // Guinea-Bissau
        'ke' => [ -4.7,   5.0,   34.0,  42.0],  // Kenya
        'km' => [-12.4, -11.4,   43.2,  44.5],  // Comoros
        'lr' => [  4.4,   8.6,  -11.5,  -7.4],  // Liberia
        'ls' => [-30.7, -28.6,   27.0,  29.5],  // Lesotho
        'ly' => [ 19.5,  33.2,    9.3,  25.2],  // Libya
        'ma' => [ 27.7,  36.0,  -13.2,  -1.0],  // Morocco
        'mg' => [-25.6, -11.9,   43.2,  50.5],  // Madagascar
        'ml' => [ 10.1,  25.0,  -12.3,   4.3],  // Mali
        'mr' => [ 14.7,  27.3,  -17.1,  -4.8],  // Mauritania
        'mu' => [-20.5, -19.9,   57.3,  57.8],  // Mauritius
        'mw' => [-17.1,  -9.4,   32.7,  35.9],  // Malawi
        'mz' => [-26.9, -10.5,   30.2,  40.8],  // Mozambique
        'na' => [-29.1, -16.9,   11.7,  25.3],  // Namibia
        'ne' => [ 11.7,  23.5,    0.2,  15.9],  // Niger
        'ng' => [  4.3,  13.9,    2.7,  14.7],  // Nigeria
        'rw' => [ -2.8,  -1.1,   29.0,  30.9],  // Rwanda
        'sc' => [ -9.8,  -3.7,   55.3,  56.0],  // Seychelles
        'sd' => [  8.7,  22.2,   21.8,  38.6],  // Sudan
        'sl' => [  6.9,   9.9,  -13.3,  -10.3], // Sierra Leone
        'sn' => [ 12.3,  16.7,  -17.6, -11.4],  // Senegal
        'so' => [ -1.7,  11.9,   40.9,  51.4],  // Somalia
        'ss' => [  3.5,  12.2,   24.1,  36.9],  // South Sudan
        'st' => [ -0.1,   1.7,    6.5,   7.5],  // São Tomé & Príncipe
        'sz' => [-27.3, -25.7,   30.8,  32.1],  // Eswatini
        'td' => [  7.4,  23.5,   13.5,  24.0],  // Chad
        'tg' => [  6.1,  11.1,   -0.1,   1.8],  // Togo
        'tn' => [ 30.2,  37.5,    7.5,  11.6],  // Tunisia
        'tz' => [-11.7,  -1.0,   29.3,  40.4],  // Tanzania
        'ug' => [ -1.5,   4.2,   29.6,  35.0],  // Uganda
        'za' => [-34.9, -22.1,   16.5,  33.0],  // South Africa
        'zm' => [-18.1,  -8.2,   22.0,  33.7],  // Zambia
        'zw' => [-22.4, -15.6,   25.2,  33.1],  // Zimbabwe

        // ── Asia ─────────────────────────────────────────────────────────────
        'ae' => [ 22.6,  26.1,   51.6,  56.4],  // UAE
        'af' => [ 29.4,  38.5,   60.5,  75.0],  // Afghanistan
        'am' => [ 38.8,  41.3,   43.4,  46.6],  // Armenia
        'az' => [ 38.4,  41.9,   44.8,  50.4],  // Azerbaijan
        'bd' => [ 20.7,  26.6,   88.0,  92.7],  // Bangladesh
        'bh' => [ 25.8,  26.3,   50.4,  50.7],  // Bahrain
        'bn' => [  4.0,   5.1,  114.1, 115.4],  // Brunei
        'bt' => [ 26.7,  28.3,   88.7,  92.1],  // Bhutan
        'cn' => [ 18.2,  53.6,   73.5, 135.1],  // China
        'ge' => [ 41.1,  43.6,   40.0,  46.7],  // Georgia (Asia side)
        'hk' => [ 22.1,  22.6,  113.8, 114.4],  // Hong Kong
        'id' => [ -8.8,   5.9,   95.0, 141.0],  // Indonesia
        'il' => [ 29.5,  33.3,   34.3,  35.9],  // Israel
        'in' => [  8.1,  37.1,   68.1,  97.4],  // India
        'iq' => [ 29.1,  37.4,   38.8,  48.8],  // Iraq
        'ir' => [ 25.1,  39.8,   44.0,  63.3],  // Iran
        'jo' => [ 29.2,  33.4,   35.0,  39.3],  // Jordan
        'jp' => [ 24.3,  45.5,  122.9, 153.0],  // Japan
        'kg' => [ 39.2,  43.3,   69.3,  80.3],  // Kyrgyzstan
        'kh' => [ 10.4,  14.7,  102.3, 107.6],  // Cambodia
        'kp' => [ 37.7,  43.0,  124.2, 130.7],  // North Korea
        'kr' => [ 33.1,  38.6,  125.1, 129.6],  // South Korea
        'kw' => [ 28.5,  30.1,   46.5,  48.4],  // Kuwait
        'kz' => [ 40.9,  55.4,   50.3,  87.4],  // Kazakhstan
        'la' => [ 13.9,  22.5,  100.1, 107.7],  // Laos
        'lb' => [ 33.1,  34.7,   35.1,  36.6],  // Lebanon
        'lk' => [  5.9,   9.8,   79.7,  81.9],  // Sri Lanka
        'mm' => [ 10.0,  28.5,   92.2, 101.2],  // Myanmar
        'mn' => [ 41.6,  52.2,   87.8, 119.9],  // Mongolia
        'mo' => [ 22.1,  22.2,  113.5, 113.6],  // Macao
        'mv' => [ -0.7,   7.1,   73.0,  73.7],  // Maldives
        'my' => [  0.9,   7.4,   99.6, 119.3],  // Malaysia
        'np' => [ 26.4,  30.4,   80.1,  88.2],  // Nepal
        'om' => [ 16.6,  26.4,   51.9,  59.9],  // Oman
        'ph' => [  5.0,  21.1,  117.2, 126.6],  // Philippines
        'pk' => [ 23.7,  37.1,   60.9,  77.8],  // Pakistan
        'ps' => [ 31.2,  32.6,   34.2,  35.6],  // Palestine
        'qa' => [ 24.5,  26.2,   50.8,  51.7],  // Qatar
        'sa' => [ 16.4,  32.2,   36.5,  55.7],  // Saudi Arabia
        'sg' => [  1.1,   1.5,  103.6, 104.1],  // Singapore
        'sy' => [ 32.3,  37.3,   35.7,  42.4],  // Syria
        'th' => [  5.6,  20.5,   97.3, 105.6],  // Thailand
        'tj' => [ 36.7,  41.0,   67.4,  75.2],  // Tajikistan
        'tl' => [ -9.4,  -8.1,  124.0, 127.3],  // Timor-Leste
        'tm' => [ 35.1,  42.8,   52.5,  66.7],  // Turkmenistan
        'tr' => [ 35.8,  42.1,   26.0,  44.8],  // Turkey
        'tw' => [ 21.9,  25.3,  119.3, 122.0],  // Taiwan
        'uz' => [ 37.2,  45.6,   56.0,  73.1],  // Uzbekistan
        'vn' => [  8.6,  23.4,  102.1, 109.5],  // Vietnam
        'ye' => [ 12.6,  18.9,   42.5,  54.7],  // Yemen

        // ── Oceania ───────────────────────────────────────────────────────────
        'au' => [-43.7,  -9.2,  113.3, 153.6],  // Australia
        'fj' => [-20.7, -15.7,  177.0, 180.0],  // Fiji
        'fm' => [  5.3,  10.1,  138.0, 163.0],  // Micronesia
        'ki' => [ -3.4,   2.0,  172.9, 177.2],  // Kiribati
        'mh' => [  5.6,  14.7,  160.8, 172.0],  // Marshall Islands
        'mp' => [ 14.1,  20.6,  144.9, 146.1],  // Northern Mariana Islands
        'nc' => [-22.7, -20.1,  164.0, 167.1],  // New Caledonia
        'nf' => [-29.2, -28.9,  167.9, 168.0],  // Norfolk Island
        'nr' => [ -0.5,   0.0,  166.9, 167.0],  // Nauru
        'nu' => [-19.2, -18.9, -170.0,-169.7],  // Niue
        'nz' => [-47.3, -34.4,  166.4, 178.6],  // New Zealand
        'pf' => [-27.7, -15.0, -145.5,-134.5],  // French Polynesia
        'pg' => [-11.7,   0.9,  141.0, 156.0],  // Papua New Guinea
        'pw' => [  2.8,   8.1,  131.1, 134.7],  // Palau
        'sb' => [-11.9,  -5.4,  155.5, 162.8],  // Solomon Islands
        'to' => [-21.5, -18.5, -175.4,-173.7],  // Tonga
        'tv' => [ -8.6,  -5.7,  176.1, 179.9],  // Tuvalu
        'vu' => [-20.2, -13.1,  166.5, 170.2],  // Vanuatu
        'ws' => [-14.1, -13.4, -172.8,-171.4],  // Samoa
        'wf' => [-14.4, -13.2, -178.3,-176.1],  // Wallis & Futuna
    ];

    protected function coordsAreInCountry(float $lat, float $lng, string $cc): bool
    {
        $b = self::COUNTRY_BOUNDS[strtolower($cc)] ?? null;
        if (!$b) {
            return true; // Country not in table — don't reject; geocoding passes through
        }
        [$minLat, $maxLat, $minLng, $maxLng] = $b;
        return $lat >= $minLat && $lat <= $maxLat && $lng >= $minLng && $lng <= $maxLng;
    }

    /**
     * Extract ISO 3166-1 alpha-2 country code from the last segment(s) of an address string.
     * Accepts: full country names in Spanish and English, and bare ISO-2 codes.
     * Covers all 195 UN-recognized countries.
     * Nominatim's countrycodes parameter accepts any valid ISO-2 code, so new countries
     * are supported automatically — just add their name → code mapping here.
     */
    protected function extractCountryCode(string $addressText): ?string
    {
        static $map = null;
        if ($map === null) {
            $map = [
                // ── Americas ─────────────────────────────────────────────────
                'antigua y barbuda'       => 'ag', 'antigua and barbuda'     => 'ag',
                'argentina'               => 'ar',
                'aruba'                   => 'aw',
                'bahamas'                 => 'bs',
                'barbados'                => 'bb',
                'belice'                  => 'bz', 'belize'                  => 'bz',
                'bermuda'                 => 'bm',
                'bolivia'                 => 'bo',
                'brasil'                  => 'br', 'brazil'                  => 'br',
                'canadá'                  => 'ca', 'canada'                  => 'ca',
                'chile'                   => 'cl',
                'colombia'                => 'co',
                'costa rica'              => 'cr',
                'cuba'                    => 'cu',
                'curaçao'                 => 'cw', 'curacao'                 => 'cw',
                'dominica'                => 'dm',
                'república dominicana'    => 'do', 'dominican republic'      => 'do',
                'ecuador'                 => 'ec',
                'el salvador'             => 'sv',
                'estados unidos'          => 'us', 'united states'           => 'us',
                'united states of america'=> 'us', 'usa'                     => 'us',
                'granada'                 => 'gd', 'grenada'                 => 'gd',
                'guadalupe'               => 'gp', 'guadeloupe'              => 'gp',
                'guatemala'               => 'gt',
                'guayana francesa'        => 'gf', 'french guiana'           => 'gf',
                'guyana'                  => 'gy',
                'haití'                   => 'ht', 'haiti'                   => 'ht',
                'honduras'                => 'hn',
                'islas caimán'            => 'ky', 'cayman islands'          => 'ky',
                'islas malvinas'          => 'fk', 'falkland islands'        => 'fk',
                'islas turcas y caicos'   => 'tc', 'turks and caicos islands' => 'tc',
                'islas vírgenes británicas'=> 'vg','british virgin islands'  => 'vg',
                'islas vírgenes de ee. uu.'=> 'vi','us virgin islands'       => 'vi',
                'jamaica'                 => 'jm',
                'martinica'               => 'mq', 'martinique'              => 'mq',
                'méxico'                  => 'mx', 'mexico'                  => 'mx',
                'montserrat'              => 'ms',
                'nicaragua'               => 'ni',
                'panamá'                  => 'pa', 'panama'                  => 'pa',
                'paraguay'                => 'py',
                'perú'                    => 'pe', 'peru'                    => 'pe',
                'puerto rico'             => 'pr',
                'saint barthélemy'        => 'bl', 'san bartolomé'           => 'bl',
                'saint kitts y nevis'     => 'kn', 'saint kitts and nevis'   => 'kn',
                'santa lucía'             => 'lc', 'saint lucia'             => 'lc',
                'san martín'              => 'mf', 'saint martin'            => 'mf',
                'san pedro y miquelón'    => 'pm', 'saint pierre and miquelon'=> 'pm',
                'san vicente y las granadinas'=> 'vc','saint vincent and the grenadines'=> 'vc',
                'surinam'                 => 'sr', 'suriname'                => 'sr',
                'trinidad y tobago'       => 'tt', 'trinidad and tobago'     => 'tt',
                'uruguay'                 => 'uy',
                'venezuela'               => 've',

                // ── Europe ───────────────────────────────────────────────────
                'albania'                 => 'al',
                'alemania'                => 'de', 'germany'                 => 'de',
                'andorra'                 => 'ad',
                'austria'                 => 'at',
                'bélgica'                 => 'be', 'belgium'                 => 'be', 'belgique' => 'be',
                'bielorrusia'             => 'by', 'belarus'                 => 'by',
                'bosnia y herzegovina'    => 'ba', 'bosnia and herzegovina'  => 'ba',
                'bulgaria'                => 'bg',
                'chipre'                  => 'cy', 'cyprus'                  => 'cy',
                'croacia'                 => 'hr', 'croatia'                 => 'hr',
                'dinamarca'               => 'dk', 'denmark'                 => 'dk',
                'eslovaquia'              => 'sk', 'slovakia'                => 'sk',
                'eslovenia'               => 'si', 'slovenia'                => 'si',
                'españa'                  => 'es', 'spain'                   => 'es',
                'estonia'                 => 'ee',
                'finlandia'               => 'fi', 'finland'                 => 'fi',
                'francia'                 => 'fr', 'france'                  => 'fr',
                'georgia'                 => 'ge',
                'grecia'                  => 'gr', 'greece'                  => 'gr',
                'hungría'                 => 'hu', 'hungary'                 => 'hu',
                'irlanda'                 => 'ie', 'ireland'                 => 'ie',
                'islandia'                => 'is', 'iceland'                 => 'is',
                'italia'                  => 'it', 'italy'                   => 'it',
                'letonia'                 => 'lv', 'latvia'                  => 'lv',
                'liechtenstein'           => 'li',
                'lituania'                => 'lt', 'lithuania'               => 'lt',
                'luxemburgo'              => 'lu', 'luxembourg'              => 'lu',
                'malta'                   => 'mt',
                'moldavia'                => 'md', 'moldova'                 => 'md',
                'mónaco'                  => 'mc', 'monaco'                  => 'mc',
                'montenegro'              => 'me',
                'macedonia del norte'     => 'mk', 'north macedonia'         => 'mk',
                'noruega'                 => 'no', 'norway'                  => 'no',
                'países bajos'            => 'nl', 'netherlands'             => 'nl', 'holanda' => 'nl',
                'polonia'                 => 'pl', 'poland'                  => 'pl',
                'portugal'                => 'pt',
                'reino unido'             => 'gb', 'united kingdom'          => 'gb', 'uk' => 'gb',
                'república checa'         => 'cz', 'czech republic'          => 'cz', 'czechia' => 'cz',
                'rumania'                 => 'ro', 'romania'                 => 'ro',
                'rusia'                   => 'ru', 'russia'                  => 'ru',
                'san marino'              => 'sm',
                'serbia'                  => 'rs',
                'suecia'                  => 'se', 'sweden'                  => 'se',
                'suiza'                   => 'ch', 'switzerland'             => 'ch', 'schweiz' => 'ch',
                'ucrania'                 => 'ua', 'ukraine'                 => 'ua',
                'vaticano'                => 'va', 'vatican'                 => 'va',

                // ── Africa ───────────────────────────────────────────────────
                'angola'                  => 'ao',
                'argelia'                 => 'dz', 'algeria'                 => 'dz',
                'benín'                   => 'bj', 'benin'                   => 'bj',
                'botsuana'                => 'bw', 'botswana'                => 'bw',
                'burkina faso'            => 'bf',
                'burundi'                 => 'bi',
                'camerún'                 => 'cm', 'cameroon'                => 'cm',
                'cabo verde'              => 'cv', 'cape verde'              => 'cv',
                'chad'                    => 'td',
                'comoras'                 => 'km', 'comoros'                 => 'km',
                'congo'                   => 'cg', 'república del congo'     => 'cg',
                'república democrática del congo' => 'cd', 'democratic republic of the congo' => 'cd',
                'costa de marfil'         => 'ci', "côte d'ivoire"           => 'ci', 'ivory coast' => 'ci',
                'djibouti'                => 'dj', 'yibuti'                  => 'dj',
                'egipto'                  => 'eg', 'egypt'                   => 'eg',
                'eritrea'                 => 'er',
                'etiopía'                 => 'et', 'ethiopia'                => 'et',
                'gabón'                   => 'ga', 'gabon'                   => 'ga',
                'gambia'                  => 'gm',
                'ghana'                   => 'gh',
                'guinea'                  => 'gn',
                'guinea-bisáu'            => 'gw', 'guinea-bissau'           => 'gw',
                'guinea ecuatorial'       => 'gq', 'equatorial guinea'       => 'gq',
                'kenia'                   => 'ke', 'kenya'                   => 'ke',
                'lesoto'                  => 'ls', 'lesotho'                 => 'ls',
                'liberia'                 => 'lr',
                'libia'                   => 'ly', 'libya'                   => 'ly',
                'madagascar'              => 'mg',
                'malawi'                  => 'mw',
                'malí'                    => 'ml', 'mali'                    => 'ml',
                'marruecos'               => 'ma', 'morocco'                 => 'ma',
                'mauricio'                => 'mu', 'mauritius'               => 'mu',
                'mauritania'              => 'mr',
                'mozambique'              => 'mz',
                'namibia'                 => 'na',
                'níger'                   => 'ne', 'niger'                   => 'ne',
                'nigeria'                 => 'ng',
                'ruanda'                  => 'rw', 'rwanda'                  => 'rw',
                'santo tomé y príncipe'   => 'st', 'são tomé and príncipe'   => 'st',
                'senegal'                 => 'sn',
                'seychelles'              => 'sc',
                'sierra leona'            => 'sl', 'sierra leone'            => 'sl',
                'somalia'                 => 'so',
                'sudáfrica'               => 'za', 'south africa'            => 'za',
                'sudán'                   => 'sd', 'sudan'                   => 'sd',
                'sudán del sur'           => 'ss', 'south sudan'             => 'ss',
                'suazilandia'             => 'sz', 'eswatini'                => 'sz', 'swaziland' => 'sz',
                'tanzania'                => 'tz',
                'togo'                    => 'tg',
                'túnez'                   => 'tn', 'tunisia'                 => 'tn',
                'uganda'                  => 'ug',
                'zambia'                  => 'zm',
                'zimbabue'                => 'zw', 'zimbabwe'                => 'zw',

                // ── Asia & Middle East ────────────────────────────────────────
                'afganistán'              => 'af', 'afghanistan'             => 'af',
                'arabia saudita'          => 'sa', 'saudi arabia'            => 'sa',
                'armenia'                 => 'am',
                'azerbaiyán'              => 'az', 'azerbaijan'              => 'az',
                'baréin'                  => 'bh', 'bahrain'                 => 'bh',
                'bangladés'               => 'bd', 'bangladesh'              => 'bd',
                'bután'                   => 'bt', 'bhutan'                  => 'bt',
                'brunéi'                  => 'bn', 'brunei'                  => 'bn',
                'camboya'                 => 'kh', 'cambodia'                => 'kh',
                'china'                   => 'cn',
                'corea del norte'         => 'kp', 'north korea'             => 'kp',
                'corea del sur'           => 'kr', 'south korea'             => 'kr',
                'emiratos árabes unidos'  => 'ae', 'united arab emirates'    => 'ae', 'uae' => 'ae',
                'filipinas'               => 'ph', 'philippines'             => 'ph',
                'india'                   => 'in',
                'indonesia'               => 'id',
                'irak'                    => 'iq', 'iraq'                    => 'iq',
                'irán'                    => 'ir', 'iran'                    => 'ir',
                'israel'                  => 'il',
                'japón'                   => 'jp', 'japan'                   => 'jp',
                'jordania'                => 'jo', 'jordan'                  => 'jo',
                'kazajistán'              => 'kz', 'kazakhstan'              => 'kz',
                'kirguistán'              => 'kg', 'kyrgyzstan'              => 'kg',
                'kuwait'                  => 'kw',
                'laos'                    => 'la',
                'líbano'                  => 'lb', 'lebanon'                 => 'lb',
                'malasia'                 => 'my', 'malaysia'                => 'my',
                'maldivas'                => 'mv', 'maldives'                => 'mv',
                'mongolia'                => 'mn',
                'myanmar'                 => 'mm', 'birmania'                => 'mm',
                'nepal'                   => 'np',
                'omán'                    => 'om', 'oman'                    => 'om',
                'pakistán'                => 'pk', 'pakistan'                => 'pk',
                'palestina'               => 'ps', 'palestine'               => 'ps',
                'qatar'                   => 'qa',
                'singapur'                => 'sg', 'singapore'               => 'sg',
                'siria'                   => 'sy', 'syria'                   => 'sy',
                'sri lanka'               => 'lk',
                'tailandia'               => 'th', 'thailand'                => 'th',
                'taiwán'                  => 'tw', 'taiwan'                  => 'tw',
                'tayikistán'              => 'tj', 'tajikistan'              => 'tj',
                'timor oriental'          => 'tl', 'east timor'              => 'tl', 'timor-leste' => 'tl',
                'turkmenistán'            => 'tm', 'turkmenistan'            => 'tm',
                'turquía'                 => 'tr', 'turkey'                  => 'tr', 'türkiye' => 'tr',
                'uzbekistán'              => 'uz', 'uzbekistan'              => 'uz',
                'vietnam'                 => 'vn', 'viet nam'                => 'vn',
                'yemen'                   => 'ye',

                // ── Oceania ───────────────────────────────────────────────────
                'australia'               => 'au',
                'fiyi'                    => 'fj', 'fiji'                    => 'fj',
                'micronesia'              => 'fm',
                'nauru'                   => 'nr',
                'nueva zelanda'           => 'nz', 'new zealand'             => 'nz',
                'nueva caledonia'         => 'nc', 'new caledonia'           => 'nc',
                'palau'                   => 'pw',
                'papúa nueva guinea'      => 'pg', 'papua new guinea'        => 'pg',
                'polinesia francesa'      => 'pf', 'french polynesia'        => 'pf',
                'islas salomón'           => 'sb', 'solomon islands'         => 'sb',
                'samoa'                   => 'ws',
                'tonga'                   => 'to',
                'tuvalu'                  => 'tv',
                'vanuatu'                 => 'vu',
            ];

            // Add all ISO-2 codes directly (e.g. last segment is just "CO" or "US")
            foreach (array_unique(array_values($map)) as $iso) {
                if (!isset($map[$iso])) {
                    $map[$iso] = $iso;
                }
            }
        }

        $parts = array_values(array_filter(array_map('trim', explode(',', mb_strtolower($addressText)))));

        // Check from last segment backwards (country is most often the last element)
        foreach (array_reverse($parts) as $part) {
            if (isset($map[$part])) {
                return $map[$part];
            }
        }

        return null;
    }

    /**
     * Build address string from shipment details (sender or receiver).
     */
    public static function buildAddressFromDetails(array $details): string
    {
        $parts = array_filter([
            $details['address'] ?? null,
            $details['address_line2'] ?? null,
            $details['city'] ?? null,
            $details['state'] ?? $details['state_name'] ?? null,
            $details['postal_code'] ?? $details['zip_code'] ?? null,
            $details['country'] ?? $details['country_name'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');
        return implode(', ', $parts);
    }
}
