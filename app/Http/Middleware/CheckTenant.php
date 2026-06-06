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

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use App\Models\Organization;

class CheckTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // Si el usuario está autenticado pero no tiene organización asignada → redirigir a onboarding
        if ($user && $user->organization_id === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'Please select or create an organization to continue.');
        }

        if ($user && $user->organization_id) {
            // Validate organization is active
            if ($user->organization && !$user->organization->is_active) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                return redirect()->route('login')->withErrors(['email' => 'Your organization is inactive.']);
            }

            // Handle orphan users (organization_id exists but organization deleted)
            if (!$user->organization) {
                // Option: Logout, or Log error. For now, let's logout to be safe.
                Auth::guard('web')->logout();
                return redirect()->route('login')->withErrors(['email' => 'Organization not found.']);
            }

            // Bind organization to the service container/request if needed
            // For now, we rely on the user->organization relationship

            // Scope queries globally could be set here, but we'll use Model Scopes or Policies
            // defined in the models themselves or via a Trait 'BelongsToTenant'.
        }

        return $next($request);
    }
}
