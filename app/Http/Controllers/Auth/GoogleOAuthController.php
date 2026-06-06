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
use App\Models\Organization;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleOAuthController extends Controller
{
    protected $settings;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
    }

    private function configureGoogle()
    {
        // Load settings override from DB
        $clientId = $this->settings->get('integrations', 'google_client_id');
        $clientSecret = $this->settings->get('integrations', 'google_client_secret');

        // Fallback to .env if DB is empty (Hybrid Approach)
        if ($clientId && $clientSecret) {
            config([
                'services.google.client_id' => $clientId,
                'services.google.client_secret' => $clientSecret,
                'services.google.redirect' => route('auth.google.callback'), // Ensure callback matches
            ]);
        }
    }

    public function redirect(Request $request)
    {
        $this->configureGoogle();

        if ($request->get('from') === 'rates') {
            $request->session()->put('url.intended', route('rates.calculator'));
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback()
    {
        $this->configureGoogle();

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect()->route('login')->withErrors(['email' => 'Google Authentication Failed: ' . $e->getMessage()]);
        }

        $user = User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            // User exists, check if linked
            if (!$user->google_id) {
                // Link account
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar_url' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);
            }
        } else {
            // Create New User & Organization
            $org = Organization::create([
                'name' => $googleUser->getName() . "'s Org",
                'slug' => Str::slug($googleUser->getName() . '-' . Str::random(4)),
                'is_active' => true,
                'settings' => [],
            ]);

            $user = User::create([
                'name' => $googleUser->getName(),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'password' => Hash::make(Str::random(24)),
                'organization_id' => $org->id,
                'email_verified_at' => now(),
                'is_active' => true,
            ]);

            $user->assignRole('admin');
        }

        Auth::login($user, true);

        return redirect()->intended('/dashboard');
    }
}
