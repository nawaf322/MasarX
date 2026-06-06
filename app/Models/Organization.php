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

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'logo_url',
        'sublogo_url',
        'settings',
        'is_active',
        // Identity & Location
        'tax_id',
        'vat_number',
        'commercial_registration',
        'national_address',
        'vat_enabled',
        'legal_name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'country_id',
        'state_id',
        'city_id',
        // Branding
        'primary_color',
        'secondary_color',
        'accent_color',
        'favicon_url',
        'login_logo_url',
        'login_image_url',
        'ui_theme',
        'sidebar_compact',
        // Advanced Branding
        'primary_font',
        'secondary_font',
        'base_font_size',
        'layout_density',
        'card_skin',
        'layout_background',
        'sidebar_menu_order',
        'notification_style',
        'notification_group_style',
        'notification_max_count',
        'notification_position',
        'notification_duration',
        'monochrome_mode',
        'login_welcome_text',
        'login_form_position',
        'login_visible_fields',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean',
        'national_address' => 'array',
        'vat_enabled' => 'boolean',
        'sidebar_compact' => 'boolean',
        'sidebar_menu_order' => 'array',
        'login_visible_fields' => 'array',
        'notification_duration' => 'integer',
        'notification_max_count' => 'integer',
        'monochrome_mode' => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function shipments()
    {
        return $this->hasMany(\App\Models\Shipment::class);
    }

    public function country()
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function state()
    {
        return $this->belongsTo(State::class, 'state_id');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    // ──────────────────────────────────────────────────────────────
    // Operational relations
    // ──────────────────────────────────────────────────────────────

    public function branches()
    {
        return $this->hasMany(\App\Models\Branch::class);
    }

    public function departments()
    {
        return $this->hasMany(\App\Models\Department::class);
    }

    public function services()
    {
        return $this->hasMany(\App\Models\Service::class);
    }

    public function shipmentStatuses()
    {
        return $this->hasMany(\App\Models\ShipmentStatus::class);
    }

    // ──────────────────────────────────────────────────────────────
    // SaaS relations
    // ──────────────────────────────────────────────────────────────

    public function saasSubscriptions()
    {
        return $this->hasMany(\App\Models\SaasSubscription::class);
    }

    public function saasWallet()
    {
        return $this->hasOne(\App\Models\SaasWallet::class);
    }

    public function saasInvoices()
    {
        return $this->hasMany(\App\Models\SaasInvoice::class);
    }

    // ──────────────────────────────────────────────────────────────
    // SaaS helpers
    // ──────────────────────────────────────────────────────────────

    /**
     * Return the current active SaaS subscription or null.
     */
    public function activeSaasSubscription(): ?\App\Models\SaasSubscription
    {
        return $this->saasSubscriptions()
            ->whereIn('status', ['active', 'trial', 'grace_period'])
            ->latest()
            ->first();
    }

    /**
     * Return wallet balance (0 if no wallet yet).
     */
    public function walletBalance(): float
    {
        return (float) ($this->saasWallet?->balance ?? 0.0);
    }
}
