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

return [
    'wizard' => [
        'internal_service' => 'Internal (Default)',
        'payment_manual' => 'Manual payment',
        'validation' => [
            'name_required' => 'Name is required',
            'phone_required' => 'Phone is required',
            'address_required' => 'Address is required',
            'country_required' => 'Country is required',
            'weight_required' => 'Weight is required',
            'weight_min' => 'Weight must be greater than 0',
            'service_required' => 'You must select a service',
            'rate_required' => 'You must select a rate',
            'content_description_required' => 'Content description is required',
        ],
    ],
    'activity' => [
        'created' => 'Shipment created',
        'status_changed' => 'Changed status to :status',
        'updated' => 'Updated shipment data',
        'payment_manual' => 'Registered manual payment',
        'payment_stripe' => 'Payment received via Stripe',
        'payment_paypal' => 'Payment received via PayPal',
    ],
];
