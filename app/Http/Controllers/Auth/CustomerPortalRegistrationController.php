<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class CustomerPortalRegistrationController extends Controller
{
    /**
     * Show the customer self-registration page for a given organization slug.
     * GET /register/customer/{slug}
     */
    public function show(string $slug): Response|\Illuminate\Http\RedirectResponse
    {
        $org = Organization::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $org) {
            abort(404, __('customer_portal.not_found'));
        }

        return Inertia::render('Auth/CustomerRegister', [
            'slug'            => $slug,
            'orgName'         => $org->name,
            'orgLogo'         => $org->login_logo_url
                                    ? Storage::url($org->login_logo_url)
                                    : ($org->logo_url ? Storage::url($org->logo_url) : null),
            'orgPrimaryColor' => $org->primary_color ?? '#4F46E5',
        ]);
    }

    /**
     * Handle the customer self-registration form submission.
     * POST /register/customer/{slug}
     */
    public function store(Request $request, string $slug): RedirectResponse
    {
        $org = Organization::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $org) {
            abort(404, __('customer_portal.not_found'));
        }

        $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|string|email|max:255',
            'phone'                 => 'nullable|string|max:30',
            'password'              => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Email uniqueness scoped to this organization
        if (User::where('email', strtolower($request->email))
                ->where('organization_id', $org->id)
                ->exists()) {
            return back()->withErrors([
                'email' => __('customer_portal.email_taken'),
            ])->withInput();
        }

        $user = User::create([
            'name'                    => $request->name,
            'email'                   => strtolower($request->email),
            'phone'                   => $request->phone ?? null,
            'password'                => Hash::make($request->password),
            'organization_id'         => $org->id,
            'is_active'               => true,
            'must_change_password'    => false,
            'invitation_accepted_at'  => now(), // Self-registered = already accepted
        ]);

        $user->assignRole('customer');

        // Auto-create a locker using org-configured code format
        $lockerCode = app(\App\Services\LockerCodeService::class)->generate($org->id);
        \App\Models\Locker::create([
            'organization_id' => $org->id,
            'customer_id'     => $user->id,
            'code'            => $lockerCode,
            'status'          => 'active',
            'assigned_at'     => now(),
        ]);

        Auth::login($user);

        return redirect()->route('my-locker.index');
    }
}
