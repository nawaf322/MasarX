<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Demo Mode Protection Middleware
 *
 * When DEMO_MODE=true in .env, this middleware prevents destructive
 * operations while allowing visitors to explore and create data freely.
 *
 * BLOCKED: delete, bulk-delete, password reset of super-admin, license deactivation
 * ALLOWED: create, edit (non-admin), view, login/logout, tracking, calculator
 */
class DemoModeProtection
{
    /**
     * The super-admin user ID that cannot be modified in demo mode.
     */
    private const DEMO_ADMIN_ID = 1;

    /**
     * Message shown when a demo-restricted action is attempted.
     */
    private const DEMO_MESSAGE = 'This action is not available in demo mode. Purchase a license to unlock all features.';

    /**
     * Routes that are always allowed regardless of HTTP method.
     */
    private const ALWAYS_ALLOWED = [
        'login',
        'logout',
        'register',
        'install/*',
        'tracking',
        'tracking/*',
        'rate',
        'rate/*',
        'api/tracking/*',
        'up',
    ];

    /**
     * Route patterns where DELETE/destroy is blocked.
     */
    private const BLOCKED_DESTROY_PATTERNS = [
        'customers/*',
        'customers/bulk-destroy',
        'shipments/*',
        'shipments/bulk-destroy',
        'settings/users/*',
        'settings/users/bulk-deactivate',
        'settings/branches/*',
        'settings/departments/*',
        'settings/shipment-statuses/*',
        'settings/services/*',
        'settings/hs-codes/*',
        'settings/api/clients/*',
        'settings/api/webhooks/*',
        'settings/roles/*',
        'settings/updates/deactivate',
        'lockers/*',
        'contracts/*',
        'commissions/rules/*',
        'import/*',
        'profile',
        'my-contacts/*',
    ];

    /**
     * Route patterns where specific POST/PUT/PATCH actions are blocked.
     */
    private const BLOCKED_MUTATION_PATTERNS = [
        'settings/users/*/password-reset',
        'settings/users/*/toggle-active',
        'settings/updates/deactivate',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Only active when DEMO_MODE=true
        if (!config('app.demo_mode')) {
            return $next($request);
        }

        // Never interfere with installation wizard
        if (str_starts_with($request->path(), 'install')) {
            return $next($request);
        }

        $path   = $request->path();
        $method = $request->method();

        // Always allow safe navigation
        if ($this->isAlwaysAllowed($path)) {
            return $next($request);
        }

        // Allow GET requests (viewing is always fine)
        if ($method === 'GET') {
            return $next($request);
        }

        // Block all DELETE requests
        if ($method === 'DELETE') {
            return $this->demoResponse($request);
        }

        // Block POST-based bulk destroy/deactivate
        if ($method === 'POST' && $this->isBulkDestroyRoute($path)) {
            return $this->demoResponse($request);
        }

        // Block mutations to the super-admin account
        if ($this->isProtectedAdminMutation($request, $path)) {
            return $this->demoResponse($request, 'The demo admin account cannot be modified. Create your own user to test editing.');
        }

        // Block specific dangerous mutations (password reset, toggle active, license deactivate)
        if ($this->isBlockedMutation($path)) {
            return $this->demoResponse($request);
        }

        return $next($request);
    }

    /**
     * Check if the route is in the always-allowed list.
     */
    private function isAlwaysAllowed(string $path): bool
    {
        foreach (self::ALWAYS_ALLOWED as $pattern) {
            if ($path === $pattern || fnmatch($pattern, $path)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Detect POST-based bulk destroy or deactivate routes.
     */
    private function isBulkDestroyRoute(string $path): bool
    {
        return str_contains($path, 'bulk-destroy')
            || str_contains($path, 'bulk-deactivate')
            || str_ends_with($path, '/deactivate');
    }

    /**
     * Protect the demo super-admin from any modification.
     * - Cannot change password, email, name, or role of user ID 1
     * - Cannot edit the profile if logged in as the demo admin
     */
    private function isProtectedAdminMutation(Request $request, string $path): bool
    {
        // Protect PUT/PATCH to the super-admin user via Settings > Users
        if (preg_match('#^settings/users/(\d+)$#', $path, $matches)) {
            if (in_array($request->method(), ['PUT', 'PATCH']) && (int) $matches[1] === self::DEMO_ADMIN_ID) {
                return true;
            }
        }

        // Protect password reset of super-admin
        if (preg_match('#^settings/users/(\d+)/password-reset$#', $path, $matches)) {
            if ((int) $matches[1] === self::DEMO_ADMIN_ID) {
                return true;
            }
        }

        // Protect toggle-active on super-admin
        if (preg_match('#^settings/users/(\d+)/toggle-active$#', $path, $matches)) {
            if ((int) $matches[1] === self::DEMO_ADMIN_ID) {
                return true;
            }
        }

        // Protect profile update if logged-in user IS the demo admin
        if ($path === 'profile' && in_array($request->method(), ['PUT', 'PATCH'])) {
            $user = $request->user();
            if ($user && $user->id === self::DEMO_ADMIN_ID) {
                // Allow profile updates EXCEPT password and email changes
                if ($request->filled('password') || $request->filled('email')) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if this is a specifically blocked mutation route.
     */
    private function isBlockedMutation(string $path): bool
    {
        foreach (self::BLOCKED_MUTATION_PATTERNS as $pattern) {
            if (fnmatch($pattern, $path)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return the appropriate demo-blocked response.
     */
    private function demoResponse(Request $request, ?string $message = null): Response
    {
        $msg = $message ?? self::DEMO_MESSAGE;

        // API requests get JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message'   => $msg,
                'demo_mode' => true,
            ], 403);
        }

        // Inertia/web requests get a redirect back with flash message
        return back()->with('error', $msg);
    }
}
