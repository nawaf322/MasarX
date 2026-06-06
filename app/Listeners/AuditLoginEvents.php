<?php

namespace App\Listeners;

use App\Models\AuditLog;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

/**
 * Writes AuditLog entries for authentication events:
 *   Login, Logout, Failed login attempt.
 *
 * Registered in AppServiceProvider for all three Auth events.
 * Never throws — wrapped in try/catch so auth flow is never blocked.
 */
class AuditLoginEvents
{
    public function handleLogin(Login $event): void
    {
        $this->write($event->user, 'login', 'auth', [
            'guard' => $event->guard,
            'remember' => $event->remember,
        ]);
    }

    public function handleLogout(Logout $event): void
    {
        $this->write($event->user, 'logout', 'auth', [
            'guard' => $event->guard,
        ]);
    }

    public function handleFailed(Failed $event): void
    {
        // No authenticated user — try to resolve the organization from the attempted email.
        // If we cannot determine the organization, skip the DB audit entry (audit_logs.organization_id
        // is NOT NULL with a FK constraint; inserting 0 causes an integrity violation).
        $credentials = $event->credentials ?? [];
        $email = $credentials['email'] ?? $credentials['username'] ?? null;

        // Attempt to resolve the org from the user record (may not exist for unknown emails)
        $attemptedUser = $email
            ? \App\Models\User::where('email', $email)->select('id', 'organization_id')->first()
            : null;

        // If we cannot resolve an org, log to the Laravel log channel only and skip DB
        if (! $attemptedUser || ! $attemptedUser->organization_id) {
            Log::info('AuditLoginEvents::handleFailed: failed login for unknown email — skipping DB audit', [
                'attempted_email' => $email,
                'ip'              => Request::ip(),
            ]);
            return;
        }

        try {
            AuditLog::create([
                'organization_id' => $attemptedUser->organization_id,
                'user_id'         => null,
                'action'          => 'login_failed',
                'module'          => 'auth',
                'subject_id'      => $attemptedUser->id,
                'subject_type'    => $email ? "email:{$email}" : null,
                'old_values'      => null,
                'new_values'      => ['attempted_email' => $email],
                'ip_address'      => Request::ip(),
                'user_agent'      => Request::userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('AuditLoginEvents::handleFailed: ' . $e->getMessage());
        }
    }

    private function write($user, string $action, string $module, array $context = []): void
    {
        if (! $user || is_null($user->organization_id)) {
            return;
        }

        try {
            // Deduplicate: skip if an identical entry was written in the last 5 seconds
            // (the Login event can fire twice when session guard + remember-token guard both authenticate)
            $recentDuplicate = AuditLog::where('organization_id', $user->organization_id)
                ->where('user_id', $user->id)
                ->where('action', $action)
                ->where('module', $module)
                ->where('created_at', '>=', now()->subSeconds(5))
                ->exists();

            if ($recentDuplicate) {
                return;
            }

            AuditLog::create([
                'organization_id' => $user->organization_id,
                'user_id'         => $user->id,
                'action'          => $action,
                'module'          => $module,
                'subject_id'      => $user->id,
                'subject_type'    => 'user',
                'old_values'      => null,
                'new_values'      => $context,
                'ip_address'      => Request::ip(),
                'user_agent'      => Request::userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('AuditLoginEvents: ' . $e->getMessage());
        }
    }
}
