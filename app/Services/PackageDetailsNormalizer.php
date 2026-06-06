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

/**
 * Normalizes heterogeneous package_details into a standard structure.
 * Handles: wizard format, MercadoLibre items array, flat format.
 * Output is always compatible with LocalCarrierAdapter and rate calculation.
 */
class PackageDetailsNormalizer
{
    /**
     * Normalize raw package_details from any supported format.
     *
     * @param mixed $rawPackageDetails Can be:
     *   - wizard: { weight, dimensions:{length,width,height}, pieces, content_description }
     *   - MercadoLibre: array of items [{quantity, unit_price, ...}, ...]
     *   - flat: { weight, length, width, height, declared_value }
     * @param string $weightUnit 'kg' or 'lb'
     * @param string $dimensionUnit 'cm' or 'in'
     * @return array { packages: [...], summary: { total_weight, total_pieces, max_dims, declared_value_total, chargeable_weight, volumetric_weight } }
     */
    public static function normalize($rawPackageDetails, string $weightUnit = 'kg', string $dimensionUnit = 'cm', float $volumetricDivisor = 5000.0): array
    {
        $packages = self::extractPackages($rawPackageDetails);
        $normalized = [];
        $totalWeight = 0.0;
        $totalPieces = 0;
        $totalDeclaredValue = 0.0;
        $maxLength = 0.0;
        $maxWidth = 0.0;
        $maxHeight = 0.0;

        foreach ($packages as $p) {
            $np = self::normalizeSinglePackage($p, $weightUnit, $dimensionUnit);
            $normalized[] = $np;
            $totalWeight += (float) ($np['weight'] ?? 0);
            $totalPieces += (int) ($np['pieces'] ?? 1);
            $totalDeclaredValue += (float) ($np['declared_value'] ?? 0);
            $maxLength = max($maxLength, (float) ($np['length'] ?? 0));
            $maxWidth = max($maxWidth, (float) ($np['width'] ?? 0));
            $maxHeight = max($maxHeight, (float) ($np['height'] ?? 0));
        }

        if (empty($normalized)) {
            $normalized[] = [
                'weight' => 1.0,
                'length' => 10.0,
                'width' => 10.0,
                'height' => 10.0,
                'pieces' => 1,
                'declared_value' => 0.0,
                'content_description' => '',
                'items' => [],
            ];
            $totalWeight = 1.0;
            $totalPieces = 1;
            $maxLength = $maxWidth = $maxHeight = 10.0;
        }

        if ($volumetricDivisor < 1) {
            $volumetricDivisor = 5000.0;
        }
        $volumetricWeight = ($maxLength * $maxWidth * $maxHeight) / $volumetricDivisor;
        $chargeableWeight = max($totalWeight, $volumetricWeight);

        return [
            'packages' => $normalized,
            'summary' => [
                'total_weight' => round($totalWeight, 4),
                'total_pieces' => $totalPieces,
                'max_dims' => ['length' => $maxLength, 'width' => $maxWidth, 'height' => $maxHeight],
                'declared_value_total' => round($totalDeclaredValue, 2),
                'chargeable_weight' => round($chargeableWeight, 4),
                'volumetric_weight' => round($volumetricWeight, 4),
            ],
        ];
    }

    /**
     * Extract a flat package_details array for rate calculation (single aggregated package).
     * Used by LocalCarrierAdapter.
     */
    public static function toRatePayload(array $normalized): array
    {
        $s = $normalized['summary'] ?? [];
        return [
            'weight' => $s['total_weight'] ?? 1,
            'length' => ($s['max_dims']['length'] ?? 10) ?: 10,
            'width' => ($s['max_dims']['width'] ?? 10) ?: 10,
            'height' => ($s['max_dims']['height'] ?? 10) ?: 10,
            'declared_value' => $s['declared_value_total'] ?? 0,
            'pieces' => $s['total_pieces'] ?? 1,
            'content_description' => implode(', ', array_filter(array_column($normalized['packages'] ?? [], 'content_description'))),
        ];
    }

    private static function extractPackages($raw): array
    {
        if (!is_array($raw)) {
            return [];
        }

        // Already normalized (packages + summary)
        if (isset($raw['packages']) && is_array($raw['packages'])) {
            return $raw['packages'];
        }

        // Array of packages: wizard format ({ weight, length, width, height, pieces, declared_value }) vs MercadoLibre (quantity, unit_price, dimensions)
        if (isset($raw[0]) && is_array($raw[0])) {
            $first = $raw[0];
            $hasWizardFormat = isset($first['length']) || isset($first['width']) || (isset($first['declared_value']) && !isset($first['unit_price']) && !isset($first['unit_value']));
            if ($hasWizardFormat) {
                return $raw; // Wizard packages: will be normalized by normalizeSinglePackage
            }
            return self::mlItemsToPackages($raw);
        }

        // Wizard: packages[] array
        if (isset($raw['packages']) && is_array($raw['packages'])) {
            return $raw['packages'];
        }

        // Flat or wizard single: one package
        if (isset($raw['weight']) || isset($raw['length']) || isset($raw['dimensions'])) {
            return [$raw];
        }

        return [];
    }

    private static function mlItemsToPackages(array $items): array
    {
        $packages = [];
        foreach ($items as $item) {
            $qty = (int) ($item['quantity'] ?? 1);
            $unitPrice = (float) ($item['unit_price'] ?? $item['unit_value'] ?? 0);
            $weight = (float) ($item['weight'] ?? 0);
            $dimensions = $item['dimensions'] ?? [];
            $packages[] = [
                'weight' => $weight ?: 0.5,
                'length' => $dimensions['length'] ?? 10,
                'width' => $dimensions['width'] ?? 10,
                'height' => $dimensions['height'] ?? 10,
                'pieces' => $qty,
                'declared_value' => $qty * $unitPrice,
                'content_description' => $item['title'] ?? $item['description'] ?? '',
                'items' => [$item],
            ];
        }
        if (empty($packages)) {
            $packages[] = ['weight' => 1, 'length' => 10, 'width' => 10, 'height' => 10, 'pieces' => 1, 'declared_value' => 0, 'content_description' => ''];
        }
        return $packages;
    }

    private static function normalizeSinglePackage(array $p, string $weightUnit, string $dimensionUnit): array
    {
        $weight = self::normalizeWeight((float) ($p['weight'] ?? 1), $weightUnit);
        $dims = $p['dimensions'] ?? $p;
        $length = self::normalizeDimension((float) ($dims['length'] ?? 0), $dimensionUnit) ?: 10;
        $width = self::normalizeDimension((float) ($dims['width'] ?? 0), $dimensionUnit) ?: 10;
        $height = self::normalizeDimension((float) ($dims['height'] ?? 0), $dimensionUnit) ?: 10;

        return [
            'weight' => $weight,
            'length' => $length,
            'width' => $width,
            'height' => $height,
            'pieces' => (int) ($p['pieces'] ?? 1) ?: 1,
            'declared_value' => (float) ($p['declared_value'] ?? 0),
            'content_description' => (string) ($p['content_description'] ?? ''),
            'items' => $p['items'] ?? [],
        ];
    }

    private static function normalizeWeight(float $value, string $unit): float
    {
        return $unit === 'lb' ? $value * 0.453592 : $value;
    }

    private static function normalizeDimension(float $value, string $unit): float
    {
        return $unit === 'in' ? $value * 2.54 : $value;
    }
}
