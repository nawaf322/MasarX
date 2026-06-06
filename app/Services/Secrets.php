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

namespace App\Services;

use Illuminate\Support\Facades\Crypt;

class Secrets
{
    /**
     * Encrypt specific keys in an array.
     */
    public static function encryptArray(array $data, array $keysToEncrypt, ?array $existingData = null): array
    {
        foreach ($keysToEncrypt as $key) {
            if (isset($data[$key]) && !empty($data[$key])) {
                // Check if value is masked (starts with ********)
                if (strpos($data[$key], '********') === 0) {
                    // If masked, try to restore from existing data if possible, or just don't re-encrypt
                    // Ideally we should have the existing encrypted value to restore.
                    if ($existingData && isset($existingData[$key])) {
                        $data[$key] = $existingData[$key];
                    }
                    // If no existing data provided, we risk saving the mask as the value.
                    // The controller should provide existing data.
                } else {
                    try {
                        $data[$key] = Crypt::encryptString($data[$key]);
                    } catch (\Exception $e) {
                        // Log error or ignore
                    }
                }
            }
        }
        return $data;
    }

    /**
     * Decrypt specific keys in an array.
     */
    public static function decryptArray(array $data, array $keysToDecrypt): array
    {
        foreach ($keysToDecrypt as $key) {
            if (isset($data[$key]) && !empty($data[$key])) {
                try {
                    $data[$key] = Crypt::decryptString($data[$key]);
                } catch (\Exception $e) {
                    $data[$key] = null; // Fail safe
                }
            }
        }
        return $data;
    }

    /**
     * Mask sensitive keys for frontend display.
     */
    public static function mask(array $data, array $keysToMask): array
    {
        foreach ($keysToMask as $key) {
            if (isset($data[$key]) && !empty($data[$key])) {
                $val = $data[$key];
                // If it looks encrypted (long string), assume it is
                $data[$key] = '********' . substr($val, -4);
            }
        }
        return $data;
    }
}
