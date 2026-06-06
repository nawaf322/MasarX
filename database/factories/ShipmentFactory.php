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

namespace Database\Factories;

use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
        return [
            'uuid' => $this->faker->uuid(),
            'organization_id' => \App\Models\Organization::factory(), // Create org automatically
            'tracking_number' => 'TRK-' . $this->faker->unique()->numerify('#####'),
            'status' => $this->faker->randomElement(['pending', 'in_transit', 'delivered', 'cancelled']),
            'payment_status' => $this->faker->randomElement(['paid', 'unpaid', 'partial']),
            'sender_details' => [
                'name' => $this->faker->name(),
                'city' => $this->faker->city(),
                'country' => $this->faker->countryCode(),
            ],
            'receiver_details' => [
                'name' => $this->faker->name(),
                'city' => $this->faker->city(),
                'country' => $this->faker->countryCode(),
            ],
            'package_details' => [
                'weight' => $this->faker->randomFloat(2, 0.5, 50),
                'dimensions' => '10x10x10',
                'pieces' => 1,
            ],
            'subtotal' => $this->faker->randomFloat(2, 40, 400),
            'tax' => $this->faker->randomFloat(2, 5, 50),
            'discount' => 0,
            'total' => $this->faker->randomFloat(2, 50, 500),
            'profit' => $this->faker->randomFloat(2, 10, 100), // Added profit for UI demo
            'ship_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'created_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ];
    }
}
