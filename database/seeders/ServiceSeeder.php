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
use App\Models\Service;
use App\Models\Organization;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Añade servicios típicos de courier/logística. Solo inserta los que no existen (firstOrCreate).
     */
    public function run(): void
    {
        $organizations = Organization::all();

        if ($organizations->isEmpty()) {
            return;
        }

        $defaultServices = [
            // Air
            ['code' => 'express_air', 'name' => 'Express Air', 'mode' => 'air', 'description' => 'Fast air freight delivery', 'sort_order' => 1],
            ['code' => 'standard_air', 'name' => 'Standard Air', 'mode' => 'air', 'description' => 'Standard air shipping', 'sort_order' => 2],
            ['code' => 'economy_air', 'name' => 'Economy Air', 'mode' => 'air', 'description' => 'Economy air freight', 'sort_order' => 3],
            ['code' => 'next_day_air', 'name' => 'Next Day Air', 'mode' => 'air', 'description' => 'Next business day delivery', 'sort_order' => 4],
            ['code' => 'same_day_air', 'name' => 'Same Day Air', 'mode' => 'air', 'description' => 'Same day air delivery', 'sort_order' => 5],
            ['code' => 'international_air_express', 'name' => 'International Air Express', 'mode' => 'air', 'description' => 'International express air freight', 'sort_order' => 6],
            ['code' => 'domestic_air_freight', 'name' => 'Domestic Air Freight', 'mode' => 'air', 'description' => 'Domestic air cargo', 'sort_order' => 7],
            // Sea
            ['code' => 'ocean_fcl', 'name' => 'Ocean Freight FCL', 'mode' => 'sea', 'description' => 'Full container load', 'sort_order' => 10],
            ['code' => 'ocean_lcl', 'name' => 'Ocean Freight LCL', 'mode' => 'sea', 'description' => 'Less than container load', 'sort_order' => 11],
            ['code' => 'sea_standard', 'name' => 'Sea Freight Standard', 'mode' => 'sea', 'description' => 'Standard ocean shipping', 'sort_order' => 12],
            ['code' => 'sea_express', 'name' => 'Sea Freight Express', 'mode' => 'sea', 'description' => 'Express ocean freight', 'sort_order' => 13],
            ['code' => 'international_sea_cargo', 'name' => 'International Sea Cargo', 'mode' => 'sea', 'description' => 'International ocean cargo', 'sort_order' => 14],
            // Land
            ['code' => 'ground', 'name' => 'Ground Shipping', 'mode' => 'land', 'description' => 'Standard ground delivery', 'sort_order' => 20],
            ['code' => 'express_ground', 'name' => 'Express Ground', 'mode' => 'land', 'description' => 'Express ground shipping', 'sort_order' => 21],
            ['code' => 'same_day', 'name' => 'Same Day Delivery', 'mode' => 'land', 'description' => 'Same day ground delivery', 'sort_order' => 22],
            ['code' => 'local_delivery', 'name' => 'Local Delivery', 'mode' => 'land', 'description' => 'Local area delivery', 'sort_order' => 23],
            ['code' => 'regional_trucking', 'name' => 'Regional Trucking', 'mode' => 'land', 'description' => 'Regional truck freight', 'sort_order' => 24],
            ['code' => 'standard_truck', 'name' => 'Standard Truck', 'mode' => 'land', 'description' => 'Standard trucking service', 'sort_order' => 25],
            ['code' => 'last_mile', 'name' => 'Last Mile', 'mode' => 'land', 'description' => 'Last mile delivery', 'sort_order' => 26],
            ['code' => 'white_glove', 'name' => 'White Glove Delivery', 'mode' => 'land', 'description' => 'Premium delivery with installation', 'sort_order' => 27],
        ];

        foreach ($organizations as $org) {
            foreach ($defaultServices as $s) {
                Service::firstOrCreate(
                    [
                        'organization_id' => $org->id,
                        'code' => $s['code'],
                    ],
                    [
                        'organization_id' => $org->id,
                        'name' => $s['name'],
                        'code' => $s['code'],
                        'mode' => $s['mode'],
                        'description' => $s['description'] ?? null,
                        'sort_order' => $s['sort_order'],
                        'is_active' => true,
                    ]
                );
            }
        }

        $this->command->info('Services seeded successfully for ' . $organizations->count() . ' organization(s).');
    }
}
