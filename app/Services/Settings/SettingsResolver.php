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

namespace App\Services\Settings;

use App\Models\OrganizationSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Resolves effective settings per organization for shipment operations.
 * Order: 1) shipping_config, 2) legacy (billing/pricing/locale), 3) hard defaults.
 * Cache: org:{id}:settings:v3 (10 min). Invalidate on any settings update.
 */
class SettingsResolver
{
    private const CACHE_KEY_PREFIX = 'org:';
    private const CACHE_KEY_SUFFIX = ':settings:v3';
    private const CACHE_TTL_SECONDS = 600; // 10 minutes

    public function getEffectiveSettings(?int $organizationId): array
    {
        if ($organizationId === null) {
            return $this->defaults();
        }

        $key = self::CACHE_KEY_PREFIX . $organizationId . self::CACHE_KEY_SUFFIX;

        return Cache::remember($key, self::CACHE_TTL_SECONDS, function () use ($organizationId) {
            return $this->resolve($organizationId);
        });
    }

    /**
     * Invalidate cache for an organization (call after any billing/pricing/locale/shipping_config update).
     */
    public static function forgetCache(int $organizationId): void
    {
        Cache::forget(self::CACHE_KEY_PREFIX . $organizationId . self::CACHE_KEY_SUFFIX);
    }

    private function resolve(int $organizationId): array
    {
        $rows = OrganizationSetting::withoutGlobalScope('tenant')
            ->where('organization_id', $organizationId)
            ->get()
            ->groupBy('group')
            ->map(fn ($group) => $group->pluck('value', 'key')->map(function ($value) {
                $decoded = json_decode($value, true);
                return $decoded;
            })->toArray())
            ->toArray();

        $shipping = $rows['shipping_config'] ?? [];
        $billing = $rows['billing'] ?? [];
        $pricing = $rows['pricing'] ?? [];
        $locale = $rows['locale'] ?? [];

        $defaults = $this->defaults();

        return [
            'tax_rate' => (float) ($shipping['tax_rate'] ?? $billing['tax_rate'] ?? $defaults['tax_rate']),
            'tax_name' => (string) ($shipping['tax_name'] ?? $billing['tax_name'] ?? $defaults['tax_name']),
            'weight_unit' => (string) ($shipping['weight_unit'] ?? $locale['weight_unit'] ?? $defaults['weight_unit']),
            'dimension_unit' => (string) ($shipping['dimension_unit'] ?? $locale['dimension_unit'] ?? $defaults['dimension_unit']),
            'volumetric_divisor' => (float) ($shipping['volumetric_divisor'] ?? $pricing['volumetric_divisor'] ?? $defaults['volumetric_divisor']),
            'base_surcharge' => (float) ($shipping['base_surcharge'] ?? $pricing['base_surcharge'] ?? $defaults['base_surcharge']),
            'fuel_surcharge_percent' => (float) ($shipping['fuel_surcharge_percent'] ?? $pricing['fuel_surcharge_percent'] ?? $defaults['fuel_surcharge_percent']),
            'insurance_percent' => (float) ($shipping['insurance_percent'] ?? $pricing['insurance_percent'] ?? $defaults['insurance_percent']),
            // Internal fallback rate prices (used when no rate card/rule matches)
            'default_base_price' => (float) ($shipping['default_base_price'] ?? $pricing['default_base_price'] ?? $defaults['default_base_price']),
            'default_price_per_kg' => (float) ($shipping['default_price_per_kg'] ?? $pricing['default_price_per_kg'] ?? $defaults['default_price_per_kg']),
            'currency' => (string) ($locale['currency'] ?? $defaults['currency']),
            'language' => (string) ($locale['language'] ?? $defaults['language']),
            'timezone' => (string) ($locale['timezone'] ?? $defaults['timezone']),
            'date_format' => (string) ($locale['date_format'] ?? $defaults['date_format']),
            'time_format' => (string) ($locale['time_format'] ?? $defaults['time_format']),
        ];
    }

    private function defaults(): array
    {
        return [
            'tax_rate' => 0,
            'tax_name' => 'Tax',
            'volumetric_divisor' => 5000,
            'base_surcharge' => 0,
            'fuel_surcharge_percent' => 0,
            'insurance_percent' => 0,
            'default_base_price' => 5.00,
            'default_price_per_kg' => 2.00,
            'weight_unit' => 'kg',
            'dimension_unit' => 'cm',
            'currency' => 'USD',
            'language' => 'en',
            'timezone' => 'UTC',
            'date_format' => 'd/m/Y',
            'time_format' => '24h',
        ];
    }
}
