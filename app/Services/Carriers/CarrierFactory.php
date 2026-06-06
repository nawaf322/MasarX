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

use App\Adapters\DHLAdapter;
use App\Adapters\FedExAdapter;
use App\Adapters\UPSAdapter;
use App\Adapters\USPSAdapter;
use Exception;

class CarrierFactory
{
    /**
     * @param string $carrierName  Carrier code: local, dhl, fedex, ups, usps
     * @param array  $credentials  Decrypted credentials from CarrierAccount model
     * @param string $mode         'test' | 'live'
     */
    public static function make(string $carrierName, array $credentials = [], string $mode = 'test'): CarrierStrategy
    {
        return match (strtolower($carrierName)) {
            'local', 'deprixa' => new LocalCarrierAdapter(),
            'dhl'   => new CarrierAdapterBridge(new DHLAdapter(),   'dhl',   $credentials, $mode),
            'fedex' => new CarrierAdapterBridge(new FedExAdapter(), 'fedex', $credentials, $mode),
            'ups'   => new CarrierAdapterBridge(new UPSAdapter(),   'ups',   $credentials, $mode),
            'usps'  => new CarrierAdapterBridge(new USPSAdapter(),  'usps',  $credentials, $mode),
            default => throw new Exception("Carrier [{$carrierName}] not supported."),
        };
    }
}
