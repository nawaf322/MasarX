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
use Illuminate\Support\Facades\Schema;

/**
 * Importa countries, states y cities desde los SQL de ejemplo en database/demo.
 * Los archivos esperados: "countries (2).sql", "states (1).sql", "cities.sql.gz".
 * Crea tablas temporales _import con la estructura del dump, carga los INSERT,
 * copia a las tablas reales con mapeo de IDs y elimina las temporales.
 */
class ImportLocationsFromDemo extends Command
{
    protected $signature = 'locations:import-from-demo
                            {--force : Ejecutar sin confirmación}
                            {--step= : Solo ejecutar un paso: cities-load (carga cities en proceso aparte)}';

    protected $description = 'Poblar countries, states y cities desde database/demo (SQL de ejemplo)';

    private string $demoPath;

    public function __construct()
    {
        parent::__construct();
        $this->demoPath = base_path('database/demo');
    }

    public function handle(): int
    {
        $memory = $this->option('step') === 'cities-load' ? '512M' : '768M';
        @ini_set('memory_limit', $memory);
        if (!is_dir($this->demoPath)) {
            $this->error('No existe el directorio database/demo.');
            return self::FAILURE;
        }

        $countriesFile = $this->demoPath . '/countries (2).sql';
        $statesFile = $this->demoPath . '/states (1).sql';
        $citiesFile = file_exists($this->demoPath . '/cities.sql.gz')
            ? $this->demoPath . '/cities.sql.gz'
            : $this->demoPath . '/cities.sql';

        if (!file_exists($countriesFile)) {
            $this->error('No encontrado: database/demo/countries (2).sql');
            return self::FAILURE;
        }
        if (!file_exists($statesFile)) {
            $this->error('No encontrado: database/demo/states (1).sql');
            return self::FAILURE;
        }
        if (!file_exists($citiesFile)) {
            $this->error('No encontrado: database/demo/cities.sql ni cities.sql.gz');
            return self::FAILURE;
        }

        if ($this->option('step') === 'cities-load') {
            $this->createCitiesImportTableOnly();
            $this->loadCitiesImport($citiesFile);
            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm('¿Importar locations desde demo? Se vaciarán y repoblarán countries, states y cities.')) {
            return self::FAILURE;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            $this->nullLocationReferences();
            $this->truncateLocationTables();
            $this->createImportTables();
            $this->loadCountriesImport($countriesFile);
            $countryMap = $this->copyCountriesFromImport();
            $this->loadStatesImport($statesFile);
            $stateMap = $this->copyStatesFromImport($countryMap);
            $this->loadCitiesImport($citiesFile);
            $this->copyCitiesFromImport($countryMap, $stateMap);
        } finally {
            $this->dropImportTables();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        $this->info('Importación desde demo completada.');
        return self::SUCCESS;
    }

    private function nullLocationReferences(): void
    {
        if (Schema::hasTable('users')) {
            DB::table('users')->update(['country_id' => null, 'state_id' => null, 'city_id' => null]);
        }
        if (Schema::hasTable('organizations')) {
            $cols = ['country_id', 'state_id', 'city_id'];
            if (Schema::hasColumn('organizations', 'country_id')) {
                DB::table('organizations')->update(array_combine($cols, [null, null, null]));
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
        $this->info('Tablas countries, states y cities vaciadas.');
    }

    /** Solo crea la tabla cities_import (para el paso --step=cities-load). */
    private function createCitiesImportTableOnly(): void
    {
        Schema::dropIfExists('cities_import');
        DB::statement("
            CREATE TABLE cities_import (
                id mediumint unsigned NOT NULL AUTO_INCREMENT,
                name varchar(255) NOT NULL,
                state_id mediumint unsigned NOT NULL,
                state_code varchar(255) NOT NULL,
                country_id mediumint unsigned NOT NULL,
                country_code char(2) NOT NULL,
                type varchar(191) DEFAULT NULL,
                level int DEFAULT NULL,
                parent_id int unsigned DEFAULT NULL,
                latitude decimal(10,8) NOT NULL DEFAULT 0,
                longitude decimal(11,8) NOT NULL DEFAULT 0,
                native varchar(255) DEFAULT NULL,
                population bigint unsigned DEFAULT NULL,
                timezone varchar(255) DEFAULT NULL,
                translations text,
                created_at timestamp NOT NULL DEFAULT '2014-01-01 12:01:01',
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                flag tinyint(1) NOT NULL DEFAULT 1,
                wikiDataId varchar(255) DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    private function createImportTables(): void
    {
        $this->info('Creando tablas temporales _import...');
        Schema::dropIfExists('cities_import');
        Schema::dropIfExists('states_import');
        Schema::dropIfExists('countries_import');

        // Estructura del dump countries (world database)
        DB::statement("
            CREATE TABLE countries_import (
                id mediumint unsigned NOT NULL AUTO_INCREMENT,
                name varchar(100) NOT NULL,
                iso3 char(3) DEFAULT NULL,
                numeric_code char(3) DEFAULT NULL,
                iso2 char(2) DEFAULT NULL,
                phonecode varchar(255) DEFAULT NULL,
                capital varchar(255) DEFAULT NULL,
                currency varchar(255) DEFAULT NULL,
                currency_name varchar(255) DEFAULT NULL,
                currency_symbol varchar(255) DEFAULT NULL,
                tld varchar(255) DEFAULT NULL,
                native varchar(255) DEFAULT NULL,
                population bigint unsigned DEFAULT NULL,
                gdp bigint unsigned DEFAULT NULL,
                region varchar(255) DEFAULT NULL,
                region_id mediumint unsigned DEFAULT NULL,
                subregion varchar(255) DEFAULT NULL,
                subregion_id mediumint unsigned DEFAULT NULL,
                nationality varchar(255) DEFAULT NULL,
                area_sq_km double DEFAULT NULL,
                postal_code_format varchar(255) DEFAULT NULL,
                postal_code_regex varchar(255) DEFAULT NULL,
                timezones text,
                translations text,
                latitude decimal(10,8) DEFAULT NULL,
                longitude decimal(11,8) DEFAULT NULL,
                emoji varchar(191) DEFAULT NULL,
                emojiU varchar(191) DEFAULT NULL,
                created_at timestamp NULL DEFAULT NULL,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                flag tinyint(1) NOT NULL DEFAULT 1,
                wikiDataId varchar(255) DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Estructura del dump states
        DB::statement("
            CREATE TABLE states_import (
                id mediumint unsigned NOT NULL AUTO_INCREMENT,
                name varchar(255) NOT NULL,
                country_id mediumint unsigned NOT NULL,
                country_code char(2) NOT NULL,
                fips_code varchar(255) DEFAULT NULL,
                iso2 varchar(255) DEFAULT NULL,
                iso3166_2 varchar(10) DEFAULT NULL,
                type varchar(191) DEFAULT NULL,
                level int DEFAULT NULL,
                parent_id int unsigned DEFAULT NULL,
                native varchar(255) DEFAULT NULL,
                latitude decimal(10,8) DEFAULT NULL,
                longitude decimal(11,8) DEFAULT NULL,
                timezone varchar(255) DEFAULT NULL,
                translations text,
                created_at timestamp NULL DEFAULT NULL,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                flag tinyint(1) NOT NULL DEFAULT 1,
                wikiDataId varchar(255) DEFAULT NULL,
                population varchar(255) DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Estructura del dump cities
        DB::statement("
            CREATE TABLE cities_import (
                id mediumint unsigned NOT NULL AUTO_INCREMENT,
                name varchar(255) NOT NULL,
                state_id mediumint unsigned NOT NULL,
                state_code varchar(255) NOT NULL,
                country_id mediumint unsigned NOT NULL,
                country_code char(2) NOT NULL,
                type varchar(191) DEFAULT NULL,
                level int DEFAULT NULL,
                parent_id int unsigned DEFAULT NULL,
                latitude decimal(10,8) NOT NULL DEFAULT 0,
                longitude decimal(11,8) NOT NULL DEFAULT 0,
                native varchar(255) DEFAULT NULL,
                population bigint unsigned DEFAULT NULL,
                timezone varchar(255) DEFAULT NULL,
                translations text,
                created_at timestamp NOT NULL DEFAULT '2014-01-01 12:01:01',
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                flag tinyint(1) NOT NULL DEFAULT 1,
                wikiDataId varchar(255) DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    private function loadCountriesImport(string $file): void
    {
        $this->info('Cargando countries desde demo...');
        $lines = file($file, FILE_IGNORE_NEW_LINES);
        $done = false;
        foreach ($lines as $line) {
            if (stripos($line, 'INSERT INTO `countries`') === false) {
                continue;
            }
            $sql = str_replace('INSERT INTO `countries`', 'INSERT INTO `countries_import`', trim($line));
            DB::unprepared($sql);
            $done = true;
            break;
        }
        if (!$done) {
            throw new \RuntimeException('No se encontró INSERT INTO countries en el archivo.');
        }
        $this->info('Countries import: ' . DB::table('countries_import')->count() . ' filas.');
    }

    private function copyCountriesFromImport(): array
    {
        $this->info('Copiando countries_import -> countries...');
        $rows = DB::table('countries_import')->orderBy('id')->get();
        $now = now()->format('Y-m-d H:i:s');
        $map = [];
        $bar = $this->output->createProgressBar($rows->count());
        $bar->start();
        foreach ($rows as $r) {
            $iso2 = $r->iso2 ?? '';
            if ($iso2 === '') {
                $bar->advance();
                continue;
            }
            $newId = DB::table('countries')->insertGetId([
                'organization_id' => null,
                'name' => $r->name,
                'iso2' => substr($iso2, 0, 2),
                'iso3' => $r->iso3 ? substr($r->iso3, 0, 3) : null,
                'phone_code' => $r->phonecode ? preg_replace('/[^0-9+]/', '', $r->phonecode) ?: $r->phonecode : null,
                'currency' => $r->currency ? substr($r->currency, 0, 255) : null,
                'region' => $r->region ? substr($r->region, 0, 255) : null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $map[(int) $r->id] = $newId;
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
        $this->info('Countries: ' . count($map) . ' insertados.');
        return $map;
    }

    private function loadStatesImport(string $file): void
    {
        $this->info('Cargando states desde demo...');
        $lines = file($file, FILE_IGNORE_NEW_LINES);
        $done = 0;
        foreach ($lines as $line) {
            if (stripos($line, 'INSERT INTO `states`') === false) {
                continue;
            }
            $sql = str_replace('INSERT INTO `states`', 'INSERT INTO `states_import`', trim($line));
            DB::unprepared($sql);
            $done++;
        }
        $this->info('States import: ' . DB::table('states_import')->count() . ' filas.');
    }

    private function copyStatesFromImport(array $countryMap): array
    {
        $this->info('Copiando states_import -> states...');
        $rows = DB::table('states_import')->orderBy('id')->get();
        $now = now()->format('Y-m-d H:i:s');
        $map = [];
        $bar = $this->output->createProgressBar($rows->count());
        $bar->start();
        foreach ($rows as $r) {
            $newCountryId = $countryMap[(int) $r->country_id] ?? null;
            if ($newCountryId === null) {
                $bar->advance();
                continue;
            }
            $newId = DB::table('states')->insertGetId([
                'organization_id' => null,
                'country_id' => $newCountryId,
                'name' => substr($r->name, 0, 255),
                'code' => $r->iso2 ? substr($r->iso2, 0, 255) : ($r->iso3166_2 ? substr($r->iso3166_2, 0, 255) : null),
                'iso2' => $r->iso2 ? substr($r->iso2, 0, 255) : null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $map[(int) $r->id] = $newId;
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
        $this->info('States: ' . count($map) . ' insertados.');
        return $map;
    }

    private function loadCitiesImport(string $file): void
    {
        $this->info('Cargando cities desde demo (puede tardar varios minutos)...');
        $isGz = str_ends_with(strtolower($file), '.gz');
        $tmpSql = storage_path('app/cities_demo_import.sql');
        $copyCmd = $isGz
            ? sprintf('gunzip -c %s | grep "INSERT INTO" | sed "s/INSERT INTO \`cities\`/INSERT INTO \`cities_import\`/" > %s', escapeshellarg($file), escapeshellarg($tmpSql))
            : sprintf('grep "INSERT INTO" %s | sed "s/INSERT INTO \`cities\`/INSERT INTO \`cities_import\`/" > %s', escapeshellarg($file), escapeshellarg($tmpSql));
        exec($copyCmd);
        $n = 0;
        if (is_file($tmpSql) && filesize($tmpSql) > 0) {
            $n = $this->streamInsertCitiesChunked($tmpSql);
            @unlink($tmpSql);
        }
        $this->info('Cities import: ' . $n . ' filas.');
    }

    /** Ejecuta el INSERT de cities por trozos para no cargar 111MB en memoria. */
    private function streamInsertCitiesChunked(string $tmpSql): int
    {
        $fp = fopen($tmpSql, 'r');
        if (!$fp) {
            return 0;
        }
        $chunkSize = 3000;
        $buffer = '';
        $total = 0;
        $header = "INSERT INTO `cities_import` VALUES ";
        $readHeader = true;
        $rows = [];
        $start = 0;
        $search = '),(';
        $searchLen = 3;
        $nextRowStart = 2;
        while (!feof($fp)) {
            $chunk = fread($fp, 1024 * 1024);
            if ($chunk === false || $chunk === '') {
                break;
            }
            $buffer .= $chunk;
            if ($readHeader) {
                if (strpos($buffer, 'VALUES ') !== false) {
                    $p = strpos($buffer, 'VALUES ') + 7;
                    $buffer = substr($buffer, $p);
                    $readHeader = false;
                } else {
                    continue;
                }
            }
            $pos = 0;
            while (($pos = strpos($buffer, $search, $pos)) !== false) {
                $row = substr($buffer, $start, $pos - $start + 1);
                if ($this->rowIsOutsideQuotedString($buffer, $start, $pos)) {
                    $rows[] = $row;
                    $start = $pos + $nextRowStart;
                    if (count($rows) >= $chunkSize) {
                        DB::unprepared($header . implode(',', $rows));
                        $total += count($rows);
                        $rows = [];
                        $buffer = substr($buffer, $start);
                        $pos = 0;
                        $start = 0;
                    }
                }
                $pos += $searchLen;
            }
            $buffer = $start > 0 ? substr($buffer, $start) : $buffer;
            $start = 0;
        }
        if (!empty($rows)) {
            DB::unprepared($header . implode(',', $rows));
            $total += count($rows);
        }
        fclose($fp);
        return $total;
    }

    /** Comprueba si la posición "),(" está fuera de una cadena entre comillas simples (MySQL escapa '' como ''). */
    private function rowIsOutsideQuotedString(string $buf, int $from, int $to): bool
    {
        $inside = false;
        $i = $from;
        $len = min($to, strlen($buf));
        while ($i < $len) {
            $c = $buf[$i];
            if ($c === "'") {
                if ($i + 1 < $len && $buf[$i + 1] === "'") {
                    $i += 2;
                    continue;
                }
                $inside = !$inside;
            }
            $i++;
        }
        return !$inside;
    }

    private function copyCitiesFromImport(array $countryMap, array $stateMap): void
    {
        $this->info('Copiando cities_import -> cities...');
        $now = now()->format('Y-m-d H:i:s');
        $chunkSize = 500;
        $chunk = [];
        $count = 0;
        $bar = $this->output->createProgressBar(DB::table('cities_import')->count());
        $bar->start();
        DB::table('cities_import')->orderBy('id')->chunk($chunkSize, function ($rows) use ($countryMap, $stateMap, $now, &$chunk, &$count, $chunkSize, $bar) {
            foreach ($rows as $r) {
                $newStateId = $stateMap[(int) $r->state_id] ?? null;
                $newCountryId = $countryMap[(int) $r->country_id] ?? null;
                if ($newStateId === null || $newCountryId === null) {
                    $bar->advance();
                    continue;
                }
                $chunk[] = [
                    'organization_id' => null,
                    'country_id' => $newCountryId,
                    'state_id' => $newStateId,
                    'name' => substr($r->name, 0, 255),
                    'latitude' => isset($r->latitude) ? (float) $r->latitude : null,
                    'longitude' => isset($r->longitude) ? (float) $r->longitude : null,
                    'timezone' => $r->timezone ? substr($r->timezone, 0, 255) : null,
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
        });
        if (!empty($chunk)) {
            DB::table('cities')->insert($chunk);
            $count += count($chunk);
        }
        $bar->finish();
        $this->newLine();
        $this->info('Cities: ' . $count . ' insertados.');
    }

    private function dropImportTables(): void
    {
        $this->info('Eliminando tablas temporales...');
        Schema::dropIfExists('cities_import');
        Schema::dropIfExists('states_import');
        Schema::dropIfExists('countries_import');
    }
}
