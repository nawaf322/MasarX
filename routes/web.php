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

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

// Public tracking (no auth required)
Route::get('/tracking', [\App\Http\Controllers\TrackingController::class, 'index'])
    ->middleware('throttle:60,1')
    ->name('tracking.index');

// Public Rate Calculator
Route::get('/rate', [\App\Http\Controllers\PublicCalculatorController::class, 'show'])->name('public.calculator');
Route::post('/rate/calculate', [\App\Http\Controllers\PublicCalculatorController::class, 'calculate'])->name('public.calculator.calculate')->middleware('throttle:30,1');
Route::post('/rate/save-intent', [\App\Http\Controllers\PublicCalculatorController::class, 'saveIntent'])->name('public.calculator.save-intent')->middleware('throttle:20,1');

Route::middleware(['auth', 'verified', \App\Http\Middleware\CheckTenant::class, 'security.policy', 'security.ip'])->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/logistics', [\App\Http\Controllers\DashboardController::class, 'logistics'])->name('dashboard.logistics')->middleware('can:view dashboard');

    // Global search — accessible to all authenticated users (customers get scoped results)
    Route::get('/api/search/global', [\App\Http\Controllers\SearchController::class, 'global'])->name('api.search.global');

    // Location dropdowns — accessible to all authenticated users (used in shipment create form)
    Route::get('/customers/locations/states', [\App\Http\Controllers\CustomerController::class, 'locationsStates'])->name('customers.locations.states');
    Route::get('/customers/locations/cities', [\App\Http\Controllers\CustomerController::class, 'locationsCities'])->name('customers.locations.cities');

    // Dispatch
    Route::middleware('can:dispatch.access')->group(function () {
        Route::get('/dispatch', [\App\Http\Controllers\DispatchController::class, 'index'])->name('dispatch.index');
        Route::get('/dispatch/driver-locations', [\App\Http\Controllers\DispatchController::class, 'driverLocations'])->name('dispatch.driver-locations');
        Route::get('/dispatch/driver-locations/{driver}/history', [\App\Http\Controllers\DispatchController::class, 'driverLocationHistory'])->name('dispatch.driver-location-history');
        // M6 GPS — driver sends real-time location
        Route::post('/dispatch/driver-locations/update', [\App\Http\Controllers\DispatchController::class, 'updateDriverLocation'])->name('dispatch.driver-location-update');
        Route::post('/dispatch/auto-optimize', [\App\Http\Controllers\DispatchController::class, 'autoOptimize'])->name('dispatch.auto-optimize');
    });

    // Locations
    Route::prefix('locations')->middleware('can:locations.view')->group(function () {
        Route::resource('countries', \App\Http\Controllers\Locations\CountryController::class)->only(['index', 'show'])->names('locations.countries');
        Route::resource('states', \App\Http\Controllers\Locations\StateController::class)->only(['index', 'show'])->names('locations.states');
        Route::resource('cities', \App\Http\Controllers\Locations\CityController::class)->only(['index', 'show'])->names('locations.cities');
        Route::middleware('can:locations.manage')->group(function () {
            Route::resource('countries', \App\Http\Controllers\Locations\CountryController::class)->except(['index', 'show', 'create', 'edit'])->names('locations.countries');
            Route::resource('states', \App\Http\Controllers\Locations\StateController::class)->except(['index', 'show', 'create', 'edit'])->names('locations.states');
            Route::resource('cities', \App\Http\Controllers\Locations\CityController::class)->except(['index', 'show', 'create', 'edit'])->names('locations.cities');
        });
    });

    // Rates Module
    Route::prefix('rates')->name('rates.')->middleware('can:settings.pricing.view')->group(function () {
        Route::get('/', [\App\Http\Controllers\Rates\RatesController::class, 'index'])->name('index');

        Route::middleware('can:settings.pricing.update')->group(function () {
            Route::resource('zones', \App\Http\Controllers\Rates\RateZoneController::class)->except(['index', 'show']);
            Route::resource('cards', \App\Http\Controllers\Rates\RateCardController::class)->except(['index', 'show']);
            Route::post('cards/{card}/rules', [\App\Http\Controllers\Rates\RateRuleController::class, 'store'])->name('cards.rules.store');
            Route::resource('rules', \App\Http\Controllers\Rates\RateRuleController::class)->except(['index', 'store', 'create', 'show']);
        });
        Route::resource('zones', \App\Http\Controllers\Rates\RateZoneController::class)->only(['index', 'show']);
        Route::resource('cards', \App\Http\Controllers\Rates\RateCardController::class)->only(['index', 'show']);
        Route::resource('rules', \App\Http\Controllers\Rates\RateRuleController::class)->only(['show']);

        Route::get('calculator', [\App\Http\Controllers\Rates\RateCalculatorController::class, 'index'])->name('calculator');
        Route::post('calculate', [\App\Http\Controllers\Rates\RateCalculatorController::class, 'calculate'])->name('calculate.post');
        Route::post('/quote', [\App\Http\Controllers\Rates\RateCalculatorController::class, 'calculate'])->name('quote');
    });

    // Customers
    Route::middleware('can:customers.access')->group(function () {
        Route::get('/customers', [\App\Http\Controllers\CustomerController::class, 'index'])->name('customers.index');
        Route::get('/customers/create', [\App\Http\Controllers\CustomerController::class, 'create'])->name('customers.create');
        Route::post('/customers', [\App\Http\Controllers\CustomerController::class, 'store'])->name('customers.store')->middleware('can:customers.create');
        Route::get('/customers/export', [\App\Http\Controllers\CustomerController::class, 'export'])->name('customers.export');
        Route::get('/customers/import-template', [\App\Http\Controllers\CustomerController::class, 'importTemplate'])->name('customers.import.template');
        Route::post('/customers/import', [\App\Http\Controllers\CustomerController::class, 'import'])->name('customers.import');
        Route::post('/customers/import-deprixa-pro', [\App\Http\Controllers\CustomerController::class, 'importDeprixaPro'])->middleware('throttle:5,1')->name('customers.import.deprixa-pro');
        Route::get('/api/customers/search', [\App\Http\Controllers\CustomerController::class, 'searchApi'])->name('api.customers.search');
        Route::post('/api/customers/quick-create', [\App\Http\Controllers\CustomerController::class, 'quickCreateApi'])->name('api.customers.quick-create');
        Route::match(['put', 'patch'], '/api/customers/{id}', [\App\Http\Controllers\CustomerController::class, 'updateApi'])->name('api.customers.update');
        Route::get('/customers/{customer}', [\App\Http\Controllers\CustomerController::class, 'show'])->name('customers.show');
        Route::get('/customers/{customer}/edit', [\App\Http\Controllers\CustomerController::class, 'edit'])->name('customers.edit');
        Route::match(['put', 'patch'], '/customers/{customer}', [\App\Http\Controllers\CustomerController::class, 'update'])->name('customers.update');
        Route::post('/customers/bulk-destroy', [\App\Http\Controllers\CustomerController::class, 'bulkDestroy'])->name('customers.bulk-destroy')->middleware('can:customers.delete');
        Route::delete('/customers/{customer}', [\App\Http\Controllers\CustomerController::class, 'destroy'])->name('customers.destroy')->middleware('can:customers.delete');
        Route::post('/customers/{customer}/resend-invitation', [\App\Http\Controllers\CustomerController::class, 'resendPortalInvitation'])->name('customers.resend-invitation');
        // Customer wallet management (admin)
        Route::get('/customers/{customer}/wallet',  [\App\Http\Controllers\CustomerWalletController::class, 'adminIndex'])->name('customers.wallet');
        Route::post('/customers/{customer}/wallet/credit', [\App\Http\Controllers\CustomerWalletController::class, 'adminCredit'])->name('customers.wallet.credit');
    });

    // Invoice view — accessible to all authenticated users (customers can view their own invoices)
    Route::get('/invoices/{shipment}', [\App\Http\Controllers\InvoiceController::class, 'show'])->name('invoices.show');

    // Billing / Invoicing (basic — remitos y facturas PDF)
    Route::middleware('can:settings.billing.view')->group(function () {
        Route::get('/billing', [\App\Http\Controllers\InvoiceController::class, 'index'])->name('billing.index');
        Route::get('/billing/export-pdf', [\App\Http\Controllers\InvoiceController::class, 'exportPdf'])->name('billing.export-pdf');
        Route::get('/shipments/{shipment}/payment/success', [\App\Http\Controllers\ShipmentController::class, 'paymentSuccess'])->name('shipments.payment.success');
        Route::post('/invoices/{shipment}/send-email', [\App\Http\Controllers\InvoiceController::class, 'sendEmail'])->name('invoices.send-email');
        Route::post('/invoices/{shipment}/send-whatsapp', [\App\Http\Controllers\InvoiceController::class, 'sendWhatsapp'])->name('invoices.send-whatsapp');
        Route::post('/invoices/{shipment}/send-sms', [\App\Http\Controllers\InvoiceController::class, 'sendSms'])->name('invoices.send-sms');
    });

    // M1 — Contracts
    Route::prefix('contracts')->name('contracts.')->middleware(['edition:contracts', 'can:contracts.view'])->group(function () {
        Route::get('/',                  [\App\Http\Controllers\ContractController::class, 'index'])->name('index');
        Route::get('/{contract}',        [\App\Http\Controllers\ContractController::class, 'show'])->name('show');
        Route::get('/{contract}/print',  [\App\Http\Controllers\ContractController::class, 'printView'])->name('print');
        Route::get('/create',            [\App\Http\Controllers\ContractController::class, 'create'])->name('create')->middleware('can:contracts.create');
        Route::post('/',                 [\App\Http\Controllers\ContractController::class, 'store'])->name('store')->middleware('can:contracts.create');
        Route::get('/{contract}/edit',   [\App\Http\Controllers\ContractController::class, 'edit'])->name('edit')->middleware('can:contracts.manage');
        Route::put('/{contract}',        [\App\Http\Controllers\ContractController::class, 'update'])->name('update')->middleware('can:contracts.manage');
        Route::delete('/{contract}',     [\App\Http\Controllers\ContractController::class, 'destroy'])->name('destroy')->middleware('can:contracts.manage');
        Route::post('/{contract}/sign',  [\App\Http\Controllers\ContractController::class, 'sign'])->name('sign')->middleware('can:contracts.manage');
    });

    // Reports
    Route::get('/reports', [\App\Http\Controllers\ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/shipments', [\App\Http\Controllers\ReportController::class, 'shipmentsReport'])->name('reports.shipments');
    Route::get('/reports/shipments/export-pdf', [\App\Http\Controllers\ReportController::class, 'exportShipmentsPdf'])->name('reports.shipments.export-pdf');
    Route::get('/reports/shipments/export-excel', [\App\Http\Controllers\ReportController::class, 'exportShipmentsExcel'])->name('reports.shipments.export-excel');
    Route::get('/reports/returns', [\App\Http\Controllers\ReportController::class, 'returnsReport'])->name('reports.returns');
    Route::get('/reports/returns/export-pdf', [\App\Http\Controllers\ReportController::class, 'exportReturnsPdf'])->name('reports.returns.export-pdf');
    Route::get('/reports/returns/export-excel', [\App\Http\Controllers\ReportController::class, 'exportReturnsExcel'])->name('reports.returns.export-excel');
    Route::middleware('edition:advanced_reports')->group(function () {
        Route::get('/reports/financial', [\App\Http\Controllers\ReportController::class, 'financial'])
            ->name('reports.financial')
            ->middleware('can:reports.financial.view');
        Route::get('/reports/financial/export-pdf', [\App\Http\Controllers\ReportController::class, 'exportFinancialPdf'])->name('reports.financial.export-pdf');
        Route::get('/reports/financial/export-excel', [\App\Http\Controllers\ReportController::class, 'exportFinancialExcel'])->name('reports.financial.export-excel');
        Route::get('/reports/financial/export-gl', [\App\Http\Controllers\ReportController::class, 'exportGl'])->name('reports.financial.export-gl');
        // M8 — Branch & Zone Profitability Reports
        Route::get('/reports/branch-profitability', [\App\Http\Controllers\ReportController::class, 'branchReport'])->name('reports.branch');
        Route::get('/reports/zone-profitability', [\App\Http\Controllers\ReportController::class, 'zoneReport'])->name('reports.zone');
    });

    // M8 — Commissions
    Route::prefix('commissions')->name('commissions.')->middleware(['edition:commissions', 'can:commissions.view'])->group(function () {
        Route::get('/', [\App\Http\Controllers\CommissionController::class, 'index'])->name('index');
        Route::get('/export', [\App\Http\Controllers\CommissionController::class, 'export'])->name('export');
        Route::post('/bulk-approve', [\App\Http\Controllers\CommissionController::class, 'bulkApprove'])->name('bulk-approve')->middleware('can:commissions.manage');
        Route::post('/bulk-pay', [\App\Http\Controllers\CommissionController::class, 'bulkPay'])->name('bulk-pay')->middleware('can:commissions.manage');
        Route::get('/rules', [\App\Http\Controllers\CommissionController::class, 'rules'])->name('rules');
        Route::post('/rules', [\App\Http\Controllers\CommissionController::class, 'storeRule'])->name('rules.store')->middleware('can:commissions.manage');
        Route::put('/rules/{rule}', [\App\Http\Controllers\CommissionController::class, 'updateRule'])->name('rules.update')->middleware('can:commissions.manage');
        Route::delete('/rules/{rule}', [\App\Http\Controllers\CommissionController::class, 'destroyRule'])->name('rules.destroy')->middleware('can:commissions.manage');
        Route::post('/{commission}/approve', [\App\Http\Controllers\CommissionController::class, 'approve'])->name('approve')->middleware('can:commissions.manage');
        Route::post('/{commission}/mark-paid', [\App\Http\Controllers\CommissionController::class, 'markPaid'])->name('mark-paid')->middleware('can:commissions.manage');
    });

    // Settings
    Route::prefix('settings')->group(function () {
        Route::get('/', fn() => redirect()->route('settings.company'))->name('settings.index');

        // Identity
        Route::get('/company', [\App\Http\Controllers\Settings\CompanyProfileController::class, 'show'])
            ->name('settings.company')
            ->middleware('can:settings.company.view');
        Route::post('/company', [\App\Http\Controllers\Settings\CompanyProfileController::class, 'update'])
            ->name('settings.company.update')
            ->middleware('can:settings.company.update');

        Route::get('/branding', [\App\Http\Controllers\Settings\BrandingController::class, 'show'])
            ->name('settings.branding')
            ->middleware('can:settings.branding.view');
        Route::post('/branding', [\App\Http\Controllers\Settings\BrandingController::class, 'update'])
            ->name('settings.branding.update')
            ->middleware('can:settings.branding.update');

        Route::get('/locale', [\App\Http\Controllers\Settings\LocaleController::class, 'show'])
            ->name('settings.locale')
            ->middleware('can:settings.locale.view');
        Route::post('/locale', [\App\Http\Controllers\Settings\LocaleController::class, 'update'])
            ->name('settings.locale.update')
            ->middleware('can:settings.locale.update');
        Route::post('/locale/currencies/{id}/toggle', [\App\Http\Controllers\Settings\LocaleController::class, 'toggleCurrency'])
            ->name('settings.locale.currencies.toggle')
            ->middleware('can:settings.locale.update');
        Route::post('/locale/currencies/{id}/set-primary', [\App\Http\Controllers\Settings\LocaleController::class, 'setPrimaryCurrency'])
            ->name('settings.locale.currencies.set-primary')
            ->middleware('can:settings.locale.update');
        Route::post('/locale/currencies', [\App\Http\Controllers\Settings\LocaleController::class, 'storeCurrency'])
            ->name('settings.locale.currencies.store')
            ->middleware('can:settings.locale.update');

        // Access Control
        Route::get('/users', [\App\Http\Controllers\Settings\UsersController::class, 'index'])
            ->name('settings.users')
            ->middleware('can:settings.users.list');
        Route::post('/users', [\App\Http\Controllers\Settings\UsersController::class, 'store'])
            ->name('settings.users.store')
            ->middleware('can:settings.users.create');
        Route::patch('/users/{user}', [\App\Http\Controllers\Settings\UsersController::class, 'update'])
            ->name('settings.users.update')
            ->middleware('can:settings.users.update');
        Route::delete('/users/{user}', [\App\Http\Controllers\Settings\UsersController::class, 'destroy'])
            ->name('settings.users.destroy')
            ->middleware('can:settings.users.delete');
        Route::put('/users/{user}/password-reset', [\App\Http\Controllers\Settings\UsersController::class, 'resetPassword'])
            ->name('settings.users.password.reset')
            ->middleware('can:settings.users.update');
        Route::patch('/users/{user}/toggle-active', [\App\Http\Controllers\Settings\UsersController::class, 'toggleActive'])
            ->name('settings.users.toggle-active')
            ->middleware('can:settings.users.update');
        Route::post('/users/bulk-deactivate', [\App\Http\Controllers\Settings\UsersController::class, 'bulkDeactivate'])
            ->name('settings.users.bulk-deactivate')
            ->middleware('can:settings.users.update');
        Route::post('/users/{user}/resend-invitation', [\App\Http\Controllers\Settings\UsersController::class, 'resendInvitation'])
            ->name('settings.users.resend-invitation')
            ->middleware('can:settings.users.create');

        // Branches (sucursales — single level)
        Route::middleware('can:settings.branches.view')->group(function () {
            Route::get('/branches', [\App\Http\Controllers\Settings\BranchController::class, 'index'])->name('settings.branches');
        });
        Route::middleware('can:settings.branches.store')->group(function () {
            Route::post('/branches', [\App\Http\Controllers\Settings\BranchController::class, 'store'])->name('settings.branches.store');
        });
        Route::middleware('can:settings.branches.update')->group(function () {
            Route::put('/branches/{branch}', [\App\Http\Controllers\Settings\BranchController::class, 'update'])->name('settings.branches.update');
            Route::patch('/branches/{branch}', [\App\Http\Controllers\Settings\BranchController::class, 'update']);
        });
        Route::middleware('can:settings.branches.destroy')->group(function () {
            Route::delete('/branches/{branch}', [\App\Http\Controllers\Settings\BranchController::class, 'destroy'])->name('settings.branches.destroy');
        });

        // Shipment Statuses
        Route::get('/shipment-statuses', [\App\Http\Controllers\Settings\ShipmentStatusController::class, 'index'])
            ->name('settings.shipment-statuses')->middleware('can:settings.shipment-statuses.view');
        Route::middleware('can:settings.shipment-statuses.manage')->group(function () {
            Route::post('/shipment-statuses', [\App\Http\Controllers\Settings\ShipmentStatusController::class, 'store'])
                ->name('settings.shipment-statuses.store');
            Route::put('/shipment-statuses/{shipment_status}', [\App\Http\Controllers\Settings\ShipmentStatusController::class, 'update'])
                ->name('settings.shipment-statuses.update');
            Route::delete('/shipment-statuses/{shipment_status}', [\App\Http\Controllers\Settings\ShipmentStatusController::class, 'destroy'])
                ->name('settings.shipment-statuses.destroy');
        });

        // Services
        Route::get('/services', [\App\Http\Controllers\Settings\ServiceController::class, 'index'])
            ->name('settings.services')->middleware('can:settings.services.view');
        Route::middleware('can:settings.services.manage')->group(function () {
            Route::post('/services', [\App\Http\Controllers\Settings\ServiceController::class, 'store'])
                ->name('settings.services.store');
            Route::put('/services/{service}', [\App\Http\Controllers\Settings\ServiceController::class, 'update'])
                ->name('settings.services.update');
            Route::delete('/services/{service}', [\App\Http\Controllers\Settings\ServiceController::class, 'destroy'])
                ->name('settings.services.destroy');
            Route::post('/services/{service}/toggle-active', [\App\Http\Controllers\Settings\ServiceController::class, 'toggleActive'])
                ->name('settings.services.toggle-active');
        });

        Route::get('/roles', [\App\Http\Controllers\Settings\RolesController::class, 'index'])
            ->name('settings.roles')
            ->middleware('can:settings.roles.list');
        Route::put('/roles/{role}', [\App\Http\Controllers\Settings\RolesController::class, 'update'])
            ->name('settings.roles.update')
            ->middleware('can:settings.roles.manage');

        Route::get('/security', [\App\Http\Controllers\Settings\SecurityController::class, 'show'])
            ->name('settings.security')
            ->middleware('can:settings.security.view');
        Route::post('/security', [\App\Http\Controllers\Settings\SecurityController::class, 'update'])
            ->name('settings.security.update')
            ->middleware('can:settings.security.update');

        // Logistics Config
        Route::get('/tracking', [\App\Http\Controllers\Settings\TrackingController::class, 'show'])
            ->name('settings.tracking')
            ->middleware('can:settings.tracking.view');
        Route::post('/sequence', [\App\Http\Controllers\Settings\TrackingController::class, 'updateSequence'])
            ->name('settings.sequence.update')
            ->middleware('can:settings.tracking.update');
        Route::post('/tracking/labels', [\App\Http\Controllers\Settings\TrackingController::class, 'updateLabels'])
            ->name('settings.tracking.labels.update')
            ->middleware('can:settings.tracking.update');

        Route::get('/pricing', fn () => redirect()->route('settings.shipping-config'))->name('settings.pricing');

        Route::get('/shipping-config', [\App\Http\Controllers\Settings\ShippingConfigController::class, 'show'])
            ->name('settings.shipping-config')
            ->middleware('can:settings.shipping-config.view');
        Route::post('/shipping-config', [\App\Http\Controllers\Settings\ShippingConfigController::class, 'update'])
            ->name('settings.shipping-config.update')
            ->middleware('can:settings.shipping-config.update');
        Route::post('/shipping-config/sequence', [\App\Http\Controllers\Settings\ShippingConfigController::class, 'updateSequence'])
            ->name('settings.shipping-config.sequence.update')
            ->middleware('can:settings.shipping-config.update');

        // Lockers settings
        Route::get('/lockers-settings', [\App\Http\Controllers\Settings\LockersSettingsController::class, 'show'])
            ->name('settings.lockers');
        Route::post('/lockers-settings', [\App\Http\Controllers\Settings\LockersSettingsController::class, 'update'])
            ->name('settings.lockers.update');
        Route::get('/lockers-settings/preview', [\App\Http\Controllers\Settings\LockersSettingsController::class, 'previewCode'])
            ->name('settings.lockers.preview');

        // Notifications
        Route::get('/notifications', [\App\Http\Controllers\Settings\NotificationsController::class, 'index'])
            ->name('settings.notifications')
            ->middleware('can:settings.notifications.view');
        Route::post('/notifications/rule', [\App\Http\Controllers\Settings\NotificationsController::class, 'updateRule'])
            ->name('settings.notifications.rule')
            ->middleware('can:settings.notifications.update');
        Route::post('/notifications/template', [\App\Http\Controllers\Settings\NotificationsController::class, 'updateTemplate'])
            ->name('settings.notifications.template')
            ->middleware('can:settings.notifications.update');
        Route::post('/notifications/channels', [\App\Http\Controllers\Settings\NotificationsController::class, 'updateChannel'])
            ->name('settings.notifications.channel')
            ->middleware('can:settings.notifications.update');
        Route::post('/notifications/channels/test', [\App\Http\Controllers\Settings\NotificationsController::class, 'testChannel'])
            ->name('settings.notifications.channel.test')
            ->middleware('can:settings.notifications.update');

        // Maintenance & Audit
        Route::get('/audit', [\App\Http\Controllers\Settings\AuditController::class, 'index'])
            ->name('settings.audit')
            ->middleware('can:settings.audit.view');
        Route::get('/maintenance', [\App\Http\Controllers\Settings\MaintenanceController::class, 'index'])
            ->name('settings.maintenance')
            ->middleware('can:settings.maintenance.view');
        Route::post('/maintenance/health', [\App\Http\Controllers\Settings\MaintenanceController::class, 'healthCheck'])
            ->name('settings.maintenance.health')
            ->middleware('can:settings.maintenance.manage');
        Route::post('/maintenance/cache', [\App\Http\Controllers\Settings\MaintenanceController::class, 'clearCache'])
            ->name('settings.maintenance.cache')
            ->middleware('can:settings.maintenance.manage');
        Route::get('/maintenance/export', [\App\Http\Controllers\Settings\MaintenanceController::class, 'exportSettings'])
            ->name('settings.maintenance.export')
            ->middleware('can:settings.maintenance.manage');
        Route::post('/maintenance/import', [\App\Http\Controllers\Settings\MaintenanceController::class, 'importSettings'])
            ->name('settings.maintenance.import')
            ->middleware('can:settings.maintenance.manage');
        Route::post('/maintenance/clear-log', [\App\Http\Controllers\Settings\MaintenanceController::class, 'clearLog'])
            ->name('settings.maintenance.clear-log')
            ->middleware('can:settings.maintenance.manage');

        // Updates
        Route::get('/updates', [\App\Http\Controllers\Settings\UpdateController::class, 'index'])
            ->name('settings.updates')->middleware('can:settings.updates.view');
        Route::get('/updates/progress', [\App\Http\Controllers\Settings\UpdateController::class, 'progress'])
            ->name('settings.updates.progress')->middleware('can:settings.updates.view');
        Route::post('/updates/activate', [\App\Http\Controllers\Settings\UpdateController::class, 'activate'])
            ->name('settings.updates.activate')
            ->middleware('can:settings.maintenance.manage');
        Route::post('/updates/check', [\App\Http\Controllers\Settings\UpdateController::class, 'check'])
            ->name('settings.updates.check')
            ->middleware('can:settings.maintenance.manage');
        Route::post('/updates/apply', [\App\Http\Controllers\Settings\UpdateController::class, 'apply'])
            ->name('settings.updates.apply')
            ->middleware('can:settings.maintenance.manage');
        Route::post('/updates/deactivate', [\App\Http\Controllers\Settings\UpdateController::class, 'deactivate'])
            ->name('settings.updates.deactivate')
            ->middleware('can:settings.maintenance.manage');

        // Billing Settings (invoice template config)
        Route::get('/billing', [\App\Http\Controllers\Settings\BillingController::class, 'show'])
            ->name('settings.billing')
            ->middleware('can:settings.billing.view');
        Route::post('/billing', [\App\Http\Controllers\Settings\BillingController::class, 'update'])
            ->name('settings.billing.update')
            ->middleware('can:settings.billing.update');

        // Departments
        Route::get('/departments', [\App\Http\Controllers\Settings\DepartmentController::class, 'index'])
            ->name('settings.departments')->middleware('can:settings.departments.view');
        Route::post('/departments', [\App\Http\Controllers\Settings\DepartmentController::class, 'store'])
            ->name('settings.departments.store')->middleware('can:settings.departments.store');
        Route::put('/departments/{department}', [\App\Http\Controllers\Settings\DepartmentController::class, 'update'])
            ->name('settings.departments.update')->middleware('can:settings.departments.update');
        Route::delete('/departments/{department}', [\App\Http\Controllers\Settings\DepartmentController::class, 'destroy'])
            ->name('settings.departments.destroy')->middleware('can:settings.departments.destroy');
    });

    // Finance
    Route::get('/finance', [\App\Http\Controllers\FinanceController::class, 'index'])
        ->name('finance.index')
        ->middleware(['can:finance.view', 'edition:finance_dashboard']);

    // Warehouse
    Route::middleware('can:warehouse.access')->group(function () {
        Route::get('/warehouse', [\App\Http\Controllers\WarehouseController::class, 'index'])->name('warehouse.index');
        Route::get('/warehouse/receive', [\App\Http\Controllers\WarehouseController::class, 'receive'])->name('warehouse.receive');
        Route::post('/warehouse/scan', [\App\Http\Controllers\WarehouseController::class, 'scan'])->name('warehouse.scan');
        Route::get('/warehouse/lookup', [\App\Http\Controllers\WarehouseController::class, 'lookupShipment'])->name('warehouse.lookup');

        Route::get('/warehouse/manifests', [\App\Http\Controllers\WarehouseController::class, 'manifests'])->name('warehouse.manifests.index');
        Route::get('/warehouse/manifests/create', function () {
            $orgId = \Illuminate\Support\Facades\Auth::user()->organization_id;
            return \Inertia\Inertia::render('Warehouse/Manifests/Create', [
                'drivers' => \App\Models\User::role('Driver')
                    ->where('organization_id', $orgId)
                    ->where('is_active', true)
                    ->get(['id', 'name', 'email']),
            ]);
        })->name('warehouse.manifests.create');
        Route::post('/warehouse/manifests', [\App\Http\Controllers\WarehouseController::class, 'createManifest'])->name('warehouse.manifests.store');
        Route::get('/warehouse/manifests/export-pdf', [\App\Http\Controllers\WarehouseController::class, 'exportPdf'])->name('warehouse.manifests.export-pdf');
        Route::get('/warehouse/manifests/{manifest}', [\App\Http\Controllers\WarehouseController::class, 'showManifest'])->name('warehouse.manifests.show');

        Route::get('/warehouse/inventory', [\App\Http\Controllers\WarehouseController::class, 'inventory'])->name('warehouse.inventory.index');
        Route::get('/warehouse/inventory/export-pdf', [\App\Http\Controllers\WarehouseController::class, 'exportInventoryPdf'])->name('warehouse.inventory.export-pdf');
        // M4 — Inventory photo uploads
        Route::get('/warehouse/inventory/items', [\App\Http\Controllers\WarehouseController::class, 'items'])->name('warehouse.inventory.items.index');
        Route::post('/warehouse/inventory/items/{item}/photos', [\App\Http\Controllers\WarehouseController::class, 'uploadItemPhotos'])->name('warehouse.inventory.items.photos');
        Route::get('/warehouse/inventory/locations', [\App\Http\Controllers\WarehouseController::class, 'locations'])->name('warehouse.inventory.locations.index');
        Route::post('/warehouse/inventory/locations/{location}/photos', [\App\Http\Controllers\WarehouseController::class, 'uploadLocationPhotos'])->name('warehouse.inventory.locations.photos');
    });

    // API Tokens (admin/super-admin only)
    Route::get('/api-tokens', [\App\Http\Controllers\ApiTokenController::class, 'index'])
        ->name('api-tokens.index')
        ->middleware('role:admin|super-admin');

    // Genetic Algorithm
    Route::middleware('can:dispatch.access')->group(function () {
        Route::post('/ga/optimize-routes', [\App\Http\Controllers\GaController::class, 'optimizeRoutes'])
            ->name('ga.optimize-routes');
    });

    // Admin - Organization Management (super-admin only)
    Route::prefix('admin')->middleware('role:super-admin')->group(function () {
        Route::get('/organizations', [\App\Http\Controllers\Admin\OrganizationController::class, 'index'])
            ->name('admin.organizations.index');
        Route::post('/organizations', [\App\Http\Controllers\Admin\OrganizationController::class, 'store'])
            ->name('admin.organizations.store');
        Route::put('/organizations/{organization}', [\App\Http\Controllers\Admin\OrganizationController::class, 'update'])
            ->name('admin.organizations.update');
        Route::post('/organizations/{organization}/toggle-status', [\App\Http\Controllers\Admin\OrganizationController::class, 'toggleStatus'])
            ->name('admin.organizations.toggle-status');
    });

    // Settings - API Management (admin/super-admin only)
    Route::prefix('settings')->middleware('role:admin|super-admin')->group(function () {
        Route::get('/api', [\App\Http\Controllers\Settings\ApiManagementController::class, 'index'])
            ->name('settings.api.index');
        Route::get('/api/clients', [\App\Http\Controllers\Settings\ApiManagementController::class, 'clientsIndex'])
            ->name('settings.api.clients.index');
        Route::get('/api/clients/create', [\App\Http\Controllers\Settings\ApiManagementController::class, 'clientsCreate'])
            ->name('settings.api.clients.create');
        Route::post('/api/clients', [\App\Http\Controllers\Settings\ApiManagementController::class, 'clientsStore'])
            ->name('settings.api.clients.store');
        Route::get('/api/clients/{client}/edit', [\App\Http\Controllers\Settings\ApiManagementController::class, 'clientsEdit'])
            ->name('settings.api.clients.edit');
        Route::put('/api/clients/{client}', [\App\Http\Controllers\Settings\ApiManagementController::class, 'clientsUpdate'])
            ->name('settings.api.clients.update');
        Route::delete('/api/clients/{client}', [\App\Http\Controllers\Settings\ApiManagementController::class, 'clientsDestroy'])
            ->name('settings.api.clients.destroy');
        Route::get('/api/webhooks', [\App\Http\Controllers\Settings\ApiManagementController::class, 'webhooksIndex'])
            ->name('settings.api.webhooks.index');
        Route::post('/api/webhooks', [\App\Http\Controllers\Settings\ApiManagementController::class, 'webhooksStore'])
            ->name('settings.api.webhooks.store');
        Route::get('/api/logs', [\App\Http\Controllers\Settings\ApiManagementController::class, 'logsIndex'])
            ->name('settings.api.logs.index');

        // Settings - Integrations
        Route::get('/integrations', [\App\Http\Controllers\Settings\IntegrationsController::class, 'index'])
            ->name('settings.integrations')
            ->middleware('can:settings.integrations.view');
        Route::post('/integrations/update', [\App\Http\Controllers\Settings\IntegrationsController::class, 'update'])
            ->name('settings.integrations.update')->middleware('can:settings.integrations.update');
        Route::post('/carrier/update', [\App\Http\Controllers\Settings\IntegrationsController::class, 'updateCarrier'])
            ->name('settings.carrier.update');
        Route::post('/carrier/test', [\App\Http\Controllers\Settings\IntegrationsController::class, 'testCarrier'])
            ->name('settings.carrier.test');
        Route::post('/mercadolibre/update', [\App\Http\Controllers\Settings\IntegrationsController::class, 'updateMercadolibre'])
            ->name('settings.mercadolibre.update');
        Route::post('/integrations/mercadolibre/test', [\App\Http\Controllers\Settings\IntegrationsController::class, 'testMercadolibre'])
            ->name('settings.mercadolibre.test');
        Route::get('/integrations/mercadolibre/redirect', [\App\Http\Controllers\Settings\IntegrationsController::class, 'mercadolibreRedirect'])
            ->name('integrations.mercadolibre.redirect');
        Route::get('/integrations/mercadolibre/callback', [\App\Http\Controllers\Settings\IntegrationsController::class, 'mercadolibreCallback'])
            ->name('integrations.mercadolibre.callback');
        Route::post('/maps/update', [\App\Http\Controllers\Settings\IntegrationsController::class, 'updateMaps'])
            ->name('settings.maps.update');
        Route::post('/public-calculator/update', [\App\Http\Controllers\Settings\IntegrationsController::class, 'updatePublicCalculator'])
            ->name('settings.public-calculator.update')
            ->middleware('can:settings.integrations.update');
        Route::post('/google/test', [\App\Http\Controllers\Settings\IntegrationsController::class, 'testGoogle'])
            ->name('settings.google.test');
    });

    // SaaS Billing Dashboard
    Route::prefix('my-billing')->middleware('role:super-admin')->group(function () {
        Route::get('/', [\App\Http\Controllers\Saas\BillingController::class, 'index'])
            ->name('tenant.billing.index');
        // Dashboard alias
        Route::get('/dashboard', [\App\Http\Controllers\Saas\BillingController::class, 'index'])
            ->name('tenant.billing.dashboard');
        Route::get('/recharge', [\App\Http\Controllers\Saas\BillingController::class, 'recharge'])
            ->name('tenant.billing.recharge');
        Route::post('/recharge/stripe', [\App\Http\Controllers\Saas\BillingController::class, 'stripeSession'])
            ->name('tenant.billing.recharge.stripe');
        Route::post('/recharge/paypal', [\App\Http\Controllers\Saas\BillingController::class, 'paypalOrder'])
            ->name('tenant.billing.recharge.paypal');
        Route::get('/stripe/success', [\App\Http\Controllers\Saas\BillingController::class, 'stripeSuccess'])
            ->name('tenant.billing.stripe.success');
        Route::get('/stripe/cancel', [\App\Http\Controllers\Saas\BillingController::class, 'stripeCancel'])
            ->name('tenant.billing.stripe.cancel');
        Route::get('/paypal/capture', [\App\Http\Controllers\Saas\BillingController::class, 'paypalCapture'])
            ->name('tenant.billing.paypal.capture');
    });

    // In-App Notifications
    Route::prefix('notifications/inapp')->name('inapp.')->group(function () {
        Route::get('/',          [\App\Http\Controllers\InAppNotificationsController::class, 'index'])->name('index');
        Route::get('/count',     [\App\Http\Controllers\InAppNotificationsController::class, 'count'])->name('count');
        Route::post('/read-all', [\App\Http\Controllers\InAppNotificationsController::class, 'markAllRead'])->name('read-all');
        Route::post('/{id}/read',[\App\Http\Controllers\InAppNotificationsController::class, 'markRead'])->name('read');
    });

    // Shipments
    // ─── Proof of Delivery ────────────────────────────────────────────────────
    Route::get('/shipments/{shipment}/pod', [\App\Http\Controllers\ProofOfDeliveryController::class, 'show'])->name('shipments.pod.show')->middleware('can:pod.create');
    Route::post('/shipments/{shipment}/pod', [\App\Http\Controllers\ProofOfDeliveryController::class, 'store'])->name('shipments.pod.store')->middleware('can:pod.create');
    Route::get('/shipments/{shipment}/pod/download', [\App\Http\Controllers\ProofOfDeliveryController::class, 'download'])->name('shipments.pod.download')->middleware('can:pod.view');

    // ─── Customs Declarations ─────────────────────────────────────────────────
    Route::get('/shipments/{shipment}/customs', [\App\Http\Controllers\CustomsDeclarationController::class, 'show'])->name('shipments.customs.show')->middleware('can:customs.view');
    Route::post('/shipments/{shipment}/customs', [\App\Http\Controllers\CustomsDeclarationController::class, 'store'])->name('shipments.customs.store')->middleware('can:customs.manage');
    Route::delete('/shipments/{shipment}/customs', [\App\Http\Controllers\CustomsDeclarationController::class, 'destroy'])->name('shipments.customs.destroy')->middleware('can:customs.manage');

    // ─── Returns ──────────────────────────────────────────────────────────────
    Route::prefix('returns')->name('returns.')->group(function () {
        Route::get('/', [\App\Http\Controllers\ReturnShipmentController::class, 'index'])->name('index')->middleware('can:returns.view');
        Route::get('/create', [\App\Http\Controllers\ReturnShipmentController::class, 'create'])->name('create')->middleware('can:returns.create');
        Route::post('/', [\App\Http\Controllers\ReturnShipmentController::class, 'store'])->name('store')->middleware('can:returns.create');
        Route::get('/{returnShipment}', [\App\Http\Controllers\ReturnShipmentController::class, 'show'])->name('show')->middleware('can:returns.view');
        Route::patch('/{returnShipment}', [\App\Http\Controllers\ReturnShipmentController::class, 'update'])->name('update')->middleware('can:returns.update');
    });

    // ─── COD ──────────────────────────────────────────────────────────────────
    Route::prefix('cod')->name('cod.')->group(function () {
        Route::get('/', [\App\Http\Controllers\CodController::class, 'index'])->name('index')->middleware('can:cod.view');
        Route::post('/{shipment}/collect', [\App\Http\Controllers\CodController::class, 'collect'])->name('collect')->middleware('can:cod.collect');
        Route::post('/{shipment}/remit', [\App\Http\Controllers\CodController::class, 'remit'])->name('remit')->middleware('can:cod.remit');
    });

    // ─── Import ───────────────────────────────────────────────────────────────
    Route::prefix('import')->name('import.')->middleware('can:shipments.import')->group(function () {
        Route::get('/', [\App\Http\Controllers\ImportController::class, 'index'])->name('index');
        Route::get('/template', [\App\Http\Controllers\ImportController::class, 'template'])->name('template');
        Route::post('/', [\App\Http\Controllers\ImportController::class, 'store'])->name('store');
        Route::post('/deprixa-pro', [\App\Http\Controllers\ImportController::class, 'importDeprixaPro'])->middleware('throttle:5,1')->name('deprixa-pro');
        Route::get('/{importJob}', [\App\Http\Controllers\ImportController::class, 'show'])->name('show');
        Route::delete('/{importJob}', [\App\Http\Controllers\ImportController::class, 'destroy'])->name('destroy');
    });

    // ─── HS Codes Settings ────────────────────────────────────────────────────
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::middleware('can:settings.hs-codes.view')->group(function () {
            Route::get('/hs-codes/search', [\App\Http\Controllers\Settings\HsCodeController::class, 'search'])->name('hs-codes.search');
            Route::get('/hs-codes', [\App\Http\Controllers\Settings\HsCodeController::class, 'index'])->name('hs-codes.index');
        });
        Route::middleware('can:settings.hs-codes.manage')->group(function () {
            Route::post('/hs-codes', [\App\Http\Controllers\Settings\HsCodeController::class, 'store'])->name('hs-codes.store');
            Route::put('/hs-codes/{hsCode}', [\App\Http\Controllers\Settings\HsCodeController::class, 'update'])->name('hs-codes.update');
            Route::delete('/hs-codes/{hsCode}', [\App\Http\Controllers\Settings\HsCodeController::class, 'destroy'])->name('hs-codes.destroy');
        });
    });

    Route::post('/shipments/bulk-destroy', [\App\Http\Controllers\ShipmentController::class, 'bulkDestroy'])->name('shipments.bulk-destroy');
    Route::post('/shipments/get-rates', [\App\Http\Controllers\ShipmentController::class, 'getRates'])->name('shipments.rates');
    Route::get('/shipments/export', [\App\Http\Controllers\ShipmentController::class, 'export'])->name('shipments.export');
    Route::get('/shipments/{shipment}/label', [\App\Http\Controllers\ShipmentController::class, 'label'])->name('shipments.label');
    Route::post('/shipments/{shipment}/mark-paid', [\App\Http\Controllers\ShipmentController::class, 'markPaid'])->name('shipments.mark-paid');
    Route::get('/payments/{payment}/receipt', [\App\Http\Controllers\ShipmentController::class, 'downloadPaymentReceipt'])->name('payments.receipt');
    Route::get('/shipments/attachments/{attachment}/download', [\App\Http\Controllers\ShipmentController::class, 'downloadAttachment'])->name('shipments.attachments.download');
    Route::put('/shipments/{shipment}/change-status', [\App\Http\Controllers\ShipmentController::class, 'changeStatus'])->name('shipments.change-status');
    Route::post('/shipments/{shipment}/archive', [\App\Http\Controllers\ShipmentController::class, 'archive'])->name('shipments.archive');
    Route::post('/shipments/{shipment}/unarchive', [\App\Http\Controllers\ShipmentController::class, 'unarchive'])->name('shipments.unarchive');
    Route::post('/shipments/{shipment}/clone', [\App\Http\Controllers\ShipmentController::class, 'clone'])->name('shipments.clone');
    Route::get('/shipments/from-rate', [\App\Http\Controllers\Shipments\CreateFromCalculatorController::class, 'show'])->name('shipments.from-rate');
    Route::resource('shipments', \App\Http\Controllers\ShipmentController::class);

    // M3 - Origin Pickups (Recolección de Origen)
    Route::prefix('pickups')->name('pickups.')->middleware('can:pickups.view')->group(function () {
        Route::get('/', [\App\Http\Controllers\PickupController::class, 'index'])->name('index');
        Route::get('/search-shipment', [\App\Http\Controllers\PickupController::class, 'searchShipment'])->name('search-shipment');
        Route::get('/create', [\App\Http\Controllers\PickupController::class, 'create'])->name('create')->middleware('can:pickups.create');
        Route::post('/', [\App\Http\Controllers\PickupController::class, 'store'])->name('store')->middleware('can:pickups.create');
        Route::post('/bulk-cancel', [\App\Http\Controllers\PickupController::class, 'bulkCancel'])->name('bulk-cancel')->middleware('can:pickups.manage');
        Route::post('/bulk-destroy', [\App\Http\Controllers\PickupController::class, 'bulkDestroy'])->name('bulk-destroy')->middleware('can:pickups.manage');
        Route::get('/{pickup}/print', [\App\Http\Controllers\PickupController::class, 'printView'])->name('print');
        Route::get('/{pickup}', [\App\Http\Controllers\PickupController::class, 'show'])->name('show');
        Route::get('/{pickup}/confirm-form', function (\App\Models\OriginPickup $pickup) {
            abort_if($pickup->organization_id !== auth()->user()->organization_id, 403);
            $pickup->load('shipment');
            $action = $pickup->status === 'pending' ? 'confirm' : 'complete';
            return inertia('Pickups/Confirm', ['pickup' => $pickup, 'action' => $action]);
        })->name('confirm.form')->middleware('can:pickups.manage');
        Route::post('/{pickup}/confirm', [\App\Http\Controllers\PickupController::class, 'confirm'])->name('confirm')->middleware('can:pickups.manage');
        // Allow both managers (pickups.manage) and drivers (pickups.complete) to complete pickups
        Route::post('/{pickup}/complete', [\App\Http\Controllers\PickupController::class, 'complete'])->name('complete');
        Route::post('/{pickup}/upload-photos', [\App\Http\Controllers\PickupController::class, 'uploadPhotos'])->name('upload-photos');
        // Driver-accessible confirm-form for completing pickups
        Route::get('/{pickup}/complete-form', function (\App\Models\OriginPickup $pickup) {
            abort_if($pickup->organization_id !== auth()->user()->organization_id, 403);
            $pickup->load('shipment');
            return inertia('Pickups/Confirm', ['pickup' => $pickup, 'action' => 'complete']);
        })->name('complete.form');
        Route::post('/{pickup}/cancel', [\App\Http\Controllers\PickupController::class, 'cancel'])->name('cancel')->middleware('can:pickups.manage');
        Route::post('/{pickup}/assign', [\App\Http\Controllers\PickupController::class, 'assign'])->name('assign')->middleware('can:pickups.manage');
    });

    // ─── My Locker (customer self-service portal) ─────────────────────────────
    Route::get('/my-locker', [\App\Http\Controllers\MyLockerController::class, 'index'])->name('my-locker.index');

    // ─── My Wallet (customer wallet) ──────────────────────────────────────────
    Route::prefix('my-wallet')->name('my-wallet.')->group(function () {
        Route::get('/',          [\App\Http\Controllers\CustomerWalletController::class, 'index'])->name('index');
        Route::get('/recharge',  [\App\Http\Controllers\CustomerWalletController::class, 'rechargeForm'])->name('recharge');
        Route::post('/recharge', [\App\Http\Controllers\CustomerWalletController::class, 'processRecharge'])->name('recharge.store');
    });

    // ─── My Shipments (customer self-service) ─────────────────────────────────
    Route::get('/my-shipments', [\App\Http\Controllers\CustomerPortalController::class, 'shipments'])->name('my-shipments.index');

    // ─── Customer Contacts / Recipients ───────────────────────────────────────
    Route::prefix('my-contacts')->name('my-contacts.')->group(function () {
        Route::get('/',                  [\App\Http\Controllers\CustomerContactController::class, 'index'])->name('index');
        Route::post('/',                 [\App\Http\Controllers\CustomerContactController::class, 'store'])->name('store');
        Route::put('/{contact}',         [\App\Http\Controllers\CustomerContactController::class, 'update'])->name('update');
        Route::delete('/{contact}',      [\App\Http\Controllers\CustomerContactController::class, 'destroy'])->name('destroy');
        Route::get('/api',               [\App\Http\Controllers\CustomerContactController::class, 'apiIndex'])->name('api');
        Route::post('/api',              [\App\Http\Controllers\CustomerContactController::class, 'apiStore'])->name('api.store');
    });

    // ─── Lockers (Casilleros) ──────────────────────────────────────────────────
    Route::prefix('lockers')->name('lockers.')->middleware('can:lockers.view')->group(function () {
        Route::get('/',              [\App\Http\Controllers\LockerController::class, 'index'])->name('index');
        Route::get('/create',        [\App\Http\Controllers\LockerController::class, 'create'])->name('create')->middleware('can:lockers.manage');
        Route::post('/',             [\App\Http\Controllers\LockerController::class, 'store'])->name('store')->middleware('can:lockers.manage');
        Route::get('/{locker}',      [\App\Http\Controllers\LockerController::class, 'show'])->name('show');
        Route::put('/{locker}',      [\App\Http\Controllers\LockerController::class, 'update'])->name('update')->middleware('can:lockers.manage');
        Route::delete('/{locker}',   [\App\Http\Controllers\LockerController::class, 'destroy'])->name('destroy')->middleware('can:lockers.manage');
    });

    // ─── Pre-Alerts (Prealerta de paquetes / casillero) ────────────────────────
    Route::prefix('pre-alerts')->name('pre-alerts.')->middleware('can:pre-alerts.view')->group(function () {
        Route::get('/',                              [\App\Http\Controllers\PreAlertController::class, 'index'])->name('index');
        Route::post('/import-deprixa-pro',           [\App\Http\Controllers\PreAlertController::class, 'importDeprixaPro'])->name('import-deprixa-pro')->middleware('can:pre-alerts.create');
        Route::post('/bulk-cancel',                  [\App\Http\Controllers\PreAlertController::class, 'bulkCancel'])->name('bulk-cancel')->middleware('can:pre-alerts.manage');
        Route::post('/bulk-destroy',                 [\App\Http\Controllers\PreAlertController::class, 'bulkDestroy'])->name('bulk-destroy')->middleware('can:pre-alerts.manage');
        Route::get('/create',                        [\App\Http\Controllers\PreAlertController::class, 'create'])->name('create')->middleware('can:pre-alerts.create');
        Route::post('/',                             [\App\Http\Controllers\PreAlertController::class, 'store'])->name('store')->middleware('can:pre-alerts.create');
        Route::get('/{preAlert}',                    [\App\Http\Controllers\PreAlertController::class, 'show'])->name('show');
        Route::post('/{preAlert}/receive',           [\App\Http\Controllers\PreAlertController::class, 'receive'])->name('receive')->middleware('can:pre-alerts.manage');
        Route::post('/{preAlert}/convert',           [\App\Http\Controllers\PreAlertController::class, 'convert'])->name('convert')->middleware('can:pre-alerts.manage');
        Route::post('/{preAlert}/cancel',            [\App\Http\Controllers\PreAlertController::class, 'cancel'])->name('cancel')->middleware('can:pre-alerts.manage');
        Route::post('/{preAlert}/attachments',       [\App\Http\Controllers\PreAlertController::class, 'uploadAttachment'])->name('attachments.upload')->middleware('can:pre-alerts.create');
        Route::post('/{preAlert}/parse-invoice',     [\App\Http\Controllers\PreAlertController::class, 'parseInvoice'])->name('parse-invoice')->middleware('can:pre-alerts.create');
        Route::get('/{preAlert}/convert-form',       [\App\Http\Controllers\PreAlertController::class, 'showConvert'])->name('convert-form')->middleware('can:pre-alerts.manage');
        Route::post('/{preAlert}/rate-quote',        [\App\Http\Controllers\PreAlertController::class, 'rateQuote'])->name('rate-quote');
    });
});

