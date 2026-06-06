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

namespace App\Services\Carriers;

use App\Models\Shipment;
use Illuminate\Support\Str;



class LocalCarrierAdapter implements CarrierStrategy
{
    private function normalizeWeight($value, $unit)
    {
        $value = floatval($value);
        if ($unit === 'lb') {
            return $value * 0.453592; // Convert lb to kg
        }
        return $value; // Assume kg
    }

    private function normalizeDimension($value, $unit)
    {
        $value = floatval($value);
        if ($unit === 'in') {
            return $value * 2.54; // Convert in to cm
        }
        return $value; // Assume cm
    }

    private function resolveCountry(array $details): ?\App\Models\Country
    {
        $countryId = $details['country_id'] ?? null;
        if ($countryId && is_numeric($countryId)) {
            $c = \App\Models\Country::find((int) $countryId);
            if ($c) {
                return $c;
            }
        }
        $code = $details['country_code'] ?? $details['country'] ?? '';
        if (empty($code)) {
            return null;
        }
        // Try iso2 (US, CO, etc.)
        $country = \App\Models\Country::where('iso2', strtoupper($code))->first();
        if ($country) {
            return $country;
        }
        // Try by name (USA, United States, etc.)
        return \App\Models\Country::where('name', 'like', '%' . $code . '%')->first();
    }

    private function buildInternalFallbackRate(
        array $payload,
        int $organizationId,
        float $actualWeight,
        float $chargeableWeight,
        float $volumetricWeight,
        float $length,
        float $width,
        float $height,
        array $cfg,
        ?string $serviceName = null,
        ?string $serviceCode = null,
        ?\App\Models\Service $serviceModel = null
    ): array {
        // Moneda objetivo desde locale (configuración de la organización)
        $targetCurrency = (string) ($cfg['currency'] ?? 'USD');
        
        // Si hay un modelo de servicio, usar sus precios configurados
        if ($serviceModel) {
            $serviceCurrency = (string) ($serviceModel->currency ?? 'USD');
            $basePrice = (float) ($serviceModel->base_price ?? $cfg['default_base_price']);
            $pricePerKg = (float) ($serviceModel->price_per_kg ?? $cfg['default_price_per_kg']);
            
            // Convertir precios del servicio a la moneda de locale si es diferente
            if ($serviceCurrency !== $targetCurrency) {
                $currencyService = app(\App\Services\CurrencyService::class);
                $basePrice = $currencyService->convert($basePrice, $serviceCurrency, $targetCurrency);
                $pricePerKg = $currencyService->convert($pricePerKg, $serviceCurrency, $targetCurrency);
            }
        } else {
            // Use prices from shipping_config settings (configurable via Settings > Shipping Config).
            // SettingsResolver always provides these keys with org-specific or global defaults.
            $basePrice = (float) $cfg['default_base_price'];
            $pricePerKg = (float) $cfg['default_price_per_kg'];
            $serviceCurrency = 'USD';

            // Convert to locale currency if different from USD
            if ($targetCurrency !== 'USD') {
                $currencyService = app(\App\Services\CurrencyService::class);
                $basePrice = $currencyService->convert($basePrice, 'USD', $targetCurrency);
                $pricePerKg = $currencyService->convert($pricePerKg, 'USD', $targetCurrency);
            }
        }
        
        $subtotal = $basePrice + ($chargeableWeight * $pricePerKg);
        $declaredValue = (float) ($payload['package_details']['declared_value'] ?? 0);
        $baseSurcharge = (float) ($cfg['base_surcharge'] ?? 0);
        $globalFuelPercent = (float) ($cfg['fuel_surcharge_percent'] ?? 0) / 100;
        $globalInsurancePercent = (float) ($cfg['insurance_percent'] ?? 0) / 100;
        $fuel = $subtotal * $globalFuelPercent;
        $insurance = $declaredValue > 0 ? $declaredValue * $globalInsurancePercent : $subtotal * ($globalInsurancePercent * 0.5);
        $globalTaxRate = (float) ($cfg['tax_rate'] ?? 0) / 100;
        $tax = ($subtotal + $fuel + $insurance) * $globalTaxRate;
        $total = round($subtotal + $fuel + $insurance + $tax + $baseSurcharge, 2);
        $currency = $targetCurrency;

        $name = $serviceName ?? __('shipments.wizard.internal_service');
        $code = $serviceCode ?? 'internal';
        // Usar estimated_days del servicio si está disponible, sino desde configuración
        $estimatedDays = $serviceModel && isset($serviceModel->estimated_days)
            ? (int) $serviceModel->estimated_days
            : (int) ($cfg['default_estimated_days'] ?? 3);
        
        return [
            'service_code' => $code,
            'service_name' => $name,
            'carrier_name' => $name,
            'carrier_code' => 'local',
            'total_price' => number_format($total, 2, '.', ''),
            'currency' => $currency,
            'estimated_days' => $estimatedDays,
            'is_stub' => false,
            'rate_card_id' => null,
            'rate_rule_id' => null,
            'exchange_rate' => 1.0,
            'breakdown' => [
                'subtotal' => $subtotal,
                'base' => $basePrice,
                'weight_charge' => $chargeableWeight * $pricePerKg,
                'fuel' => $fuel,
                'insurance' => $insurance,
                'tax' => $tax,
                'base_surcharge' => $baseSurcharge,
                'global_tax_applied' => $globalTaxRate * 100,
            ]
        ];
    }

