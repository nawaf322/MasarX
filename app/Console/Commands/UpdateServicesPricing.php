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

use App\Models\Service;
use App\Models\Organization;
use Illuminate\Console\Command;

class UpdateServicesPricing extends Command
{
    protected $signature = 'services:update-pricing {--org-id= : Organization ID}';
    protected $description = 'Actualiza los precios de los servicios existentes con valores diferenciados según su tipo';

    public function handle(): int
    {
        $orgId = $this->option('org-id');
        
        if ($orgId) {
            $orgs = Organization::where('id', $orgId)->get();
        } else {
            $orgs = Organization::all();
        }

        if ($orgs->isEmpty()) {
            $this->error('No se encontraron organizaciones.');
            return self::FAILURE;
        }

        foreach ($orgs as $org) {
            $this->info("Actualizando servicios para organización: {$org->name} (ID: {$org->id})");
            
            $services = Service::where('organization_id', $org->id)->get();
            
            if ($services->isEmpty()) {
                $this->warn("  No hay servicios para esta organización.");
                continue;
            }

            // Definir precios diferenciados según el código/nombre del servicio
            $pricingMap = [
                // Express services - más caros
                'express_air' => ['base' => 15.00, 'per_kg' => 4.50],
                'next_day_air' => ['base' => 20.00, 'per_kg' => 5.00],
                'same_day_air' => ['base' => 25.00, 'per_kg' => 6.00],
                'international_air_express' => ['base' => 30.00, 'per_kg' => 7.00],
                
                // Standard services - precio medio
                'standard_air' => ['base' => 10.00, 'per_kg' => 3.00],
                'standard_sea' => ['base' => 8.00, 'per_kg' => 2.50],
                'standard_land' => ['base' => 7.00, 'per_kg' => 2.00],
                
                // Economy services - más baratos
                'economy_air' => ['base' => 5.00, 'per_kg' => 2.00],
                'economy_sea' => ['base' => 4.00, 'per_kg' => 1.50],
                'economy_land' => ['base' => 3.00, 'per_kg' => 1.00],
            ];

            $updated = 0;
            foreach ($services as $service) {
                $code = strtolower($service->code);
                
                // Establecer currency USD por defecto si no está configurado
                if (empty($service->currency)) {
                    $service->currency = 'USD';
                }
                
                if (isset($pricingMap[$code])) {
                    $pricing = $pricingMap[$code];
                    $service->base_price = $pricing['base'];
                    $service->price_per_kg = $pricing['per_kg'];
                    $service->save();
                    $updated++;
                    $this->line("  ✓ {$service->name}: Base = {$pricing['base']} {$service->currency}, Por Kg = {$pricing['per_kg']} {$service->currency}");
                } else {
                    // Para servicios no mapeados, usar precios por defecto según modo
                    $defaultPricing = match($service->mode) {
                        'air' => ['base' => 8.00, 'per_kg' => 2.50],
                        'sea' => ['base' => 6.00, 'per_kg' => 2.00],
                        'land' => ['base' => 5.00, 'per_kg' => 1.50],
                        default => ['base' => 5.00, 'per_kg' => 2.00],
                    };
                    $service->base_price = $defaultPricing['base'];
                    $service->price_per_kg = $defaultPricing['per_kg'];
                    $service->save();
                    $updated++;
                    $this->line("  ✓ {$service->name} (modo: {$service->mode}): Base = {$defaultPricing['base']} {$service->currency}, Por Kg = {$defaultPricing['per_kg']} {$service->currency}");
                }
            }
            
            $this->info("  Total actualizados: {$updated} servicios");
        }

        $this->info("
✓ Precios actualizados exitosamente.");
        return self::SUCCESS;
    }
}
