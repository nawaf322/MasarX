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

class SaudiLocationsSeeder extends Seeder
{
    /**
     * Seeds Saudi Arabia, its 13 administrative regions (states) and major cities.
     *
     * IMPORTANT — Arabic names:
     * The schema (countries/states/cities migrations) has NO dedicated Arabic
     * column (no `name_ar`, no translations table, no json). To avoid losing the
     * Arabic name it is stored together with the English name inside the existing
     * `name` column using the bilingual format "English / العربية".
     *
     * Columns actually used per table (verified against the migrations):
     *   - countries: name, iso2, iso3, phone_code, currency, region, is_active, organization_id, timestamps
     *   - states:    country_id, name, iso2, is_active, organization_id, timestamps
     *   - cities:    country_id, state_id, name, is_active, organization_id, timestamps
     *
     * Note: the State model lists a `code` attribute in $fillable but the states
     * migration does NOT create that column, so it is intentionally omitted here.
     *
     * Idempotent: uses updateOrCreate so re-running will not duplicate rows.
     */
    public function run(): void
    {
        $this->command->info('🇸🇦 Poblando Arabia Saudita: país, regiones y ciudades...');

        $now = now()->toDateTimeString();

        // --- COUNTRY ---
        $country = DB::table('countries')->where('iso2', 'SA')->first();
        if ($country) {
            DB::table('countries')->where('id', $country->id)->update([
                'name'       => 'Saudi Arabia / المملكة العربية السعودية',
                'iso3'       => 'SAU',
                'phone_code' => '966',
                'currency'   => 'SAR',
                'region'     => 'Asia',
                'is_active'  => true,
                'updated_at' => $now,
            ]);
            $countryId = $country->id;
        } else {
            $countryId = DB::table('countries')->insertGetId([
                'name'            => 'Saudi Arabia / المملكة العربية السعودية',
                'iso2'            => 'SA',
                'iso3'            => 'SAU',
                'phone_code'      => '966',
                'currency'        => 'SAR',
                'region'          => 'Asia',
                'is_active'       => true,
                'organization_id' => null,
                'created_at'      => $now,
                'updated_at'      => $now,
            ]);
        }
        $this->command->info('   ✓ País Arabia Saudita listo (id ' . $countryId . ').');

        // --- STATES (13 administrative regions) ---
        // [ iso2 code, English name, Arabic name ]
        $regions = [
            ['RD', 'Riyadh', 'الرياض'],
            ['MK', 'Makkah', 'مكة المكرمة'],
            ['MD', 'Madinah', 'المدينة المنورة'],
            ['EP', 'Eastern Province', 'المنطقة الشرقية'],
            ['AS', 'Asir', 'عسير'],
            ['TB', 'Tabuk', 'تبوك'],
            ['QS', 'Qassim', 'القصيم'],
            ['HL', 'Hail', 'حائل'],
            ['NB', 'Northern Borders', 'الحدود الشمالية'],
            ['JZ', 'Jazan', 'جازان'],
            ['NJ', 'Najran', 'نجران'],
            ['BH', 'Al Bahah', 'الباحة'],
            ['JF', 'Al Jawf', 'الجوف'],
        ];

        $stateIds = [];
        foreach ($regions as [$iso2, $en, $ar]) {
            $state = DB::table('states')
                ->where('country_id', $countryId)
                ->where('iso2', $iso2)
                ->first();

            $attributes = [
                'name'       => $en . ' / ' . $ar,
                'is_active'  => true,
                'updated_at' => $now,
            ];

            if ($state) {
                DB::table('states')->where('id', $state->id)->update($attributes);
                $stateIds[$iso2] = $state->id;
            } else {
                $stateIds[$iso2] = DB::table('states')->insertGetId(array_merge($attributes, [
                    'country_id'      => $countryId,
                    'iso2'            => $iso2,
                    'organization_id' => null,
                    'created_at'      => $now,
                ]));
            }
        }
        $this->command->info('   ✓ ' . count($stateIds) . ' regiones (estados) listas.');

        // --- CITIES (by region iso2) ---
        // [ English, Arabic ] grouped by region code.
        $citiesByRegion = [
            'RD' => [
                ['Riyadh', 'الرياض'],
                ['Al Kharj', 'الخرج'],
                ['Al Majmaah', 'المجمعة'],
                ['Dawadmi', 'الدوادمي'],
            ],
            'MK' => [
                ['Makkah', 'مكة المكرمة'],
                ['Jeddah', 'جدة'],
                ['Taif', 'الطائف'],
                ['Rabigh', 'رابغ'],
            ],
            'MD' => [
                ['Madinah', 'المدينة المنورة'],
                ['Yanbu', 'ينبع'],
                ['Badr', 'بدر'],
            ],
            'EP' => [
                ['Dammam', 'الدمام'],
                ['Khobar', 'الخبر'],
                ['Dhahran', 'الظهران'],
                ['Jubail', 'الجبيل'],
                ['Al Ahsa', 'الأحساء'],
                ['Hafr Al Batin', 'حفر الباطن'],
                ['Qatif', 'القطيف'],
            ],
            'AS' => [
                ['Abha', 'أبها'],
                ['Khamis Mushait', 'خميس مشيط'],
                ['Bisha', 'بيشة'],
            ],
            'TB' => [
                ['Tabuk', 'تبوك'],
                ['Duba', 'ضباء'],
            ],
            'QS' => [
                ['Buraidah', 'بريدة'],
                ['Unaizah', 'عنيزة'],
                ['Al Rass', 'الرس'],
            ],
            'HL' => [
                ['Hail', 'حائل'],
            ],
            'NB' => [
                ['Arar', 'عرعر'],
                ['Rafha', 'رفحاء'],
            ],
            'JZ' => [
                ['Jazan', 'جازان'],
                ['Sabya', 'صبيا'],
            ],
            'NJ' => [
                ['Najran', 'نجران'],
            ],
            'BH' => [
                ['Al Bahah', 'الباحة'],
            ],
            'JF' => [
                ['Sakaka', 'سكاكا'],
                ['Qurayyat', 'القريات'],
            ],
        ];

        $totalCities = 0;
        foreach ($citiesByRegion as $iso2 => $cities) {
            $stateId = $stateIds[$iso2] ?? null;
            if (!$stateId) {
                continue;
            }
            foreach ($cities as [$en, $ar]) {
                $name = $en . ' / ' . $ar;
                $city = DB::table('cities')
                    ->where('state_id', $stateId)
                    ->where('name', $name)
                    ->first();

                if ($city) {
                    DB::table('cities')->where('id', $city->id)->update([
                        'is_active'  => true,
                        'updated_at' => $now,
                    ]);
                } else {
                    DB::table('cities')->insert([
                        'country_id'      => $countryId,
                        'state_id'        => $stateId,
                        'name'            => $name,
                        'is_active'       => true,
                        'organization_id' => null,
                        'created_at'      => $now,
                        'updated_at'      => $now,
                    ]);
                }
                $totalCities++;
            }
        }
        $this->command->info('   ✓ ' . $totalCities . ' ciudades listas.');

        $this->command->newLine();
        $this->command->info('✅ Arabia Saudita: país, regiones y ciudades sembrados.');
    }
}
