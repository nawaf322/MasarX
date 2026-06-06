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

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use ZipArchive;

class UpdateService
{
    private string $tempDir;
    private const  PROGRESS_KEY = 'update.progress';

    public function __construct(private LicenseBoxService $lb)
    {
        $this->tempDir = storage_path('app/updates');
    }

    // ── Delegate license helpers ──────────────────────────────────────────────

    public function hasLicense(): bool        { return $this->lb->hasLicense(); }
    public function activateLicense(string $code, string $client): array { return $this->lb->activateLicense($code, $client); }
    public function verifyLicense(): array    { return $this->lb->verifyLicense(); }
    public function deactivateLicense(): array{ return $this->lb->deactivateLicense(); }

    // ── Check for updates (uses LicenseBox) ───────────────────────────────────

    public function checkForUpdate(): array
    {
        $result = $this->lb->checkUpdate();

        if (empty($result['status'])) {
            // Clean up unformatted sprintf templates from the license server (e.g. "%s has no versions yet.")
            $errMsg = $result['message'] ?? 'Update check failed.';
            $errMsg = preg_replace('/%s\s*/i', config('app.name', 'Deprixa Plus') . ' ', $errMsg);
            $errMsg = trim($errMsg);
            return ['error' => $errMsg];
        }

        $hasUpdate      = !empty($result['update_available']);
        $licExpired     = !empty($result['license_expired']);

        return [
            'current_version'  => config('version.current'),
            'latest_version'   => $result['version']    ?? config('version.current'),
            'has_update'       => $hasUpdate,
            'update_id'        => $result['update_id']  ?? null,
            // SQL field from LicenseBox is ignored — Laravel migrations handle all DB changes
            'has_sql'          => false,
            'changelog'        => $result['changelog']  ?? '',
            'message'          => trim(preg_replace('/%s\s*/i', config('app.name', 'Deprixa Plus') . ' ', $result['message'] ?? '')),
            // true when update exists but support period has expired
            'license_expired'  => $licExpired,
            // can_download = has update AND support is active
            'can_download'     => $hasUpdate && !$licExpired,
        ];
    }

    // ── Progress tracking ─────────────────────────────────────────────────────

    public function getProgress(): array
    {
        return Cache::get(self::PROGRESS_KEY, ['running' => false, 'steps' => [], 'done' => false, 'error' => null]);
    }

    private function resetProgress(): void
    {
        Cache::put(self::PROGRESS_KEY, ['running' => true, 'steps' => [], 'done' => false, 'error' => null], now()->addMinutes(15));
    }

    private function progress(string $step, bool $done = false, ?string $error = null): void
    {
        $current = Cache::get(self::PROGRESS_KEY, ['running' => true, 'steps' => []]);
        $current['steps'][] = $step;
        $current['done']    = $done;
        $current['error']   = $error;
        $current['running'] = !$done && !$error;
        Cache::put(self::PROGRESS_KEY, $current, now()->addMinutes(15));
    }

    // ── Apply update ──────────────────────────────────────────────────────────

