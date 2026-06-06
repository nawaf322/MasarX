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
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Artisan;
use App\Models\OrganizationSetting;
use App\Models\Shipment;
use App\Services\AuditService;

class MaintenanceController extends Controller
{
    protected $audit;

    public function __construct(AuditService $audit)
    {
        $this->audit = $audit;
    }

    public function index()
    {
        $dbStatus = 'Connected';
        $dbName = null;
        try {
            DB::connection()->getPdo();
            $dbName = config('database.connections.' . config('database.default') . '.database');
        } catch (\Exception $e) {
            $dbStatus = 'Error';
        }

        $orgId = Auth::user()->organization_id;
        $storageWritable = is_writable(storage_path());
        $storageLogWritable = is_writable(storage_path('logs'));

        // Disk space
        $diskTotal = @disk_total_space(base_path()) ?: 0;
        $diskFree  = @disk_free_space(base_path()) ?: 0;
        $diskUsed  = $diskTotal - $diskFree;

        // Pending queue jobs
        $pendingJobs = 0;
        try {
            if (config('queue.default') === 'database') {
                $pendingJobs = DB::table('jobs')->count();
            }
        } catch (\Throwable $e) {}

        // Failed jobs
        $failedJobs = 0;
        try {
            $failedJobs = DB::table('failed_jobs')->count();
        } catch (\Throwable $e) {}

        // Tenant data summary
        $shipmentCount = 0;
        $userCount = 0;
        try {
            $shipmentCount = \App\Models\Shipment::where('organization_id', $orgId)->count();
            $userCount = \App\Models\User::where('organization_id', $orgId)->count();
        } catch (\Throwable $e) {}

        // Last error lines from laravel.log
        $recentErrors = [];
        try {
            $logPath = storage_path('logs/laravel.log');
            if (file_exists($logPath) && is_readable($logPath)) {
                $lines = array_filter(
                    array_slice(file($logPath) ?: [], -500),
                    fn($l) => str_contains($l, '.ERROR')
                        || str_contains($l, '.CRITICAL')
                        || str_contains($l, '.WARNING')
                        || str_contains($l, '.EMERGENCY')
                        || str_contains($l, '.ALERT')
                );
                $recentErrors = array_values(array_slice(array_values($lines), -10));
            }
        } catch (\Throwable $e) {}

        return Inertia::render('Settings/Maintenance', [
            'server' => [
                'db_status'             => $dbStatus,
                'db_driver'             => DB::connection()->getDriverName(),
                'db_name'               => $dbName,
                'php_version'           => PHP_VERSION,
                'server_time'           => now()->toDateTimeString(),
                'app_env'               => config('app.env'),
                'app_debug'             => (bool) config('app.debug'),
                'laravel_version'       => \Illuminate\Foundation\Application::VERSION,
                'memory_limit'          => ini_get('memory_limit'),
                'max_execution_time'    => ini_get('max_execution_time') . 's',
                'upload_max_filesize'   => ini_get('upload_max_filesize'),
                'cache_driver'          => config('cache.default'),
                'queue_connection'      => config('queue.default'),
                'storage_writable'      => $storageWritable,
                'storage_log_writable'  => $storageLogWritable,
                'disk_total_gb'         => $diskTotal > 0 ? round($diskTotal / 1073741824, 1) : null,
                'disk_free_gb'          => $diskFree  > 0 ? round($diskFree  / 1073741824, 1) : null,
                'disk_used_gb'          => $diskUsed  > 0 ? round($diskUsed  / 1073741824, 1) : null,
                'disk_used_pct'         => $diskTotal > 0 ? round($diskUsed / $diskTotal * 100) : null,
                'pending_jobs'          => $pendingJobs,
                'failed_jobs'           => $failedJobs,
                'shipment_count'        => $shipmentCount,
                'user_count'            => $userCount,
                'recent_errors'         => $recentErrors,
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
                'warning' => session('warning'),
            ],
        ]);
    }

