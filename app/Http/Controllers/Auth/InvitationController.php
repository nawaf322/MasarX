<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    /**
     * Show the "set your password" form for an invitation link.
     */
    public function show(string $token): Response|RedirectResponse
    {
        $user = User::where('invitation_token', $token)
            ->whereNull('invitation_accepted_at')
            ->first();

        if (! $user) {
            return redirect()->route('login')
                ->with('error', __('invitation.invalid_or_expired'));
        }

        // Token expires after 7 days
        if ($user->invitation_sent_at && $user->invitation_sent_at->lt(now()->subDays(7))) {
            return redirect()->route('login')
                ->with('error', __('invitation.expired'));
        }

        return Inertia::render('Auth/AcceptInvitation', [
            'token'   => $token,
            'name'    => $user->name,
            'email'   => $user->email,
            'orgName' => $user->organization?->name ?? config('app.name'),
            'role'    => $user->roles->first()?->name ?? '',
        ]);
    }

    /**
     * Accept the invitation: set password, activate account, auto-login.
     */
    public function accept(Request $request, string $token): RedirectResponse
    {
        $user = User::where('invitation_token', $token)
            ->whereNull('invitation_accepted_at')
            ->first();

        if (! $user) {
            return redirect()->route('login')
                ->with('error', __('invitation.invalid_or_expired'));
        }

        if ($user->invitation_sent_at && $user->invitation_sent_at->lt(now()->subDays(7))) {
            return redirect()->route('login')
                ->with('error', __('invitation.expired'));
        }

        $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user->update([
            'password'                => Hash::make($request->password),
            'invitation_token'        => null,       // consume token
            'invitation_accepted_at'  => now(),
            'must_change_password'    => false,
            'is_active'               => true,
        ]);

        Auth::login($user);

        return redirect()->intended(route('dashboard'))
            ->with('success', __('invitation.welcome', ['org' => $user->organization?->name ?? config('app.name')]));
    }
}
