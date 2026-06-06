<?php
/**
 * UPDATE SERVER — Host this on YOUR server (not distributed with the product).
 *
 * This file is a reference implementation. Deploy it on your own server
 * (e.g. updates.deprixa.com) and point config/version.php > update_server to it.
 *
 * Endpoints:
 *   POST /api/check    — verify license + return latest version info
 *   POST /api/download — return signed download stream
 *
 * Dependencies (on YOUR server only):
 *   - Envato API Personal Token (never distributed to clients)
 *   - The compiled update zip files stored securely
 */

// ── POST /api/check ───────────────────────────────────────────────────────────
function handleCheck(array $body): array
{
    $purchaseCode    = trim($body['purchase_code'] ?? '');
    $currentVersion  = $body['current_version'] ?? '0.0.0';
    $domain          = $body['domain'] ?? '';

    // 1. Verify purchase code with Envato API
    $envatoToken = getenv('ENVATO_PERSONAL_TOKEN'); // stored only on YOUR server
    $ch = curl_init("https://api.envato.com/v3/market/author/sale?code={$purchaseCode}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ["Authorization: Bearer {$envatoToken}"],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $res   = curl_exec($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200) {
        return ['error' => 'Invalid purchase code. Please verify your code on Envato.'];
    }

    $sale = json_decode($res, true);

    // Optional: verify the item ID matches YOUR product
    // if (($sale['item']['id'] ?? null) !== YOUR_ITEM_ID) {
    //     return ['error' => 'This code is not for Deprixa.'];
    // }

    // 2. Get latest version info from your releases manifest
    $latest   = getLatestVersion();
    $token    = generateDownloadToken($purchaseCode, $latest['version']); // signed, expires in 30min

    return [
        'version'   => $latest['version'],
        'changelog' => $latest['changelog'],
        'requires'  => $latest['requires'],  // minimum version to update from
        'token'     => $token,
    ];
}

// ── POST /api/download ────────────────────────────────────────────────────────
function handleDownload(array $body): void
{
    $purchaseCode = trim($body['purchase_code'] ?? '');
    $token        = $body['token'] ?? '';
    $version      = verifyDownloadToken($token, $purchaseCode);

    if (!$version) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid or expired download token.']);
        return;
    }

    $zipPath = __DIR__ . "/releases/deprixa-{$version}.zip";
    if (!file_exists($zipPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Release file not found.']);
        return;
    }

    // Stream the zip
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="update.zip"');
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    exit;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLatestVersion(): array
{
    // Read from a manifest.json you maintain
    $manifest = json_decode(file_get_contents(__DIR__ . '/releases/manifest.json'), true);
    return $manifest['latest'];
}

function generateDownloadToken(string $purchaseCode, string $version): string
{
    $secret  = getenv('TOKEN_SECRET');
    $expires = time() + 1800; // 30 minutes
    $payload = "{$purchaseCode}|{$version}|{$expires}";
    $sig     = hash_hmac('sha256', $payload, $secret);
    return base64_encode("{$payload}|{$sig}");
}

function verifyDownloadToken(string $token, string $purchaseCode): ?string
{
    $secret = getenv('TOKEN_SECRET');
    try {
        $decoded = base64_decode($token);
        [$code, $version, $expires, $sig] = explode('|', $decoded);
        if ($code !== $purchaseCode) return null;
        if ((int)$expires < time()) return null;
        $expected = hash_hmac('sha256', "{$code}|{$version}|{$expires}", $secret);
        return hash_equals($expected, $sig) ? $version : null;
    } catch (\Throwable) {
        return null;
    }
}

/*
 * releases/manifest.json format:
 * {
 *   "latest": {
 *     "version": "1.2.0",
 *     "requires": "1.0.0",
 *     "changelog": "- Fixed X\n- Added Y\n- Improved Z"
 *   }
 * }
 *
 * releases/ folder:
 *   deprixa-1.1.0.zip
 *   deprixa-1.2.0.zip
 *   manifest.json
 *
 * What goes in the zip:
 *   - All app files EXCEPT: .env, storage/, vendor/, node_modules/
 *   - Include: compiled assets (public/build/), migrations, new PHP files
 *   - Top-level folder optional (the UpdateService handles both)
 */
