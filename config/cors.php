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

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 *
 * Controls which external origins may call the API and what they can do.
 * The web (Inertia) stack is same-origin by design — these settings apply
 * primarily to /api/* routes consumed by external clients or mobile apps.
 *
 * Change CORS_ALLOWED_ORIGINS in .env to add trusted external origins:
 *   CORS_ALLOWED_ORIGINS=https://app.mycompany.com,https://mobile.mycompany.com
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Paths subject to CORS
    |--------------------------------------------------------------------------
    | Only /api/* routes need CORS handling. The web (Inertia) stack is
    | always same-origin — no CORS headers needed there.
    */
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    | By default only the application's own origin is allowed.
    | Set CORS_ALLOWED_ORIGINS in .env to add external trusted origins.
    | Use '*' ONLY in fully public read-only APIs (not this app).
    */
    'allowed_origins' => array_filter(
        array_map(
            'trim',
            explode(',', env('CORS_ALLOWED_ORIGINS', env('APP_URL', 'http://localhost')))
        )
    ),

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins Patterns (regex)
    |--------------------------------------------------------------------------
    | Alternative to listing every subdomain. Example:
    |   '#^https://.*\.mycompany\.com$#'
    */
    'allowed_origins_patterns' => [],

    /*
    |--------------------------------------------------------------------------
    | Allowed HTTP Methods
    |--------------------------------------------------------------------------
    | Only methods actually used by the API. DELETE and PATCH are included
    | for REST resource management. No TRACE or CONNECT.
    */
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Headers
    |--------------------------------------------------------------------------
    | Only headers the API actually reads. Wildcards ('*') are avoided to
    | prevent leaking custom headers to cross-origin callers.
    */
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-TOKEN',
        'X-Idempotency-Key',
        'Accept',
        'Accept-Language',
        'Origin',
    ],

    /*
    |--------------------------------------------------------------------------
    | Exposed Headers
    |--------------------------------------------------------------------------
    | Headers the browser is allowed to read from API responses.
    */
    'exposed_headers' => [
        'X-Idempotent-Replayed',
    ],

    /*
    |--------------------------------------------------------------------------
    | Max Age (preflight cache TTL in seconds)
    |--------------------------------------------------------------------------
    | 7200 = 2 hours. Browser caches OPTIONS response to avoid repeated
    | preflight requests. Set to 0 to disable caching (useful in dev).
    */
    'max_age' => 7200,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    | Must be true for cookie/session-based auth (Sanctum stateful).
    | When true, allowed_origins CANNOT be '*'.
    */
    'supports_credentials' => true,

];
