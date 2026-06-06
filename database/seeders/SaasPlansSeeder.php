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

use App\Models\SaasPlan;
use Illuminate\Database\Seeder;

class SaasPlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name'             => 'Starter',
                'slug'             => 'starter',
                'description'      => 'Perfect for small courier operations. Up to 500 shipments/month.',
                'price_monthly'    => 29.00,
                'price_quarterly'  => 79.00,
                'price_semiannual' => 149.00,
                'price_annual'     => 279.00,
                'currency'         => 'USD',
                'features'         => [
                    'shipments_per_month' => 500,
                    'users'               => 5,
                    'branches'            => 1,
                    'api_access'          => false,
                    'custom_branding'     => false,
                    'priority_support'    => false,
                ],
                'limits'           => [
                    'max_shipments'    => 500,
                    'max_users'        => 5,
                    'max_branches'     => 1,
                    'storage_gb'       => 5,
                    'api_calls_daily'  => 0,
                ],
                'trial_days'       => 14,
                'grace_period_days'=> 7,
                'is_active'        => true,
                'sort_order'       => 1,
            ],
            [
                'name'             => 'Growth',
                'slug'             => 'growth',
                'description'      => 'For growing logistics companies. Up to 2,000 shipments/month.',
                'price_monthly'    => 79.00,
                'price_quarterly'  => 219.00,
                'price_semiannual' => 419.00,
                'price_annual'     => 789.00,
                'currency'         => 'USD',
                'features'         => [
                    'shipments_per_month' => 2000,
                    'users'               => 20,
                    'branches'            => 5,
                    'api_access'          => true,
                    'custom_branding'     => true,
                    'priority_support'    => false,
                ],
                'limits'           => [
                    'max_shipments'    => 2000,
                    'max_users'        => 20,
                    'max_branches'     => 5,
                    'storage_gb'       => 25,
                    'api_calls_daily'  => 10000,
                ],
                'trial_days'       => 14,
                'grace_period_days'=> 7,
                'is_active'        => true,
                'sort_order'       => 2,
            ],
            [
                'name'             => 'Pro',
                'slug'             => 'pro',
                'description'      => 'For established courier businesses. Up to 10,000 shipments/month.',
                'price_monthly'    => 199.00,
                'price_quarterly'  => 549.00,
                'price_semiannual' => 1049.00,
                'price_annual'     => 1989.00,
                'currency'         => 'USD',
                'features'         => [
                    'shipments_per_month' => 10000,
                    'users'               => 100,
                    'branches'            => 20,
                    'api_access'          => true,
                    'custom_branding'     => true,
                    'priority_support'    => true,
                ],
                'limits'           => [
                    'max_shipments'    => 10000,
                    'max_users'        => 100,
                    'max_branches'     => 20,
                    'storage_gb'       => 100,
                    'api_calls_daily'  => 100000,
                ],
                'trial_days'       => 14,
                'grace_period_days'=> 14,
                'is_active'        => true,
                'sort_order'       => 3,
            ],
            [
                'name'             => 'Enterprise',
                'slug'             => 'enterprise',
                'description'      => 'Unlimited shipments, users, and branches. Dedicated support.',
                'price_monthly'    => 499.00,
                'price_quarterly'  => 1349.00,
                'price_semiannual' => 2549.00,
                'price_annual'     => 4799.00,
                'currency'         => 'USD',
                'features'         => [
                    'shipments_per_month' => null,
                    'users'               => null,
                    'branches'            => null,
                    'api_access'          => true,
                    'custom_branding'     => true,
                    'priority_support'    => true,
                    'dedicated_support'   => true,
                    'sla'                 => '99.9%',
                ],
                'limits'           => [
                    'max_shipments'    => null,
                    'max_users'        => null,
                    'max_branches'     => null,
                    'storage_gb'       => null,
                    'api_calls_daily'  => null,
                ],
                'trial_days'       => 0,
                'grace_period_days'=> 30,
                'is_active'        => true,
                'sort_order'       => 4,
            ],
        ];

        foreach ($plans as $planData) {
            SaasPlan::updateOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
        }

        $this->command->info('SaaS plans seeded: ' . count($plans) . ' plans.');
    }
}
