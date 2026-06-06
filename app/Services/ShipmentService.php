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

use App\Models\Organization;
use App\Models\Shipment;
use Illuminate\Support\Str;

class ShipmentService
{
    /**
     * Generate a unique tracking number for the organization.
     * Format: PRE-TIMESTAMP-RANDOM (e.g., DEP-17382-XA9)
     * or purely random like: DEP-ABC1234
     */
    public function generateTrackingNumber(Organization $organization): string
    {
        $prefix = strtoupper(substr($organization->slug ?? 'DEP', 0, 3));

        do {
            // Option 1: Timestamp based (Sequential-ish)
            // $number = $prefix . '-' . now()->timestamp . '-' . strtoupper(Str::random(3));

            // Option 2: Random String (Cleaner) e.g., DEP-9X2YAB
            $uniquePart = strtoupper(Str::random(8));
            $number = "{$prefix}-{$uniquePart}";

        } while (Shipment::where('tracking_number', $number)->exists());

        return $number;
    }

    /**
     * Calculate Shipping Rate (Stub).
     */
    public function calculateRate(array $packageDetails, string $serviceType): float
    {
        // Simple weight-based logic for now
        $weight = $packageDetails['weight'] ?? 1;
        $baseRate = match ($serviceType) {
            'express' => 20.00,
            'overnight' => 50.00,
            default => 10.00,
        };

        return $baseRate + ($weight * 2.50);
    }
}
