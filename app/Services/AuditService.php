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

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Log an authenticated-user action to audit_logs.
     * Silently returns if no authenticated user or no tenant.
     */
    public function log(
        string $action,
        string $module,
        string $subject,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int   $subjectId = null
    ): void {
        $user = Auth::user();

        if (! $user || is_null($user->organization_id)) {
            return;
        }

        try {
            AuditLog::create([
                'organization_id' => $user->organization_id,
                'user_id'         => $user->id,
                'action'          => $action,
                'module'          => $module,
                'subject_type'    => $subject,
                'subject_id'      => $subjectId,
                'old_values'      => $oldValues,
                'new_values'      => $newValues,
                'ip_address'      => Request::ip(),
                'user_agent'      => Request::userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('AuditService::log failed: ' . $e->getMessage());
        }
    }

    /**
     * Log a system-initiated action (queue job, scheduled task, etc.).
     * Requires explicit organization_id since there is no Auth user.
     */
    public function logSystem(
        int    $organizationId,
        string $action,
        string $module,
        string $subject,
        ?array $newValues = null,
        ?int   $subjectId = null
    ): void {
        try {
            AuditLog::create([
                'organization_id' => $organizationId,
                'user_id'         => null,
                'action'          => $action,
                'module'          => $module,
                'subject_type'    => $subject,
                'subject_id'      => $subjectId,
                'old_values'      => null,
                'new_values'      => $newValues,
                'ip_address'      => null,
                'user_agent'      => 'system',
            ]);
        } catch (\Throwable $e) {
            Log::warning('AuditService::logSystem failed: ' . $e->getMessage());
        }
    }
}
