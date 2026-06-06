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

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withProviders([
        \App\Providers\DomainEventServiceProvider::class,
    ])
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Exclude SaaS webhook routes from CSRF verification
        $middleware->validateCsrfTokens(except: [
            'my-billing/webhook/stripe',
            'my-billing/webhook/paypal',
        ]);

        $middleware->web(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\CheckInstalled::class,
            \App\Http\Middleware\DemoModeProtection::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\SetTenantLocale::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'tenant'           => \App\Http\Middleware\CheckTenant::class,
            'api.idempotency'  => \App\Http\Middleware\IdempotencyMiddleware::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'security.policy' => \App\Http\Middleware\EnforceSecurityPolicy::class,
            'security.ip' => \App\Http\Middleware\RestrictIpAddress::class,
            'api.scope' => \App\Http\Middleware\CheckApiTokenScope::class,
            'edition'          => \App\Http\Middleware\RequireEdition::class,
            '2fa.lock'         => \App\Http\Middleware\Enforce2faLock::class,
        ]);

        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API routes MUST return JSON (401/403/422/etc), never redirect to /login
        $exceptions->shouldRenderJsonWhen(fn ($request, $e) => $request->is('api/*') || $request->expectsJson());

        // InvalidStateTransitionException → 422 back with error flash (web) or JSON (API)
        $exceptions->render(function (\App\Exceptions\InvalidStateTransitionException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            return back()->withErrors(['state' => $e->getMessage()]);
        });

        // HTTP error pages → redirect with structured flash for SweetAlert2 modal
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, $request) {
            $code = $e->getStatusCode();
            if ($request->expectsJson() || $request->is('api/*') || $request->is('install*')) {
                return null; // let default handler respond
            }

            $errorMeta = match ($code) {
                401 => ['title' => '401 — Unauthorized', 'text' => 'You need to sign in to access this page.', 'icon' => 'warning'],
                403 => ['title' => '403 — Access Forbidden', 'text' => $e->getMessage() ?: 'You don\'t have permission to access this resource.', 'icon' => 'warning'],
                404 => ['title' => '404 — Page Not Found', 'text' => 'The page you\'re looking for doesn\'t exist or has been moved.', 'icon' => 'info'],
                429 => ['title' => '429 — Too Many Requests', 'text' => 'You\'ve sent too many requests. Please wait a moment and try again.', 'icon' => 'warning'],
                500 => ['title' => '500 — Server Error', 'text' => 'Something went wrong on our end. Please try again later.', 'icon' => 'error'],
                503 => ['title' => '503 — Under Maintenance', 'text' => 'We\'re performing maintenance. We\'ll be back shortly.', 'icon' => 'info'],
                default => null,
            };

            if (!$errorMeta) return null;

            // Authenticated users → redirect to dashboard with SweetAlert flash
            if ($request->user() && in_array($code, [403, 404, 429])) {
                return redirect()->route('dashboard')
                    ->with('flash', ['http_error' => $errorMeta]);
            }

            // 401 → redirect to login
            if ($code === 401) {
                return redirect()->route('login')
                    ->with('flash', ['http_error' => $errorMeta]);
            }

            return null; // 500/503 fallback to Blade pages
        });

        // Log every exception during install for debugging
        $exceptions->report(function (\Throwable $e) {
            try {
                if (app()->bound('request') && str_contains(request()->path(), 'install')) {
                    \Illuminate\Support\Facades\Log::error('[INSTALL ERROR] ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
                }
            } catch (\Throwable $ignored) {}
        });
    })->create();
