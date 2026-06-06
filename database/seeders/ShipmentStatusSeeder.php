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
use App\Models\ShipmentStatus;
use App\Models\Organization;
use App\Models\Shipment;

class ShipmentStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener todas las organizaciones o crear una por defecto
        $organizations = Organization::all();
        
        if ($organizations->isEmpty()) {
            $organizations = collect([Organization::create([
                'name' => 'Default Organization',
                'primary_color' => '#E5325A'
            ])]);
        }

        // Estados iniciales basados en la imagen de referencia y requerimientos
        $defaultStatuses = [
            [
                'code' => 'pending',
                'name' => 'Pending',
                'icon' => 'Clock',
                'color' => '#F39C12', // Naranja
                'order' => 1,
            ],
            [
                'code' => 'processed',
                'name' => 'Processed',
                'icon' => 'RefreshCw',
                'color' => '#2980B9', // Azul oscuro
                'order' => 2,
            ],
            [
                'code' => 'courier',
                'name' => 'Courier',
                'icon' => 'Truck',
                'color' => '#3498DB', // Azul claro
                'order' => 3,
            ],
            [
                'code' => 'picked_up',
                'name' => 'Picked Up',
                'icon' => 'Package',
                'color' => '#9B59B6', // Púrpura
                'order' => 4,
            ],
            [
                'code' => 'in_transit',
                'name' => 'In Transit',
                'icon' => 'Truck',
                'color' => '#3498DB', // Azul claro (Shipping)
                'order' => 5,
            ],
            [
                'code' => 'out_for_delivery',
                'name' => 'Out for Delivery',
                'icon' => 'Truck',
                'color' => '#E67E22', // Naranja oscuro
                'order' => 6,
            ],
            [
                'code' => 'delivered',
                'name' => 'Delivered',
                'icon' => 'CheckCircle',
                'color' => '#27AE60', // Verde
                'order' => 7,
            ],
            [
                'code' => 'completed',
                'name' => 'Completed',
                'icon' => 'CheckCircle2',
                'color' => '#27AE60', // Verde
                'order' => 8,
            ],
            [
                'code' => 'cancelled',
                'name' => 'Cancelled',
                'icon' => 'XCircle',
                'color' => '#E74C3C', // Rojo
                'order' => 9,
            ],
            [
                'code' => 'exception',
                'name' => 'Exception',
                'icon' => 'AlertTriangle',
                'color' => '#E74C3C', // Rojo
                'order' => 10,
            ],
            [
                'code' => 'on_hold',
                'name' => 'On Hold',
                'icon' => 'PauseCircle',
                'color' => '#95A5A6', // Gris
                'order' => 11,
            ],
            [
                'code' => 'returned',
                'name' => 'Returned',
                'icon' => 'RotateCcw',
                'color' => '#E67E22', // Naranja
                'order' => 12,
            ],
            // Estados adicionales de logística y courier
            ['code' => 'label_created', 'name' => 'Label Created', 'icon' => 'FileText', 'color' => '#2980B9', 'order' => 13],
            ['code' => 'manifest_created', 'name' => 'Manifest Created', 'icon' => 'FileText', 'color' => '#3498DB', 'order' => 14],
            ['code' => 'pickup_scheduled', 'name' => 'Pickup Scheduled', 'icon' => 'Clock', 'color' => '#9B59B6', 'order' => 15],
            ['code' => 'at_warehouse', 'name' => 'At Warehouse', 'icon' => 'MapPin', 'color' => '#3498DB', 'order' => 16],
            ['code' => 'sorting', 'name' => 'Sorting Center', 'icon' => 'RefreshCw', 'color' => '#2980B9', 'order' => 17],
            ['code' => 'customs_clearance', 'name' => 'Customs Clearance', 'icon' => 'FileText', 'color' => '#8E44AD', 'order' => 18],
            ['code' => 'at_destination_hub', 'name' => 'At Destination Hub', 'icon' => 'MapPin', 'color' => '#3498DB', 'order' => 19],
            ['code' => 'delivery_attempted', 'name' => 'Delivery Attempted', 'icon' => 'AlertTriangle', 'color' => '#E67E22', 'order' => 20],
            ['code' => 'available_for_pickup', 'name' => 'Available for Pickup', 'icon' => 'Package', 'color' => '#27AE60', 'order' => 21],
            ['code' => 'failed_delivery', 'name' => 'Failed Delivery', 'icon' => 'XCircle', 'color' => '#E74C3C', 'order' => 22],
            ['code' => 'refused', 'name' => 'Refused', 'icon' => 'XCircle', 'color' => '#95A5A6', 'order' => 23],
            ['code' => 'undeliverable', 'name' => 'Undeliverable', 'icon' => 'AlertTriangle', 'color' => '#E74C3C', 'order' => 24],
            ['code' => 'damaged', 'name' => 'Damaged', 'icon' => 'AlertTriangle', 'color' => '#C0392B', 'order' => 25],
            ['code' => 'lost', 'name' => 'Lost', 'icon' => 'AlertTriangle', 'color' => '#7F8C8D', 'order' => 26],
            ['code' => 'awaiting_payment', 'name' => 'Awaiting Payment', 'icon' => 'Clock', 'color' => '#F39C12', 'order' => 27],
            ['code' => 'payment_received', 'name' => 'Payment Received', 'icon' => 'CheckCircle', 'color' => '#27AE60', 'order' => 28],
            ['code' => 'proof_of_delivery', 'name' => 'Proof of Delivery', 'icon' => 'CheckCircle2', 'color' => '#27AE60', 'order' => 29],
            // ── Phase 2 lifecycle states (domain model normalization) ──────────
            ['code' => 'draft',                 'name' => 'Draft',                  'icon' => 'FileEdit',    'color' => '#94A3B8', 'order' => 30],
            ['code' => 'quoted',                'name' => 'Quoted',                 'icon' => 'FileText',    'color' => '#60A5FA', 'order' => 31],
            ['code' => 'confirmed',             'name' => 'Confirmed',              'icon' => 'CheckCircle', 'color' => '#34D399', 'order' => 32],
            ['code' => 'pending_pickup',        'name' => 'Pending Pickup',         'icon' => 'Clock',       'color' => '#FBBF24', 'order' => 33],
            ['code' => 'received_at_warehouse', 'name' => 'Received at Warehouse',  'icon' => 'MapPin',      'color' => '#818CF8', 'order' => 34],
            ['code' => 'sorted',                'name' => 'Sorted',                 'icon' => 'RefreshCw',   'color' => '#A78BFA', 'order' => 35],
            ['code' => 'return_requested',      'name' => 'Return Requested',       'icon' => 'RotateCcw',   'color' => '#FB923C', 'order' => 36],
            ['code' => 'return_in_transit',     'name' => 'Return In Transit',      'icon' => 'Truck',       'color' => '#F97316', 'order' => 37],
        ];

        foreach ($organizations as $org) {
            foreach ($defaultStatuses as $statusData) {
                ShipmentStatus::firstOrCreate(
                    [
                        'organization_id' => $org->id,
                        'code' => $statusData['code'],
                    ],
                    array_merge($statusData, [
                        'organization_id' => $org->id,
                        'is_active' => true,
                    ])
                );
            }
        }

        $this->command->info('Shipment statuses seeded successfully for ' . $organizations->count() . ' organization(s).');
        
        // Migrar datos existentes: asignar status_id a shipments basado en el campo status (string)
        $this->migrateExistingShipments();
    }

    /**
     * Migrar shipments existentes que tienen status como string al nuevo status_id
     */
    private function migrateExistingShipments(): void
    {
        $organizations = Organization::all();
        
        foreach ($organizations as $org) {
            $statusMap = ShipmentStatus::where('organization_id', $org->id)
                ->pluck('id', 'code')
                ->toArray();

            // Actualizar shipments que tienen status como string pero no status_id
            $shipments = Shipment::where('organization_id', $org->id)
                ->whereNull('status_id')
                ->get();

            foreach ($shipments as $shipment) {
                $statusString = is_string($shipment->status) 
                    ? $shipment->status 
                    : (method_exists($shipment->status, 'value') ? $shipment->status->value : null);
                
                if ($statusString && isset($statusMap[$statusString])) {
                    $shipment->status_id = $statusMap[$statusString];
                    $shipment->save();
                } elseif ($statusString) {
                    // Si el estado no existe, usar 'pending' por defecto
                    $shipment->status_id = $statusMap['pending'] ?? null;
                    $shipment->save();
                }
            }
        }

        $this->command->info('Migrated existing shipments to use status_id.');
    }
}
