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
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Validates extended PAT fields: expiry, scope, IP whitelist, rate limit.
 * Must run after auth:sanctum has resolved the token.
 */
class CheckApiTokenScope
{
    public function handle(Request $request, Closure $next, string $requiredScope = ''): Response
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $token = $request->user()?->currentAccessToken();

        // If no PAT token (session-based web auth), skip extended checks
        if (!$token || !method_exists($token, 'hasScope')) {
            // Web session user — allow all
            if ($requiredScope !== '') {
                return response()->json(['error' => 'Insufficient permissions'], 403);
            }
            return $next($request);
        }

        // ── 1. Expiry check ─────────────────────────────────────────────────
        if ($token->expires_at && $token->expires_at->isPast()) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        if (!is_null($token->revoked_at)) {
            return response()->json(['error' => 'Token revoked'], 401);
        }

        // ── 2. IP whitelist ─────────────────────────────────────────────────
        $whitelist = $token->ip_whitelist ?? [];
        if (!empty($whitelist)) {
            $clientIp = $request->ip();
            if (!in_array($clientIp, $whitelist)) {
                return response()->json(['error' => 'IP not allowed'], 403);
            }
        }

        // ── 3. Rate limiting ────────────────────────────────────────────────
        $rateLimit = $token->rate_limit_per_minute ?? null;
        if ($rateLimit) {
            $key = 'api_token:' . $token->id;
            if (RateLimiter::tooManyAttempts($key, $rateLimit)) {
                return response()->json(['error' => 'Rate limit exceeded'], 429);
            }
            RateLimiter::hit($key, 60);
        }

        // ── 4. Scope check ──────────────────────────────────────────────────
        if ($requiredScope !== '') {
            if (!$token->hasScope($requiredScope)) {
                return response()->json(['error' => 'Insufficient permissions'], 403);
            }
        }

        // Attach token to request for downstream use
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
