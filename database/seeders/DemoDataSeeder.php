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

use App\Models\Branch;
use App\Models\NumberingSequence;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\RateCard;
use App\Models\RateRule;
use App\Models\RateZone;
use App\Models\Shipment;
use App\Models\ShipmentHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::first();

        if (!$org) {
            $this->command->error('No organization found. Run wizard first.');
            return;
        }

        DB::transaction(function () use ($org) {
            $this->seedDemoUsers($org);
            $this->seedDepartments($org);
            $this->seedHsCodes($org);
            $this->seedCustomers($org);
            $this->seedRateCards($org);
            $this->seedDrivers($org);
            $this->seedBranches($org);
            $this->seedShipments($org);
        });

        $this->command->info('Demo data seeded successfully.');
    }

    // ──────────────────────────────────────────────────────────────
    // Demo Users (admin, employee, driver, customer)
    // ──────────────────────────────────────────────────────────────

    private function seedDemoUsers(Organization $org): void
    {
        $demoUsers = [
            [
                'name'     => 'Admin Demo',
                'email'    => 'admin@demo.masarx.com',
                'password' => 'demo1234',
                'role'     => 'admin',
                'phone'    => '+1 800 100 0001',
            ],
            [
                'name'     => 'Employee Demo',
                'email'    => 'employee@demo.masarx.com',
                'password' => 'demo1234',
                'role'     => 'Employee',
                'phone'    => '+1 800 100 0002',
            ],
            [
                'name'     => 'Driver Demo',
                'email'    => 'driver@demo.masarx.com',
                'password' => 'demo1234',
                'role'     => 'Driver',
                'phone'    => '+1 800 100 0003',
            ],
            [
                'name'     => 'Customer Demo',
                'email'    => 'customer@demo.masarx.com',
                'password' => 'demo1234',
                'role'     => 'customer',
                'phone'    => '+1 800 100 0004',
            ],
        ];

        foreach ($demoUsers as $u) {
            $user = User::firstOrCreate(
                ['email' => $u['email'], 'organization_id' => $org->id],
                [
                    'name'            => $u['name'],
                    'phone'           => $u['phone'],
                    'password'        => Hash::make($u['password']),
                    'organization_id' => $org->id,
                    'is_active'       => true,
                ]
            );

            $role = Role::where('name', $u['role'])->first();
            if ($role && !$user->hasRole($u['role'])) {
                $user->assignRole($role);
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Departments
    // ──────────────────────────────────────────────────────────────

    private function seedDepartments(Organization $org): void
    {
        $departments = [
            ['name' => 'Operations',       'code' => 'OPS'],
            ['name' => 'Customer Service', 'code' => 'CS'],
            ['name' => 'Warehouse',        'code' => 'WH'],
            ['name' => 'Finance',          'code' => 'FIN'],
            ['name' => 'Sales',            'code' => 'SLS'],
            ['name' => 'IT Support',       'code' => 'IT'],
            ['name' => 'Human Resources',  'code' => 'HR'],
        ];

        foreach ($departments as $d) {
            \App\Models\Department::firstOrCreate(
                ['organization_id' => $org->id, 'name' => $d['name']],
                ['organization_id' => $org->id, 'name' => $d['name'], 'code' => $d['code'], 'active' => true]
            );
        }
    }

    // ──────────────────────────────────────────────────────────────
    // HS Codes (Customs)
    // ──────────────────────────────────────────────────────────────

    private function seedHsCodes(Organization $org): void
    {
        if (!class_exists(\App\Models\HsCode::class)) {
            return;
        }

        $codes = [
            ['code' => '8471.30',   'description' => 'Portable digital automatic data-processing machines (laptops)', 'category' => 'Electronics'],
            ['code' => '8517.13',   'description' => 'Smartphones and cellular phones',                               'category' => 'Electronics'],
            ['code' => '8528.72',   'description' => 'Television receivers, colour',                                    'category' => 'Electronics'],
            ['code' => '6110.20',   'description' => 'Jerseys, pullovers, cardigans — cotton',                          'category' => 'Apparel'],
            ['code' => '6204.62',   'description' => 'Women\'s trousers — cotton',                                      'category' => 'Apparel'],
            ['code' => '6403.99',   'description' => 'Footwear with outer soles of rubber/plastics',                    'category' => 'Footwear'],
            ['code' => '3304.99',   'description' => 'Beauty and makeup preparations',                                  'category' => 'Cosmetics'],
            ['code' => '3401.11',   'description' => 'Soap and organic surface-active products',                        'category' => 'Cosmetics'],
            ['code' => '0901.21',   'description' => 'Coffee, roasted, not decaffeinated',                              'category' => 'Food & Beverage'],
            ['code' => '2009.11',   'description' => 'Orange juice, frozen',                                            'category' => 'Food & Beverage'],
            ['code' => '8703.23',   'description' => 'Motor vehicles — cylinder capacity 1500-3000cc',                  'category' => 'Automotive'],
            ['code' => '8714.10',   'description' => 'Parts and accessories of motorcycles',                            'category' => 'Automotive'],
            ['code' => '9403.60',   'description' => 'Wooden furniture (not office/kitchen/bedroom)',                    'category' => 'Furniture'],
            ['code' => '4901.99',   'description' => 'Printed books, brochures, leaflets',                              'category' => 'Books & Media'],
            ['code' => '9503.00',   'description' => 'Toys, scale models, puzzles',                                     'category' => 'Toys & Games'],
            ['code' => '3004.90',   'description' => 'Medicaments in measured doses',                                   'category' => 'Pharmaceuticals'],
            ['code' => '7113.19',   'description' => 'Articles of jewellery — precious metal',                          'category' => 'Jewelry'],
            ['code' => '9018.90',   'description' => 'Medical instruments and appliances',                              'category' => 'Medical'],
            ['code' => '3923.30',   'description' => 'Carboys, bottles, flasks — plastics',                             'category' => 'Packaging'],
            ['code' => '7210.49',   'description' => 'Flat-rolled products of iron or non-alloy steel',                 'category' => 'Industrial'],
        ];

        foreach ($codes as $c) {
            try {
                \App\Models\HsCode::firstOrCreate(
                    ['organization_id' => $org->id, 'code' => $c['code']],
                    array_merge($c, ['organization_id' => $org->id, 'is_active' => true])
                );
            } catch (\Throwable) {
                // Skip duplicates silently — record already exists
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // 15 Customers
    // ──────────────────────────────────────────────────────────────

    private function seedCustomers(Organization $org): void
    {
        $customers = [
            ['name' => 'Ana García',            'email' => 'ana.garcia@demo.co',      'phone' => '+57 310 100 0001', 'city' => 'Bogotá',     'country' => 'CO'],
            ['name' => 'Carlos Mendoza',         'email' => 'c.mendoza@demo.co',       'phone' => '+57 310 100 0002', 'city' => 'Medellín',   'country' => 'CO'],
            ['name' => 'Maria Rodriguez',        'email' => 'maria.r@demo.mx',         'phone' => '+52 55 1234 5678', 'city' => 'Ciudad de México', 'country' => 'MX'],
            ['name' => 'Global Shipping Co.',    'email' => 'ops@globalshipping.com',  'phone' => '+1 305 555 0100',  'city' => 'Miami',       'country' => 'US'],
            ['name' => 'Tech Express Ltd.',      'email' => 'info@techexpress.com',    'phone' => '+1 212 555 0200',  'city' => 'New York',    'country' => 'US'],
            ['name' => 'Pedro Ramírez',          'email' => 'pedro.r@demo.co',         'phone' => '+57 315 100 0003', 'city' => 'Cali',        'country' => 'CO'],
            ['name' => 'Logistics Partners SAS', 'email' => 'ventas@logpartners.co',   'phone' => '+57 300 100 0004', 'city' => 'Barranquilla', 'country' => 'CO'],
            ['name' => 'Laura Hernández',        'email' => 'laura.h@demo.es',         'phone' => '+34 91 123 4567',  'city' => 'Madrid',      'country' => 'ES'],
            ['name' => 'Miguel Torres',          'email' => 'miguel.t@demo.mx',        'phone' => '+52 33 1234 5678', 'city' => 'Guadalajara', 'country' => 'MX'],
            ['name' => 'Transports BCN S.L.',    'email' => 'admin@transportsbcn.es',  'phone' => '+34 93 234 5678',  'city' => 'Barcelona',   'country' => 'ES'],
            ['name' => 'Sofia Vargas',           'email' => 'sofia.v@demo.pe',         'phone' => '+51 1 234 5678',   'city' => 'Lima',        'country' => 'PE'],
            ['name' => 'Fast Courier Inc.',      'email' => 'ops@fastcourier.us',      'phone' => '+1 818 555 0300',  'city' => 'Los Angeles', 'country' => 'US'],
            ['name' => 'Andrés Rojas',           'email' => 'andres.r@demo.ar',        'phone' => '+54 11 1234 5678', 'city' => 'Buenos Aires', 'country' => 'AR'],
            ['name' => 'DataCargo Systems',      'email' => 'contact@datacargo.co',    'phone' => '+57 300 200 0005', 'city' => 'Bogotá',     'country' => 'CO'],
            ['name' => 'Valentina Cruz',         'email' => 'v.cruz@demo.cl',          'phone' => '+56 2 2345 6789',  'city' => 'Santiago',   'country' => 'CL'],
        ];

        $customerRole = Role::where('name', 'customer')->first();

        foreach ($customers as $c) {
            $user = User::firstOrCreate(
                ['email' => $c['email'], 'organization_id' => $org->id],
                [
                    'name'            => $c['name'],
                    'phone'           => $c['phone'],
                    'city'            => $c['city'],
                    'country'         => $c['country'],
                    'password'        => Hash::make('demo123456'),
                    'organization_id' => $org->id,
                    'is_active'       => true,
                ]
            );

            if ($customerRole && !$user->hasRole('customer')) {
                $user->assignRole($customerRole);
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // 5 Rate Cards with zones and rules
    // ──────────────────────────────────────────────────────────────

    private function seedRateCards(Organization $org): void
    {
        // Get a fallback country ID for zones with origin_any/dest_any = true
        // The DB column is NOT NULL, so we must provide a valid ID even for "any" zones
        $fallbackCountryId = DB::table('countries')
            ->where('organization_id', $org->id)
            ->value('id') ?? DB::table('countries')->value('id') ?? 1;

        $cards = [
            [
                'name'     => 'Local Express',
                'currency' => 'USD',
                'flat'     => 5.00,
                'per_kg'   => 2.00,
                'min_w'    => 0,
                'max_w'    => 30,
                'zones'    => [
                    ['name' => 'Local Zona 1', 'origin_any' => true, 'dest_any' => true],
                    ['name' => 'Local Zona 2', 'origin_any' => true, 'dest_any' => true],
                ],
            ],
            [
                'name'     => 'Nacional Estándar',
                'currency' => 'USD',
                'flat'     => 8.00,
                'per_kg'   => 3.00,
                'min_w'    => 0,
                'max_w'    => 70,
                'zones'    => [
                    ['name' => 'Nacional Norte', 'origin_any' => true, 'dest_any' => true],
                    ['name' => 'Nacional Sur',   'origin_any' => true, 'dest_any' => true],
                    ['name' => 'Nacional Centro', 'origin_any' => true, 'dest_any' => true],
                ],
            ],
            [
                'name'     => 'Internacional Economy',
                'currency' => 'USD',
                'flat'     => 25.00,
                'per_kg'   => 8.00,
                'min_w'    => 0.5,
                'max_w'    => 300,
                'zones'    => [
                    ['name' => 'LATAM', 'origin_any' => true, 'dest_any' => true],
                    ['name' => 'USA/CAN', 'origin_any' => true, 'dest_any' => true],
                ],
            ],
            [
                'name'     => 'Express 24h',
                'currency' => 'USD',
                'flat'     => 15.00,
                'per_kg'   => 5.00,
                'min_w'    => 0,
                'max_w'    => 50,
                'zones'    => [
                    ['name' => 'Express Local', 'origin_any' => true, 'dest_any' => true],
                    ['name' => 'Express Nacional', 'origin_any' => true, 'dest_any' => true],
                ],
            ],
            [
                'name'     => 'Económico 5-7 días',
                'currency' => 'USD',
                'flat'     => 4.00,
                'per_kg'   => 1.50,
                'min_w'    => 1,
                'max_w'    => 100,
                'zones'    => [
                    ['name' => 'Eco Zona A', 'origin_any' => true, 'dest_any' => true],
                    ['name' => 'Eco Zona B', 'origin_any' => true, 'dest_any' => true],
                ],
            ],
        ];

        foreach ($cards as $cardData) {
            $card = RateCard::firstOrCreate(
                ['name' => $cardData['name'], 'organization_id' => $org->id],
                [
                    'organization_id'        => $org->id,
                    'currency'               => $cardData['currency'],
                    'chargeable_weight_rule' => 'actual',
                    'volumetric_divisor'     => 5000,
                    'active'                 => true,
                ]
            );

            foreach ($cardData['zones'] as $zoneData) {
                $zone = RateZone::firstOrCreate(
                    ['name' => $zoneData['name'], 'organization_id' => $org->id],
                    [
                        'organization_id'   => $org->id,
                        'origin_any'        => $zoneData['origin_any'],
                        'dest_any'          => $zoneData['dest_any'],
                        'origin_country_id' => $fallbackCountryId,
                        'dest_country_id'   => $fallbackCountryId,
                        'active'            => true,
                    ]
                );

                RateRule::firstOrCreate(
                    [
                        'rate_card_id' => $card->id,
                        'rate_zone_id' => $zone->id,
                        'organization_id' => $org->id,
                    ],
                    [
                        'organization_id'        => $org->id,
                        'rate_card_id'           => $card->id,
                        'rate_zone_id'           => $zone->id,
                        'service_type'           => 'standard',
                        'min_weight'             => $cardData['min_w'],
                        'max_weight'             => $cardData['max_w'],
                        'flat_price'             => $cardData['flat'],
                        'price_per_kg'           => $cardData['per_kg'],
                        'min_charge'             => $cardData['flat'],
                        'fuel_surcharge_percent' => 5.0,
                        'insurance_percent'      => 1.0,
                        'tax_percent'            => 0.0,
                        'handling_fee'           => 0.0,
                        'active'                 => true,
                    ]
                );
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // 3 Drivers
    // ──────────────────────────────────────────────────────────────

    private function seedDrivers(Organization $org): void
    {
        $drivers = [
            ['name' => 'Juan Delivery',    'email' => 'juan.delivery@demo.co'],
            ['name' => 'Pedro Express',    'email' => 'pedro.express@demo.co'],
            ['name' => 'Maria Transport',  'email' => 'maria.transport@demo.co'],
        ];

        $driverRole = Role::where('name', 'driver')->first();

        foreach ($drivers as $d) {
            $user = User::firstOrCreate(
                ['email' => $d['email'], 'organization_id' => $org->id],
                [
                    'name'            => $d['name'],
                    'password'        => Hash::make('demo123456'),
                    'organization_id' => $org->id,
                    'is_active'       => true,
                ]
            );

            if ($driverRole && !$user->hasRole('driver')) {
                $user->assignRole($driverRole);
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // 2 Additional branches
    // ──────────────────────────────────────────────────────────────

    private function seedBranches(Organization $org): void
    {
        $branches = [
            ['name' => 'Sucursal Norte', 'code' => 'SNR', 'city' => 'Barranquilla', 'country' => 'CO'],
            ['name' => 'Sucursal Sur',   'code' => 'SSR', 'city' => 'Cali',         'country' => 'CO'],
        ];

        foreach ($branches as $b) {
            Branch::firstOrCreate(
                ['organization_id' => $org->id, 'name' => $b['name']],
                array_merge($b, ['organization_id' => $org->id])
            );
        }
    }

    // ──────────────────────────────────────────────────────────────
    // 35 Shipments (varied statuses, last 60 days)
    // ──────────────────────────────────────────────────────────────

    private function seedShipments(Organization $org): void
    {
        $customers = User::where('organization_id', $org->id)
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'driver'))
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'admin'))
            ->get();

        if ($customers->isEmpty()) {
            $customers = User::where('organization_id', $org->id)->get();
        }

        if ($customers->isEmpty()) {
            return;
        }

        $seq = NumberingSequence::where('organization_id', $org->id)
            ->where('type', 'shipment')
            ->first();

        // Distribution of 35 shipments by status
        $statusDistribution = [
            'pending'          => 5,
            'picked_up'        => 5,
            'in_transit'       => 8,
            'out_for_delivery' => 5,
            'delivered'        => 10,
            'cancelled'        => 2,
        ];

        $routePairs = [
            ['CO', 'CO'], ['CO', 'US'], ['MX', 'US'], ['US', 'CO'],
            ['CO', 'MX'], ['ES', 'CO'], ['CO', 'ES'], ['CO', 'AR'],
            ['MX', 'MX'], ['US', 'MX'],
        ];

        $allShipments = [];
        $idx          = 0;

        foreach ($statusDistribution as $status => $count) {
            for ($i = 0; $i < $count; $i++) {
                $customer    = $customers->random();
                $routePair   = $routePairs[array_rand($routePairs)];
                $createdAt   = Carbon::now()->subDays(rand(1, 60))->subHours(rand(0, 23));
                $weight      = round(mt_rand(5, 5000) / 10, 1); // 0.5 - 50 kg
                $total       = round($weight * 3.5 + 8.0 + rand(0, 20), 2);

                $trackingNum = $this->generateTrackingNumber($seq, $org->id, $idx);

                $shipment = Shipment::firstOrCreate(
                    ['tracking_number' => $trackingNum, 'organization_id' => $org->id],
                    [
                        'uuid'             => Str::uuid(),
                        'tracking_number'  => $trackingNum,
                        'organization_id'  => $org->id,
                        'status'           => $status,
                        'payment_status'   => $this->resolvePaymentStatus($status, $i),
                        'sender_details'   => [
                            'name'    => $org->name,
                            'email'   => $org->email ?? 'sender@demo.co',
                            'phone'   => '+57 300 000 0000',
                            'address' => 'Calle Principal 123',
                            'city'    => 'Bogotá',
                            'country' => $routePair[0],
                        ],
                        'receiver_details' => [
                            'name'    => $customer->name,
                            'email'   => $customer->email,
                            'phone'   => $customer->phone ?? '+57 300 111 1111',
                            'address' => '123 Main Street',
                            'city'    => $customer->city ?? 'Ciudad',
                            'country' => $routePair[1],
                        ],
                        'package_details'  => [
                            'weight' => $weight,
                            'length' => rand(10, 80),
                            'width'  => rand(10, 60),
                            'height' => rand(5, 50),
                            'pieces' => rand(1, 3),
                        ],
                        'subtotal'     => round($total * 0.9, 2),
                        'tax'          => round($total * 0.1, 2),
                        'discount'     => 0.00,
                        'total'        => $total,
                        'currency'     => 'USD',
                        'is_archived'  => false,
                        'ship_date'    => $createdAt,
                        'delivered_at' => $status === 'delivered' ? $createdAt->copy()->addDays(rand(1, 5)) : null,
                        'created_at'   => $createdAt,
                        'updated_at'   => $createdAt,
                    ]
                );

                $allShipments[] = ['shipment' => $shipment, 'status' => $status, 'createdAt' => $createdAt];
                $idx++;
            }
        }

        // Create ShipmentHistory entries
        foreach ($allShipments as $entry) {
            $this->createShipmentHistory($entry['shipment'], $entry['status'], $entry['createdAt'], $org->id);
        }

        // Create Payments
        $this->createPayments($allShipments, $org->id);
    }

    private function createShipmentHistory(Shipment $shipment, string $finalStatus, Carbon $createdAt, int $orgId): void
    {
        $statusFlow = [
            'pending'          => ['pending'],
            'picked_up'        => ['pending', 'picked_up'],
            'in_transit'       => ['pending', 'picked_up', 'in_transit'],
            'out_for_delivery' => ['pending', 'picked_up', 'in_transit', 'out_for_delivery'],
            'delivered'        => ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'],
            'cancelled'        => ['pending', 'cancelled'],
        ];

        $flow = $statusFlow[$finalStatus] ?? [$finalStatus];
        $time = $createdAt->copy();

        $existingCount = ShipmentHistory::where('shipment_id', $shipment->id)->count();
        if ($existingCount > 0) {
            return;
        }

        foreach ($flow as $step) {
            ShipmentHistory::create([
                'shipment_id'     => $shipment->id,
                'organization_id' => $orgId,
                'status'          => $step,
                'description'     => $this->getStatusDescription($step),
                'location'        => 'Sistema',
                'created_at'      => $time->copy(),
                'updated_at'      => $time->copy(),
            ]);
            $time->addHours(rand(2, 24));
        }
    }

    private function createPayments(array $allShipments, int $orgId): void
    {
        $paymentCount = 0;
        $methods = ['manual', 'stripe', 'paypal'];

        foreach ($allShipments as $entry) {
            $shipment = $entry['shipment'];
            $status   = $entry['status'];

            if (!in_array($status, ['delivered', 'in_transit', 'out_for_delivery'])) {
                continue;
            }

            // Check existing payment
            if (Payment::where('shipment_id', $shipment->id)->exists()) {
                continue;
            }

            if ($paymentCount >= 25) {
                break;
            }

            // payment_status is cast to PaymentStatus enum — use ->value to get the string
            $psRaw = $shipment->payment_status;
            $paymentStatus = $psRaw instanceof \UnitEnum ? $psRaw->value : (string) $psRaw;
            if (!in_array($paymentStatus, ['paid', 'partial'])) {
                continue;
            }

            $amount = $paymentStatus === 'paid'
                ? (float) $shipment->total
                : round((float) $shipment->total * 0.5, 2);

            Payment::create([
                'shipment_id'     => $shipment->id,
                'organization_id' => $orgId,
                'amount'          => $amount,
                'currency'        => $shipment->currency ?? 'USD',
                'method'          => $methods[array_rand($methods)],
                'notes'           => 'Demo payment',
            ]);

            $paymentCount++;
        }
    }

    private function resolvePaymentStatus(string $shipmentStatus, int $index): string
    {
        if ($shipmentStatus === 'cancelled') {
            return 'unpaid';
        }
        if ($shipmentStatus === 'delivered') {
            return $index % 3 === 0 ? 'partial' : 'paid';
        }
        if (in_array($shipmentStatus, ['in_transit', 'out_for_delivery'])) {
            return $index % 2 === 0 ? 'paid' : 'unpaid';
        }
        return 'unpaid';
    }

    private function generateTrackingNumber(?NumberingSequence $seq, int $orgId, int $idx): string
    {
        if ($seq) {
            $nextNum = ($seq->next_number ?? 1000) + $idx;
            $padded  = str_pad((string) $nextNum, $seq->padding ?? 6, '0', STR_PAD_LEFT);
            return ($seq->prefix ?? 'DEP') . $padded . ($seq->suffix ?? '');
        }
        return 'DEMO' . str_pad((string) ($idx + 1001), 6, '0', STR_PAD_LEFT);
    }

    private function getStatusDescription(string $status): string
    {
        return match ($status) {
            'pending'          => 'Envío registrado y pendiente de recolección',
            'picked_up'        => 'Paquete recolectado por mensajero',
            'in_transit'       => 'En tránsito hacia destino',
            'out_for_delivery' => 'En camino para entrega final',
            'delivered'        => 'Entregado exitosamente',
            'cancelled'        => 'Envío cancelado',
            default            => 'Actualización de estado',
        };
    }
}
