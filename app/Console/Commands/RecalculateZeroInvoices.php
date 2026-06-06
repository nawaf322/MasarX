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
use Illuminate\Support\Facades\DB;

class RecalculateZeroInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:recalc-zeros';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate shipments with 0.00 total based on current rates matched by service type.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $shipments = Shipment::where('total', '<=', 0)
            ->where('status', '!=', 'cancelled')
            ->get();

        if ($shipments->isEmpty()) {
            $this->info("No zero-value shipments found.");
            return;
        }

        $this->info("Found {$shipments->count()} shipments with 0.00 total. Processing...");

        $bar = $this->output->createProgressBar($shipments->count());
        $bar->start();

        foreach ($shipments as $shipment) {
            try {
                // 1. Prepare Payload (normalize package_details for rate calculation)
                $cfg = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($shipment->organization_id);
                $normalized = $shipment->package_details_normalized;
                $payload = [
                    'sender_details' => $shipment->sender_details,
                    'receiver_details' => $shipment->receiver_details,
                    'package_details' => \App\Services\PackageDetailsNormalizer::toRatePayload($normalized),
                    'weight_unit' => $cfg['weight_unit'] ?? 'kg',
                    'dimension_unit' => $cfg['dimension_unit'] ?? 'cm',
                    'target_currency' => $shipment->currency ?? 'USD',
                    'organization_id' => $shipment->organization_id,
                ];

                // 2. Get Rates
                // Assuming Local Carrier for now. Logic could be improved to detect carrier.
                $adapter = CarrierFactory::make('local');
                $rates = $adapter->getRates($payload);

                // 3. Match Service
                $matchedRate = null;
                $serviceTypeValue = $shipment->service_type instanceof \App\Enums\ServiceType
                    ? $shipment->service_type->value
                    : $shipment->service_type;

                foreach ($rates as $rate) {
                    if (strcasecmp($rate['service_code'], $serviceTypeValue) === 0) {
                        $matchedRate = $rate;
                        break;
                    }
                }

                if ($matchedRate) {
                    $shipment->update([
                        'subtotal' => $matchedRate['total_price'],
                        'total' => $matchedRate['total_price'],
                        'currency' => $matchedRate['currency'],
                        'exchange_rate' => $matchedRate['exchange_rate'] ?? 1.0,
                        'rate_rule_id' => $matchedRate['rate_rule_id'],
                        'rate_card_id' => $matchedRate['rate_card_id'],
                    ]);
                } else {
                    $this->warn("
No matching rate found for Shipment {$shipment->tracking_number} (Service: {$serviceTypeValue})");
                }

            } catch (\Exception $e) {
                $this->error("
Error processing Shipment {$shipment->tracking_number}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->info("
Recalculation complete.");
    }
}
