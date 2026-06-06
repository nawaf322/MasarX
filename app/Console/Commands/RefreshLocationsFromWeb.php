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

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Vacía las tablas countries, states y cities y las repuebla con datos actualizados
 * desde https://github.com/dr5hn/countries-states-cities-database (JSON).
 */
class RefreshLocationsFromWeb extends Command
{
    protected $signature = 'locations:refresh-from-web
                            {--force : Ejecutar sin confirmación}';

    protected $description = 'Vacía y repuebla countries, states y cities con datos actualizados del mundo (dr5hn/countries-states-cities-database)';

    private const COUNTRIES_JSON = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/countries.json';
    private const STATES_JSON = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/states.json';
    private const CITIES_JSON = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/cities.json';

    public function handle(): int
    {
        if (!$this->option('force') && !$this->confirm('¿Vaciar y repoblar countries, states y cities? Se anularán las referencias en users y otras tablas.')) {
            return self::FAILURE;
        }

        $this->info('Anulando referencias a locations en otras tablas...');
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            $this->nullLocationReferences();
            $this->truncateLocationTables();
            $this->fetchAndSeedCountries();
            $this->fetchAndSeedStates();
            $this->fetchAndSeedCities();
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        $this->info('Listo. Countries, states y cities repoblados.');
        return self::SUCCESS;
    }

    private function nullLocationReferences(): void
    {
        if (Schema::hasTable('users')) {
            DB::table('users')->update(['country_id' => null, 'state_id' => null, 'city_id' => null]);
        }
        if (Schema::hasTable('organizations')) {
            $cols = ['country_id', 'state_id', 'city_id'];
            if (Schema::hasColumns('organizations', $cols)) {
                DB::table('organizations')->update(array_combine($cols, array_fill(0, 3, null)));
            }
        }
        if (Schema::hasTable('rate_zones')) {
            DB::table('rate_zones')->update([
                'origin_country_id' => null, 'origin_state_id' => null, 'origin_city_id' => null,
                'dest_country_id' => null, 'dest_state_id' => null, 'dest_city_id' => null,
            ]);
        }
    }

    private function truncateLocationTables(): void
    {
        DB::table('cities')->truncate();
        DB::table('states')->truncate();
        DB::table('countries')->truncate();
        $this->info('Tablas cities, states y countries truncadas.');
    }

