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

use App\Models\Country;
use App\Models\Currency;
use App\Models\Organization;
use App\Models\RateCard;
use App\Models\RateRule;
use App\Models\RateZone;
use Illuminate\Database\Seeder;

/**
 * Pobla rate_cards, rate_zones y rate_rules con datos de referencia tipo couriers globales.
 * Usa todos los países configurados y monedas importantes. NO borra datos existentes.
 */
class RatesSeeder extends Seeder
{
    /** Monedas principales para tarjetas (si existen en Currency) */
    private const KEY_CURRENCIES = ['USD', 'EUR', 'GBP', 'COP', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'PAB', 'CRC'];

    public function run(): void
    {
        $orgs = Organization::all();
        if ($orgs->isEmpty()) {
            $this->command->warn('No hay organizaciones. Ejecute DatabaseSeeder primero.');
            return;
        }

        $countries = Country::orderBy('name')->get();
        if ($countries->isEmpty()) {
            $this->command->warn('No hay países. Ejecute LocationsSeeder primero.');
            return;
        }

        $countriesByIso = $countries->keyBy('iso2');

        foreach ($orgs as $org) {
            $this->seedForOrganization($org, $countries, $countriesByIso);
        }

        $this->command->info('RatesSeeder completado.');
    }

    private function seedForOrganization(Organization $org, $countries, $countriesByIso): void
    {
        $orgId = $org->id;

        $activeCurrencies = Currency::where('is_active', true)->pluck('code')->toArray();
        $currenciesToUse = array_values(array_intersect(self::KEY_CURRENCIES, $activeCurrencies));
        if (empty($currenciesToUse)) {
            $currenciesToUse = array_slice($activeCurrencies, 0, 12);
        }
        if (empty($currenciesToUse)) {
            $currenciesToUse = ['USD', 'EUR', 'COP'];
        }

        // --- RATE CARDS: varias monedas importantes, estilo DHL/FedEx/UPS ---
        $cardsData = [];
        foreach ($currenciesToUse as $i => $code) {
            $suffix = count($currenciesToUse) > 1 ? " {$code}" : '';
            $cardsData[] = ['name' => "Express Air{$suffix}", 'currency' => $code, 'chargeable_weight_rule' => 'max', 'volumetric_divisor' => 5000];
            $cardsData[] = ['name' => "Standard Ground{$suffix}", 'currency' => $code, 'chargeable_weight_rule' => 'actual', 'volumetric_divisor' => null];
        }
        $cardsData[] = ['name' => 'Economy Sea EUR', 'currency' => in_array('EUR', $currenciesToUse) ? 'EUR' : 'USD', 'chargeable_weight_rule' => 'volumetric', 'volumetric_divisor' => 6000];

        $cards = [];
        foreach ($cardsData as $c) {
            $card = RateCard::firstOrCreate(
                ['organization_id' => $orgId, 'name' => $c['name']],
                [
                    'currency' => $c['currency'],
                    'chargeable_weight_rule' => $c['chargeable_weight_rule'],
                    'volumetric_divisor' => $c['volumetric_divisor'] ?? 5000,
                    'active' => true,
                ]
            );
            $cards[$c['name']] = $card;
        }
        $this->command->info("   Org {$orgId}: " . count($cards) . " rate cards.");

        // --- RATE ZONES: rutas con todos los países configurados ---
        $isoPairs = [
            ['US', 'CO', 'USA → Colombia'],
            ['US', 'MX', 'USA → México'],
            ['CO', 'US', 'Colombia → USA'],
            ['MX', 'US', 'México → USA'],
            ['ES', 'CO', 'España → Colombia'],
            ['CO', 'ES', 'Colombia → España'],
            ['ES', 'MX', 'España → México'],
            ['MX', 'CO', 'México → Colombia'],
            ['CO', 'MX', 'Colombia → México'],
            ['AR', 'US', 'Argentina → USA'],
            ['US', 'AR', 'USA → Argentina'],
            ['CL', 'US', 'Chile → USA'],
            ['US', 'CL', 'USA → Chile'],
            ['PE', 'CO', 'Perú → Colombia'],
            ['CO', 'PE', 'Colombia → Perú'],
            ['CO', 'EC', 'Colombia → Ecuador'],
            ['EC', 'CO', 'Ecuador → Colombia'],
            ['PA', 'CO', 'Panamá → Colombia'],
            ['CO', 'PA', 'Colombia → Panamá'],
            ['CR', 'US', 'Costa Rica → USA'],
            ['US', 'CR', 'USA → Costa Rica'],
            ['PE', 'US', 'Perú → USA'],
            ['US', 'PE', 'USA → Perú'],
            ['CL', 'CO', 'Chile → Colombia'],
            ['CO', 'CL', 'Colombia → Chile'],
            ['AR', 'CO', 'Argentina → Colombia'],
            ['CO', 'AR', 'Colombia → Argentina'],
            ['MX', 'AR', 'México → Argentina'],
            ['ES', 'AR', 'España → Argentina'],
            ['ES', 'PE', 'España → Perú'],
            ['ES', 'EC', 'España → Ecuador'],
            ['PA', 'US', 'Panamá → USA'],
            ['CR', 'CO', 'Costa Rica → Colombia'],
        ];

        // Claves ya incluidas para evitar duplicados
        $seenKeys = [];
        foreach ($isoPairs as $p) {
            $seenKeys["{$p[0]}_{$p[1]}"] = true;
        }

        // Añadir zonas dinámicas: cada país hacia hubs (US, CO, MX, ES)
        $hubIsos = ['US', 'CO', 'MX', 'ES'];
        foreach ($countries as $country) {
            $iso = $country->iso2 ?? null;
            if (!$iso) continue;
            foreach ($hubIsos as $hub) {
                if ($iso === $hub) continue;
                $key = "{$iso}_{$hub}";
                if (isset($seenKeys[$key])) continue;
                $hubCountry = $countriesByIso->get($hub);
                if (!$hubCountry) continue;
                $seenKeys[$key] = true;
                $isoPairs[] = [$iso, $hub, "{$country->name} → {$hubCountry->name}"];
            }
        }

        $zones = [];
        foreach ($isoPairs as $pair) {
            $orig = $pair[0];
            $dest = $pair[1];
            $name = $pair[2];
            $o = $countriesByIso->get($orig);
            $d = $countriesByIso->get($dest);
            if (!$o || !$d) continue;
            $zone = RateZone::firstOrCreate(
                [
                    'organization_id' => $orgId,
                    'name' => $name,
                    'origin_country_id' => $o->id,
                    'dest_country_id' => $d->id,
                ],
                ['active' => true]
            );
            $zones[$name] = $zone;
        }
        $this->command->info("   Org {$orgId}: " . count($zones) . " rate zones.");

        // --- RATE RULES (tarifas por peso, vinculando card + zone) ---
        // Multiplicador por tipo de tarjeta: Express Air > Standard Ground > Economy (como couriers reales)
        $rulesCreated = 0;
        foreach ($cards as $cardName => $card) {
            $mult = 1.0;
            if (stripos($cardName, 'Express') !== false) $mult = 1.35;
            elseif (stripos($cardName, 'Economy') !== false) $mult = 0.75;
            foreach ($zones as $zoneName => $zone) {
                $ruleCount = RateRule::where('rate_card_id', $card->id)->where('rate_zone_id', $zone->id)->count();
                if ($ruleCount > 0) continue;

                RateRule::create([
                    'organization_id' => $orgId,
                    'rate_card_id' => $card->id,
                    'rate_zone_id' => $zone->id,
                    'service_type' => 'Standard',
                    'min_weight' => 0,
                    'max_weight' => 5,
                    'flat_price' => round(15.00 * $mult, 2),
                    'price_per_kg' => round(3.50 * $mult, 2),
                    'min_charge' => round(20.00 * $mult, 2),
                    'fuel_surcharge_percent' => 5,
                    'insurance_percent' => 0,
                    'tax_percent' => 0,
                    'handling_fee' => round(2.00 * $mult, 2),
                    'rounding_rule' => 'nearest',
                    'active' => true,
                ]);
                $rulesCreated++;

                RateRule::create([
                    'organization_id' => $orgId,
                    'rate_card_id' => $card->id,
                    'rate_zone_id' => $zone->id,
                    'service_type' => 'Express',
                    'min_weight' => 0,
                    'max_weight' => 5,
                    'flat_price' => round(25.00 * $mult, 2),
                    'price_per_kg' => round(5.00 * $mult, 2),
                    'min_charge' => round(35.00 * $mult, 2),
                    'fuel_surcharge_percent' => 6,
                    'insurance_percent' => 0,
                    'tax_percent' => 0,
                    'handling_fee' => round(3.00 * $mult, 2),
                    'rounding_rule' => 'nearest',
                    'active' => true,
                ]);
                $rulesCreated++;

                RateRule::create([
                    'organization_id' => $orgId,
                    'rate_card_id' => $card->id,
                    'rate_zone_id' => $zone->id,
                    'service_type' => 'Economy',
                    'min_weight' => 0,
                    'max_weight' => 30,
                    'flat_price' => round(8.00 * $mult, 2),
                    'price_per_kg' => round(2.00 * $mult, 2),
                    'min_charge' => round(12.00 * $mult, 2),
                    'fuel_surcharge_percent' => 4,
                    'insurance_percent' => 0,
                    'tax_percent' => 0,
                    'handling_fee' => round(1.00 * $mult, 2),
                    'rounding_rule' => 'nearest',
                    'active' => true,
                ]);
                $rulesCreated++;
            }
        }
        $this->command->info("   Org {$orgId}: {$rulesCreated} rate rules creados.");
    }
}
