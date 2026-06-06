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

use App\Models\User;
use App\Models\Organization;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        require_once __DIR__ . '/LocationsSeeder.php';

        $this->call([
            RolesAndPermissionsSeeder::class,
            LocationsSeeder::class,
            SaudiLocationsSeeder::class,
            CurrenciesSeeder::class,
        ]);

        // Crear organización por defecto y asignarla al admin (evita organization_id null)
        $org = Organization::firstOrCreate(
            ['slug' => 'deprixa-global'],
            ['name' => 'Deprixa Global', 'primary_color' => '#E5325A', 'is_active' => true, 'settings' => []]
        );

        $this->call([RatesSeeder::class]);

        // Solo crear usuario de prueba en ambientes de desarrollo
        // En producción, los usuarios deben crearse desde Settings > Users
        if (app()->environment(['local', 'development', 'testing'])) {
            $testPassword = env('TEST_USER_PASSWORD', 'Deprixa2026!');
            $existing = \App\Models\User::where('email', 'admin@deprixa.com')->first();
            if (!$existing) {
                $user = \App\Models\User::factory()->create([
                    'name' => 'Deprixa Admin',
                    'email' => 'admin@deprixa.com',
                    'password' => bcrypt($testPassword),
                    'organization_id' => $org->id,
                    'must_change_password' => false,
                ]);
                $user->assignRole('super-admin');
                $this->command->info("Admin user created: admin@deprixa.com / password: {$testPassword}");
            } else {
                if (!$existing->hasRole('super-admin')) {
                    $existing->assignRole('super-admin');
                }
                $this->command->info("Admin user already exists: admin@deprixa.com");
            }
        } else {
            $this->command->info("Skipping test user creation in production. Create users from Settings > Users.");
        }
    }
}
