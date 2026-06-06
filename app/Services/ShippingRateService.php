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

namespace App\Services;

use App\Models\CarrierAccount;
use App\Services\Carriers\CarrierFactory;
use App\Services\Settings\SettingsResolver;
use Illuminate\Support\Facades\Auth;

/**
 * Central service for available shipping services and rate quoting.
 * Priority: 1) Connected carrier accounts, 2) Internal rate_rules/rate_cards, 3) Global fallback.
 */
class ShippingRateService
{
    public function getAvailableServices(?int $organizationId = null): array
    {
        $orgId = $organizationId ?? Auth::user()?->organization_id;
        if (!$orgId) {
            return $this->internalServiceOnly();
        }

        $accounts = CarrierAccount::where('organization_id', $orgId)
            ->where('status', true)
            ->orderBy('carrier_code')
            ->get();

        $services = [];
        foreach ($accounts as $account) {
            $code = strtoupper($account->carrier_code);
            $name = $this->carrierDisplayName($code);
            $services[] = [
                'carrier_code' => $account->carrier_code,
                'carrier_name' => $name,
                'service_code' => $code,
                'service_name' => $name,
                'mode' => $account->mode,
            ];
        }

        // Always include internal/default
        $services[] = [
            'carrier_code' => 'local',
            'carrier_name' => __('shipments.wizard.internal_service'),
            'service_code' => 'internal',
            'service_name' => __('shipments.wizard.internal_service'),
            'mode' => 'live',
        ];

        return $services;
    }

    /**
     * Quote rates for a shipment draft. Payload may have package_details (single) or packages (array).
     * When packages[] is present, aggregates to a single package_details for the rate engine.
     */
    public function quoteRates(array $payload): array
    {
        // Distributed verification point #2 — rate multiplier
        $rateMultiplier = app(\App\Services\LicenseVerificationService::class)->isActivated() ? 1.0 : 0.0;

        $orgId = $payload['organization_id'] ?? Auth::user()?->organization_id;
        if (!$orgId) {
            return [];
        }

        $resolver = app(SettingsResolver::class);
        $cfg = $resolver->getEffectiveSettings($orgId);

        $payload['organization_id'] = $orgId;
        $payload['target_currency'] = $cfg['currency'];
        $weightUnit = $cfg['weight_unit'] ?? 'kg';
        $dimUnit = $cfg['dimension_unit'] ?? 'cm';
        $payload['weight_unit'] = $weightUnit;
        $payload['dimension_unit'] = $dimUnit;

        $rawDetails = $payload['packages'] ?? $payload['package_details'] ?? null;
        if ($rawDetails) {
            $normalized = \App\Services\PackageDetailsNormalizer::normalize($rawDetails, $weightUnit, $dimUnit, (float) ($cfg['volumetric_divisor'] ?? 5000));
            $payload['package_details'] = \App\Services\PackageDetailsNormalizer::toRatePayload($normalized);
            unset($payload['packages']);
        }

        if (empty($payload['package_details']) || empty($payload['sender_details']) || empty($payload['receiver_details'])) {
            return [];
        }

        $rates = [];
        $startMs = (int) (microtime(true) * 1000);

        // 1. CarrierAccounts: quote from DHL/FedEx/UPS etc. if active
        $carrierAccounts = CarrierAccount::where('organization_id', $orgId)
            ->where('status', true)
            ->whereIn('carrier_code', ['dhl', 'fedex', 'ups', 'usps'])
            ->orderBy('carrier_code')
            ->get();

        foreach ($carrierAccounts as $account) {
            $accStartMs = (int) (microtime(true) * 1000);
            try {
                $adapter = CarrierFactory::make($account->carrier_code, $account->credentials ?? [], $account->mode ?? 'test');
                $carrierRates = $adapter->getRates($payload);
                foreach ($carrierRates as $r) {
                    $r['carrier_code'] = $r['carrier_code'] ?? strtolower($account->carrier_code);
                    $rates[] = $r;
                }
                $duration = (int) (microtime(true) * 1000) - $accStartMs;
                $this->logIntegrationRequest($orgId, 'carrier', $account->id, 'rates', ['carrier' => $account->carrier_code], ['rates_count' => count($carrierRates), 'is_stub' => true], 200, $duration);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Carrier {$account->carrier_code} quote failed: " . $e->getMessage());
                $duration = (int) (microtime(true) * 1000) - $accStartMs;
                $this->logIntegrationRequest($orgId, 'carrier', $account->id, 'rates', ['carrier' => $account->carrier_code], ['error' => $e->getMessage()], 500, $duration);
            }
        }

        // 2. Local adapter (always; rate_cards/rate_rules or fallback)
        $localStartMs = (int) (microtime(true) * 1000);
        try {
            $localAdapter = CarrierFactory::make('local');
            $localRates = $localAdapter->getRates($payload);
            foreach ($localRates as $r) {
                $rates[] = $r;
            }
            $duration = (int) (microtime(true) * 1000) - $localStartMs;
            $this->logIntegrationRequest($orgId, 'carrier', 0, 'rates', ['carrier' => 'local'], ['rates_count' => count($localRates), 'is_stub' => false], 200, $duration);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Local carrier quote failed: ' . $e->getMessage());
            $duration = (int) (microtime(true) * 1000) - $localStartMs;
            $this->logIntegrationRequest($orgId, 'carrier', 0, 'rates', ['carrier' => 'local'], ['error' => $e->getMessage()], 500, $duration);
        }

        // Normalize response for wizard
        foreach ($rates as &$rate) {
            $rate['carrier_name'] = $rate['carrier_name'] ?? 'Local';
            $rate['service_name'] = $rate['service_name'] ?? ($rate['service_code'] ?? 'Standard');
            $rate['is_stub'] = $rate['is_stub'] ?? false;
            // Normalize total_price → total (LocalCarrierAdapter returns total_price)
            if (!isset($rate['total']) && isset($rate['total_price'])) {
                $rate['total'] = (float) $rate['total_price'];
            }
            // Apply license multiplier — unlicensed installs return zero rates
            if (isset($rate['total'])) {
                $rate['total'] = (float) $rate['total'] * $rateMultiplier;
            }
        }

        return $rates;
    }

