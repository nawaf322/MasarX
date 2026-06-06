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
use App\Models\CarrierAccount;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\UniqueConstraintViolationException;

class BusinessLogicSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure Organization
        $org = Organization::first();
        if (!$org) {
            $org = Organization::create([
                'name' => 'Deprixa Global',
                'primary_color' => '#E5325A'
            ]);
        }
        $orgId = $org->id;

        // 2. Seed Carrier Accounts (Resolves "Not Configured")
        // NOTA: Las credenciales deben configurarse desde Settings > Integrations
        // No se crean credenciales de prueba para evitar valores hardcodeados en producción
        $carriers = ['dhl', 'fedex', 'ups', 'usps'];
        foreach ($carriers as $code) {
            CarrierAccount::firstOrCreate(
                ['organization_id' => $orgId, 'carrier_code' => $code],
                [
                    'credentials' => [], // Credenciales vacías - deben configurarse desde UI
                    'mode' => 'test',
                    'status' => false // Inactivo hasta que se configuren credenciales reales
                ]
            );
        }
        $this->command->info("Carrier Accounts created (inactive) for Org {$orgId}. Configure credentials in Settings > Integrations.");

        // 3. Seed Driver (Resolves "Fleet (0)")
        // NOTA: Solo crear driver en ambiente de desarrollo
        // En producción, los drivers deben crearse desde Settings > Users
        if (app()->environment(['local', 'development', 'testing'])) {
            $driverEmail = 'driver@deprixa.com';
            $driver = null;

            try {
                // Generar password aleatorio seguro o usar variable de entorno
                $driverPassword = env('DEMO_DRIVER_PASSWORD', \Illuminate\Support\Str::random(16));
                $driver = User::create([
                    'name' => 'Demo Driver',
                    'email' => $driverEmail,
                    'password' => Hash::make($driverPassword),
                    'organization_id' => $orgId,
                    'is_active' => true,
                    'must_change_password' => true // Requerir cambio de password en primer login
                ]);
                $this->command->info("Created Demo Driver: {$driverEmail} (password must be changed on first login)");
                $this->command->info("Set DEMO_DRIVER_PASSWORD in .env to use a custom password for development.");
            } catch (\Exception $e) {
                $this->command->info("Driver exists or constraint error: " . $e->getMessage());
                // Try to find it (using global scope bypass as best effort)
                $driver = User::withoutGlobalScopes()->where('email', $driverEmail)->first();
            }

            if ($driver && !$driver->hasRole('Driver')) {
                $driver->assignRole('Driver');
                $this->command->info("Assigned Driver role.");
            }
        } else {
            $this->command->info("Skipping demo driver creation in production. Create drivers from Settings > Users.");
        }
    }
}
