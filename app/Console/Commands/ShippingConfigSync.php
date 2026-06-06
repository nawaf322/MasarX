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

use App\Models\NumberingSequence;
use App\Models\Organization;
use App\Services\SettingsService;
use App\Services\SequenceService;
use Illuminate\Console\Command;

class ShippingConfigSync extends Command
{
    protected $signature = 'shipping-config:sync';

    protected $description = 'Backfill shipping_config from billing/pricing/locale and ensure tracking sequence exists. Does not delete legacy values.';

    public function handle(): int
    {
        $organizations = Organization::all();
        if ($organizations->isEmpty()) {
            $this->info('No organizations found.');
            return self::SUCCESS;
        }

        $settings = app(SettingsService::class);
        $sequenceService = app(SequenceService::class);

        foreach ($organizations as $org) {
            $this->info("Organization: {$org->name} (ID: {$org->id})");
            $settings->forOrganization($org->id);

            $billing = $settings->getGroup('billing');
            $pricing = $settings->getGroup('pricing');
            $locale = $settings->getGroup('locale');
            $shipping = $settings->getGroup('shipping_config');

            $copied = [];

            if (!isset($shipping['tax_rate']) && isset($billing['tax_rate'])) {
                $settings->set('shipping_config', 'tax_rate', $billing['tax_rate']);
                $copied[] = 'tax_rate (from billing)';
            }
            if (!isset($shipping['tax_name']) && isset($billing['tax_name'])) {
                $settings->set('shipping_config', 'tax_name', $billing['tax_name']);
                $copied[] = 'tax_name (from billing)';
            }
            if (!isset($shipping['volumetric_divisor']) && isset($pricing['volumetric_divisor'])) {
                $settings->set('shipping_config', 'volumetric_divisor', $pricing['volumetric_divisor']);
                $copied[] = 'volumetric_divisor (from pricing)';
            }
            if (!isset($shipping['base_surcharge']) && array_key_exists('base_surcharge', $pricing)) {
                $settings->set('shipping_config', 'base_surcharge', $pricing['base_surcharge'] ?? 0);
                $copied[] = 'base_surcharge (from pricing)';
            }
            if (!isset($shipping['fuel_surcharge_percent']) && array_key_exists('fuel_surcharge_percent', $pricing)) {
                $settings->set('shipping_config', 'fuel_surcharge_percent', $pricing['fuel_surcharge_percent'] ?? 0);
                $copied[] = 'fuel_surcharge_percent (from pricing)';
            }
            if (!isset($shipping['insurance_percent']) && array_key_exists('insurance_percent', $pricing)) {
                $settings->set('shipping_config', 'insurance_percent', $pricing['insurance_percent'] ?? 0);
                $copied[] = 'insurance_percent (from pricing)';
            }
            if (!isset($shipping['weight_unit']) && isset($locale['weight_unit'])) {
                $settings->set('shipping_config', 'weight_unit', $locale['weight_unit']);
                $copied[] = 'weight_unit (from locale)';
            }
            if (!isset($shipping['dimension_unit']) && isset($locale['dimension_unit'])) {
                $settings->set('shipping_config', 'dimension_unit', $locale['dimension_unit']);
                $copied[] = 'dimension_unit (from locale)';
            }

            if (!empty($copied)) {
                $this->line('  Copied: ' . implode(', ', $copied));
            } else {
                $this->line('  No keys to copy (shipping_config already set or legacy missing).');
            }

            $trackingExists = NumberingSequence::where('organization_id', $org->id)->where('type', 'tracking')->exists();
            if (!$trackingExists) {
                $sequenceService->ensureTrackingSequence($org->id);
                $this->line('  Created numbering_sequences type=tracking.');
            }
        }

        $this->info('Sync complete. Clear cache if needed: php artisan cache:clear');
        return self::SUCCESS;
    }
}
