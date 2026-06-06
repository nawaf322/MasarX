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
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    // ─── Moyasar (Saudi payment gateway — mada + Apple Pay) ─────────────────
    'moyasar' => [
        'publishable_key' => env('MOYASAR_PUBLISHABLE_KEY', ''),
        'secret_key'      => env('MOYASAR_SECRET_KEY', ''),
        'webhook_secret'  => env('MOYASAR_WEBHOOK_SECRET', ''),
    ],

    // ─── Saudi Carriers ──────────────────────────────────────────────────────
    'aramex' => [
        'enabled'              => env('ARAMEX_ENABLED', false),
        'username'             => env('ARAMEX_USERNAME', ''),
        'password'             => env('ARAMEX_PASSWORD', ''),
        'version'              => env('ARAMEX_VERSION', 'v1.0'),
        'pin'                  => env('ARAMEX_PIN', ''),
        'account_number'       => env('ARAMEX_ACCOUNT_NUMBER', ''),
        'account_pin'          => env('ARAMEX_ACCOUNT_PIN', ''),
        'account_entity'       => env('ARAMEX_ACCOUNT_ENTITY', 'RUH'),
        'account_country_code' => env('ARAMEX_ACCOUNT_COUNTRY_CODE', 'SA'),
        'test_mode'            => env('ARAMEX_TEST_MODE', true),
    ],

    'smsa' => [
        'enabled'     => env('SMSA_ENABLED', false),
        'pass_key'    => env('SMSA_PASS_KEY', ''),
        'sender_code' => env('SMSA_SENDER_CODE', ''),
        'flat_rate'   => env('SMSA_FLAT_RATE', 25.0),
        'test_mode'   => env('SMSA_TEST_MODE', true),
    ],

    'dhl' => [
        'enabled'        => env('DHL_ENABLED', false),
        'api_key'        => env('DHL_API_KEY', ''),
        'api_secret'     => env('DHL_API_SECRET', ''),
        'account_number' => env('DHL_ACCOUNT_NUMBER', ''),
        'test_mode'      => env('DHL_TEST_MODE', true),
    ],

];
