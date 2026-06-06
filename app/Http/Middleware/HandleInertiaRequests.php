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

namespace App\Http\Middleware;

use App\Services\EditionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Resolve authenticated user safely — DB may not exist during install wizard.
        $authUser  = null;
        $authRoles = [];
        $authPerms = [];
        try {
            $authUser  = $request->user();
            $authRoles = $authUser ? $authUser->getRoleNames() : [];
            $authPerms = $authUser ? $authUser->getAllPermissions()->pluck('name') : [];
        } catch (\Throwable) {
            // Tables absent during installation — return empty auth context
        }

        return array_merge(parent::share($request), [
            'auth' => [
                'user'        => $authUser,
                'roles'       => $authRoles,
                'permissions' => $authPerms,
            ],
            'demo_mode' => config('app.demo_mode', false),
            'ziggy' => function () use ($request) {
                return array_merge((new Ziggy)->toArray(), [
                    'location' => $request->url(),
                ]);
            },
            'flash' => function () use ($request) {
                $base = [
                    'success' => $request->session()->get('success'),
                    'error' => $request->session()->get('error'),
                ];
                $custom = $request->session()->get('flash');
                return is_array($custom) ? array_merge($base, $custom) : $base;
            },
            'branding' => function () use ($request, $authUser) {
                // For guests, show default Org (ID 1) or resolve via Domain.
                // For auth users, show their Org.
                // Wrapped in try-catch: during installation the DB may not exist yet.
                try {
                    $org = $request->user()?->organization ?? \App\Models\Organization::first();
                } catch (\Throwable $e) {
                    $org = null;
                }

                // Use SettingsService to get locale settings
                $settings = app(\App\Services\SettingsService::class);
                try {
                    if ($org) {
                        $settings->forOrganization($org->id);
                    }
                } catch (\Throwable $e) {
                    // DB not available during install — use defaults
                }
                try {
                    $localeSettings = $settings->getGroup('locale');
                    $securitySettings = $settings->getGroup('security');
                } catch (\Throwable $e) {
                    $localeSettings = [];
                    $securitySettings = [];
                }

                // Determine if Locked Out by 2FA
                $isLocked = false;
                try {
                    if (($securitySettings['require_2fa_admin'] ?? false) && $authUser) {
                        if ($authUser->hasRole(['admin', 'super-admin']) && !$authUser->two_factor_enabled) {
                            $isLocked = true;
                        }
                    }
                } catch (\Throwable) {}


                return [
                    'app_name' => config('app.name', 'MasarX Lite'),
                    'security_locked' => $isLocked,
                    'primary_color' => $org?->primary_color ?? '#4F46E5',
                    'secondary_color' => $org?->secondary_color ?? '#10B981',
                    'accent_color' => $org?->accent_color ?? '#F59E0B',
                    'logo_url' => $org?->logo_url ? \Illuminate\Support\Facades\Storage::url($org->logo_url) : null,
                    'sublogo_url' => $org?->sublogo_url ? \Illuminate\Support\Facades\Storage::url($org->sublogo_url) : null,
                    'favicon_url' => $org?->favicon_url ? \Illuminate\Support\Facades\Storage::url($org->favicon_url) : null,
                    'login_logo_url' => $org?->login_logo_url ? \Illuminate\Support\Facades\Storage::url($org->login_logo_url) : null,
                    'login_image_url' => $org?->login_image_url ? \Illuminate\Support\Facades\Storage::url($org->login_image_url) : null,
                    'ui_theme' => $org?->ui_theme ?? 'system',
                    'sidebar_compact' => (bool) ($org?->sidebar_compact ?? false),
                    'primary_font' => $org?->primary_font ?? 'Inter',
                    'secondary_font' => $org?->secondary_font ?? 'Inter',
                    'base_font_size' => $org?->base_font_size ?? '16px',
                    'layout_density' => $org?->layout_density ?? 'normal',
                    'card_skin' => $org?->card_skin ?? 'shadow',
                    'layout_background' => $org?->layout_background ?? 'oklch(98.5% 0.002 247.839)',
                    'notification_style' => $org?->notification_style ?? 'toast',
                    'notification_group_style' => $org?->notification_group_style ?? 'stacked',
                    'notification_max_count' => (int) ($org?->notification_max_count ?? 4),
                    'notification_position' => $org?->notification_position ?? 'top-right',
                    'notification_duration' => (int) ($org?->notification_duration ?? 5000),
                    'monochrome_mode' => (bool) ($org?->monochrome_mode ?? false),
                    'login_welcome_text' => $org?->login_welcome_text ?? null,
                    'login_form_position' => $org?->login_form_position ?? 'right',
                    'login_visible_fields' => $org?->login_visible_fields ?? ['email', 'password', 'remember'],
                    // Phase 2: Regional Formats (Moved to SettingsService)
                    'weight_unit' => $localeSettings['weight_unit'] ?? 'kg',
                    'dimension_unit' => $localeSettings['dimension_unit'] ?? 'cm',
                    'currency_code' => $localeSettings['currency'] ?? 'USD',
                    'date_format' => $localeSettings['date_format'] ?? 'd/m/Y',
                    'time_format' => $localeSettings['time_format'] ?? '24h',
                    'timezone' => $localeSettings['timezone'] ?? 'UTC',
                    'google_maps_key' => rescue(fn () => $settings->get('integrations', 'google_maps_key'), null, false),
                    'google_login_enabled' => rescue(fn () => !empty($settings->get('integrations', 'google_client_id')), false, false),
                    'needs_company_setup' => $authUser && $org
                        ? rescue(fn () => empty(trim((string) $settings->get('company', 'name'))), false, false)
                        : false,
                ];
            },
            'locale' => function () use ($request) {
                return app()->getLocale();
            },
            // Update badge: visible to ALL authenticated users when a new version is available
            'update_available' => function () use ($request) {
                if (!$request->user()) return false;
                return Cache::has('update.available');
            },
            // Edition / Feature flags — shared to all Inertia pages
            'edition' => function () {
                try {
                    $svc = app(EditionService::class);
                    return [
                        'current'   => $svc->edition(),
                        'isPremium' => $svc->isPremium(),
                        'isEnvato'  => $svc->isEnvato(),
                        'features'  => $svc->available(),
                    ];
                } catch (\Throwable) {
                    return ['current' => 'premium', 'isPremium' => true, 'isEnvato' => false, 'features' => []];
                }
            },
            // Status color map — keyed by status code, value is hex color from shipment_statuses.
            // Eliminates hardcoded badge colors in frontend components.
            'status_colors' => function () use ($request) {
                if (!$request->user()) return [];
                try {
                    $orgId = $request->user()->organization_id;
                    return \Illuminate\Support\Facades\DB::table('shipment_statuses')
                        ->where('organization_id', $orgId)
                        ->where('is_active', true)
                        ->pluck('color', 'code')
                        ->toArray();
                } catch (\Throwable) {
                    return [];
                }
            },
            // Distributed verification point #7 — app integrity hash
            '_app_h' => fn () => app(\App\Services\LicenseVerificationService::class)->getHash(),
            // Legacy compatibility: useTranslation delegará a react-i18next; translations se mantiene para SSR/fallback.
            // Fuente principal frontend: resources/js/i18n/*.json (react-i18next).
            'translations' => function () {
                $locale = app()->getLocale();
                $path = base_path("resources/js/i18n/{$locale}.json");
                if (file_exists($path)) {
                    $decoded = json_decode(file_get_contents($path), true);
                    return is_array($decoded) ? $decoded : [];
                }
                $fallback = base_path('resources/js/i18n/en.json');
                return (file_exists($fallback) && ($decoded = json_decode(file_get_contents($fallback), true)))
                    ? $decoded : [];
            },
        ]);
    }
}
