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

namespace Tests\Unit;

use App\Models\Country;
use App\Models\Organization;
use App\Models\RateZone;
use App\Services\Rates\RateZoneMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateZoneMatcherTest extends TestCase
{
    use RefreshDatabase;

    private RateZoneMatcher $matcher;
    private int $orgId;
    private int $countryUs;
    private int $countryCo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->matcher = app(RateZoneMatcher::class);
        $org = Organization::factory()->create();
        $this->orgId = $org->id;

        $us = Country::create(['name' => 'United States', 'iso2' => 'US', 'organization_id' => null]);
        $co = Country::create(['name' => 'Colombia', 'iso2' => 'CO', 'organization_id' => null]);
        $this->countryUs = $us->id;
        $this->countryCo = $co->id;
    }

    public function test_zone_exact_match(): void
    {
        RateZone::create([
            'organization_id' => $this->orgId,
            'name' => 'US-CO',
            'origin_country_id' => $this->countryUs,
            'dest_country_id' => $this->countryCo,
            'origin_any' => false,
            'dest_any' => false,
            'active' => true,
        ]);

        $zones = $this->matcher->findMatchingZones($this->orgId, $this->countryUs, $this->countryCo);
        $this->assertCount(1, $zones);
        $this->assertSame('US-CO', $zones->first()->name);
    }

    public function test_origin_any_matches_any_origin(): void
    {
        RateZone::create([
            'organization_id' => $this->orgId,
            'name' => 'Any-US',
            'origin_country_id' => $this->countryUs,
            'dest_country_id' => $this->countryUs,
            'origin_any' => true,
            'dest_any' => false,
            'active' => true,
        ]);

        $zones = $this->matcher->findMatchingZones($this->orgId, $this->countryCo, $this->countryUs);
        $this->assertCount(1, $zones);
        $this->assertSame('Any-US', $zones->first()->name);
    }

    public function test_dest_any_matches_any_dest(): void
    {
        RateZone::create([
            'organization_id' => $this->orgId,
            'name' => 'US-Any',
            'origin_country_id' => $this->countryUs,
            'dest_country_id' => $this->countryCo,
            'origin_any' => false,
            'dest_any' => true,
            'active' => true,
        ]);

        $zones = $this->matcher->findMatchingZones($this->orgId, $this->countryUs, $this->countryUs);
        $this->assertCount(1, $zones);
        $this->assertSame('US-Any', $zones->first()->name);
    }

    public function test_both_any_matches_any_route(): void
    {
        RateZone::create([
            'organization_id' => $this->orgId,
            'name' => 'Any-Any',
            'origin_country_id' => $this->countryUs,
            'dest_country_id' => $this->countryCo,
            'origin_any' => true,
            'dest_any' => true,
            'active' => true,
        ]);

        $zones = $this->matcher->findMatchingZones($this->orgId, $this->countryCo, $this->countryUs);
        $this->assertCount(1, $zones);
        $this->assertSame('Any-Any', $zones->first()->name);
    }

    public function test_no_match_returns_empty(): void
    {
        RateZone::create([
            'organization_id' => $this->orgId,
            'name' => 'US-CO only',
            'origin_country_id' => $this->countryUs,
            'dest_country_id' => $this->countryCo,
            'origin_any' => false,
            'dest_any' => false,
            'active' => true,
        ]);

        $zones = $this->matcher->findMatchingZones($this->orgId, $this->countryCo, $this->countryUs);
        $this->assertCount(0, $zones);
    }

    public function test_inactive_zone_not_returned(): void
    {
        RateZone::create([
            'organization_id' => $this->orgId,
            'name' => 'Inactive',
            'origin_country_id' => $this->countryUs,
            'dest_country_id' => $this->countryCo,
            'origin_any' => false,
            'dest_any' => false,
            'active' => false,
        ]);

        $zones = $this->matcher->findMatchingZones($this->orgId, $this->countryUs, $this->countryCo);
        $this->assertCount(0, $zones);
    }
}
