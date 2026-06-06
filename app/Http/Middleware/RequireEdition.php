<?php

namespace App\Http\Middleware;

use App\Services\EditionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level edition/feature gate.
 *
 * Usage in routes:
 *   ->middleware('edition:commissions')
 *   ->middleware('edition:finance_dashboard,ar_ledger')   // ALL must be available
 *
 * Returns 403 Forbidden if any required feature is unavailable in the current edition.
 * API requests receive JSON; web requests are redirected to /dashboard with an error.
 */
class RequireEdition
{
    public function __construct(private readonly EditionService $edition) {}

    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        foreach ($features as $feature) {
            if (! $this->edition->has($feature)) {
                $message = __('edition.feature_unavailable', [
                    'feature' => $feature,
                    'edition' => $this->edition->edition(),
                ]);

                if ($request->expectsJson()) {
                    return response()->json(['message' => $message], 403);
                }

                return redirect()->route('dashboard')
                    ->with('error', $message);
            }
        }

        return $next($request);
    }
}