    public function getRates(array $payload): array
    {
        $organizationId = $payload['organization_id']
            ?? (\Illuminate\Support\Facades\Auth::user()?->organization_id);

        if (!$organizationId) {
            // If running in CLI without auth and no payload ID, we can't calculate rates
            return [];
        }

        // 1. Resolve Locations to IDs (country_code or country name/iso2)
        $originCountry = $this->resolveCountry($payload['sender_details'] ?? []);
        $destCountry = $this->resolveCountry($payload['receiver_details'] ?? []);

        $originCountryId = $originCountry ? $originCountry->id : null;
        $destCountryId = $destCountry ? $destCountry->id : null;

        // Weight Logic (Chargeable Weight)
        // Normalize everything to Metric (KG / CM) for calculation
        $inputWeightUnit = $payload['weight_unit'] ?? 'kg';
        $inputDimUnit = $payload['dimension_unit'] ?? 'cm';

        $actualWeight = $this->normalizeWeight($payload['package_details']['weight'] ?? 1, $inputWeightUnit);
        $length = $this->normalizeDimension($payload['package_details']['length'] ?? 0, $inputDimUnit);
        $width = $this->normalizeDimension($payload['package_details']['width'] ?? 0, $inputDimUnit);
        $height = $this->normalizeDimension($payload['package_details']['height'] ?? 0, $inputDimUnit);

        // Effective settings: shipping_config with fallback to pricing/locale/billing
        $resolver = app(\App\Services\Settings\SettingsResolver::class);
        $cfg = $resolver->getEffectiveSettings($organizationId);
        $volumetricDivisor = (float) ($cfg['volumetric_divisor'] ?? 5000);
        if ($volumetricDivisor < 1) {
            $volumetricDivisor = 5000;
        }
        $baseSurcharge = (float) ($cfg['base_surcharge'] ?? 0);
        $globalFuelPercent = (float) ($cfg['fuel_surcharge_percent'] ?? 0);
        $globalInsurancePercent = (float) ($cfg['insurance_percent'] ?? 0);

        // 2. Query Active Rate Cards
        $rateCards = \App\Models\RateCard::where('organization_id', $organizationId)
            ->where('active', true)
            ->get();

        $rates = [];

        $zoneMatcher = app(\App\Services\Rates\RateZoneMatcher::class);
        $originStateId = $payload['sender_details']['state_id'] ?? $payload['sender_details']['origin_state_id'] ?? null;
        $destStateId = $payload['receiver_details']['state_id'] ?? $payload['receiver_details']['dest_state_id'] ?? null;
        $originCityId = $payload['sender_details']['city_id'] ?? $payload['sender_details']['origin_city_id'] ?? null;
        $destCityId = $payload['receiver_details']['city_id'] ?? $payload['receiver_details']['dest_city_id'] ?? null;

        foreach ($rateCards as $card) {
            // Chargeable weight per RateCard (each card can have different rule/divisor)
            $cardDivisor = (float) ($card->volumetric_divisor ?? $volumetricDivisor) ?: $volumetricDivisor;
            $volumetricWeight = ($length * $width * $height) > 0
                ? ($length * $width * $height) / $cardDivisor
                : 0;
            $chargeableWeight = match ($card->chargeable_weight_rule ?? 'max') {
                'actual' => $actualWeight,
                'volumetric' => $volumetricWeight,
                default => max($actualWeight, $volumetricWeight),
            };

            // 3. Find Matching Zones
            $zones = $zoneMatcher->findMatchingZones(
                $organizationId,
                $originCountryId,
                $destCountryId,
                $originStateId,
                $destStateId,
                $originCityId,
                $destCityId
            );

            foreach ($zones as $zone) {
                // 4. Find ALL Matching Rules (Standard, Express, Economy - each with different pricing)
                $rules = \App\Models\RateRule::where('rate_card_id', $card->id)
                    ->where('rate_zone_id', $zone->id)
                    ->where('active', true)
                    ->where('min_weight', '<=', $chargeableWeight)
                    ->where('max_weight', '>=', $chargeableWeight)
                    ->orderBy('service_type')
                    ->get();

                foreach ($rules as $rule) {
                    // 5. Calculate Price (convention: chargeableWeight in KG, use price_per_kg or convert price_per_lb)
                    $basePrice = $rule->flat_price ?? 0;
                    $pricePerKg = $rule->effective_price_per_kg;
                    $weightPrice = $pricePerKg * $chargeableWeight;

                    $subtotal = $basePrice + $weightPrice + ($rule->handling_fee ?? 0);
                    $subtotal = max($subtotal, $rule->min_charge ?? 0);

                    // Fuel & Insurance: rule value if set, else global (Settings > Pricing)
                    $fuelPercent = $rule->fuel_surcharge_percent !== null && (float) $rule->fuel_surcharge_percent > 0
                        ? (float) $rule->fuel_surcharge_percent
                        : $globalFuelPercent;
                    $insurancePercent = $rule->insurance_percent !== null && (float) $rule->insurance_percent > 0
                        ? (float) $rule->insurance_percent
                        : $globalInsurancePercent;
                    $fuel = $subtotal * ($fuelPercent / 100);
                    $insurance = ($payload['package_details']['declared_value'] ?? 0) * ($insurancePercent / 100);

                    // LOCAL TAX (Rule-based)
                    $ruleTax = $subtotal * (($rule->tax_percent ?? 0) / 100);

                    // GLOBAL TAX (shipping_config or fallback billing)
                    $globalTaxRate = (float) ($cfg['tax_rate'] ?? 0);
                    $globalTax = $subtotal * ($globalTaxRate / 100);

                    $tax = $ruleTax + $globalTax;

                    // Total: subtotal + fuel + insurance + tax + global base surcharge (flat fee from Settings > Pricing)
                    $total = $subtotal + $fuel + $insurance + $tax + $baseSurcharge;

                    // Rounding
                    if ($rule->rounding_rule === 'ceil')
                        $total = ceil($total);
                    if ($rule->rounding_rule === 'floor')
                        $total = floor($total);
                    if ($rule->rounding_rule === 'nearest')
                        $total = round($total);

                    $rates[] = [
                        'service_code' => $rule->service_type,
                        'service_name' => $card->name . ' - ' . $rule->service_type,
                        'carrier_code' => 'local',
                        'carrier_name' => $card->name,
                        'zone_name' => $zone->name,
                        'total_price' => number_format($total, 2, '.', ''),
                        'currency' => $card->currency,
                        'estimated_days' => (int) ($cfg['default_estimated_days'] ?? 3),
                        'is_stub' => false,
                        'rate_card_id' => $card->id,
                        'rate_rule_id' => $rule->id,
                        'breakdown' => [
                            'subtotal' => $subtotal,
                            'base' => $basePrice,
                            'weight_charge' => $weightPrice,
                            'handling_fee' => (float) ($rule->handling_fee ?? 0),
                            'min_charge' => (float) ($rule->min_charge ?? 0),
                            'fuel' => $fuel,
                            'fuel_percent' => $fuelPercent,
                            'insurance' => $insurance,
                            'insurance_percent' => $insurancePercent,
                            'tax' => $tax,
                            'base_surcharge' => $baseSurcharge,
                            'chargeable_weight' => $chargeableWeight,
                            'price_per_kg' => $pricePerKg,
                            'global_tax_applied' => $globalTaxRate,
                        ]
                    ];
                }
            }
        }

        // ── Services (Settings > Services) ─────────────────────────────────────
        // Each active Service produces one real rate option with its own pricing.
        // Runs regardless of whether rate-card rules matched above.
        $activeServices = \App\Models\Service::activeForOrganization($organizationId);

        if ($activeServices->isNotEmpty()) {
            $svcVolumetricWeight = ($length * $width * $height) > 0
                ? ($length * $width * $height) / $volumetricDivisor
                : 0;
            $svcChargeableWeight = max($actualWeight, $svcVolumetricWeight) ?: max($actualWeight, 1.0);

            foreach ($activeServices as $service) {
                // Prefix prevents collision with RateRule service_type free-text (e.g. "Standard")
                $svcCode = 'svc_' . $service->code;

                $svcRate = $this->buildInternalFallbackRate(
                    $payload,
                    $organizationId,
                    $actualWeight,
                    $svcChargeableWeight,
                    $svcVolumetricWeight,
                    $length ?: 10,
                    $width ?: 10,
                    $height ?: 10,
                    $cfg,
                    $service->name,
                    $svcCode,
                    $service
                );

                $svcRate['carrier_name']     = $service->name;
                $svcRate['carrier_code']     = 'local';
                $svcRate['service_name']     = $service->name;
                $svcRate['service_code']     = $svcCode;
                $svcRate['service_mode']     = $service->mode;      // 'air' | 'sea' | 'land'
                $svcRate['is_stub']          = false;
                $svcRate['service_model_id'] = $service->id;

                $rates[] = $svcRate;
            }
        }

        // Hard fallback: only when NEITHER rate-card rules NOR services are configured.
        // Guarantees the wizard always has at least one option to show.
        if (empty($rates)) {
            $volumetricWeight = ($length * $width * $height) > 0
                ? ($length * $width * $height) / $volumetricDivisor
                : 0;
            $chargeableWeight = max($actualWeight, $volumetricWeight) ?: max($actualWeight, 1.0);

            $rates[] = $this->buildInternalFallbackRate(
                $payload,
                $organizationId,
                $actualWeight,
                $chargeableWeight,
                $volumetricWeight,
                $length ?: 10,
                $width ?: 10,
                $height ?: 10,
                $cfg
            );
        }

        // Currency Conversion Logic
        $currencyService = app(\App\Services\CurrencyService::class);
        $currencies = $currencyService->getActiveCurrencies()->keyBy('code');
        $targetCurrency = $payload['target_currency'] ?? null;

        foreach ($rates as &$rate) {
            // If target currency is requested and different, convert
            if ($targetCurrency && $rate['currency'] !== $targetCurrency) {
                $originalCurrency = $rate['currency'];
                $originalTotal = floatval($rate['total_price']);
                $convertedTotal = $currencyService->convert($originalTotal, $originalCurrency, $targetCurrency);
                $rate['total_price'] = number_format($convertedTotal, 2, '.', '');

                // Also convert all breakdown numeric fields
                $breakdownFields = ['base', 'weight_charge', 'handling_fee', 'subtotal', 'fuel', 'insurance', 'tax', 'base_surcharge', 'min_charge'];
                if (isset($rate['breakdown']) && is_array($rate['breakdown'])) {
                    foreach ($breakdownFields as $field) {
                        if (isset($rate['breakdown'][$field]) && is_numeric($rate['breakdown'][$field])) {
                            $rate['breakdown'][$field] = number_format(
                                $currencyService->convert(floatval($rate['breakdown'][$field]), $originalCurrency, $targetCurrency),
                                2, '.', ''
                            );
                        }
                    }
                }

                $rate['currency'] = $targetCurrency;
            }

            // Append Exchange Rate for storage
            $currencyCode = $rate['currency'];
            $currencyModel = $currencies->get($currencyCode);
            $rate['exchange_rate'] = $currencyModel ? $currencyModel->exchange_rate : 1.0;
        }

        return $rates;
    }

    public function createLabel(Shipment $shipment): array
    {
        // Generate internal tracking number if not already present or force new one
        $trackingNumber = $shipment->tracking_number ?? 'DEP-' . strtoupper(Str::random(10));

        return [
            'tracking_number' => $trackingNumber,
            'label_url' => route('shipments.label', $shipment->id), // Internal label route
            'carrier_ref' => 'INTERNAL-' . $shipment->id,
            'cost' => (float) ($shipment->total ?? 0),
            'is_stub' => false,
        ];
    }

    public function track(string $trackingNumber): array
    {
        // For local carrier, we just point to our internal DB logic generally.
        // This method might be used if we want to standardize the return format 
        // regardless of where the data comes from.
        return [
            'status' => 'unknown', // Handled by internal Observer usually
            'events' => []
        ];
    }
}