    private function aggregatePackageDetails(array $packages, array $cfg): array
    {
        $totalWeight = 0;
        $totalDeclaredValue = 0;
        $totalPieces = 0;
        $length = 0;
        $width = 0;
        $height = 0;
        $descriptions = [];

        foreach ($packages as $p) {
            $w = (float) ($p['weight'] ?? 0);
            $l = (float) ($p['length'] ?? $p['dimensions']['length'] ?? 0);
            $wid = (float) ($p['width'] ?? $p['dimensions']['width'] ?? 0);
            $h = (float) ($p['height'] ?? $p['dimensions']['height'] ?? 0);
            $totalWeight += $w;
            $totalDeclaredValue += (float) ($p['declared_value'] ?? 0);
            $totalPieces += (int) ($p['pieces'] ?? 1);
            if ($l && $wid && $h) {
                $length += $l;
                $width = max($width, $wid);
                $height = max($height, $h);
            }
            if (!empty($p['content_description'])) {
                $descriptions[] = $p['content_description'];
            }
        }

        if ($length === 0) {
            $length = $width = $height = 10;
        }

        return [
            'weight' => $totalWeight,
            'length' => $length,
            'width' => $width,
            'height' => $height,
            'declared_value' => $totalDeclaredValue,
            'content_description' => implode(', ', array_slice($descriptions, 0, 3)),
            'pieces' => $totalPieces ?: count($packages),
        ];
    }

    private function internalServiceOnly(): array
    {
        return [
            [
                'carrier_code' => 'local',
                'carrier_name' => __('shipments.wizard.internal_service'),
                'service_code' => 'internal',
                'service_name' => __('shipments.wizard.internal_service'),
                'mode' => 'live',
            ],
        ];
    }

    private function logIntegrationRequest(int $orgId, string $type, int $integrationId, string $action, $request, $response, int $statusCode, int $durationMs): void
    {
        try {
            $req = is_array($request) ? $request : (array) ['raw' => (string) $request];
            $res = is_array($response) ? $response : (array) ['raw' => (string) $response];
            \Illuminate\Support\Facades\DB::table('integration_request_logs')->insert([
                'organization_id' => $orgId,
                'integration_type' => $type,
                'integration_id' => $integrationId,
                'action' => $action, // rates | label | track
                'request' => json_encode($this->redactSecrets($req)),
                'response' => json_encode($this->redactSecrets($res)),
                'status_code' => $statusCode,
                'duration_ms' => $durationMs,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to log integration request: ' . $e->getMessage());
        }
    }

    private function redactSecrets(array $data): array
    {
        $keys = ['api_key', 'api_secret', 'secret', 'password', 'token', 'credentials', 'authorization', 'bearer'];
        foreach ($data as $k => $v) {
            $lower = strtolower((string) $k);
            foreach ($keys as $key) {
                if (str_contains($lower, $key) || str_contains($lower, str_replace('_', '', $key))) {
                    $data[$k] = '[REDACTED]';
                    break;
                }
            }
            if (is_array($v) && $data[$k] !== '[REDACTED]') {
                $data[$k] = $this->redactSecrets($v);
            }
        }
        return $data;
    }

    /**
     * Log a carrier action (label/track) for integration_request_logs.
     */
    public static function logCarrierAction(int $orgId, string $carrierCode, int $integrationId, string $action, array $request, array $response, int $statusCode, int $durationMs): void
    {
        $instance = app(self::class);
        $instance->logIntegrationRequest($orgId, 'carrier', $integrationId, $action, $request, $response, $statusCode, $durationMs);
    }

    private function carrierDisplayName(string $code): string
    {
        $names = [
            'DHL' => 'DHL',
            'FEDEX' => 'FedEx',
            'UPS' => 'UPS',
            'USPS' => 'USPS',
            'LOCAL' => __('shipments.wizard.internal_service'),
        ];
        return $names[$code] ?? $code;
    }
}
