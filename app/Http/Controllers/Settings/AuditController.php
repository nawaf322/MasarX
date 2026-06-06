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

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $query = AuditLog::with('user')->where('organization_id', $orgId);

        // Full-text search across action/module/subject/user
        if ($request->filled('q')) {
            $term = '%' . trim($request->q) . '%';
            $query->where(function ($qb) use ($term) {
                $qb->where('action', 'like', $term)
                    ->orWhere('module', 'like', $term)
                    ->orWhere('subject_type', 'like', $term)
                    ->orWhere('subject_id', 'like', $term)
                    ->orWhereHas('user', fn($u) => $u->where('name', 'like', $term));
            });
        }

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->user_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 25)));

        $logs = $query->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($log) {
                $oldValues = is_array($log->old_values) ? $log->old_values : [];
                $newValues = is_array($log->new_values) ? $log->new_values : [];

                // Merge old/new into a single details object for the frontend
                $details = null;
                if (!empty($oldValues) || !empty($newValues)) {
                    $details = array_filter([
                        'before' => !empty($oldValues) ? $oldValues : null,
                        'after'  => !empty($newValues) ? $newValues : null,
                    ]);
                }

                return [
                    'id'         => $log->id,
                    'user'       => $log->user?->name ?? 'System',
                    'user_id'    => $log->user_id,
                    'action'     => $log->action,
                    'module'     => $log->module,
                    'subject'    => $log->subject_type ?: ($log->module . ($log->subject_id ? ' #' . $log->subject_id : '')),
                    'subject_id' => $log->subject_id,
                    'ip'         => $log->ip_address,
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                    'details'    => $details,
                ];
            });

        $totalCount   = AuditLog::where('organization_id', $orgId)->count();
        $last24hCount = AuditLog::where('organization_id', $orgId)
            ->where('created_at', '>=', now()->subDay())
            ->count();

        $modules = AuditLog::where('organization_id', $orgId)
            ->select('module')->distinct()->orderBy('module')->pluck('module');

        $users = User::where('organization_id', $orgId)
            ->whereIn('id',
                AuditLog::where('organization_id', $orgId)
                    ->whereNotNull('user_id')->distinct()->pluck('user_id')
            )
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Settings/AuditLogs', [
            'logs'    => $logs->items(),
            'meta'    => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
                'from'         => $logs->firstItem() ?? 0,
                'to'           => $logs->lastItem() ?? 0,
            ],
            'stats'   => ['total' => $totalCount, 'last_24h' => $last24hCount],
            'modules' => $modules,
            'users'   => $users,
            'filters' => $request->only(['q', 'module', 'action', 'user_id', 'from', 'to']),
        ]);
    }

    public function show(AuditLog $log)
    {
        abort_if($log->organization_id !== Auth::user()->organization_id, 403);

        return response()->json([
            'id'         => $log->id,
            'user'       => $log->user?->name ?? 'System',
            'action'     => $log->action,
            'module'     => $log->module,
            'subject'    => $log->subject_type,
            'subject_id' => $log->subject_id,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at->toIso8601String(),
        ]);
    }
}
