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

namespace App\Services\Rates;

use App\Models\RateZone;
use Illuminate\Support\Collection;

/**
 * Single source of truth for rate zone matching.
 * Used by LocalCarrierAdapter and RateCalculatorController to ensure identical results.
 *
 * Supports:
 * - origin_any / dest_any (wildcard)
 * - origin_country_id / dest_country_id (exact or wildcard when *_any)
 * - origin_state_id / dest_state_id (optional; null = wildcard)
 * - origin_city_id / dest_city_id (optional; null = wildcard)
 */
class RateZoneMatcher
{
    /**
     * Find zones matching the given route.
     *
     * @param int $organizationId
     * @param int|null $originCountryId
     * @param int|null $destCountryId
     * @param int|null $originStateId
     * @param int|null $destStateId
     * @param int|null $originCityId
     * @param int|null $destCityId
     * @return Collection<int, RateZone>
     */
    public function findMatchingZones(
        int $organizationId,
        ?int $originCountryId,
        ?int $destCountryId,
        ?int $originStateId = null,
        ?int $destStateId = null,
        ?int $originCityId = null,
        ?int $destCityId = null
    ): Collection {
        $zones = RateZone::where('organization_id', $organizationId)
            ->where('active', true)
            ->where(function ($q) use ($originCountryId) {
                $q->where('origin_any', true)
                    ->orWhere('origin_country_id', $originCountryId);
            })
            ->where(function ($q) use ($destCountryId) {
                $q->where('dest_any', true)
                    ->orWhere('dest_country_id', $destCountryId);
            })
            ->get();

        // Optional: filter by state/city when zone has them set
        return $zones->filter(function (RateZone $zone) use ($originStateId, $destStateId, $originCityId, $destCityId) {
            if ($zone->origin_state_id !== null && $zone->origin_state_id != $originStateId) {
                return false;
            }
            if ($zone->dest_state_id !== null && $zone->dest_state_id != $destStateId) {
                return false;
            }
            if ($zone->origin_city_id !== null && $zone->origin_city_id != $originCityId) {
                return false;
            }
            if ($zone->dest_city_id !== null && $zone->dest_city_id != $destCityId) {
                return false;
            }
            return true;
        })->values();
    }
}
