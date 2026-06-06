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

interface CarrierStrategy
{
    /**
     * Get shipping rates for a potential shipment.
     * 
     * @param array $payload (sender, receiver, package details)
     * @return array List of rates [{service_code, service_name, total_price, currency, estimated_days}]
     */
    public function getRates(array $payload): array;

    /**
     * Create a shipping label.
     *
     * @param Shipment $shipment
     * @return array {tracking_number, label_url, carrier_ref?, cost?, is_stub?}
     */
    public function createLabel(Shipment $shipment): array;

    /**
     * Track a shipment.
     * 
     * @param string $trackingNumber
     * @return array {status, events: [...]}
     */
    public function track(string $trackingNumber): array;
}