// Profile
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Two-Factor Authentication
    Route::prefix('profile/two-factor')->name('profile.two-factor.')->group(function () {
        Route::post('/', [\App\Http\Controllers\TwoFactorAuthenticationController::class, 'store'])->name('store');
        Route::post('/verify', [\App\Http\Controllers\TwoFactorAuthenticationController::class, 'verify'])->name('verify');
        Route::post('/resend', [\App\Http\Controllers\TwoFactorAuthenticationController::class, 'resend'])->name('resend');
        Route::delete('/', [\App\Http\Controllers\TwoFactorAuthenticationController::class, 'destroy'])->name('destroy');
    });
});

// Onboarding
Route::middleware('auth')->group(function () {
    Route::get('/onboarding', function () {
        return redirect()->route('dashboard');
    })->name('onboarding.index');
});

// SaaS Billing Webhooks (no auth required)
Route::post('/my-billing/webhook/stripe', [\App\Http\Controllers\Saas\BillingController::class, 'stripeWebhook'])
    ->name('webhooks.saas.stripe');
Route::post('/my-billing/webhook/paypal', [\App\Http\Controllers\Saas\BillingController::class, 'paypalWebhook'])
    ->name('webhooks.saas.paypal');

// Stripe success alias (used in SaasPaymentService redirect)
Route::middleware(['auth', 'verified', \App\Http\Middleware\CheckTenant::class, 'security.policy', 'security.ip'])
    ->group(function () {
        Route::get('/my-billing/stripe/success-return', [\App\Http\Controllers\Saas\BillingController::class, 'stripeSuccess'])
            ->name('tenant.billing.recharge.stripe.success');
    });

