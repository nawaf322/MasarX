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

namespace App\Console\Commands;

use App\Services\UpdateService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckUpdatesCommand extends Command
{
    protected $signature   = 'app:check-updates {--force : Force re-check even if recently checked}';
    protected $description = 'Check for available software updates (runs twice daily via scheduler)';

    public function handle(UpdateService $updater): int
    {
        if (!$updater->hasLicense()) {
            $this->line('No license activated. Skipping update check.');
            return 0;
        }

        $cacheKey = 'update.last_check';
        if (!$this->option('force') && Cache::has($cacheKey)) {
            $this->line('Skipped — checked within last 12h. Use --force to override.');
            return 0;
        }

        $this->line('Checking for updates via LicenseBox...');
        $result = $updater->checkForUpdate();

        if (isset($result['error'])) {
            Log::warning('[CheckUpdates] ' . $result['error']);
            $this->warn('Failed: ' . $result['error']);
            return 1;
        }

        Cache::put($cacheKey, now()->toIso8601String(), now()->addHours(12));

        if ($result['has_update']) {
            $latest = $result['latest_version'];

            Cache::put('update.available', $result, now()->addHours(12));
            $this->info("Update available: v{$latest}");

            // Send in-app notification to all super-admin and admin users (once per version)
            $notifKey = 'update.notified.' . $latest;
            if (!Cache::has($notifKey)) {
                $this->sendInAppNotification($result);
                Cache::put($notifKey, true, now()->addDays(30));
                $this->line('In-app notification sent to admins.');
            }
        } else {
            Cache::forget('update.available');
            $this->info('Already on latest version (' . config('version.current') . ').');

            // Expired license warning
            if (!empty($result['license_expired'])) {
                $this->warn('License update period has expired. Clients cannot download updates.');
            }
        }

        return 0;
    }

    private function sendInAppNotification(array $updateInfo): void
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('in_app_notifications')) {
                return;
            }

            $version   = $updateInfo['latest_version'];
            $changelog = $updateInfo['changelog'] ?? '';
            $summary   = $updateInfo['message']   ?? "Version {$version} is now available.";

            // Notify ALL active users so everyone sees the update notification
            $admins = \App\Models\User::where('is_active', true)->get(['id']);

            $now = now();
            foreach ($admins as $admin) {
                DB::table('in_app_notifications')->insert([
                    'user_id'    => $admin->id,
                    'type'       => 'update_available',
                    'title'      => "🆕 Update v{$version} available",
                    'body'       => $summary ?: "A new version of Deprixa is available. Go to Settings → Updates to apply it.",
                    'icon'       => 'bell',
                    'url'        => '/settings/updates',
                    'read'       => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('[CheckUpdates] Could not send in-app notification: ' . $e->getMessage());
        }
    }
}
