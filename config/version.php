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
    | Application Version
    |--------------------------------------------------------------------------
    | This file is auto-updated by the update system. Do not edit manually.
    */

    'current'        => '1.0.0',

    // URL of YOUR update server (you host this separately)
    'update_server'  => env('UPDATE_SERVER_URL', 'https://updates.masarx.com/api'),

    // Files and directories never overwritten during updates
    'exclude_paths'  => [
        '.env',
        '.env.example',
        'storage/',
        'public/uploads/',
        'public/storage/',
        'bootstrap/cache/',
        'node_modules/',
        'vendor/',
        'config/version.php',  // managed separately
    ],
];
