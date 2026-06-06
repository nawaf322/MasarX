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

namespace Database\Seeders;

use App\Models\RateCard;
use App\Models\RateRule;
use App\Models\RateZone;
use App\Models\Country;
use Illuminate\Database\Seeder;

/**
 * Populates Rate Zones, Rate Cards, and Rate Rules for Organization 3.
 * Mirrors the structure of Org 2 with realistic Latin America logistics rates.
 */
class Org3RatesSeeder extends Seeder
{
    private int $orgId = 3;

    public function run(): void
    {
        $this->command->info('Seeding rates for Org 3 (BLADIMIR PUTIN\'s Team)...');

        // Resolve country IDs
        $countries = Country::pluck('id', 'iso2');

        $CO = $countries['CO'] ?? 1;
        $US = $countries['US'] ?? 2;
        $MX = $countries['MX'] ?? 3;
        $ES = $countries['ES'] ?? 4;
        $AR = $countries['AR'] ?? 5;
        $CL = $countries['CL'] ?? 6;
        $PE = $countries['PE'] ?? 7;
        $EC = $countries['EC'] ?? 8;
        $PA = $countries['PA'] ?? 9;
        $CR = $countries['CR'] ?? 10;

        // ── ZONES ──────────────────────────────────────────────────────────────
        $zonesDef = [
            ['name' => 'Colombia → USA',      'orig' => $CO, 'dest' => $US],
            ['name' => 'USA → Colombia',       'orig' => $US, 'dest' => $CO],
            ['name' => 'Colombia → México',    'orig' => $CO, 'dest' => $MX],
            ['name' => 'México → Colombia',    'orig' => $MX, 'dest' => $CO],
            ['name' => 'Colombia → España',    'orig' => $CO, 'dest' => $ES],
            ['name' => 'España → Colombia',    'orig' => $ES, 'dest' => $CO],
            ['name' => 'Colombia → Argentina', 'orig' => $CO, 'dest' => $AR],
            ['name' => 'Argentina → Colombia', 'orig' => $AR, 'dest' => $CO],
            ['name' => 'Colombia → Chile',     'orig' => $CO, 'dest' => $CL],
            ['name' => 'Chile → Colombia',     'orig' => $CL, 'dest' => $CO],
            ['name' => 'Colombia → Perú',      'orig' => $CO, 'dest' => $PE],
            ['name' => 'Perú → Colombia',      'orig' => $PE, 'dest' => $CO],
            ['name' => 'Colombia → Ecuador',   'orig' => $CO, 'dest' => $EC],
            ['name' => 'Ecuador → Colombia',   'orig' => $EC, 'dest' => $CO],
            ['name' => 'Colombia → Panamá',    'orig' => $CO, 'dest' => $PA],
            ['name' => 'Panamá → Colombia',    'orig' => $PA, 'dest' => $CO],
            ['name' => 'Colombia → Costa Rica','orig' => $CO, 'dest' => $CR],
            ['name' => 'USA → México',         'orig' => $US, 'dest' => $MX],
            ['name' => 'México → USA',         'orig' => $MX, 'dest' => $US],
            ['name' => 'Internacional (Todo → Todo)', 'orig' => $CO, 'dest' => $US, 'any' => true],
        ];

        $zones = [];
        foreach ($zonesDef as $def) {
            $isAny = $def['any'] ?? false;
            $zone = RateZone::firstOrCreate(
                ['organization_id' => $this->orgId, 'name' => $def['name']],
                [
                    // origin_country_id is NOT NULL in DB; use the provided country as
                    // a reference even for wildcard zones (origin_any/dest_any handles matching).
                    'origin_country_id'  => $def['orig'],
                    'origin_any'         => $isAny,
                    'origin_state_id'    => null,
                    'origin_city_id'     => null,
                    'dest_country_id'    => $def['dest'],
                    'dest_any'           => $isAny,
                    'dest_state_id'      => null,
                    'dest_city_id'       => null,
                    'active'             => true,
                ]
            );
            $zones[] = $zone;
        }

        $this->command->info('  ✅ ' . count($zones) . ' zones created/found.');

        // ── RATE CARDS ─────────────────────────────────────────────────────────
        $cardsDef = [
            ['name' => 'Express Air USD',     'currency' => 'USD', 'rule' => 'max',    'vol_div' => 5000],
            ['name' => 'Standard Ground USD', 'currency' => 'USD', 'rule' => 'max',    'vol_div' => 5000],
            ['name' => 'Economy USD',         'currency' => 'USD', 'rule' => 'actual', 'vol_div' => 6000],
            ['name' => 'Express Air COP',     'currency' => 'COP', 'rule' => 'max',    'vol_div' => 5000],
            ['name' => 'Standard Ground COP', 'currency' => 'COP', 'rule' => 'max',    'vol_div' => 5000],
            ['name' => 'Economy COP',         'currency' => 'COP', 'rule' => 'actual', 'vol_div' => 6000],
        ];

        $cards = [];
        foreach ($cardsDef as $def) {
            $card = RateCard::firstOrCreate(
                ['organization_id' => $this->orgId, 'name' => $def['name']],
                [
                    'currency'               => $def['currency'],
                    'chargeable_weight_rule' => $def['rule'],
                    'volumetric_divisor'     => $def['vol_div'],
                    'active'                 => true,
                ]
            );
            $cards[] = $card;
        }

        $this->command->info('  ✅ ' . count($cards) . ' rate cards created/found.');

        // ── RATE RULES ─────────────────────────────────────────────────────────
        // Weight brackets (kg)
        $brackets = [
            ['min' => 0,   'max' => 0.5],
            ['min' => 0.5, 'max' => 1],
            ['min' => 1,   'max' => 3],
            ['min' => 3,   'max' => 5],
            ['min' => 5,   'max' => 10],
            ['min' => 10,  'max' => 20],
            ['min' => 20,  'max' => 30],
            ['min' => 30,  'max' => 70],
        ];

        // Pricing matrix per card type × service
        // [flat, price_per_kg, min_charge, fuel_surcharge%, insurance%, tax%, handling]
        $pricing = [
            // Express Air USD
            'Express Air USD' => [
                'Express'  => [35.00, 7.50,  45.00, 18.0, 0.5, 0.0, 3.00],
                'Standard' => [22.00, 5.00,  28.00, 15.0, 0.5, 0.0, 2.00],
                'Economy'  => [12.00, 3.20,  16.00, 10.0, 0.5, 0.0, 1.50],
            ],
            'Standard Ground USD' => [
                'Standard' => [15.00, 3.50,  20.00, 12.0, 0.3, 0.0, 1.50],
                'Economy'  => [9.00,  2.10,  12.00, 8.0,  0.3, 0.0, 1.00],
                'Express'  => [25.00, 5.50,  32.00, 16.0, 0.5, 0.0, 2.50],
            ],
            'Economy USD' => [
                'Economy'  => [8.00,  1.80,  10.00, 7.0,  0.2, 0.0, 0.80],
                'Standard' => [13.00, 2.80,  17.00, 10.0, 0.3, 0.0, 1.20],
                'Express'  => [20.00, 4.20,  26.00, 14.0, 0.4, 0.0, 2.00],
            ],
            // Express Air COP (values × 4000 exchange rate)
            'Express Air COP' => [
                'Express'  => [140000, 30000,  180000, 18.0, 0.5, 19.0, 12000],
                'Standard' => [88000,  20000,  112000, 15.0, 0.5, 19.0, 8000],
                'Economy'  => [48000,  12800,   64000, 10.0, 0.5, 19.0, 6000],
            ],
            'Standard Ground COP' => [
                'Standard' => [60000,  14000,   80000, 12.0, 0.3, 19.0, 6000],
                'Economy'  => [36000,   8400,   48000, 8.0,  0.3, 19.0, 4000],
                'Express'  => [100000, 22000,  128000, 16.0, 0.5, 19.0, 10000],
            ],
            'Economy COP' => [
                'Economy'  => [32000,   7200,   40000, 7.0,  0.2, 19.0, 3200],
                'Standard' => [52000,  11200,   68000, 10.0, 0.3, 19.0, 4800],
                'Express'  => [80000,  16800,  104000, 14.0, 0.4, 19.0, 8000],
            ],
        ];

        // Zone multipliers — longer routes cost more
        $zoneMultiplier = [
            'Colombia → USA'              => 1.20,
            'USA → Colombia'              => 1.20,
            'Colombia → España'           => 1.35,
            'España → Colombia'           => 1.35,
            'Colombia → Argentina'        => 1.15,
            'Argentina → Colombia'        => 1.15,
            'Colombia → Chile'            => 1.10,
            'Chile → Colombia'            => 1.10,
            'Colombia → México'           => 1.00,
            'México → Colombia'           => 1.00,
            'Colombia → Perú'             => 0.90,
            'Perú → Colombia'             => 0.90,
            'Colombia → Ecuador'          => 0.80,
            'Ecuador → Colombia'          => 0.80,
            'Colombia → Panamá'           => 0.85,
            'Panamá → Colombia'           => 0.85,
            'Colombia → Costa Rica'       => 0.88,
            'USA → México'                => 1.05,
            'México → USA'                => 1.05,
            'Internacional (Todo → Todo)' => 1.50,
        ];

        // Weight bracket multipliers — heavier = lower per-kg price
        $weightMultiplier = [
            0 => 1.60, 1 => 1.40, 2 => 1.20, 3 => 1.10, 4 => 1.00, 5 => 0.90, 6 => 0.80, 7 => 0.70,
        ];

        $rulesCreated = 0;
        $rulesSkipped = 0;

        foreach ($cards as $card) {
            $cardPricing = $pricing[$card->name] ?? null;
            if (!$cardPricing) {
                continue;
            }

            foreach ($zones as $zone) {
                $mult = $zoneMultiplier[$zone->name] ?? 1.0;

                foreach ($cardPricing as $serviceType => $base) {
                    [$flat, $perKg, $minCharge, $fuel, $ins, $tax, $handling] = $base;

                    foreach ($brackets as $i => $bracket) {
                        $wMult = $weightMultiplier[$i] ?? 1.0;

                        $exists = RateRule::withoutGlobalScope('tenant')
                            ->where('organization_id', $this->orgId)
                            ->where('rate_card_id', $card->id)
                            ->where('rate_zone_id', $zone->id)
                            ->where('service_type', $serviceType)
                            ->where('min_weight', $bracket['min'])
                            ->where('max_weight', $bracket['max'])
                            ->exists();

                        if ($exists) {
                            $rulesSkipped++;
                            continue;
                        }

                        RateRule::create([
                            'organization_id'       => $this->orgId,
                            'rate_card_id'          => $card->id,
                            'rate_zone_id'          => $zone->id,
                            'service_type'          => $serviceType,
                            'min_weight'            => $bracket['min'],
                            'max_weight'            => $bracket['max'],
                            'flat_price'            => round($flat * $mult * $wMult, 2),
                            'price_per_kg'          => round($perKg * $mult * $wMult, 2),
                            'price_per_lb'          => round(($perKg * $mult * $wMult) / 2.205, 2),
                            'min_charge'            => round($minCharge * $mult, 2),
                            'fuel_surcharge_percent'=> $fuel,
                            'insurance_percent'     => $ins,
                            'tax_percent'           => $tax,
                            'handling_fee'          => round($handling * $mult, 2),
                            'rounding_rule'         => 'ceil',
                            'active'                => true,
                        ]);

                        $rulesCreated++;
                    }
                }
            }
        }

        $this->command->info("  ✅ {$rulesCreated} rules created, {$rulesSkipped} skipped (already exist).");
        $this->command->info('Done! Org 3 now has: ' .
            count($zones) . ' zones, ' .
            count($cards) . ' cards, ' .
            $rulesCreated . ' new rules.'
        );
    }
}
