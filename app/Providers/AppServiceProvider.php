<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

namespace App\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind EditionService as singleton so feature checks are cheap
        $this->app->singleton(\App\Services\EditionService::class);

        // ShipmentStateMachine is stateless — singleton is safe and avoids re-construction
        $this->app->singleton(\App\Services\ShipmentStateMachine::class);
    }

    public function boot(): void
    {
        Sanctum::usePersonalAccessTokenModel(\App\Models\PersonalAccessToken::class);

        // ── Super-admin gate bypass (every bypass audit-logged) ───────────────
        Gate::before(function ($user, $ability) {
            if ($user->hasRole('super-admin')) {
                Log::info('super-admin:gate-bypass', [
                    'user_id' => $user->id,
                    'email'   => $user->email,
                    'org_id'  => $user->organization_id,
                    'ability' => $ability,
                    'ip'      => request()->ip(),
                    'url'     => request()->fullUrl(),
                ]);
                return true;
            }
            return null;
        });

        // ── Model observers ───────────────────────────────────────────────────
        \App\Models\Shipment::observe(\App\Observers\ShipmentObserver::class);

        // ── Auth events — last_login_at update + audit trail ─────────────────
        Event::listen(\Illuminate\Auth\Events\Login::class, function ($event) {
            try {
                $event->user->update(['last_login_at' => now()]);
            } catch (\Throwable $e) {
                Log::warning('Failed to update last_login_at', [
                    'user_id' => $event->user->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        });
        Event::listen(
            \Illuminate\Auth\Events\Login::class,
            [\App\Listeners\AuditLoginEvents::class, 'handleLogin']
        );
        Event::listen(
            \Illuminate\Auth\Events\Logout::class,
            [\App\Listeners\AuditLoginEvents::class, 'handleLogout']
        );
        Event::listen(
            \Illuminate\Auth\Events\Failed::class,
            [\App\Listeners\AuditLoginEvents::class, 'handleFailed']
        );

        // Domain event → listener wiring is in DomainEventServiceProvider
        // (extracted Phase 9 — keeps this provider focused on bootstrap concerns)
    }
}
