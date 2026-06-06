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
    /*
    |--------------------------------------------------------------------------
    | API Route to Scope Mapping
    |--------------------------------------------------------------------------
    | Maps route names to required scope(s). Token must have at least one
    | of the required scopes, or '*' for full access.
    */
    'route_scopes' => [
        // User - any authenticated token can access
        'api.user' => [],

        // Shipments
        'api.shipments.index' => ['shipments.view'],
        'api.shipments.store' => ['shipments.create'],
        'api.shipments.show' => ['shipments.view'],
        'api.shipments.update' => ['shipments.edit'],

        // Rates
        'api.rates.quote' => ['rates.quote'],

        // Tracking
        'api.tracking.show' => ['tracking.view'],

        // Driver (driver app - uses driver-specific scopes if needed, or * for now)
        'api.driver.assigned-shipments' => ['dispatch.view', 'shipments.view'],
        'api.driver.update-status' => ['dispatch.assign'],
        'api.driver.profile' => ['dispatch.view'],

        // Locations
        'api.locations.countries' => ['locations.view'],
        'api.locations.countries.store' => ['locations.manage'],
        'api.locations.states' => ['locations.view'],
        'api.locations.states.store' => ['locations.manage'],
        'api.locations.cities' => ['locations.view'],
        'api.locations.cities.store' => ['locations.manage'],

        // Customers (B2B / mobile)
        'api.customers.index' => ['customers.view'],
        'api.customers.store' => ['customers.create'],

        // Warehouse manifests
        'api.warehouse.manifests.index' => ['warehouse.view'],
        'api.warehouse.manifests.store' => ['warehouse.manage'],
        // Warehouse inventory
        'api.warehouse.inventory.index' => ['inventory.view'],
        'api.warehouse.inventory.movements.index' => ['inventory.view'],
        'api.warehouse.inventory.movements.store' => ['inventory.manage'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Routes That Require No Scope Check
    |--------------------------------------------------------------------------
    | Webhooks and other public routes - do not use api.token middleware.
    */
    'public_routes' => [
        'api.webhooks.handle',
        'api.webhooks.carrier-update',
    ],
];
