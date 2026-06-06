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

use App\Models\Branch;
use App\Models\Department;
use App\Models\NotificationRule;
use App\Models\NotificationTemplate;
use App\Models\NumberingSequence;
use App\Models\Organization;
use App\Models\OrganizationSetting;
use App\Models\SaasPlan;
use App\Models\SaasSubscription;
use App\Models\SaasWallet;
use App\Models\Service;
use App\Models\ShipmentStatus;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class OrganizationOnboardingService
{
    /**
     * Full provision for a brand-new organization.
     * Must be called inside a DB::transaction().
     */
    public function provision(Organization $org, array $adminData): void
    {
        $this->createAdminUser($org, $adminData);
        $this->seedDefaultSettings($org);
        $this->applyDefaultBranding($org);
        $this->createDefaultBranches($org);
        $this->createDefaultDepartments($org);
        $this->createDefaultServices($org);
        $this->createDefaultShipmentStatuses($org);
        $this->createDefaultNumberingSequences($org);
        $this->createDefaultNotifications($org);
        $this->createWallet($org);
        $this->createTrialSubscription($org);
    }

    /**
     * Backfill defaults for an existing organization (idempotent).
     * Safe to run multiple times — uses firstOrCreate everywhere.
     */
    public function backfill(Organization $org): void
    {
        $this->seedDefaultSettings($org);
        $this->applyDefaultBranding($org);
        $this->createDefaultBranches($org);
        $this->createDefaultDepartments($org);
        $this->createDefaultServices($org);
        $this->createDefaultShipmentStatuses($org);
        $this->createDefaultNumberingSequences($org);
        $this->createDefaultNotifications($org);
        $this->createWallet($org);
        $this->createTrialSubscription($org);
    }

    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    private function createAdminUser(Organization $org, array $adminData): void
    {
        $user = User::create([
            'name'            => $adminData['name'],
            'email'           => $adminData['email'],
            'password'        => Hash::make($adminData['password']),
            'organization_id' => $org->id,
            'is_active'       => true,
        ]);

        $adminRole = Role::where('name', 'admin')->first();
        if ($adminRole) {
            $user->assignRole($adminRole);
        }
    }

    public function seedDefaultSettings(Organization $org): void
    {
        $defaults = [
            // ── Shipping config ────────────────────────────────────
            ['group' => 'shipping_config', 'key' => 'weight_unit',            'value' => '"kg"'],
            ['group' => 'shipping_config', 'key' => 'dimension_unit',         'value' => '"cm"'],
            ['group' => 'shipping_config', 'key' => 'volumetric_divisor',     'value' => '5000'],
            ['group' => 'shipping_config', 'key' => 'tax_rate',               'value' => '0'],
            ['group' => 'shipping_config', 'key' => 'tax_name',               'value' => '"Tax"'],
            ['group' => 'shipping_config', 'key' => 'fuel_surcharge_percent', 'value' => '0'],
            ['group' => 'shipping_config', 'key' => 'insurance_percent',      'value' => '0'],
            ['group' => 'shipping_config', 'key' => 'base_surcharge',         'value' => '0'],
            ['group' => 'shipping_config', 'key' => 'default_base_price',     'value' => '5'],
            ['group' => 'shipping_config', 'key' => 'default_price_per_kg',   'value' => '2.99'],

            // ── Locale ─────────────────────────────────────────────
            ['group' => 'locale', 'key' => 'currency',        'value' => '"USD"'],
            ['group' => 'locale', 'key' => 'language',        'value' => '"es"'],
            ['group' => 'locale', 'key' => 'timezone',        'value' => '"America/Bogota"'],
            ['group' => 'locale', 'key' => 'date_format',     'value' => '"d/m/Y"'],
            ['group' => 'locale', 'key' => 'time_format',     'value' => '"24h"'],
            ['group' => 'locale', 'key' => 'weight_unit',     'value' => '"kg"'],
            ['group' => 'locale', 'key' => 'dimension_unit',  'value' => '"cm"'],

            // ── Company ────────────────────────────────────────────
            ['group' => 'company', 'key' => 'name',       'value' => json_encode($org->name)],
            ['group' => 'company', 'key' => 'legal_name', 'value' => json_encode($org->legal_name ?? $org->name)],
            ['group' => 'company', 'key' => 'tax_id',     'value' => json_encode($org->tax_id ?? '')],
            ['group' => 'company', 'key' => 'email',      'value' => json_encode($org->email ?? '')],
            ['group' => 'company', 'key' => 'phone',      'value' => json_encode($org->phone ?? '')],
            ['group' => 'company', 'key' => 'website',    'value' => '""'],
            ['group' => 'company', 'key' => 'address',    'value' => json_encode($org->address ?? '')],
            ['group' => 'company', 'key' => 'city',       'value' => '""'],
            ['group' => 'company', 'key' => 'state',      'value' => '""'],
            ['group' => 'company', 'key' => 'country',    'value' => '""'],

            // ── Billing ────────────────────────────────────────────
            ['group' => 'billing', 'key' => 'tax_rate',      'value' => '0'],
            ['group' => 'billing', 'key' => 'tax_name',      'value' => '"Tax"'],
            ['group' => 'billing', 'key' => 'currency',      'value' => '"USD"'],
            ['group' => 'billing', 'key' => 'invoice_terms', 'value' => '"Payment is due upon receipt."'],
            ['group' => 'billing', 'key' => 'footer_notes',  'value' => '"Thank you for your business."'],
            ['group' => 'billing', 'key' => 'invoice_theme', 'value' => '"fedex"'],
            ['group' => 'billing', 'key' => 'stripe_enabled',    'value' => '"0"'],
            ['group' => 'billing', 'key' => 'stripe_test_mode',  'value' => '"1"'],
            ['group' => 'billing', 'key' => 'paypal_enabled',    'value' => '"0"'],
            ['group' => 'billing', 'key' => 'paypal_test_mode',  'value' => '"1"'],

            // ── Pricing ────────────────────────────────────────────
            ['group' => 'pricing', 'key' => 'volumetric_divisor',     'value' => '5000'],
            ['group' => 'pricing', 'key' => 'fuel_surcharge_percent', 'value' => '0'],
            ['group' => 'pricing', 'key' => 'insurance_percent',      'value' => '0'],
            ['group' => 'pricing', 'key' => 'base_surcharge',         'value' => '0'],

            // ── Security ───────────────────────────────────────────
            ['group' => 'security', 'key' => 'session_timeout_minutes', 'value' => '60'],
            ['group' => 'security', 'key' => 'require_2fa_admin',       'value' => 'false'],
            ['group' => 'security', 'key' => 'password_expiry_days',    'value' => 'null'],
            ['group' => 'security', 'key' => 'allow_google_login',      'value' => 'false'],
            ['group' => 'security', 'key' => 'ip_whitelist',            'value' => ''],

            // ── AI ─────────────────────────────────────────────────
            ['group' => 'ai', 'key' => 'provider', 'value' => 'null'],
            ['group' => 'ai', 'key' => 'api_key',  'value' => 'null'],
            ['group' => 'ai', 'key' => 'model',    'value' => 'null'],

            // ── Public calculator ──────────────────────────────────
            ['group' => 'public_calculator', 'key' => 'enabled', 'value' => 'true'],
        ];

        foreach ($defaults as $setting) {
            OrganizationSetting::firstOrCreate(
                ['organization_id' => $org->id, 'group' => $setting['group'], 'key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }

    public function applyDefaultBranding(Organization $org): void
    {
        $updates = [];

        if (!$org->primary_color)                $updates['primary_color']    = '#7C3AED';
        if (!$org->secondary_color)              $updates['secondary_color']  = '#A78BFA';
        if (!$org->accent_color)                 $updates['accent_color']     = '#C4B5FD';
        if (!$org->ui_theme)                     $updates['ui_theme']         = 'light';
        if (!$org->primary_font)                 $updates['primary_font']     = 'Inter';
        if (!$org->secondary_font)               $updates['secondary_font']   = 'Inter';
        if (!$org->base_font_size)               $updates['base_font_size']   = '16px';
        if (!$org->layout_density)               $updates['layout_density']   = 'normal';
        if (!$org->card_skin)                    $updates['card_skin']        = 'shadow';
        if (!$org->layout_background)            $updates['layout_background']  = 'oklch(98.5% 0.002 247.839)';
        if (!$org->notification_style)           $updates['notification_style'] = 'toast';
        if (!$org->notification_position)        $updates['notification_position'] = 'top-right';
        if ($org->sidebar_compact === null)      $updates['sidebar_compact']  = false;
        if ($org->monochrome_mode === null)      $updates['monochrome_mode']  = false;

        if (!empty($updates)) {
            $org->update($updates);
        }
    }

    public function createDefaultBranches(Organization $org): void
    {
        $branches = [
            [
                'name'    => $org->name . ' - Principal',
                'code'    => 'HQ',
                'address' => $org->address,
                'city'    => $org->city ?? '',
                'country' => $org->country ?? '',
            ],
            [
                'name'    => $org->name . ' - Bodega',
                'code'    => 'WH',
                'address' => null,
                'city'    => $org->city ?? '',
                'country' => $org->country ?? '',
            ],
        ];

        foreach ($branches as $branch) {
            Branch::firstOrCreate(
                ['organization_id' => $org->id, 'code' => $branch['code']],
                array_merge($branch, ['organization_id' => $org->id])
            );
        }
    }

    private function createDefaultDepartments(Organization $org): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('departments')) {
            return;
        }

        $departments = [
            ['name' => 'Operations',        'code' => 'OPS'],
            ['name' => 'Sales & Marketing', 'code' => 'SALES'],
            ['name' => 'Customer Service',  'code' => 'CS'],
            ['name' => 'Finance',           'code' => 'FIN'],
            ['name' => 'Logistics',         'code' => 'LOG'],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(
                ['organization_id' => $org->id, 'code' => $dept['code']],
                array_merge($dept, ['organization_id' => $org->id, 'active' => true])
            );
        }
    }

    public function createDefaultServices(Organization $org): void
    {
        $services = [
            [
                'name'           => 'Express Air',
                'code'           => 'express_air',
                'mode'           => 'air',
                'description'    => 'Fast air delivery — 1 to 3 business days.',
                'base_price'     => 15.00,
                'price_per_kg'   => 3.99,
                'currency'       => 'USD',
                'estimated_days' => 2,
                'sort_order'     => 1,
            ],
            [
                'name'           => 'Standard Air',
                'code'           => 'standard_air',
                'mode'           => 'air',
                'description'    => 'Standard air freight — 3 to 5 business days.',
                'base_price'     => 10.00,
                'price_per_kg'   => 2.99,
                'currency'       => 'USD',
                'estimated_days' => 4,
                'sort_order'     => 2,
            ],
            [
                'name'           => 'Land Express',
                'code'           => 'land_express',
                'mode'           => 'land',
                'description'    => 'Express ground delivery — 2 to 4 business days.',
                'base_price'     => 8.00,
                'price_per_kg'   => 1.99,
                'currency'       => 'USD',
                'estimated_days' => 3,
                'sort_order'     => 3,
            ],
            [
                'name'           => 'Ground Standard',
                'code'           => 'ground_standard',
                'mode'           => 'land',
                'description'    => 'Economy ground service — 5 to 10 business days.',
                'base_price'     => 5.00,
                'price_per_kg'   => 1.49,
                'currency'       => 'USD',
                'estimated_days' => 7,
                'sort_order'     => 4,
            ],
            [
                'name'           => 'Economy Sea',
                'code'           => 'economy_sea',
                'mode'           => 'sea',
                'description'    => 'Maritime freight — 15 to 30 business days.',
                'base_price'     => 3.00,
                'price_per_kg'   => 0.99,
                'currency'       => 'USD',
                'estimated_days' => 20,
                'sort_order'     => 5,
            ],
        ];

        foreach ($services as $svc) {
            Service::firstOrCreate(
                ['organization_id' => $org->id, 'code' => $svc['code']],
                array_merge($svc, ['organization_id' => $org->id, 'is_active' => true])
            );
        }
    }

    public function createDefaultShipmentStatuses(Organization $org): void
    {
        $statuses = [
            ['code' => 'pending',          'name' => 'Pending',          'color' => '#F39C12', 'icon' => 'clock',              'order' => 1],
            ['code' => 'processed',        'name' => 'Processed',        'color' => '#2980B9', 'icon' => 'check-circle',       'order' => 2],
            ['code' => 'in_transit',       'name' => 'In Transit',       'color' => '#3498DB', 'icon' => 'truck',              'order' => 3],
            ['code' => 'out_for_delivery', 'name' => 'Out for Delivery', 'color' => '#E67E22', 'icon' => 'map-pin',            'order' => 4],
            ['code' => 'delivered',        'name' => 'Delivered',        'color' => '#27AE60', 'icon' => 'package-check',      'order' => 5],
            ['code' => 'cancelled',        'name' => 'Cancelled',        'color' => '#E74C3C', 'icon' => 'x-circle',           'order' => 6],
            ['code' => 'on_hold',          'name' => 'On Hold',          'color' => '#95A5A6', 'icon' => 'pause-circle',       'order' => 7],
            ['code' => 'returned',         'name' => 'Returned',         'color' => '#E67E22', 'icon' => 'rotate-ccw',         'order' => 8],
            ['code' => 'awaiting_payment', 'name' => 'Awaiting Payment', 'color' => '#F39C12', 'icon' => 'credit-card',        'order' => 9],
        ];

        foreach ($statuses as $status) {
            ShipmentStatus::firstOrCreate(
                ['organization_id' => $org->id, 'code' => $status['code']],
                array_merge($status, ['organization_id' => $org->id, 'is_active' => true])
            );
        }
    }

    public function createDefaultNumberingSequences(Organization $org): void
    {
        $sequences = [
            ['type' => 'tracking', 'prefix' => 'TRK',  'suffix' => null, 'next_number' => 1, 'padding' => 8, 'reset_rule' => 'never'],
            ['type' => 'invoice',  'prefix' => 'INV-', 'suffix' => null, 'next_number' => 1, 'padding' => 6, 'reset_rule' => 'never'],
        ];

        foreach ($sequences as $seq) {
            NumberingSequence::firstOrCreate(
                ['organization_id' => $org->id, 'type' => $seq['type']],
                array_merge($seq, ['organization_id' => $org->id])
            );
        }
    }

    private function createWallet(Organization $org): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('saas_wallets')) {
            return;
        }
        SaasWallet::firstOrCreate(
            ['organization_id' => $org->id],
            ['balance' => 0.00, 'currency' => 'USD']
        );
    }

    /**
     * Assign a trial subscription to the new organization.
     * Uses the lowest-priced active plan. Idempotent — skips if org already has a subscription.
     */
    private function createTrialSubscription(Organization $org): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('saas_subscriptions') ||
            !\Illuminate\Support\Facades\Schema::hasTable('saas_plans')) {
            return;
        }

        // Don't overwrite an existing subscription
        $already = SaasSubscription::where('organization_id', $org->id)->exists();
        if ($already) {
            return;
        }

        $plan = SaasPlan::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price_monthly')
            ->first();

        if (!$plan) {
            return;
        }

        $trialDays = $plan->trial_days ?: 14;

        SaasSubscription::create([
            'organization_id' => $org->id,
            'plan_id'         => $plan->id,
            'billing_cycle'   => 'monthly',
            'status'          => 'trial',
            'price'           => $plan->price_monthly,
            'currency'        => $plan->currency ?? 'USD',
            'starts_at'       => now(),
            'expires_at'      => now()->addDays($trialDays),
            'trial_ends_at'   => now()->addDays($trialDays),
            'auto_renew'      => true,
        ]);
    }

    public function createDefaultNotifications(Organization $org): void
    {
        // ── Default rules (one per event, email channel enabled) ──────────
        $rules = [
            ['event_key' => 'shipment_created',    'channels' => ['email'], 'is_active' => true],
            ['event_key' => 'out_for_delivery',     'channels' => ['email'], 'is_active' => true],
            ['event_key' => 'delivered',            'channels' => ['email'], 'is_active' => true],
            ['event_key' => 'exception',            'channels' => ['email'], 'is_active' => true],
            ['event_key' => 'shipment_in_transit',  'channels' => ['email'], 'is_active' => false],
            ['event_key' => 'awaiting_payment',     'channels' => ['email'], 'is_active' => false],
        ];

        foreach ($rules as $rule) {
            NotificationRule::firstOrCreate(
                ['organization_id' => $org->id, 'event_key' => $rule['event_key']],
                array_merge($rule, ['organization_id' => $org->id])
            );
        }

        // ── Default email templates (es + en) ─────────────────────────────
        $orgName = $org->name;

        $templates = [
            // ── shipment_created ──────────────────────────────────────────
            [
                'channel'     => 'email',
                'event_key'   => 'shipment_created',
                'language'    => 'es',
                'design_type' => 'html',
                'subject'     => "Tu envío ha sido registrado — {{tracking_number}}",
                'content'     => "Hola {{customer_name}},

Tu envío ha sido creado exitosamente en {$orgName}.

📦 Número de guía: {{tracking_number}}
📍 Origen: {{origin}}
📍 Destino: {{destination}}
🚚 Servicio: {{service_name}}

Puedes rastrear tu paquete en cualquier momento usando tu número de guía.

Gracias por confiar en {$orgName}.",
            ],
            [
                'channel'     => 'email',
                'event_key'   => 'shipment_created',
                'language'    => 'en',
                'design_type' => 'html',
                'subject'     => "Your shipment has been registered — {{tracking_number}}",
                'content'     => "Hello {{customer_name}},

Your shipment has been successfully created with {$orgName}.

📦 Tracking number: {{tracking_number}}
📍 Origin: {{origin}}
📍 Destination: {{destination}}
🚚 Service: {{service_name}}

You can track your package at any time using your tracking number.

Thank you for choosing {$orgName}.",
            ],

            // ── out_for_delivery ──────────────────────────────────────────
            [
                'channel'     => 'email',
                'event_key'   => 'out_for_delivery',
                'language'    => 'es',
                'design_type' => 'html',
                'subject'     => "Tu paquete está en camino — {{tracking_number}}",
                'content'     => "Hola {{customer_name}},

¡Buenas noticias! Tu paquete está en camino y será entregado hoy.

📦 Número de guía: {{tracking_number}}
📍 Dirección de entrega: {{destination}}
🕐 Fecha estimada: {{estimated_date}}

Asegúrate de estar disponible para recibir tu paquete.

Equipo {$orgName}.",
            ],
            [
                'channel'     => 'email',
                'event_key'   => 'out_for_delivery',
                'language'    => 'en',
                'design_type' => 'html',
                'subject'     => "Your package is out for delivery — {{tracking_number}}",
                'content'     => "Hello {{customer_name}},

Great news! Your package is on its way and will be delivered today.

📦 Tracking number: {{tracking_number}}
📍 Delivery address: {{destination}}
🕐 Estimated date: {{estimated_date}}

Please make sure someone is available to receive your package.

{$orgName} Team.",
            ],

            // ── delivered ─────────────────────────────────────────────────
            [
                'channel'     => 'email',
                'event_key'   => 'delivered',
                'language'    => 'es',
                'design_type' => 'html',
                'subject'     => "¡Tu paquete fue entregado! — {{tracking_number}}",
                'content'     => "Hola {{customer_name}},

Tu paquete ha sido entregado exitosamente. ✅

📦 Número de guía: {{tracking_number}}
📍 Entregado en: {{destination}}
📅 Fecha de entrega: {{delivered_at}}

Si tienes alguna pregunta sobre tu envío, no dudes en contactarnos.

Gracias por tu preferencia,
Equipo {$orgName}.",
            ],
            [
                'channel'     => 'email',
                'event_key'   => 'delivered',
                'language'    => 'en',
                'design_type' => 'html',
                'subject'     => "Your package has been delivered! — {{tracking_number}}",
                'content'     => "Hello {{customer_name}},

Your package has been successfully delivered. ✅

📦 Tracking number: {{tracking_number}}
📍 Delivered to: {{destination}}
📅 Delivery date: {{delivered_at}}

If you have any questions about your shipment, please don't hesitate to contact us.

Thank you for your business,
{$orgName} Team.",
            ],

            // ── exception ─────────────────────────────────────────────────
            [
                'channel'     => 'email',
                'event_key'   => 'exception',
                'language'    => 'es',
                'design_type' => 'html',
                'subject'     => "Alerta: Problema con tu envío — {{tracking_number}}",
                'content'     => "Hola {{customer_name}},

Hemos detectado un inconveniente con tu envío y queremos informarte.

📦 Número de guía: {{tracking_number}}
⚠️ Estado: {{status}}
📝 Detalle: {{exception_reason}}

Nuestro equipo está trabajando para resolver la situación a la brevedad. Te contactaremos con una actualización pronto.

Si tienes preguntas urgentes, escríbenos directamente.

Equipo {$orgName}.",
            ],
            [
                'channel'     => 'email',
                'event_key'   => 'exception',
                'language'    => 'en',
                'design_type' => 'html',
                'subject'     => "Alert: Issue with your shipment — {{tracking_number}}",
                'content'     => "Hello {{customer_name}},

We have detected an issue with your shipment and want to keep you informed.

📦 Tracking number: {{tracking_number}}
⚠️ Status: {{status}}
📝 Details: {{exception_reason}}

Our team is working to resolve the situation as quickly as possible. We will contact you with an update soon.

If you have urgent questions, please reach out to us directly.

{$orgName} Team.",
            ],

            // ── shipment_in_transit ───────────────────────────────────────
            [
                'channel'     => 'email',
                'event_key'   => 'shipment_in_transit',
                'language'    => 'es',
                'design_type' => 'html',
                'subject'     => "Tu envío está en tránsito — {{tracking_number}}",
                'content'     => "Hola {{customer_name}},

Tu paquete ya está en tránsito hacia su destino.

📦 Número de guía: {{tracking_number}}
📍 Destino: {{destination}}
🚚 Servicio: {{service_name}}
🕐 Entrega estimada: {{estimated_date}}

Equipo {$orgName}.",
            ],
            [
                'channel'     => 'email',
                'event_key'   => 'shipment_in_transit',
                'language'    => 'en',
                'design_type' => 'html',
                'subject'     => "Your shipment is in transit — {{tracking_number}}",
                'content'     => "Hello {{customer_name}},

Your package is now in transit to its destination.

📦 Tracking number: {{tracking_number}}
📍 Destination: {{destination}}
🚚 Service: {{service_name}}
🕐 Estimated delivery: {{estimated_date}}

{$orgName} Team.",
            ],

            // ── awaiting_payment ──────────────────────────────────────────
            [
                'channel'     => 'email',
                'event_key'   => 'awaiting_payment',
                'language'    => 'es',
                'design_type' => 'html',
                'subject'     => "Pago pendiente para tu envío — {{tracking_number}}",
                'content'     => "Hola {{customer_name}},

Tu envío está pendiente de pago para ser procesado.

📦 Número de guía: {{tracking_number}}
💰 Monto: {{amount}} {{currency}}

Por favor realiza el pago para continuar con el proceso de envío. Si ya realizaste el pago, ignora este mensaje.

Equipo {$orgName}.",
            ],
            [
                'channel'     => 'email',
                'event_key'   => 'awaiting_payment',
                'language'    => 'en',
                'design_type' => 'html',
                'subject'     => "Payment pending for your shipment — {{tracking_number}}",
                'content'     => "Hello {{customer_name}},

Your shipment is awaiting payment before it can be processed.

📦 Tracking number: {{tracking_number}}
💰 Amount: {{amount}} {{currency}}

Please complete the payment to proceed with your shipment. If you have already paid, please disregard this message.

{$orgName} Team.",
            ],
        ];

        foreach ($templates as $tpl) {
            NotificationTemplate::firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'channel'         => $tpl['channel'],
                    'event_key'       => $tpl['event_key'],
                    'language'        => $tpl['language'],
                ],
                array_merge($tpl, ['organization_id' => $org->id, 'is_active' => true])
            );
        }
    }
}
