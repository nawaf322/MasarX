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
use App\Models\Shipment;
use App\Models\ShipmentStatus;
use Illuminate\Support\Facades\DB;

class SyncShipmentStatuses extends Command
{
    protected $signature = 'shipments:sync-statuses 
                            {--org= : Organization ID (optional, syncs all if not provided)}
                            {--dry-run : Show what would be updated without making changes}';

    protected $description = 'Sincroniza el campo status con status_id para todos los envíos';

    public function handle(): int
    {
        $orgId = $this->option('org');
        $dryRun = $this->option('dry-run');

        $this->info('Sincronizando estados de envíos...');
        $this->newLine();

        $query = Shipment::query();
        if ($orgId) {
            $query->where('organization_id', $orgId);
            $this->info("Organización: {$orgId}");
        } else {
            $this->info("Todas las organizaciones");
        }

        // Solo envíos que tienen status_id pero el campo status podría estar desactualizado
        $query->whereNotNull('status_id')
              ->with('shipmentStatus');

        $total = $query->count();
        $this->info("Total de envíos a verificar: {$total}");
        $this->newLine();

        if ($total === 0) {
            $this->warn('No hay envíos con status_id para sincronizar.');
            return 0;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $updated = 0;
        $skipped = 0;
        $errors = 0;

        $query->chunk(100, function ($shipments) use (&$updated, &$skipped, &$errors, $bar, $dryRun) {
            foreach ($shipments as $shipment) {
                try {
                    $statusCode = $shipment->shipmentStatus?->code;
                    
                    if (!$statusCode) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }

                    $currentStatus = $shipment->getRawOriginal('status');
                    
                    if ($currentStatus !== $statusCode) {
                        if (!$dryRun) {
                            DB::table('shipments')
                                ->where('id', $shipment->id)
                                ->update(['status' => $statusCode]);
                        }
                        $updated++;
                    } else {
                        $skipped++;
                    }
                } catch (\Exception $e) {
                    $errors++;
                    $this->newLine();
                    $this->error("Error en envío ID {$shipment->id}: {$e->getMessage()}");
                }
                
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine(2);

        if ($dryRun) {
            $this->info("🔍 MODO DRY-RUN - No se realizaron cambios");
            $this->info("Envíos que se actualizarían: {$updated}");
        } else {
            $this->info("✅ Sincronización completada");
            $this->info("Envíos actualizados: {$updated}");
        }
        
        $this->info("Envíos sin cambios: {$skipped}");
        
        if ($errors > 0) {
            $this->warn("Errores encontrados: {$errors}");
            return 1;
        }

        return 0;
    }
}
