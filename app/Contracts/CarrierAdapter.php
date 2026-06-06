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

namespace App\Contracts;

use App\DTO\RateDto;
use App\DTO\ShipmentDto;

interface CarrierAdapter
{
    /**
     * Get shipping rates for a given shipment.
     *
     * @param ShipmentDto $shipment
     * @return RateDto[]
     */
    public function getRates(ShipmentDto $shipment): array;

    /**
     * Create a shipping label.
     * 
     * @param ShipmentDto $shipment
     * @return array {tracking_number: string, label_url: string, cost: float}
     */
    public function createLabel(ShipmentDto $shipment): array;

    /**
     * Void/Cancel a shipment.
     */
    public function voidLabel(string $trackingNumber): bool;
}
