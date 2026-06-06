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

use App\Models\City;
use App\Models\Country;
use App\Models\Organization;
use App\Models\State;
use App\Models\User;
use Illuminate\Database\Seeder;

class CustomersSeeder extends Seeder
{
    /**
     * Poblar 6 clientes (Users con rol Customer) en la tabla users.
     */
    public function run(): void
    {
        $org = Organization::first();
        if (! $org) {
            $this->command->warn('No hay organización. Ejecuta DatabaseSeeder primero.');
            return;
        }

        $country = Country::where('iso2', 'US')->first();
        $state = $country ? State::where('country_id', $country->id)->where('code', 'CA')->first() : null;
        $city = $state ? City::where('state_id', $state->id)->first() : null;

        if (! $country || ! $state || ! $city) {
            $this->command->warn('Faltan países/estados/ciudades. Ejecuta LocationsSeeder.');
            return;
        }

        $customers = [
            ['name' => 'Ana García López', 'email' => 'ana.garcia@example.com', 'phone' => '+1 555 101 0001', 'address' => '123 Main St'],
            ['name' => 'Carlos Mendoza Ruiz', 'email' => 'carlos.mendoza@example.com', 'phone' => '+1 555 102 0002', 'address' => '456 Oak Ave'],
            ['name' => 'María Fernández Soto', 'email' => 'maria.fernandez@example.com', 'phone' => '+1 555 103 0003', 'address' => '789 Pine Rd'],
            ['name' => 'Roberto Sánchez Vega', 'email' => 'roberto.sanchez@example.com', 'phone' => '+1 555 104 0004', 'address' => '321 Elm St'],
            ['name' => 'Laura Torres Pérez', 'email' => 'laura.torres@example.com', 'phone' => '+1 555 105 0005', 'address' => '654 Maple Dr'],
            ['name' => 'David Hernández Castro', 'email' => 'david.hernandez@example.com', 'phone' => '+1 555 106 0006', 'address' => '987 Cedar Ln'],
        ];

        $role = \Spatie\Permission\Models\Role::where('name', 'customer')->orWhere('name', 'Customer')->first();
        if (! $role) {
            $this->command->warn('Rol Customer no existe. Ejecuta RolesAndPermissionsSeeder.');
            return;
        }

        foreach ($customers as $data) {
            if (User::where('email', $data['email'])->where('organization_id', $org->id)->exists()) {
                continue;
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'city' => $city->name,
                'country' => $country->name,
                'zip_code' => '90210',
                'country_id' => $country->id,
                'state_id' => $state->id,
                'city_id' => $city->id,
                'password' => bcrypt('password123'),
                'organization_id' => $org->id,
                'is_active' => true,
            ]);

            $user->assignRole($role);
            $this->command->info("   ✓ Cliente creado: {$data['name']}");
        }

        $count = User::role(['customer', 'Customer'])->where('organization_id', $org->id)->count();
        $this->command->info("Total clientes en org {$org->name}: {$count}");
    }
}