    public function applyUpdate(string $updateId, string $newVersion, bool $hasSql = false): array
    {
        $basePath   = base_path();
        $extractDir = $this->tempDir . '/extracted_' . time();
        $backupDir  = $this->tempDir . '/backup_' . config('version.current') . '_' . time();

        $this->resetProgress();

        try {
            // 1. Download main zip
            $this->progress('📥 Downloading update v' . $newVersion . '...');
            $zipPath = $this->lb->downloadMainUpdate($updateId, $newVersion);
            $this->progress('✅ Download complete (' . $this->humanSize(File::size($zipPath)) . ')');

            // 2. Extract
            $this->progress('📦 Extracting update package...');
            File::ensureDirectoryExists($extractDir, 0755);
            $zip = new ZipArchive();
            if ($zip->open($zipPath) !== true) {
                throw new \RuntimeException('Zip extraction failed — file may be corrupt.');
            }
            $zip->extractTo($extractDir);
            $zip->close();
            File::delete($zipPath);

            // Detect top-level folder
            $dirs      = File::directories($extractDir);
            $sourceDir = (count($dirs) === 1 && empty(File::files($extractDir))) ? $dirs[0] : $extractDir;

            // 3. Backup current files
            $this->progress('💾 Backing up current files...');
            File::ensureDirectoryExists($backupDir, 0755);
            $this->backupCurrentFiles($sourceDir, $basePath, $backupDir);

            // 4. Copy new files
            $this->progress('🔄 Installing new files (skipping .env, storage/, uploads/)...');
            $replaced = $this->copyFiles($sourceDir, $basePath);
            $this->progress("✅ {$replaced} files installed.");

            // 5. Run migrations
            $this->progress('🗄️  Running database migrations...');
            Artisan::call('migrate', ['--force' => true]);
            $migOut = trim(Artisan::output()) ?: 'No pending migrations.';
            foreach (explode("
", $migOut) as $line) {
                if ($line = trim($line)) $this->progress('   ' . $line);
            }

            // 6. SQL field from apikey.site is intentionally ignored.
            //    All database changes (new tables, columns, indexes) are handled
            //    by Laravel migrations in step 5 above. This is intentional and safe.

            // 7. Clear caches
            $this->progress('🧹 Clearing application caches...');
            Artisan::call('optimize:clear');
            Artisan::call('view:clear');

            // 8. Update version
            $this->progress('🏷️  Updating version number to v' . $newVersion . '...');
            $this->writeNewVersion($newVersion);

            // Cleanup
            File::deleteDirectory($extractDir);
            Cache::forget('update.available');
            Cache::forget('update.last_check');

            $this->progress('🎉 Successfully updated to v' . $newVersion . '!', done: true);

            return ['success' => true, 'new_version' => $newVersion];

        } catch (\Throwable $e) {
            Log::error('[UpdateService] applyUpdate failed: ' . $e->getMessage());

            if (File::isDirectory($backupDir)) {
                try {
                    $this->progress('⚠️  Error: ' . $e->getMessage());
                    $this->progress('↩️  Rolling back to previous version...');
                    $this->copyFiles($backupDir, $basePath);
                    $this->progress('✅ Rollback complete. Your system is intact.', done: false, error: $e->getMessage());
                } catch (\Throwable $rb) {
                    $this->progress('❌ Rollback failed: ' . $rb->getMessage(), done: false, error: $e->getMessage());
                }
            } else {
                $this->progress('❌ ' . $e->getMessage(), done: false, error: $e->getMessage());
            }

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ── File helpers ──────────────────────────────────────────────────────────

    private function isExcluded(string $relativePath): bool
    {
        foreach (config('version.exclude_paths', []) as $pattern) {
            if (str_starts_with($relativePath, $pattern) || $relativePath === $pattern) return true;
        }
        return false;
    }

    private function copyFiles(string $sourceDir, string $destDir): int
    {
        $count    = 0;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $item) {
            $relative = ltrim(str_replace($sourceDir, '', $item->getPathname()), '/\\');
            if ($this->isExcluded($relative)) continue;
            $dest = $destDir . DIRECTORY_SEPARATOR . $relative;
            if ($item->isDir()) {
                File::ensureDirectoryExists($dest, 0755);
            } else {
                File::ensureDirectoryExists(dirname($dest), 0755);
                File::copy($item->getPathname(), $dest);
                $count++;
            }
        }
        return $count;
    }

    private function backupCurrentFiles(string $sourceDir, string $basePath, string $backupDir): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \RecursiveDirectoryIterator::SKIP_DOTS)
        );
        foreach ($iterator as $item) {
            if ($item->isDir()) continue;
            $relative = ltrim(str_replace($sourceDir, '', $item->getPathname()), '/\\');
            if ($this->isExcluded($relative)) continue;
            $current = $basePath . DIRECTORY_SEPARATOR . $relative;
            if (File::exists($current)) {
                $backup = $backupDir . DIRECTORY_SEPARATOR . $relative;
                File::ensureDirectoryExists(dirname($backup), 0755);
                File::copy($current, $backup);
            }
        }
    }

    private function writeNewVersion(string $version): void
    {
        $path    = config_path('version.php');
        $content = File::get($path);
        $updated = preg_replace("/'current'\s*=>\s*'[^']+'/", "'current' => '{$version}'", $content);
        File::put($path, $updated);
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 2) . ' MB';
    }
}
