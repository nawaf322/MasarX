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

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

\Illuminate\Support\Facades\Schedule::command('finance:reconcile')->dailyAt('00:00');

// Purge GPS driver locations older than retention period (default 30 days).
\Illuminate\Support\Facades\Schedule::command('driver-locations:purge')->dailyAt('02:00');

// Purge API request logs older than retention period (default 90 days).
\Illuminate\Support\Facades\Schedule::command('api-logs:purge')->weeklyOn(0, '03:00');

// Purge audit logs older than retention period (default 365 days).
\Illuminate\Support\Facades\Schedule::command('audit-logs:purge')->monthlyOn(1, '04:00');

// Purge shipment histories for terminal shipments older than retention period (default 180 days).
\Illuminate\Support\Facades\Schedule::command('shipment-histories:purge')->weeklyOn(1, '03:30');

// SaaS: process expired subscriptions, attempt renewals, flag overdue invoices.
\Illuminate\Support\Facades\Schedule::command('saas:check-subscriptions')->dailyAt('01:00');

// Check for software updates twice a day (08:00 and 20:00).
\Illuminate\Support\Facades\Schedule::command('app:check-updates')->twiceDaily(8, 20);