    private function fetchAndSeedCountries(): void
    {
        $this->info('Descargando countries.json...');
        $response = Http::timeout(60)->get(self::COUNTRIES_JSON);
        if (!$response->successful()) {
            throw new \RuntimeException('No se pudo descargar countries.json: ' . $response->status());
        }
        $countries = $response->json();
        if (!is_array($countries)) {
            throw new \RuntimeException('countries.json no es un array.');
        }

        $now = now()->format('Y-m-d H:i:s');
        $bar = $this->output->createProgressBar(count($countries));
        $bar->start();

        $inserted = [];
        foreach ($countries as $c) {
            $id = $c['id'] ?? null;
            $name = $c['name'] ?? '';
            $iso2 = $c['iso2'] ?? '';
            $iso3 = $c['iso3'] ?? null;
            $phone = $c['phone_code'] ?? null;
            $currency = $c['currency'] ?? null;
            $region = $c['region'] ?? null;
            if ($name === '' || $iso2 === '') {
                $bar->advance();
                continue;
            }
            $newId = DB::table('countries')->insertGetId([
                'organization_id' => null,
                'name' => $name,
                'iso2' => substr($iso2, 0, 2),
                'iso3' => $iso3 ? substr($iso3, 0, 3) : null,
                'phone_code' => $phone ? preg_replace('/[^0-9+]/', '', $phone) ?: $phone : null,
                'currency' => $currency ? substr($currency, 0, 255) : null,
                'region' => $region ? substr($region, 0, 255) : null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            if ($id !== null) {
                $inserted[(int) $id] = $newId;
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
        $this->getOutput()->writeln('Countries: ' . count($inserted) . ' insertados.');
        $this->app['locations.country_map'] = $inserted;
    }

    private function fetchAndSeedStates(): void
    {
        $countryMap = $this->app['locations.country_map'] ?? [];
        if (empty($countryMap)) {
            $this->warn('No hay mapa de países; generando desde BD.');
            $rows = DB::table('countries')->whereNull('organization_id')->orderBy('id')->get(['id']);
            $i = 1;
            foreach ($rows as $r) {
                $countryMap[$i++] = $r->id;
            }
        }

        $this->info('Descargando states.json...');
        $response = Http::timeout(90)->get(self::STATES_JSON);
        if (!$response->successful()) {
            throw new \RuntimeException('No se pudo descargar states.json: ' . $response->status());
        }
        $states = $response->json();
        if (!is_array($states)) {
            throw new \RuntimeException('states.json no es un array.');
        }

        $now = now()->format('Y-m-d H:i:s');
        $bar = $this->output->createProgressBar(count($states));
        $bar->start();

        $inserted = [];
        foreach ($states as $s) {
            $id = $s['id'] ?? null;
            $countryId = $s['country_id'] ?? null;
            $name = $s['name'] ?? '';
            $code = $s['state_code'] ?? $s['code'] ?? null;
            if ($name === '' || $countryId === null) {
                $bar->advance();
                continue;
            }
            $newCountryId = $countryMap[(int) $countryId] ?? null;
            if ($newCountryId === null) {
                $bar->advance();
                continue;
            }
            $newId = DB::table('states')->insertGetId([
                'organization_id' => null,
                'country_id' => $newCountryId,
                'name' => substr($name, 0, 255),
                'code' => $code ? substr($code, 0, 255) : null,
                'iso2' => $code ? substr($code, 0, 255) : null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            if ($id !== null) {
                $inserted[(int) $id] = $newId;
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
        $this->getOutput()->writeln('States: ' . count($inserted) . ' insertados.');
        $this->app['locations.state_map'] = $inserted;
    }

    private function fetchAndSeedCities(): void
    {
        $stateMap = $this->app['locations.state_map'] ?? [];
        $countryMap = $this->app['locations.country_map'] ?? [];
        if (empty($stateMap)) {
            $this->warn('No hay mapa de estados; cities se omitirán.');
            return;
        }

        $this->info('Descargando cities.json...');
        $response = Http::timeout(120)->get(self::CITIES_JSON);
        if (!$response->successful()) {
            $this->warn('No se pudo descargar cities.json: ' . $response->status() . '. Omitiendo ciudades.');
            return;
        }
        $cities = $response->json();
        if (!is_array($cities)) {
            $this->warn('cities.json no es un array.');
            return;
        }

        $now = now()->format('Y-m-d H:i:s');
        $bar = $this->output->createProgressBar(count($cities));
        $bar->start();

        $chunk = [];
        $chunkSize = 500;
        $count = 0;
        foreach ($cities as $c) {
            $stateId = $c['state_id'] ?? null;
            $countryId = $c['country_id'] ?? null;
            $name = $c['name'] ?? '';
            if ($name === '' || $stateId === null) {
                $bar->advance();
                continue;
            }
            $newStateId = $stateMap[(int) $stateId] ?? null;
            $newCountryId = $countryId !== null ? ($countryMap[(int) $countryId] ?? null) : null;
            if ($newStateId === null || $newCountryId === null) {
                $bar->advance();
                continue;
            }
            $chunk[] = [
                'organization_id' => null,
                'country_id' => $newCountryId,
                'state_id' => $newStateId,
                'name' => substr($name, 0, 255),
                'latitude' => isset($c['latitude']) ? (float) $c['latitude'] : null,
                'longitude' => isset($c['longitude']) ? (float) $c['longitude'] : null,
                'timezone' => $c['timezone'] ?? null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if (count($chunk) >= $chunkSize) {
                DB::table('cities')->insert($chunk);
                $count += count($chunk);
                $chunk = [];
            }
            $bar->advance();
        }
        if (!empty($chunk)) {
            DB::table('cities')->insert($chunk);
            $count += count($chunk);
        }
        $bar->finish();
        $this->newLine();
        $this->getOutput()->writeln('Cities: ' . $count . ' insertados.');
    }
}
