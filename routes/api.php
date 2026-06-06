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

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public tracking (no auth — read only)
Route::get('/tracking/{tracking}', [\App\Http\Controllers\Api\V1\TrackingApiController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('api.tracking.show');

// Client token endpoint (no auth required — this IS the auth endpoint)
Route::post('/v1/auth/client-token', [\App\Http\Controllers\Api\V1\ClientTokenController::class, 'issue'])
    ->name('api.client-token');

// Authenticated API — session auth (web guard, for internal Inertia/SPA use)
Route::middleware(['auth:sanctum', \App\Http\Middleware\CheckApiTokenScope::class, 'api.idempotency'])->prefix('v1')->name('api.')->group(function () {
    Route::get('/user', fn (Request $request) => response()->json($request->user()))->name('user');

    // Rates quote (scope: rates.quote)
    Route::post('/rates/quote', function (Request $request) {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'hasScope') && !$token->hasScope('rates.quote')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }
        return app(\App\Http\Controllers\Api\V1\RatesApiController::class)->quote($request);
    })->name('rates.quote');

    // Shipments (scope: shipments.view)
    Route::get('/shipments', function (Request $request) {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'hasScope') && !$token->hasScope('shipments.view')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }
        return app(\App\Http\Controllers\Api\V1\ShipmentApiController::class)->index($request);
    })->name('shipments.index');

    Route::post('/shipments', [\App\Http\Controllers\Api\V1\ShipmentApiController::class, 'store'])->name('shipments.store');
    Route::get('/shipments/{shipment}', [\App\Http\Controllers\Api\V1\ShipmentApiController::class, 'show'])->name('shipments.show');
    Route::put('/shipments/{shipment}', [\App\Http\Controllers\Api\V1\ShipmentApiController::class, 'update'])->name('shipments.update');

    // Driver app endpoints
    Route::prefix('driver')->name('driver.')->middleware('role:Driver')->group(function () {
        Route::get('/assigned-shipments', [\App\Http\Controllers\Api\DriverController::class, 'assignedShipments'])->name('assigned-shipments');
        Route::post('/update-status', [\App\Http\Controllers\Api\DriverController::class, 'updateStatus'])->name('update-status');
        Route::post('/location', [\App\Http\Controllers\Api\DriverController::class, 'reportLocation'])->name('location');
        Route::get('/profile', [\App\Http\Controllers\Api\DriverController::class, 'profile'])->name('profile');
    });

    // Locations (for dynamic selects)
    Route::prefix('locations')->group(function () {
        Route::get('/countries', [\App\Http\Controllers\Api\LocationsController::class, 'countries'])->name('locations.countries');
        Route::post('/countries', [\App\Http\Controllers\Api\LocationsController::class, 'storeCountry'])->name('locations.countries.store');
        Route::get('/states', [\App\Http\Controllers\Api\LocationsController::class, 'states'])->name('locations.states');
        Route::post('/states', [\App\Http\Controllers\Api\LocationsController::class, 'storeState'])->name('locations.states.store');
        Route::get('/cities', [\App\Http\Controllers\Api\LocationsController::class, 'cities'])->name('locations.cities');
        Route::post('/cities', [\App\Http\Controllers\Api\LocationsController::class, 'storeCity'])->name('locations.cities.store');
    });

    // Customers (scope: customers.view / customers.create)
    Route::get('/customers', function (Request $request) {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'hasScope') && !$token->hasScope('customers.view')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }
        return app(\App\Http\Controllers\Api\V1\CustomersApiController::class)->index($request);
    })->name('customers.index');

    Route::post('/customers', function (Request $request) {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'hasScope') && !$token->hasScope('customers.create')) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }
        return app(\App\Http\Controllers\Api\V1\CustomersApiController::class)->store($request);
    })->name('customers.store');

    // Warehouse API (scope: warehouse.view / warehouse.manage)
    Route::get('/warehouse/manifests', [\App\Http\Controllers\Api\V1\WarehouseApiController::class, 'indexManifests'])
        ->name('warehouse.manifests.index');
    Route::post('/warehouse/manifests', [\App\Http\Controllers\Api\V1\WarehouseApiController::class, 'storeManifest'])
        ->name('warehouse.manifests.store');

    // Inventory API (scope: inventory.view / inventory.manage)
    Route::get('/warehouse/inventory', [\App\Http\Controllers\Api\V1\InventoryApiController::class, 'index'])
        ->name('inventory.index');
    Route::post('/warehouse/inventory/movements', [\App\Http\Controllers\Api\V1\InventoryApiController::class, 'storeMovement'])
        ->name('inventory.movements.store');
});
