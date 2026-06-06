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

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LocationsSeeder extends Seeder
{
    public function run(): void
    {
        // Only truncate if ALL location tables are empty (safety guard: never destroy existing data)
        $hasCountries = DB::table('countries')->count() > 0;
        if ($hasCountries) {
            $this->command->info('📍 Países ya existen, omitiendo truncate para preservar datos.');
            return;
        }
        $this->command->info('📍 Tablas vacías, poblando países, estados y ciudades...');
        Schema::disableForeignKeyConstraints();
        DB::table('cities')->truncate();
        DB::table('states')->truncate();
        DB::table('countries')->truncate();
        Schema::enableForeignKeyConstraints();
        $this->command->info('   ✓ Tablas vaciadas para repoblado inicial.');

        $this->command->info('📍 Poblando países, estados y ciudades...');

        $now = now()->toDateTimeString();
        $global = ['organization_id' => null, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now];

        // --- PAÍSES ---
        $countries = [
            ['name' => 'Colombia', 'iso2' => 'CO', 'iso3' => 'COL', 'phone_code' => '57', 'currency' => 'COP', 'region' => 'Americas'],
            ['name' => 'Estados Unidos', 'iso2' => 'US', 'iso3' => 'USA', 'phone_code' => '1', 'currency' => 'USD', 'region' => 'Americas'],
            ['name' => 'México', 'iso2' => 'MX', 'iso3' => 'MEX', 'phone_code' => '52', 'currency' => 'MXN', 'region' => 'Americas'],
            ['name' => 'España', 'iso2' => 'ES', 'iso3' => 'ESP', 'phone_code' => '34', 'currency' => 'EUR', 'region' => 'Europe'],
            ['name' => 'Argentina', 'iso2' => 'AR', 'iso3' => 'ARG', 'phone_code' => '54', 'currency' => 'ARS', 'region' => 'Americas'],
            ['name' => 'Chile', 'iso2' => 'CL', 'iso3' => 'CHL', 'phone_code' => '56', 'currency' => 'CLP', 'region' => 'Americas'],
            ['name' => 'Perú', 'iso2' => 'PE', 'iso3' => 'PER', 'phone_code' => '51', 'currency' => 'PEN', 'region' => 'Americas'],
            ['name' => 'Ecuador', 'iso2' => 'EC', 'iso3' => 'ECU', 'phone_code' => '593', 'currency' => 'USD', 'region' => 'Americas'],
            ['name' => 'Panamá', 'iso2' => 'PA', 'iso3' => 'PAN', 'phone_code' => '507', 'currency' => 'PAB', 'region' => 'Americas'],
            ['name' => 'Costa Rica', 'iso2' => 'CR', 'iso3' => 'CRI', 'phone_code' => '506', 'currency' => 'CRC', 'region' => 'Americas'],
        ];

        foreach ($countries as $c) {
            DB::table('countries')->insert(array_merge($c, $global));
        }
        $countryIds = DB::table('countries')->pluck('id', 'iso2')->all();
        $this->command->info('   ✓ ' . count($countryIds) . ' países importados.');

        // --- ESTADOS (por país) ---
        $states = [
            'CO' => [
                ['name' => 'Antioquia', 'code' => 'ANT', 'iso2' => 'ANT'],
                ['name' => 'Cundinamarca', 'code' => 'CUN', 'iso2' => 'CUN'],
                ['name' => 'Valle del Cauca', 'code' => 'VAC', 'iso2' => 'VAC'],
                ['name' => 'Bogotá D.C.', 'code' => 'DC', 'iso2' => 'DC'],
                ['name' => 'Santander', 'code' => 'SAN', 'iso2' => 'SAN'],
                ['name' => 'Atlántico', 'code' => 'ATL', 'iso2' => 'ATL'],
                ['name' => 'Bolívar', 'code' => 'BOL', 'iso2' => 'BOL'],
                ['name' => 'Nariño', 'code' => 'NAR', 'iso2' => 'NAR'],
            ],
            'US' => [
                ['name' => 'California', 'code' => 'CA', 'iso2' => 'CA'],
                ['name' => 'Florida', 'code' => 'FL', 'iso2' => 'FL'],
                ['name' => 'New York', 'code' => 'NY', 'iso2' => 'NY'],
                ['name' => 'Texas', 'code' => 'TX', 'iso2' => 'TX'],
                ['name' => 'Illinois', 'code' => 'IL', 'iso2' => 'IL'],
            ],
            'MX' => [
                ['name' => 'Ciudad de México', 'code' => 'CDMX', 'iso2' => 'CDMX'],
                ['name' => 'Jalisco', 'code' => 'JAL', 'iso2' => 'JAL'],
                ['name' => 'Nuevo León', 'code' => 'NL', 'iso2' => 'NL'],
                ['name' => 'Estado de México', 'code' => 'MEX', 'iso2' => 'MEX'],
                ['name' => 'Quintana Roo', 'code' => 'QR', 'iso2' => 'QR'],
            ],
            'ES' => [
                ['name' => 'Madrid', 'code' => 'MD', 'iso2' => 'MD'],
                ['name' => 'Cataluña', 'code' => 'CT', 'iso2' => 'CT'],
                ['name' => 'Andalucía', 'code' => 'AN', 'iso2' => 'AN'],
                ['name' => 'Comunidad Valenciana', 'code' => 'VC', 'iso2' => 'VC'],
            ],
            'AR' => [
                ['name' => 'Buenos Aires', 'code' => 'BA', 'iso2' => 'BA'],
                ['name' => 'Córdoba', 'code' => 'CB', 'iso2' => 'CB'],
                ['name' => 'Santa Fe', 'code' => 'SF', 'iso2' => 'SF'],
            ],
            'CL' => [
                ['name' => 'Metropolitana de Santiago', 'code' => 'RM', 'iso2' => 'RM'],
                ['name' => 'Valparaíso', 'code' => 'VS', 'iso2' => 'VS'],
            ],
            'PE' => [
                ['name' => 'Lima', 'code' => 'LIM', 'iso2' => 'LIM'],
                ['name' => 'Arequipa', 'code' => 'ARE', 'iso2' => 'ARE'],
            ],
            'EC' => [
                ['name' => 'Pichincha', 'code' => 'P', 'iso2' => 'P'],
                ['name' => 'Guayas', 'code' => 'G', 'iso2' => 'G'],
            ],
            'PA' => [
                ['name' => 'Panamá', 'code' => 'PA', 'iso2' => 'PA'],
                ['name' => 'Colón', 'code' => 'COL', 'iso2' => 'COL'],
            ],
            'CR' => [
                ['name' => 'San José', 'code' => 'SJ', 'iso2' => 'SJ'],
                ['name' => 'Alajuela', 'code' => 'AL', 'iso2' => 'AL'],
            ],
        ];

        $stateIds = [];
        foreach ($states as $iso2 => $list) {
            $countryId = $countryIds[$iso2] ?? null;
            if (!$countryId) continue;
            foreach ($list as $s) {
                $id = DB::table('states')->insertGetId(array_merge([
                    'country_id' => $countryId,
                    'name' => $s['name'],
                    'code' => $s['code'],
                    'iso2' => $s['iso2'],
                ], $global));
                $stateIds[$iso2 . '|' . $s['iso2']] = $id;
            }
        }
        $totalStates = DB::table('states')->count();
        $this->command->info('   ✓ ' . $totalStates . ' estados importados.');

        // --- CIUDADES (por estado) ---
        $citiesByState = [
            'CO|ANT' => ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Rionegro'],
            'CO|CUN' => ['Bogotá', 'Soacha', 'Chía', 'Zipaquirá', 'Facatativá'],
            'CO|VAC' => ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago'],
            'CO|DC' => ['Bogotá'],
            'CO|SAN' => ['Bucaramanga', 'Floridablanca', 'Piedecuesta', 'Barrancabermeja'],
            'CO|ATL' => ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga'],
            'CO|BOL' => ['Cartagena', 'Sincelejo', 'Magangué', 'Turbaco'],
            'CO|NAR' => ['Pasto', 'Ipiales', 'Tumaco', 'Túquerres'],
            'US|CA' => ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
            'US|FL' => ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
            'US|NY' => ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
            'US|TX' => ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Fort Worth'],
            'US|IL' => ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford'],
            'MX|CDMX' => ['Ciudad de México', 'Iztapalapa', 'Gustavo A. Madero', 'Coyoacán', 'Tlalpan'],
            'MX|JAL' => ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta'],
            'MX|NL' => ['Monterrey', 'Guadalupe', 'San Nicolás', 'Apodaca', 'Santa Catarina'],
            'MX|MEX' => ['Ecatepec', 'Nezahualcóyotl', 'Toluca', 'Naucalpan', 'Tlalnepantla'],
            'MX|QR' => ['Cancún', 'Playa del Carmen', 'Chetumal', 'Cozumel', 'Tulum'],
            'ES|MD' => ['Madrid', 'Alcalá de Henares', 'Getafe', 'Leganés', 'Móstoles'],
            'ES|CT' => ['Barcelona', 'L\'Hospitalet', 'Badalona', 'Sabadell', 'Terrassa'],
            'ES|AN' => ['Sevilla', 'Málaga', 'Córdoba', 'Granada', 'Cádiz'],
            'ES|VC' => ['Valencia', 'Alicante', 'Elche', 'Castellón de la Plana'],
            'AR|BA' => ['Buenos Aires', 'La Plata', 'Mar del Plata', 'Bahía Blanca', 'Quilmes'],
            'AR|CB' => ['Córdoba', 'Villa María', 'Río Cuarto', 'Alta Gracia'],
            'AR|SF' => ['Santa Fe', 'Rosario', 'Rafaela', 'Venado Tuerto'],
            'CL|RM' => ['Santiago', 'Puente Alto', 'Maipú', 'La Florida', 'Las Condes'],
            'CL|VS' => ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana'],
            'PE|LIM' => ['Lima', 'Callao', 'Ate', 'Comas', 'San Juan de Lurigancho'],
            'PE|ARE' => ['Arequipa', 'Camaná', 'Mollendo', 'Chivay'],
            'EC|P' => ['Quito', 'Cayambe', 'Machachi', 'Sangolquí'],
            'EC|G' => ['Guayaquil', 'Durán', 'Milagro', 'Samborondón'],
            'PA|PA' => ['Ciudad de Panamá', 'San Miguelito', 'Arraiján', 'La Chorrera', 'Colón'],
            'PA|COL' => ['Colón', 'Puerto Colón', 'Chagres'],
            'CR|SJ' => ['San José', 'Desamparados', 'Alajuelita', 'Tibás', 'Goicoechea'],
            'CR|AL' => ['Alajuela', 'San José de Alajuela', 'San Ramón', 'Grecia', 'Poás'],
        ];

        $totalCities = 0;
        foreach ($citiesByState as $key => $cityNames) {
            $stateId = $stateIds[$key] ?? null;
            if (!$stateId) continue;
            $countryId = DB::table('states')->where('id', $stateId)->value('country_id');
            foreach ($cityNames as $name) {
                DB::table('cities')->insert(array_merge([
                    'country_id' => $countryId,
                    'state_id' => $stateId,
                    'name' => $name,
                    'latitude' => null,
                    'longitude' => null,
                    'timezone' => null,
                ], $global));
                $totalCities++;
            }
        }
        $this->command->info('   ✓ ' . $totalCities . ' ciudades importadas.');

        $this->command->newLine();
        $this->command->info('✅ Países, estados y ciudades listos.');
    }
}
