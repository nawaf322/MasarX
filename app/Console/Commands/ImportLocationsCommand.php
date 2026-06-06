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
use App\Models\Country;
use App\Models\State;
use App\Models\City;

class ImportLocationsCommand extends Command
{
    protected $signature = 'locations:import 
                            {--source=csc : Source format (csc, geonames)} 
                            {--path= : Path to the file}
                            {--only= : Comma separated list of entities to import (countries,states,cities)}
                            {--org= : Organization ID to import for (Strict Multi-tenant)}';

    protected $description = 'Import locations from external sources for a specific organization';

    public function handle()
    {
        $source = $this->option('source');
        $path = $this->option('path');
        $orgId = $this->option('org');
        $only = $this->option('only') ? explode(',', $this->option('only')) : ['countries', 'states', 'cities'];

        if (!$orgId) {
            $this->error("Organization ID (--org) is required for strict multi-tenant mode.");
            return 1;
        }

        // Auto-download scenario
        if (!$path && $source === 'csc') {
            $this->info("No path provided. Downloading latest data from dr5hn/countries-states-cities-database...");
            $url = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/main/countries+states+cities.json';
            $path = storage_path('app/locations.json');

            $context = stream_context_create([
                "http" => [
                    "header" => "User-Agent: DeprixaPlus/1.0
"
                ]
            ]);

            $json = file_get_contents($url, false, $context);
            if (!$json) {
                $this->error("Failed to download data from GitHub.");
                return 1;
            }
            file_put_contents($path, $json);
            $this->info("Download complete: $path");
        }

        if (!$path || !file_exists($path)) {
            $this->error("File not found at: $path");
            return 1;
        }

        $this->info("Starting import from $source for Organization ID: $orgId...");

        if ($source === 'csc') {
            $this->importFromCsc($path, $only, $orgId);
        } else {
            $this->error("Source $source not implemented yet.");
        }

        return 0;
    }

    private function importFromCsc($path, $only, $orgId)
    {
        $data = json_decode(file_get_contents($path), true);

        if (!$data) {
            $this->error("Failed to decode JSON");
            return;
        }

        DB::beginTransaction();

        try {
            if (in_array('countries', $only)) {
                $this->importCountries($data, $orgId);
            }

            if (in_array('states', $only)) {
                $this->importStates($data, $orgId);
            }

            if (in_array('cities', $only)) {
                $this->importCities($data, $orgId);
            }

            DB::commit();
            $this->info("Import completed successfully!");
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error: " . $e->getMessage());
        }
    }

    private function importCountries($data, $orgId)
    {
        $this->info("Importing Countries...");
        $bar = $this->output->createProgressBar(count($data));

        // Use strict unique per org
        foreach ($data as $countryData) {
            Country::updateOrCreate(
                [
                    'organization_id' => $orgId,
                    'iso2' => $countryData['iso2'] // Still use ISO2 for matching, but scoped by Org? 
                    // Wait, if name/iso2 is unique PER ORG, we need to match on Org + Iso2
                ],
                [
                    'name' => $countryData['name'],
                    'iso3' => $countryData['iso3'],
                    'phone_code' => $countryData['phonecode'],
                    'currency' => $countryData['currency'],
                    'region' => $countryData['region'],
                    'is_active' => true
                ]
            );
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
    }

    private function importStates($data, $orgId)
    {
        $this->info("Importing States...");
        $statesBatch = [];
        foreach ($data as $countryData) {
            // Find Country for THIS Org
            $country = Country::where('organization_id', $orgId)->where('iso2', $countryData['iso2'])->first();
            if (!$country || empty($countryData['states']))
                continue;

            foreach ($countryData['states'] as $stateData) {
                // Prepare upsert array
                // Unique key: organization_id, country_id, name
                $statesBatch[] = [
                    'organization_id' => $orgId,
                    'country_id' => $country->id,
                    'name' => $stateData['name'],
                    'code' => $stateData['iso2'] ?? null,
                    'is_active' => true
                ];
            }
        }

        $bar = $this->output->createProgressBar(count($statesBatch));
        foreach (array_chunk($statesBatch, 500) as $chunk) {
            // Upsert using the new composite unique constraint
            State::upsert($chunk, ['organization_id', 'country_id', 'name'], ['code', 'is_active']);
            $bar->advance(count($chunk));
        }
        $bar->finish();
        $this->newLine();
    }

    private function importCities($data, $orgId)
    {
        $this->info("Importing Cities...");
        foreach ($data as $countryData) {
            // Find Country for THIS Org
            $country = Country::where('organization_id', $orgId)->where('iso2', $countryData['iso2'])->first();
            if (!$country || empty($countryData['states']))
                continue;

            foreach ($countryData['states'] as $stateData) {
                // Find State for THIS Org
                $state = State::where('organization_id', $orgId)
                    ->where('country_id', $country->id)
                    ->where('name', $stateData['name'])
                    ->first();

                if (!$state || empty($stateData['cities']))
                    continue;

                $citiesBatch = [];
                foreach ($stateData['cities'] as $cityData) {
                    $citiesBatch[] = [
                        'organization_id' => $orgId,
                        'state_id' => $state->id,
                        'country_id' => $country->id,
                        'name' => $cityData['name'],
                        'latitude' => $cityData['latitude'] ?? null,
                        'longitude' => $cityData['longitude'] ?? null,
                        'is_active' => true,
                    ];
                }

                if (!empty($citiesBatch)) {
                    // Unique constraint: organization_id, state_id, name
                    City::upsert($citiesBatch, ['organization_id', 'state_id', 'name'], ['latitude', 'longitude']);
                }
            }
        }
        $this->info("Cities imported.");
    }
}
