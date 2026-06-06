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
use App\Models\Department;
use App\Models\Organization;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Añade departamentos típicos de empresas courier/logística. Solo inserta los que no existen (firstOrCreate).
     */
    public function run(): void
    {
        $organizations = Organization::all();

        if ($organizations->isEmpty()) {
            return;
        }

        $defaultDepartments = [
            ['name' => 'Operations', 'code' => 'OPS'],
            ['name' => 'Customer Service', 'code' => 'CS'],
            ['name' => 'Sales', 'code' => 'SAL'],
            ['name' => 'Finance', 'code' => 'FIN'],
            ['name' => 'Warehouse', 'code' => 'WH'],
            ['name' => 'Dispatch', 'code' => 'DSP'],
            ['name' => 'Logistics', 'code' => 'LOG'],
            ['name' => 'Human Resources', 'code' => 'HR'],
            ['name' => 'IT', 'code' => 'IT'],
            ['name' => 'Administration', 'code' => 'ADM'],
            ['name' => 'Quality Control', 'code' => 'QC'],
            ['name' => 'Customs', 'code' => 'CUS'],
            ['name' => 'Marketing', 'code' => 'MKT'],
            ['name' => 'Billing', 'code' => 'BILL'],
            ['name' => 'Purchasing', 'code' => 'PUR'],
        ];

        foreach ($organizations as $org) {
            foreach ($defaultDepartments as $d) {
                Department::firstOrCreate(
                    [
                        'organization_id' => $org->id,
                        'name' => $d['name'],
                    ],
                    [
                        'organization_id' => $org->id,
                        'name' => $d['name'],
                        'code' => $d['code'] ?? null,
                        'active' => true,
                    ]
                );
            }
        }

        $this->command->info('Departments seeded successfully for ' . $organizations->count() . ' organization(s).');
    }
}
