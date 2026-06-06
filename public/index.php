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

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// PHP version check — fail early with a readable message instead of cryptic 500
if (PHP_VERSION_ID < 80200) {
    http_response_code(500);
    die('<h2 style="font-family:sans-serif;color:#dc2626">MasarX requires PHP 8.2 or higher.</h2>'
      . '<p style="font-family:sans-serif">Your server is running PHP ' . PHP_VERSION . '. '
      . 'Please change the PHP version to 8.2+ in your hosting control panel.</p>');
}

// AUTO-INSTALL: redirect to wizard if not yet installed
(function () {
    $marker  = __DIR__ . '/../storage/framework/.installed';
    $uri     = $_SERVER['REQUEST_URI'] ?? '/';
    $path    = parse_url($uri, PHP_URL_PATH) ?? '/';
    $isAsset      = str_contains($path, '.') || str_starts_with($path, '/build/');
    $isInstallPath = in_array('install', explode('/', $path));
    if (!file_exists($marker) && !$isInstallPath && !$isAsset) {
        // When served via root .htaccess rewrite, SCRIPT_NAME = /public/index.php
        // so dirname gives /public — strip it to avoid redirect to /public/install
        $base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
        if (str_ends_with($base, '/public')) {
            $base = substr($base, 0, -7);
        }
        header('Location: ' . $base . '/install', true, 302);
        exit;
    }
})();

// Auto-create .env from .env.example if missing, and generate APP_KEY if empty.
// This runs before Laravel bootstraps so the server never crashes on a missing .env.
(function () {
    $env     = __DIR__ . '/../.env';
    $example = __DIR__ . '/../.env.example';

    if (!file_exists($env)) {
        file_exists($example) ? copy($example, $env) : file_put_contents($env, '');
    }

    $content = file_get_contents($env);
    if (preg_match('/^APP_KEY=\s*$/m', $content)) {
        $key     = 'base64:' . base64_encode(random_bytes(32));
        $content = preg_replace('/^APP_KEY=.*$/m', 'APP_KEY=' . $key, $content);
        file_put_contents($env, $content);
    }
})();

// Apply install-time config written by the wizard (bootstrap/install.env.php).
// This file is NOT watched by artisan serve's file watcher, so writing to it
// never triggers a server restart — unlike writing to .env directly.
// Values here override .env for DB credentials and locale during/after install.
(function () {
    $installConfig = __DIR__ . '/../bootstrap/install.env.php';
    if (file_exists($installConfig)) {
        foreach ((array) (require $installConfig) as $k => $v) {
            putenv("$k=$v");
            $_ENV[$k]    = $v;
            $_SERVER[$k] = $v;
        }
    }
})();

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