    public function healthCheck()
    {
        $status = 'healthy';
        $msg = 'All systems operational.';
        $checks = [];

        try {
            DB::connection()->getPdo();
            $checks['database'] = true;
        } catch (\Exception $e) {
            $checks['database'] = false;
            $status = 'unhealthy';
            $msg = 'Database connection failed.';
        }

        $checks['storage'] = is_writable(storage_path());
        if (!$checks['storage']) {
            $status = 'degraded';
            $msg = 'Storage path is not writable.';
        }

        $this->audit?->log('health_check', 'maintenance', 'Ran System Health Check', null, ['status' => $status, 'checks' => $checks]);

        if ($status === 'unhealthy') {
            return response()->json(['error' => $msg], 422);
        }
        if ($status === 'degraded') {
            return response()->json(['warning' => true, 'message' => $msg]);
        }
        return response()->json(['success' => true, 'message' => $msg]);
    }

    public function clearCache(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $groups = ['company', 'branding', 'locale', 'security', 'tracking', 'billing', 'notifications', 'shipping_config', 'labels', 'maps', 'integrations'];
        foreach ($groups as $group) {
            Cache::forget("settings:{$orgId}:{$group}");
        }

        // Clear the SettingsResolver aggregate cache (org:{id}:settings:v3)
        // used by ShippingRateService, LocalCarrierAdapter, ShipmentController
        \App\Services\Settings\SettingsResolver::forgetCache($orgId);

        try {
            Cache::store(config('cache.default'))->flush();
        } catch (\Throwable $e) {
            // Ignore if driver doesn't support flush
        }

        try {
            Artisan::call('config:clear');
            Artisan::call('view:clear');
            Artisan::call('route:clear');
        } catch (\Throwable $e) {
            // Ignore Artisan errors in shared hosting
        }

        $this->audit?->log('clear_cache', 'maintenance', 'Cleared Organization and Application Cache', null, null);

        return response()->json(['success' => true, 'message' => 'Cache cleared successfully.']);
    }

    public function exportSettings()
    {
        $orgId = Auth::user()->organization_id;
        $settings = OrganizationSetting::where('organization_id', $orgId)
            ->get(['group', 'key', 'value']);

        $this->audit?->log('export', 'maintenance', 'Exported Settings JSON', null, null);

        $filename = 'masarx-settings-org' . $orgId . '-' . now()->format('Ymd_His') . '.json';
        $payload = json_encode([
            'organization_id' => $orgId,
            'exported_at'     => now()->toIso8601String(),
            'settings'        => $settings,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return response($payload, 200, [
            'Content-Type'        => 'application/json',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function importSettings(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:json|max:10240',
        ]);

        $orgId = Auth::user()->organization_id;
        $content = file_get_contents($request->file('file')->getRealPath());
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE || !isset($data['settings']) || !is_array($data['settings'])) {
            return response()->json(['error' => 'Invalid backup file. Expected JSON with a "settings" array.'], 422);
        }

        $imported = 0;
        foreach ($data['settings'] as $row) {
            $group = $row['group'] ?? null;
            $key = $row['key'] ?? null;
            $value = $row['value'] ?? null;
            if (!$group || !$key) {
                continue;
            }
            OrganizationSetting::updateOrCreate(
                [
                    'organization_id' => $orgId,
                    'group' => $group,
                    'key' => $key,
                ],
                ['value' => is_string($value) ? $value : json_encode($value)]
            );
            $imported++;
        }

        $groups = ['company', 'branding', 'locale', 'security', 'tracking', 'billing', 'notifications', 'shipping_config', 'labels'];
        foreach ($groups as $group) {
            Cache::forget("settings:{$orgId}:{$group}");
        }

        $this->audit?->log('import', 'maintenance', 'Imported Settings from backup', null, ['imported' => $imported]);

        return response()->json(['success' => true, 'message' => "Settings restored. {$imported} entries imported."]);
    }

    public function clearLog()
    {
        $logPath = storage_path('logs/laravel.log');
        if (file_exists($logPath) && is_writable($logPath)) {
            file_put_contents($logPath, '');
        }

        $this->audit?->log('clear_log', 'maintenance', 'Cleared Application Error Log', null, null);

        return response()->json(['success' => true, 'message' => 'Error log cleared successfully.']);
    }
}
