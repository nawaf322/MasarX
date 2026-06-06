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

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\SettingsService;
use App\Services\AuditService;

class BrandingController extends Controller
{
    protected $settings;
    protected $audit;

    public function __construct(SettingsService $settings, AuditService $audit)
    {
        $this->settings = $settings;
        $this->audit = $audit;
    }

    public function show(Request $request)
    {
        $orgId = $request->user()->organization_id;
        if (!$orgId) {
            abort(403, 'No organization assigned.');
        }
        $org = $request->user()->organization;

        return Inertia::render('Settings/Branding', [
            'branding' => [
                'app_name' => $org?->name ?? 'Deprixa Plus',
                'primary_color' => $org?->primary_color ?? '#4F46E5',
                'secondary_color' => $org?->secondary_color ?? '#10B981',
                'accent_color' => $org?->accent_color ?? '#F59E0B',
                'logo_url' => $org?->logo_url ? asset('storage/' . $org->logo_url) : null,
                'sublogo_url' => $org?->sublogo_url ? asset('storage/' . $org->sublogo_url) : null,
                'favicon_url' => $org?->favicon_url ? asset('storage/' . $org->favicon_url) : null,
                'login_logo_url' => $org?->login_logo_url ? asset('storage/' . $org->login_logo_url) : null,
                'login_image_url' => $org?->login_image_url ? asset('storage/' . $org->login_image_url) : null,
                'ui_theme' => $org?->ui_theme ?? 'system',
                'sidebar_compact' => (bool) ($org?->sidebar_compact ?? false),
                'primary_font' => $org?->primary_font ?? 'Inter',
                'secondary_font' => $org?->secondary_font ?? 'Inter',
                'base_font_size' => $org?->base_font_size ?? '16px',
                'layout_density' => $org?->layout_density ?? 'normal',
                'card_skin' => $org?->card_skin ?? 'shadow',
                'layout_background' => $org?->layout_background ?? 'oklch(92.9% .013 255.508)',
                'sidebar_menu_order' => $org?->sidebar_menu_order,
                'notification_style' => $org?->notification_style ?? 'toast',
                'notification_group_style' => $org?->notification_group_style ?? 'stacked',
                'notification_max_count' => (int) ($org?->notification_max_count ?? 4),
                'notification_position' => $org?->notification_position ?? 'top-right',
                'notification_duration' => $org?->notification_duration ?? 5000,
                'monochrome_mode' => (bool) ($org?->monochrome_mode ?? false),
                'login_welcome_text' => $org?->login_welcome_text,
                'login_form_position' => $org?->login_form_position ?? 'right',
                'login_visible_fields' => $org?->login_visible_fields ?? ['email', 'password', 'remember'],
                'raw_logo_url' => $org?->logo_url,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $orgId = $request->user()->organization_id;
        $org   = $request->user()->organization;

        if (!$orgId || !$org) {
            return response()->json(['error' => 'No organization assigned. Please contact support.'], 422);
        }

        $validated = $request->validate([
            'primary_color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'secondary_color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'accent_color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'ui_theme' => ['required', 'in:light,dark,system'],
            'sidebar_compact' => ['boolean'],
            'primary_font' => ['nullable', 'string', 'max:100'],
            'secondary_font' => ['nullable', 'string', 'max:100'],
            'base_font_size' => ['nullable', 'string', 'regex:/^\d+px$/'],
            'layout_density' => ['nullable', 'in:compact,normal,spacious'],
            'card_skin' => ['nullable', 'in:shadow,bordered'],
            'layout_background' => ['nullable', 'string', 'max:120'],
            'sidebar_menu_order' => ['nullable', 'array'],
            'notification_style' => ['nullable', 'in:toast,banner,modal'],
            'notification_group_style' => ['nullable', 'in:stacked,expanded'],
            'notification_max_count' => ['nullable', 'integer', 'min:1', 'max:5'],
            'notification_position' => ['nullable', 'in:top-right,top-left,bottom-right,bottom-left'],
            'notification_duration' => ['nullable', 'integer', 'min:1000', 'max:30000'],
            'monochrome_mode' => ['boolean'],
            'login_welcome_text' => ['nullable', 'string', 'max:500'],
            'login_form_position' => ['nullable', 'in:left,right,center'],
            'login_visible_fields' => ['nullable', 'array'],
            'logo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'sublogo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'favicon' => ['nullable', 'mimes:ico,png', 'max:1024'],
            'login_logo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'login_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
        ]);

        $folder = "branding/{$org->id}";
        $dataToUpdate = [
            'primary_color' => $validated['primary_color'],
            'secondary_color' => $validated['secondary_color'] ?? null,
            'accent_color' => $validated['accent_color'] ?? null,
            'ui_theme' => $validated['ui_theme'],
            'sidebar_compact' => $validated['sidebar_compact'] ?? false,
            'primary_font' => $validated['primary_font'] ?? null,
            'secondary_font' => $validated['secondary_font'] ?? null,
            'base_font_size' => $validated['base_font_size'] ?? '16px',
            'layout_density' => $validated['layout_density'] ?? 'normal',
            'card_skin' => $validated['card_skin'] ?? 'shadow',
            'layout_background' => $validated['layout_background'] ?? 'oklch(92.9% .013 255.508)',
            'sidebar_menu_order' => $validated['sidebar_menu_order'] ?? null,
            'notification_style' => $validated['notification_style'] ?? 'toast',
            'notification_group_style' => $validated['notification_group_style'] ?? 'stacked',
            'notification_max_count' => (int) ($validated['notification_max_count'] ?? 4),
            'notification_position' => $validated['notification_position'] ?? 'top-right',
            'notification_duration' => $validated['notification_duration'] ?? 5000,
            'monochrome_mode' => $validated['monochrome_mode'] ?? false,
            'login_welcome_text' => $validated['login_welcome_text'] ?? null,
            'login_form_position' => $validated['login_form_position'] ?? 'right',
            'login_visible_fields' => $validated['login_visible_fields'] ?? ['email', 'password', 'remember'],
        ];

        // Handle File Uploads
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store($folder, 'public');
            $dataToUpdate['logo_url'] = $path;
        }

        if ($request->hasFile('sublogo')) {
            $path = $request->file('sublogo')->store($folder, 'public');
            $dataToUpdate['sublogo_url'] = $path;
        }

        if ($request->hasFile('favicon')) {
            $path = $request->file('favicon')->store($folder, 'public');
            $dataToUpdate['favicon_url'] = $path;
        }

        if ($request->hasFile('login_logo')) {
            $path = $request->file('login_logo')->store($folder, 'public');
            $dataToUpdate['login_logo_url'] = $path;
        }

        if ($request->hasFile('login_image')) {
            $path = $request->file('login_image')->store($folder, 'public');
            $dataToUpdate['login_image_url'] = $path;
        }

        $org->update($dataToUpdate);

        $this->audit?->log('updated', 'organization', 'Branding Updated', [], $dataToUpdate);

        return response()->json(['success' => true, 'message' => 'Branding settings updated successfully.']);
    }
}
