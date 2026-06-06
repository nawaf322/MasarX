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
use App\Services\Carriers\CarrierFactory;

class FixZeroInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:fix-zeros';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate invoices with $0.00 total based on current rate cards';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting Finance Sanitation...");

        $shipments = Shipment::where('total', '<=', 0)
            ->where('status', '!=', 'cancelled')
            ->get();

        $count = $shipments->count();
        $this->info("Found {$count} shipments with $0.00 total.");

        if ($count === 0) {
            return;
        }

        $fixed = 0;
        $adapter = CarrierFactory::make('local');

        foreach ($shipments as $shipment) {
            try {
                $cfg = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($shipment->organization_id);
                $normalized = $shipment->package_details_normalized;
                $payload = [
                    'sender_details' => $shipment->sender_details,
                    'receiver_details' => $shipment->receiver_details,
                    'package_details' => \App\Services\PackageDetailsNormalizer::toRatePayload($normalized),
                    'weight_unit' => $cfg['weight_unit'] ?? 'kg',
                    'dimension_unit' => $cfg['dimension_unit'] ?? 'cm',
                    'organization_id' => $shipment->organization_id,
                ];

                $rates = $adapter->getRates($payload);

                // Strategy: Pick the CHEAPEST valid rate if we don't know which one was picked originally 
                // OR pick the one matching 'service_type' if available.

                $pickedRate = null;
                foreach ($rates as $rate) {
                    if ($shipment->service_type && $rate['service_code'] === $shipment->service_type) {
                        $pickedRate = $rate;
                        break;
                    }
                }

                // Fallback to first if no match (Sanitation effort)
                if (!$pickedRate && !empty($rates)) {
                    $pickedRate = $rates[0];
                }

                if ($pickedRate) {
                    $shipment->update([
                        'total' => $pickedRate['total_price'],
                        'subtotal' => $pickedRate['total_price'],
                        'currency' => $pickedRate['currency'],
                        'rate_card_id' => $pickedRate['rate_card_id'],
                        'rate_rule_id' => $pickedRate['rate_rule_id']
                    ]);

                    $fixed++;
                    $this->info("Fixed Shipment {$shipment->tracking_number}: Now {$pickedRate['total_price']} {$pickedRate['currency']}");
                } else {
                    $this->warn("Could not find valid rate for {$shipment->tracking_number}. Skipping.");
                }

            } catch (\Exception $e) {
                $this->error("Error processing {$shipment->tracking_number}: " . $e->getMessage());
            }
        }

        $this->info("Sanitation Complete. Fixed {$fixed} of {$count} shipments.");
    }
}
