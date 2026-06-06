<?php
/**
 * Edition capabilities matrix.
 *
 * 'premium' => full feature set (direct sale)
 * 'Plus'    => full feature set (Envato/Codecanyon release)
 * 'envato'  => limited/core set (legacy key, alias of Plus)
 *
 * Features default to true for premium/Plus, check 'envato' key for availability.
 * A feature absent from this list is treated as DISABLED in all editions.
 */
return [
    'current' => env('APP_EDITION', 'Plus'), // 'premium' | 'Plus' | 'envato'

    'features' => [
        // Core operational (all editions)
        'shipments'              => ['premium' => true,  'Plus' => true,  'envato' => true],
        'tracking'               => ['premium' => true,  'Plus' => true,  'envato' => true],
        'customers'              => ['premium' => true,  'Plus' => true,  'envato' => true],
        'rates'                  => ['premium' => true,  'Plus' => true,  'envato' => true],
        'locations'              => ['premium' => true,  'Plus' => true,  'envato' => true],
        'basic_reports'          => ['premium' => true,  'Plus' => true,  'envato' => true],
        'pdf_labels'             => ['premium' => true,  'Plus' => true,  'envato' => true],
        'notifications_email'    => ['premium' => true,  'Plus' => true,  'envato' => true],
        'api_access'             => ['premium' => true,  'Plus' => true,  'envato' => true],
        'cod'                    => ['premium' => true,  'Plus' => true,  'envato' => true],
        'proof_of_delivery'      => ['premium' => true,  'Plus' => true,  'envato' => true],
        'returns'                => ['premium' => true,  'Plus' => true,  'envato' => true],
        'manifest'               => ['premium' => true,  'Plus' => true,  'envato' => true],
        'dispatch'               => ['premium' => true,  'Plus' => true,  'envato' => true],
        'warehouse'              => ['premium' => true,  'Plus' => true,  'envato' => true],
        'pickups'                => ['premium' => true,  'Plus' => true,  'envato' => true],
        'import_export'          => ['premium' => true,  'Plus' => true,  'envato' => true],
        'multi_currency'         => ['premium' => true,  'Plus' => true,  'envato' => true],
        'branding'               => ['premium' => true,  'Plus' => true,  'envato' => true],
        'roles_permissions'      => ['premium' => true,  'Plus' => true,  'envato' => true],
        'audit_log'              => ['premium' => true,  'Plus' => true,  'envato' => true],

        // Full features (premium only — routes not registered in Plus/envato)
        'commissions'            => ['premium' => true,  'Plus' => false, 'envato' => false],
        'contracts'              => ['premium' => true,  'Plus' => false, 'envato' => false],
        'finance_dashboard'      => ['premium' => true,  'Plus' => true,  'envato' => false],
        'ar_ledger'              => ['premium' => true,  'Plus' => true,  'envato' => false],
        'reconciliation'         => ['premium' => true,  'Plus' => true,  'envato' => false],
        'advanced_reports'       => ['premium' => true,  'Plus' => true,  'envato' => false],
        'multi_branch'           => ['premium' => true,  'Plus' => true,  'envato' => false],
        'departments'            => ['premium' => true,  'Plus' => true,  'envato' => false],
        'customs_declarations'   => ['premium' => true,  'Plus' => true,  'envato' => false],
        'hs_codes'               => ['premium' => true,  'Plus' => true,  'envato' => false],
        'ga_route_optimizer'     => ['premium' => true,  'Plus' => true,  'envato' => false],
        'carrier_integrations'   => ['premium' => true,  'Plus' => true,  'envato' => false],
        'webhooks'               => ['premium' => true,  'Plus' => true,  'envato' => false],
        'saas_billing'           => ['premium' => true,  'Plus' => true,  'envato' => false],
        'saas_wallet'            => ['premium' => true,  'Plus' => true,  'envato' => false],
        'inventory'              => ['premium' => true,  'Plus' => true,  'envato' => false],
        'ai_insights'            => ['premium' => true,  'Plus' => true,  'envato' => false],
        'notifications_sms'      => ['premium' => true,  'Plus' => true,  'envato' => false],
        'driver_live_tracking'   => ['premium' => true,  'Plus' => true,  'envato' => false],
        'public_rate_widget'     => ['premium' => true,  'Plus' => true,  'envato' => false],
    ],
];
