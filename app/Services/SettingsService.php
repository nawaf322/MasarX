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

use App\Models\OrganizationSetting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    protected ?int $organizationId = null;

    public function __construct(?int $organizationId = null)
    {
        $this->organizationId = $organizationId ?? (Auth::check() ? Auth::user()->organization_id : null);
    }

    /**
     * Set the organization context manually.
     */
    public function forOrganization(?int $id): self
    {
        $this->organizationId = $id;
        return $this;
    }

    public function getOrganizationId(): ?int
    {
        return $this->organizationId;
    }

    /**
     * Get a setting value.
     */
    public function get(string $group, string $key, mixed $default = null): mixed
    {
        if (!$this->organizationId) {
            return $default;
        }

        $cacheKey = "settings:{$this->organizationId}:{$group}";

        // Cache the entire group to avoid N+1 key lookups.
        // withoutGlobalScope('tenant') is required because the BelongsToTenant
        // trait on OrganizationSetting adds a global scope that returns zero rows
        // for unauthenticated requests (e.g. the public /rate calculator page).
        // Since we already filter explicitly by organization_id, the tenant scope
        // is redundant here and would poison the cache with empty results when the
        // first read happens in an unauthenticated context.
        $groupSettings = Cache::remember($cacheKey, 3600, function () use ($group) {
            return OrganizationSetting::withoutGlobalScope('tenant')
                ->where('organization_id', $this->organizationId)
                ->where('group', $group)
                ->pluck('value', 'key')
                ->map(function ($value) {
                    return json_decode($value, true);
                })
                ->toArray();
        });

        return $groupSettings[$key] ?? $default;
    }

    /**
     * Set a setting value.
     */
    public function set(string $group, string $key, mixed $value): void
    {
        if (!$this->organizationId) {
            return;
        }

        // 1. Strict Null Safety - If value is explicitly null, we allow it (nullable column)
        // or we could skip it. User requested: "si llega null y NO hay intención explícita de borrar, no lo guardes".
        // However, with the new requirement to allow clearing values, we should probably allow null if it's passed.
        // But the user specific prompt was: "si value === null -> NO guardar (salvo que venga clear_keys[])"
        // Since we don't have clear_keys logic here yet, let's implement the safe guard:
        // If value is null, we do NOT save it, unless we change this policy.
        // For now, let's follow the instruction: "Hacer value nullable... Si llega null y NO hay intención... no lo guardes".

        if ($value === null) {
            return;
        }

        // 2. Strict JSON Encoding
        $value = json_encode($value);

        OrganizationSetting::withoutGlobalScope('tenant')->updateOrCreate(
            [
                'organization_id' => $this->organizationId,
                'group' => $group,
                'key' => $key
            ],
            ['value' => $value]
        );

        // Invalidate cache
        Cache::forget("settings:{$this->organizationId}:{$group}");
        \App\Services\Settings\SettingsResolver::forgetCache($this->organizationId);
    }

    /**
     * Get all settings for a group.
     */
    public function getGroup(string $group): array
    {
        if (!$this->organizationId) {
            return [];
        }

        $cacheKey = "settings:{$this->organizationId}:{$group}";

        return Cache::remember($cacheKey, 3600, function () use ($group) {
            return OrganizationSetting::withoutGlobalScope('tenant')
                ->where('organization_id', $this->organizationId)
                ->where('group', $group)
                ->pluck('value', 'key')
                ->map(function ($value) {
                    return json_decode($value, true);
                })
                ->toArray();
        });
    }
}
