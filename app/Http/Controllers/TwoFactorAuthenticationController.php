<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use App\Notifications\TwoFactorCode;
use App\Notifications\Channels\TwilioChannel;
use Illuminate\Validation\ValidationException;

class TwoFactorAuthenticationController extends Controller
{
    /**
     * Initiate 2FA Setup (Send OTP)
     */
    public function store(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $user = $request->user();

        $code = random_int(100000, 999999);
        Cache::put("2fa_otp_{$user->id}", $code, now()->addMinutes(10));

        $user->notify(new TwoFactorCode($code));

        // Flash two_factor_pending so the profile page auto-opens the OTP modal
        session()->flash('flash', ['two_factor_pending' => true, 'success' => 'Verification code sent to your email.']);
        return \Inertia\Inertia::location(route('profile.edit'));
    }

    /**
     * Verify OTP and Enable 2FA
     */
    public function verify(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->validate([
            'code' => 'required|string|digits:6',
        ]);

        $user = $request->user();
        $cachedCode = Cache::get("2fa_otp_{$user->id}");

        if (!$cachedCode || $cachedCode != $request->code) {
            throw ValidationException::withMessages([
                'code' => ['The provided code is invalid or expired.'],
            ]);
        }

        $user->forceFill(['two_factor_enabled' => true])->save();
        Cache::forget("2fa_otp_{$user->id}");

        session()->flash('success', 'Two-factor authentication has been enabled.');
        return \Inertia\Inertia::location(route('profile.edit'));
    }

    /**
     * Resend OTP via Email or SMS (Failover)
     */
    public function resend(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $user = $request->user();
        $code = Cache::get("2fa_otp_{$user->id}");

        if (!$code) {
            $code = random_int(100000, 999999);
            Cache::put("2fa_otp_{$user->id}", $code, now()->addMinutes(10));
        }

        $useSms = $request->boolean('failover');
        $channels = $useSms ? [TwilioChannel::class] : ['mail'];

        try {
            $user->notify(new TwoFactorCode($code, $channels));
            $msg = $useSms ? 'Code sent via SMS/WhatsApp.' : 'Code resent to your email.';
            // Reopen modal + show success flash
            session()->flash('flash', ['two_factor_pending' => true, 'success' => $msg]);
        } catch (\Exception $e) {
            session()->flash('flash', ['two_factor_pending' => true, 'error' => 'Failed to send code: ' . $e->getMessage()]);
        }

        return \Inertia\Inertia::location(route('profile.edit'));
    }

    /**
     * Disable 2FA
     */
    public function destroy(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->validate([
            'password' => 'required|current_password',
        ]);

        $request->user()->forceFill(['two_factor_enabled' => false])->save();

        session()->flash('success', 'Two-factor authentication has been disabled.');
        return \Inertia\Inertia::location(route('profile.edit'));
    }
}
