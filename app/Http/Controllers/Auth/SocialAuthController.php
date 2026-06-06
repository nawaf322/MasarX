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

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

/**
 * @deprecated This controller is NOT registered in any route (see routes/auth.php — lines are commented out).
 *
 * DO NOT register this controller in routes without first fixing handleGoogleCallback():
 *   - updateOrCreate() does not set organization_id, which would create users without a tenant.
 *   - No role is assigned, leaving new users without permissions.
 *   - Does not enforce multi-tenant isolation.
 *
 * Use App\Http\Controllers\Auth\GoogleOAuthController instead (the active implementation).
 */
class SocialAuthController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            // WARNING: organization_id is intentionally not set here — this method must not
            // be activated until multi-tenant registration logic matches GoogleOAuthController.
            $user = User::updateOrCreate([
                'email' => $googleUser->getEmail(),
            ], [
                'name' => $googleUser->getName(),
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'auth_provider' => 'google',
                'password' => bcrypt(str()->random(24)), // Random password for OAuth users
                'email_verified_at' => now(),
            ]);

            Auth::login($user, true); // Remember me true by default for OAuth

            return redirect()->intended(route('dashboard'));
        } catch (\Exception $e) {
            return redirect()->route('login')->with('error', 'Google Login Failed');
        }
    }
}
