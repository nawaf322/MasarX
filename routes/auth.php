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

use App\Http\Controllers\Auth\LoginController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Invitation acceptance (public — works for both guests and logged-in users) ─
Route::get('invitation/{token}',  [\App\Http\Controllers\Auth\InvitationController::class, 'show'])
    ->name('invitation.show');
Route::post('invitation/{token}', [\App\Http\Controllers\Auth\InvitationController::class, 'accept'])
    ->name('invitation.accept')
    ->middleware('throttle:10,1');

// ── Customer Portal self-registration (public, scoped to organization slug) ──
Route::get('register/customer/{slug}',  [\App\Http\Controllers\Auth\CustomerPortalRegistrationController::class, 'show'])
    ->name('customer.portal.register');
Route::post('register/customer/{slug}', [\App\Http\Controllers\Auth\CustomerPortalRegistrationController::class, 'store'])
    ->name('customer.portal.register.store')
    ->middleware('throttle:10,1');

Route::middleware('guest')->group(function () {
    // Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    // Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])->middleware('throttle:5,1');

    // Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    // Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');

    // Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    // Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');

    // Placeholder to prevent route error in Login.tsx
    Route::get('register', [\App\Http\Controllers\Auth\RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [\App\Http\Controllers\Auth\RegisteredUserController::class, 'store'])->middleware('throttle:10,1');
    Route::get('forgot-password', [\App\Http\Controllers\Auth\PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [\App\Http\Controllers\Auth\PasswordResetLinkController::class, 'store'])->name('password.email')->middleware('throttle:5,1');

    Route::get('reset-password/{token}', [\App\Http\Controllers\Auth\NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [\App\Http\Controllers\Auth\NewPasswordController::class, 'store'])->middleware('throttle:5,1')->name('password.store');
    Route::get('auth/google', [\App\Http\Controllers\Auth\GoogleOAuthController::class, 'redirect'])->name('auth.google');
    Route::get('auth/google/callback', [\App\Http\Controllers\Auth\GoogleOAuthController::class, 'callback'])->name('auth.google.callback');
});

Route::middleware('auth')->group(function () {
    // Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');
    // Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    // Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])->middleware('throttle:6,1')->name('verification.send');

    // Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])->name('password.confirm');
    // Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');
});
