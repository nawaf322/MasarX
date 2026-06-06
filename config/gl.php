<?php
/**
 * General Ledger account codes.
 *
 * Override per-environment via .env:
 *   GL_AR=1200
 *   GL_REVENUE=4100
 *   GL_COST=5100
 *   GL_AP=2100
 *
 * Per-organization overrides can be stored in organization_settings
 * under the 'accounting' group (gl_ar, gl_revenue, gl_cost, gl_ap keys).
 */
return [
    'accounts' => [
        'ar'      => ['code' => env('GL_AR',      '1200'), 'name' => 'Accounts Receivable'],
        'revenue' => ['code' => env('GL_REVENUE',  '4100'), 'name' => 'Revenue – Freight'],
        'cost'    => ['code' => env('GL_COST',     '5100'), 'name' => 'Cost of Services'],
        'ap'      => ['code' => env('GL_AP',       '2100'), 'name' => 'Accounts Payable'],
    ],
];
