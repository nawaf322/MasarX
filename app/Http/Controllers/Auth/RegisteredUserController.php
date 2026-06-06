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
use App\Models\Locker;
use App\Models\User;
use App\Models\Organization;
use App\Services\LockerCodeService;
use App\Services\OrganizationOnboardingService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        // Allow public calculator to redirect back to rates after registration
        if ($request->get('from') === 'rates') {
            $request->session()->put('url.intended', route('rates.calculator'));
        }

        // Only set url.intended when it has NOT been set already (e.g. by public calculator saveIntent).
        // Overwriting it would redirect the user away from /shipments/from-rate after registration.
        if ($request->get('from') === 'rates' && !$request->session()->has('url.intended')) {
            $request->session()->put('url.intended', route('rates.calculator'));
        }

        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // Si ya existe una organización, el registrante es un CLIENTE de esa org
        // y debe recibir su casillero automáticamente.
        $primaryOrg = Organization::where('is_active', true)->orderBy('id')->first();

        if ($primaryOrg) {
            return $this->registerAsCustomer($request, $primaryOrg);
        }

        // Primera vez: no hay organización — crear org + admin (instalación inicial)
        return $this->registerAsOrganizationOwner($request);
    }

    /**
     * Registra al usuario como cliente de la organización principal
     * y le asigna su casillero único automáticamente.
     */
    private function registerAsCustomer(Request $request, Organization $org): RedirectResponse|SymfonyResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Unicidad de email dentro de la organización
        if (User::where('email', strtolower($request->email))
                ->where('organization_id', $org->id)
                ->exists()) {
            return back()->withErrors([
                'email' => __('validation.unique', ['attribute' => 'email']),
            ])->withInput();
        }

        $user = User::create([
            'name'                   => $request->name,
            'email'                  => strtolower($request->email),
            'password'               => Hash::make($request->password),
            'organization_id'        => $org->id,
            'is_active'              => true,
            'must_change_password'   => false,
            'invitation_accepted_at' => now(),
            'language'               => 'en',
        ]);

        $user->assignRole('customer');

        // Asignar casillero único usando el servicio configurado por la organización
        $lockerCode = app(LockerCodeService::class)->generate($org->id);
        Locker::create([
            'organization_id' => $org->id,
            'customer_id'     => $user->id,
            'code'            => $lockerCode,
            'status'          => 'active',
            'assigned_at'     => now(),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return Inertia::location(route('my-locker.index'));
    }

    /**
     * Registra al primer usuario como dueño de una nueva organización.
     * Solo se ejecuta cuando no existe ninguna organización en el sistema.
     */
    private function registerAsOrganizationOwner(Request $request): RedirectResponse
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        DB::transaction(function () use ($request, &$user) {
            $organization = Organization::create([
                'name'     => $request->name . "'s Team",
                'slug'     => Str::slug($request->name . '-' . Str::random(4)),
                'settings' => [],
            ]);

            /** @var OrganizationOnboardingService $onboarding */
            $onboarding = app(OrganizationOnboardingService::class);
            $onboarding->provision($organization, [
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => $request->password,
            ]);

            $user = User::where('email', $request->email)->firstOrFail();
        });

        event(new Registered($user));

        Auth::login($user);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
