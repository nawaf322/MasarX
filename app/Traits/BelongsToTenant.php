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

namespace App\Traits;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    /**
     * The "booted" method of the model.
     */
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            // ── Artisan commands & queue workers (php artisan ...) ───────────
            // Console processes are operator contexts. Scope is NOT applied so
            // maintenance commands and scheduled jobs can query across tenants.
            // Each command/job is responsible for adding its own org filter.
            // Exception: unit tests run under APP_ENV=testing — they must keep
            // the scope active so test isolation works correctly.
            if (app()->runningInConsole() && !app()->environment('testing')) {
                return;
            }

            // ── Authenticated web/API request ────────────────────────────────
            if (Auth::check()) {
                /** @var \App\Models\User $user */
                $user = Auth::user();

                // Super Admin sees all tenants
                if ($user->hasRole('super-admin')) {
                    return;
                }

                $builder->where(
                    $builder->getModel()->getTable() . '.organization_id',
                    $user->organization_id
                );
                return;
            }

            // ── Testing environment without auth ─────────────────────────────
            // Unit tests create records directly without actingAs().
            // Database isolation is guaranteed by RefreshDatabase (transaction).
            // Skip scope so queries work normally in unit/integration tests.
            if (app()->environment('testing')) {
                return;
            }

            // ── Unauthenticated context (queued jobs, webhooks before auth) ──
            // If the caller bound a current_org_id into the service container
            // (e.g. via app()->instance('current_org_id', $orgId)) use it.
            // Otherwise block all records to prevent cross-tenant data leaks.
            if (app()->bound('current_org_id')) {
                $builder->where(
                    $builder->getModel()->getTable() . '.organization_id',
                    app('current_org_id')
                );
                return;
            }

            // No auth context at all (production) → return nothing (fail-closed)
            $builder->whereRaw('1 = 0');
        });

        static::creating(function ($model) {
            if (Auth::check() && !$model->organization_id) {
                $model->organization_id = Auth::user()->organization_id;
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