require __DIR__.'/auth.php';

// ─── Chat ─────────────────────────────────────────────────────────────────────
Route::middleware(['auth', \App\Http\Middleware\CheckTenant::class])->prefix('chat')->name('chat.')->group(function () {
    Route::get('/messages',  [\App\Http\Controllers\ChatController::class, 'messages'])->name('messages');
    Route::post('/messages', [\App\Http\Controllers\ChatController::class, 'send'])->name('send');
    Route::post('/ping',     [\App\Http\Controllers\ChatController::class, 'ping'])->name('ping');
    Route::get('/online',    [\App\Http\Controllers\ChatController::class, 'online'])->name('online');
    Route::post('/read',     [\App\Http\Controllers\ChatController::class, 'markRead'])->name('read');
    Route::get('/unread',    [\App\Http\Controllers\ChatController::class, 'unread'])->name('unread');
    Route::post('/upload',   [\App\Http\Controllers\ChatController::class, 'upload'])->name('upload');
});

// ─── Installation Wizard ──────────────────────────────────────────────────────
Route::middleware([])->prefix('install')->name('install.')->group(function () {
    Route::get('/', [\App\Http\Controllers\InstallController::class, 'step1'])->name('step1');
    Route::get('/license', [\App\Http\Controllers\InstallController::class, 'step2'])->name('step2');
    Route::post('/license/verify', [\App\Http\Controllers\InstallController::class, 'verifyLicense'])->middleware('throttle:10,1')->name('verify-license');
    Route::get('/database', [\App\Http\Controllers\InstallController::class, 'step3'])->name('step3');
    Route::post('/database/test', [\App\Http\Controllers\InstallController::class, 'testDatabase'])->middleware('throttle:20,1')->name('test-database');
    Route::post('/database/setup', [\App\Http\Controllers\InstallController::class, 'setupDatabase'])->middleware('throttle:5,1')->name('setup-database');
    Route::get('/admin', [\App\Http\Controllers\InstallController::class, 'step4'])->name('step4');
    Route::post('/admin/create', [\App\Http\Controllers\InstallController::class, 'createAdmin'])->middleware('throttle:10,1')->name('create-admin');
    Route::get('/preferences', [\App\Http\Controllers\InstallController::class, 'step5'])->name('step5');
    Route::post('/finalize', [\App\Http\Controllers\InstallController::class, 'finalize'])->middleware('throttle:5,1')->name('finalize');
});
