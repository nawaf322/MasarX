<?php

namespace App\Http\Controllers\Settings\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiRequestLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ApiRequestLogsController extends Controller
{
    public function index(Request $request)
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        $statusGroup = $request->filled('status_group') && $request->status_group !== 'all' ? $request->status_group : null;
        $query = ApiRequestLog::where('organization_id', $orgId)
            ->when($request->filled('endpoint'), fn ($q) => $q->where('endpoint', 'like', '%' . $request->endpoint . '%'))
            ->when($statusGroup, function ($q) use ($statusGroup) {
                if ($statusGroup === '2xx') $q->whereBetween('status_code', [200, 299]);
                elseif ($statusGroup === '4xx') $q->whereBetween('status_code', [400, 499]);
                elseif ($statusGroup === '5xx') $q->whereBetween('status_code', [500, 599]);
            })
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->orderBy('created_at', 'desc');

        $logs = $query->paginate(25)
            ->withQueryString()
            ->through(fn ($log) => [
                'id' => $log->id,
                'created_at' => $log->created_at?->toIso8601String(),
                'method' => $log->method,
                'endpoint' => $log->endpoint,
                'status_code' => $log->status_code,
                'duration_ms' => $log->duration_ms,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent ? (strlen($log->user_agent) > 60 ? substr($log->user_agent, 0, 60) . '...' : $log->user_agent) : null,
                'error_message' => $log->error_message,
            ]);

        return Inertia::render('Settings/API/Logs', [
            'logs' => $logs,
            'filters' => [
                'endpoint' => $request->filled('endpoint') ? $request->endpoint : '',
                'status_group' => $statusGroup ?? 'all',
                'date_from' => $request->filled('date_from') ? $request->date_from : '',
                'date_to' => $request->filled('date_to') ? $request->date_to : '',
            ],
        ]);
    }
}
