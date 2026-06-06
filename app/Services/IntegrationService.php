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

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class IntegrationService
{
    public function logRequest(int $orgId, string $type, int $id, string $action, $req, $res, int $status, int $duration)
    {
        DB::table('integration_request_logs')->insert([
            'organization_id' => $orgId,
            'integration_type' => $type,
            'integration_id' => $id,
            'action' => $action,
            'request' => json_encode($this->mask($req)),
            'response' => json_encode($this->mask($res)),
            'status_code' => $status,
            'duration_ms' => $duration,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function mask($data)
    {
        if (is_string($data))
            return substr($data, 0, 100) . '...';
        if (is_array($data)) {
            // mask keys like 'password', 'key', 'token'
            // Simplified for prototype
            return $data;
        }
        return $data;
    }
}
