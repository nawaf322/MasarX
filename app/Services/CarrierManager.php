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

use App\Contracts\CarrierAdapter;
use App\DTO\ShipmentDto;
use App\Models\Organization;
use App\Adapters\DHLAdapter;
use App\Adapters\FedExAdapter;
use App\Adapters\UPSAdapter;
use App\Adapters\USPSAdapter;

class CarrierManager
{
    /**
     * Get enabled adapters for an organization.
     * 
     * @return CarrierAdapter[]
     */
    public function getAdapters(Organization $organization): array
    {
        // Credentials come from CarrierAccount (carrier_accounts), not carrier_configs (legacy).
        // ShippingRateService uses CarrierAccount for DHL/FedEx quote/label.
        return [
            new DHLAdapter(),
            new FedExAdapter(),
            new UPSAdapter(),
            new USPSAdapter(),
        ];
    }

    /**
     * Rate Shopping: Get rates from all adapters and sort them.
     */
    public function shopRates(Organization $organization, ShipmentDto $shipment): array
    {
        $adapters = $this->getAdapters($organization);
        $allRates = [];

        foreach ($adapters as $adapter) {
            try {
                $rates = $adapter->getRates($shipment);
                $allRates = array_merge($allRates, $rates);
            } catch (\Exception $e) {
                // Log error, continue to next carrier
            }
        }

        // Sort by cost ascending
        usort($allRates, fn($a, $b) => $a->cost <=> $b->cost);

        return $allRates;
    }
}
