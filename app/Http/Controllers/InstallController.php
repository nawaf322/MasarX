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

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\LicenseBoxExternalAPI;
use App\Services\LicenseVerificationService;
use App\Services\OrganizationOnboardingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class InstallController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // Step 1 — Welcome / Requirements
    // ──────────────────────────────────────────────────────────────

    public function step1(): Response
    {
        session()->put('install_step', 1);

        $requirements = $this->checkRequirements();

        return Inertia::render('Install/Step1Welcome', [
            'requirements' => $requirements,
            'canProceed'   => collect($requirements)->every(fn($r) => $r['status']),
            'currentStep'  => 1,
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // Step 2 — License
    // ──────────────────────────────────────────────────────────────

    public function step2(): Response|RedirectResponse
    {
        if (session('install_step', 0) < 1) {
            return Inertia::location(route('install.step1'));
        }

        session()->put('install_step', 2);

        return Inertia::render('Install/Step2License', [
            'currentStep' => 2,
        ]);
    }

    public function verifyLicense(Request $request): JsonResponse
    {
        $request->validate([
            'purchase_code' => 'required|string',
            'username'      => 'required|string',
        ]);

        $purchaseCode = $request->input('purchase_code');
        $username     = $request->input('username');

        try {
            $api    = new LicenseBoxExternalAPI();
            $result = $api->activate_license($purchaseCode, $username);

            if (!empty($result['status'])) {
                session()->put('install_license_verified', true);

                // Save license data so DashboardController::LicenseVerificationService
                // can find it in storage/framework/license.php after install.
                try {
                    $licSvc = new LicenseVerificationService();
                    $licSvc->saveLicense([
                        'purchase_code' => $purchaseCode,
                        'username'      => $username,
                        'lic_response'  => $result['lic_response'] ?? '',
                        'activated_at'  => now()->toIso8601String(),
                    ]);
                } catch (\Throwable) {}
            }

            return response()->json($result);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('verifyLicense exception: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'retry'   => true,
                'message' => 'License verification error. Please try again.',
                'error'   => 'license_verification_error',
            ], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Step 3 — Database + Company
    // ──────────────────────────────────────────────────────────────

    public function step3(): Response|RedirectResponse
    {
        if (session('install_step', 0) < 2) {
            return Inertia::location(route('install.step2'));
        }

        session()->put('install_step', 3);

        // Pre-fill from .env if already set
        return Inertia::render('Install/Step3Database', [
            'currentStep' => 3,
            'defaults'    => [
                'db_host'     => env('DB_HOST', '127.0.0.1'),
                'db_port'     => env('DB_PORT', '3306'),
                'db_name'     => env('DB_DATABASE', ''),
                'db_user'     => env('DB_USERNAME', 'root'),
                'db_password' => '',
            ],
        ]);
    }

    public function testDatabase(Request $request): JsonResponse
    {
        $request->validate([
            'db_host'     => 'required|string',
            'db_port'     => 'required|integer',
            'db_name'     => 'required|string',
            'db_user'     => 'required|string',
            'db_password' => 'nullable|string',
        ]);

        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $request->db_host,
                $request->db_port,
                $request->db_name
            );

            $pdo = new \PDO($dsn, $request->db_user, $request->db_password ?? '');
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

            $mysqlVer = $pdo->query('SELECT VERSION()')->fetchColumn();

            return response()->json([
                'success' => true,
                'message' => "Connected successfully! MySQL {$mysqlVer}",
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('DB connection test failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Connection failed. Check your database host, port, username, and password.',
            ]);
        }
    }

    public function setupDatabase(Request $request): RedirectResponse|JsonResponse
    {
        // Ensure enough memory for SQL parsing + Laravel bootstrap
        ini_set('memory_limit', '512M');
        set_time_limit(120);

        $request->validate([
            'db_host'        => 'required|string',
            'db_port'        => 'required|integer',
            'db_name'        => 'required|string',
            'db_user'        => 'required|string',
            'db_password'    => 'nullable|string',
            'company_name'   => 'required|string|max:255',
            'company_email'  => 'required|email|max:255',
            'company_phone'  => 'nullable|string|max:50',
            'company_country'=> 'nullable|string|max:10',
            'company_address'=> 'nullable|string|max:500',
        ]);

        try {
            // 1. Connect via PDO first (raw — avoids cached config)
            $dsn = sprintf(
                'mysql:host=%s;port=%d;charset=utf8mb4',
                $request->db_host,
                (int) $request->db_port
            );
            $pdo = new \PDO($dsn, $request->db_user, $request->db_password ?? '', [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);

            // Sanitize database name — only alphanumeric and underscores allowed
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $request->db_name)) {
                return back()->withErrors(['db_setup' => 'Database name can only contain letters, numbers, and underscores.']);
            }

            // Create DB if it doesn't exist, then select it
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$request->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `{$request->db_name}`");

            // Check if DB already has tables (re-import only when empty)
            $tableCount = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{$request->db_name}'")->fetchColumn();

            if ($tableCount === 0) {
                $sqlFile = base_path('database/sql/deprixa_lite.sql');
                if (!file_exists($sqlFile)) {
                    throw new \RuntimeException('SQL file not found: database/sql/deprixa_lite.sql');
                }

                // Parse and execute SQL statements using a quote-aware tokenizer
                // (simple explode(';') breaks on semicolons inside string values)
                $sql = file_get_contents($sqlFile);
                $statements = $this->parseSqlStatements($sql);

                // The dump has its own START TRANSACTION / COMMIT.
                // SET FOREIGN_KEY_CHECKS is session-level and safe outside a transaction.
                $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
                foreach ($statements as $statement) {
                    $pdo->exec($statement);
                }
                $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

                // The SQL dump snapshot is missing some tables and columns that
                // were supposed to be created by migrations 83–88.
                // Remove only those specific tracking records so artisan migrate
                // re-creates them. Migrations 89–95 ARE correctly baked into the dump.
                try {
                    $pdo->exec("DELETE FROM `migrations` WHERE `migration` IN (
                        '2026_04_08_000002_create_proof_of_deliveries_table',
                        '2026_04_08_000003_create_hs_codes_table',
                        '2026_04_08_000004_create_customs_declarations_table',
                        '2026_04_08_000005_create_import_jobs_table',
                        '2026_04_08_000006_create_return_shipments_table',
                        '2026_04_08_000007_add_cod_fields_to_shipments_table'
                    )");
                } catch (\Throwable) {}
            }

            // Apply Laravel's runtime DB config NOW so Artisan::call('migrate') connects
            // to the correct database (not the default .env placeholder).
            $this->applyRuntimeDbConfig([
                'host'     => $request->db_host,
                'port'     => (int) $request->db_port,
                'database' => $request->db_name,
                'username' => $request->db_user,
                'password' => $request->db_password ?? '',
            ]);

            // Run outstanding migrations: creates missing tables (proof_of_deliveries,
            // return_shipments, hs_codes, customs_declarations, import_jobs,
            // shipment_exception_reasons, idempotency_keys) and missing columns
            // (COD fields, invoice_number, lifecycle state fields, performance indexes).
            try {
                \Illuminate\Support\Facades\Log::info('[SETUP_DB] Running artisan migrate --force...');
                Artisan::call('migrate', ['--force' => true]);
                \Illuminate\Support\Facades\Log::info('[SETUP_DB] Migrations completed.');
            } catch (\Throwable $migErr) {
                // Non-fatal: log and continue. The install can still proceed; affected
                // features will degrade gracefully until migrations are run manually.
                \Illuminate\Support\Facades\Log::warning('[SETUP_DB] artisan migrate warning: ' . $migErr->getMessage());
            }

            // 3. Create the organization record (replaces any demo org in SQL)
            $orgSlug = \Illuminate\Support\Str::slug($request->company_name) ?: 'main';
            $existingOrg = $pdo->query("SELECT id FROM organizations LIMIT 1")->fetch(\PDO::FETCH_ASSOC);

            if ($existingOrg) {
                // Update the existing org with wizard data
                $stmt = $pdo->prepare(
                    "UPDATE organizations SET name=?, email=?, phone=?, country=?, address=?, slug=?, is_active=1 WHERE id=?"
                );
                $stmt->execute([
                    $request->company_name,
                    $request->company_email,
                    $request->company_phone,
                    $request->company_country,
                    $request->company_address,
                    $orgSlug,
                    $existingOrg['id'],
                ]);
                $orgId = $existingOrg['id'];
            } else {
                $stmt = $pdo->prepare(
                    "INSERT INTO organizations (name, slug, email, phone, country, address, is_active, settings, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 1, '{}', NOW(), NOW())"
                );
                $stmt->execute([
                    $request->company_name,
                    $orgSlug,
                    $request->company_email,
                    $request->company_phone,
                    $request->company_country,
                    $request->company_address,
                ]);
                $orgId = $pdo->lastInsertId();
            }

            session()->put('install_org_id', $orgId);
            session()->put('install_step', 3);

            // Store DB credentials in session so steps 4, 5 and finalize can apply
            // them at runtime via applyRuntimeDbConfigFromSession().
            $dbConfig = [
                'DB_HOST'     => $request->db_host,
                'DB_PORT'     => (string) $request->db_port,
                'DB_DATABASE' => $request->db_name,
                'DB_USERNAME' => $request->db_user,
                'DB_PASSWORD' => $request->db_password ?? '',
            ];
            session()->put('install_db_config', $dbConfig);

            // Apply new DB config to the running Laravel instance so the rest of
            // this request can use Eloquent immediately.
            $this->applyRuntimeDbConfig([
                'host'     => $request->db_host,
                'port'     => (int) $request->db_port,
                'database' => $request->db_name,
                'username' => $request->db_user,
                'password' => $request->db_password ?? '',
            ]);

            // Write DB credentials to bootstrap/install.env.php (NOT to .env).
            // artisan serve's file watcher ONLY watches .env — it never detects
            // changes to this file, so the server NEVER restarts during the wizard.
            // public/index.php reads this file on every request and applies the
            // values via putenv() before Laravel boots.
            $this->writeInstallEnvFile($dbConfig);

            return redirect()->route('install.step4')->with('success', 'Database imported successfully.');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('setupDatabase failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() . "\n" . $e->getTraceAsString());
            return back()->withErrors(['db_setup' => 'Database setup failed. Please check the error log or try again. If the problem persists, contact support.']);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Step 4 — Admin User
    // ──────────────────────────────────────────────────────────────

    public function step4(): Response|RedirectResponse
    {
        if (session('install_step', 0) < 3) {
            return Inertia::location(route('install.step3'));
        }

        $this->applyRuntimeDbConfigFromSession();
        session()->put('install_step', 4);

        return Inertia::render('Install/Step4Admin', [
            'currentStep' => 4,
        ]);
    }

    public function createAdmin(Request $request): RedirectResponse
    {
        $this->applyRuntimeDbConfigFromSession();

        $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|max:255',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ]);

        try {
            $orgId = session('install_org_id');
            $org   = Organization::findOrFail($orgId);

            DB::transaction(function () use ($org, $request) {
                // The SQL dump seeds a super-admin user. Find them by the super-admin
                // role rather than by a hardcoded id, so this works regardless of
                // which auto-increment id the seeded user received.
                $superAdminRole = \Spatie\Permission\Models\Role::where('name', 'super-admin')
                    ->where('guard_name', 'web')
                    ->first();

                $user = null;
                if ($superAdminRole) {
                    // Find user that already holds the super-admin role
                    $user = \App\Models\User::whereHas('roles', fn($q) => $q->where('id', $superAdminRole->id))
                        ->first();
                }

                if ($user) {
                    $user->update([
                        'name'            => $request->name,
                        'email'           => $request->email,
                        'password'        => Hash::make($request->password),
                        'organization_id' => $org->id,
                        'is_active'       => true,
                        'must_change_password' => false,
                    ]);
                } else {
                    // Fallback: create a fresh super-admin if none found in the dump
                    $user = \App\Models\User::create([
                        'name'            => $request->name,
                        'email'           => $request->email,
                        'password'        => Hash::make($request->password),
                        'organization_id' => $org->id,
                        'is_active'       => true,
                        'must_change_password' => false,
                    ]);
                }

                // Ensure super-admin role is assigned (role_id=10 in SQL dump)
                $superAdminRole = \Spatie\Permission\Models\Role::firstOrCreate(
                    ['name' => 'super-admin', 'guard_name' => 'web']
                );
                // syncRoles replaces any existing roles so only super-admin remains
                $user->syncRoles([$superAdminRole]);

                // Seed defaults — each wrapped so missing tables don't abort the install
                $onboarding = app(OrganizationOnboardingService::class);
                foreach ([
                    fn () => $onboarding->seedDefaultSettings($org),
                    fn () => $onboarding->applyDefaultBranding($org),
                    fn () => $onboarding->createDefaultBranches($org),
                    fn () => $onboarding->createDefaultServices($org),
                    fn () => $onboarding->createDefaultShipmentStatuses($org),
                    fn () => $onboarding->createDefaultNumberingSequences($org),
                    fn () => $onboarding->createDefaultNotifications($org),
                ] as $step) {
                    try { $step(); } catch (\Throwable) {}
                }
            });

            session()->put('install_step', 4);

            return redirect()->route('install.step5')->with('success', 'Admin user configured.');
        } catch (\Throwable $e) {
            return back()->withErrors(['create_admin' => 'Failed to configure admin account. Please try again or contact support.']);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Step 5 — Preferences
    // ──────────────────────────────────────────────────────────────

    public function step5(): Response|RedirectResponse
    {
        if (session('install_step', 0) < 4) {
            return Inertia::location(route('install.step4'));
        }

        $this->applyRuntimeDbConfigFromSession();
        session()->put('install_step', 5);

        return Inertia::render('Install/Step5Preferences', [
            'currentStep' => 5,
        ]);
    }

    public function finalize(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $this->applyRuntimeDbConfigFromSession();

        $request->validate([
            'language'      => 'required|in:es,en',
            'timezone'      => 'required|string',
            'currency'      => 'required|string|max:10',
            'date_format'   => 'required|string',
            'weight_unit'   => 'required|in:kg,lb',
            'dimension_unit'=> 'required|in:cm,in',
            'load_demo'     => 'boolean',
        ]);

        try {
            $orgId = session('install_org_id');
            \Illuminate\Support\Facades\Log::info('[FINALIZE] Starting. org_id=' . $orgId);

            if (!$orgId) {
                throw new \RuntimeException('Session lost: install_org_id is missing. Please restart the wizard.');
            }

            $org = Organization::findOrFail($orgId);
            \Illuminate\Support\Facades\Log::info('[FINALIZE] Organization found: ' . $org->name);

            // Save preferences to organizations.settings JSON (legacy / display layer)
            $settings = [
                'language'       => $request->language,
                'timezone'       => $request->timezone,
                'currency'       => $request->currency,
                'date_format'    => $request->date_format,
                'weight_unit'    => $request->weight_unit,
                'dimension_unit' => $request->dimension_unit,
            ];
            $org->update(['settings' => array_merge((array) $org->settings, $settings)]);

            // Also persist to organization_settings table — this is what SetTenantLocale
            // middleware reads via SettingsService. Without this, language falls back to
            // browser detection and the UI language ignores the wizard choice.
            try {
                $settingsSvc = app(\App\Services\SettingsService::class);
                foreach ($settings as $key => $value) {
                    $settingsSvc->set('locale', $key, $value);
                }

                // Set the admin user's personal language preference so it survives
                // even if org settings are overridden later.
                \App\Models\User::where('organization_id', $orgId)
                    ->orderBy('id')
                    ->first()
                    ?->update(['language' => $request->language]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('[FINALIZE] Could not persist locale to organization_settings: ' . $e->getMessage());
            }
            \Illuminate\Support\Facades\Log::info('[FINALIZE] Preferences saved.');

            // Load demo data — wrapped in its own try/catch so a seeder error
            // never blocks installation from completing.
            if ($request->boolean('load_demo')) {
                \Illuminate\Support\Facades\Log::info('[FINALIZE] Running DemoDataSeeder...');
                try {
                    Artisan::call('db:seed', ['--class' => 'DemoDataSeeder', '--force' => true]);
                    \Illuminate\Support\Facades\Log::info('[FINALIZE] DemoDataSeeder completed.');
                } catch (\Throwable $seedErr) {
                    \Illuminate\Support\Facades\Log::error('[FINALIZE] DemoDataSeeder failed (non-fatal): ' . $seedErr->getMessage() . ' in ' . $seedErr->getFile() . ':' . $seedErr->getLine());
                    // Installation continues even if demo data fails.
                }
            }

            // Create storage symlink (public/storage → storage/app/public)
            // Required for uploaded files: branding, POD photos, receipts, labels.
            try {
                if (!file_exists(public_path('storage'))) {
                    Artisan::call('storage:link');
                    \Illuminate\Support\Facades\Log::info('[FINALIZE] storage:link created.');
                }
            } catch (\Throwable $slErr) {
                \Illuminate\Support\Facades\Log::warning('[FINALIZE] storage:link failed (non-fatal): ' . $slErr->getMessage());
            }

            // Write .installed lock file
            file_put_contents(storage_path('framework/.installed'), now()->toIso8601String());
            \Illuminate\Support\Facades\Log::info('[FINALIZE] .installed created.');

            // Update install.env.php with the chosen locale.
            // This file is NOT watched by artisan serve → zero server restarts.
            $dbConfig = session('install_db_config', []);
            $this->writeInstallEnvFile(array_merge($dbConfig, [
                'APP_LOCALE'          => $request->language,
                'APP_FALLBACK_LOCALE' => $request->language,
            ]));

            // On a real server (Apache/Nginx) also persist to .env so the config
            // survives deployments without needing install.env.php.
            if (php_sapi_name() !== 'cli-server') {
                $this->updateEnvFile(array_merge($dbConfig, [
                    'APP_LOCALE'          => $request->language,
                    'APP_FALLBACK_LOCALE' => $request->language,
                ]));
            }

            // Clear session install data
            session()->forget(['install_step', 'install_org_id', 'install_license_verified', 'install_db_config']);

            \Illuminate\Support\Facades\Log::info('[FINALIZE] Done. No .env write → no artisan restart → redirecting to login.');

            // Inertia::location() forces a full browser navigation (not XHR),
            // ensuring a clean full reload of the login page after install.
            return Inertia::location('/login');

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[FINALIZE] Exception: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() . "\n" . $e->getTraceAsString());
            return back()->withErrors(['finalize' => 'Installation finalization failed. Please check the error log or try again. If the problem persists, contact support.']);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    /**
     * Quote-aware SQL statement splitter for phpMyAdmin dumps.
     * Handles single-quoted strings containing semicolons (e.g. User-Agent values).
     */
    private function parseSqlStatements(string $sql): array
    {
        $statements = [];
        $current    = '';
        $inString   = false;
        $quote      = '';
        $len        = strlen($sql);

        for ($i = 0; $i < $len; $i++) {
            $c = $sql[$i];

            if ($inString) {
                $current .= $c;
                if ($c === '\\') {
                    // Consume next char as escaped
                    if ($i + 1 < $len) {
                        $current .= $sql[++$i];
                    }
                } elseif ($c === $quote) {
                    // Doubled-quote escape: '' or ""
                    if ($i + 1 < $len && $sql[$i + 1] === $quote) {
                        $current .= $sql[++$i];
                    } else {
                        $inString = false;
                    }
                }
            } else {
                if ($c === "'" || $c === '"' || $c === '`') {
                    $inString = true;
                    $quote    = $c;
                    $current .= $c;
                } elseif ($c === '-' && $i + 1 < $len && $sql[$i + 1] === '-') {
                    // Line comment: skip to end of line
                    while ($i < $len && $sql[$i] !== "\n") {
                        $i++;
                    }
                } elseif ($c === '/' && $i + 1 < $len && $sql[$i + 1] === '*') {
                    // mysqldump uses /*!NNNNN sql */; — conditional execution blocks.
                    // These must be EXECUTED (charset settings, FOREIGN_KEY_CHECKS, etc.).
                    // Plain /* ... */ comments are skipped; /*! ... */ are passed through.
                    if ($i + 2 < $len && $sql[$i + 2] === '!') {
                        // Conditional comment: include content (strip the /*! and */ markers)
                        $i += 3;
                        // Skip version number digits if present (e.g. "40101 ")
                        while ($i < $len && ctype_digit($sql[$i])) {
                            $i++;
                        }
                        // Accumulate SQL until closing */
                        while ($i + 1 < $len && !($sql[$i] === '*' && $sql[$i + 1] === '/')) {
                            $current .= $sql[$i];
                            $i++;
                        }
                        $i++; // skip closing /
                    } else {
                        // Regular block comment: skip entirely
                        $i += 2;
                        while ($i + 1 < $len && !($sql[$i] === '*' && $sql[$i + 1] === '/')) {
                            $i++;
                        }
                        $i++; // skip closing /
                    }
                } elseif ($c === ';') {
                    $trimmed = trim($current);
                    if ($trimmed !== '') {
                        $statements[] = $trimmed;
                    }
                    $current = '';
                } else {
                    $current .= $c;
                }
            }
        }

        $trimmed = trim($current);
        if ($trimmed !== '') {
            $statements[] = $trimmed;
        }

        return $statements;
    }

    /**
     * Apply DB credentials to the running Laravel instance so Eloquent works
     * immediately after setupDatabase() without needing to restart the server.
     */
    private function applyRuntimeDbConfig(array $config): void
    {
        config([
            'database.connections.mysql.host'     => $config['host'],
            'database.connections.mysql.port'     => (int) $config['port'],
            'database.connections.mysql.database' => $config['database'],
            'database.connections.mysql.username' => $config['username'],
            'database.connections.mysql.password' => $config['password'],
        ]);
        DB::purge('mysql');
    }

    /**
     * Restore runtime DB config from session (used in steps 4, 5 and finalize
     * because each HTTP request gets a fresh PHP process with default .env config).
     */
    private function applyRuntimeDbConfigFromSession(): void
    {
        $cfg = session('install_db_config');
        if (!$cfg) return;

        $this->applyRuntimeDbConfig([
            'host'     => $cfg['DB_HOST']     ?? '',
            'port'     => $cfg['DB_PORT']     ?? 3306,
            'database' => $cfg['DB_DATABASE'] ?? '',
            'username' => $cfg['DB_USERNAME'] ?? '',
            'password' => $cfg['DB_PASSWORD'] ?? '',
        ]);
    }

    private function checkRequirements(): array
    {
        return [
            [
                'name'   => 'PHP >= 8.2',
                'status' => version_compare(PHP_VERSION, '8.2.0', '>='),
                'value'  => PHP_VERSION,
            ],
            [
                'name'   => 'PDO Extension',
                'status' => extension_loaded('pdo') && extension_loaded('pdo_mysql'),
                'value'  => extension_loaded('pdo') ? 'Available' : 'Missing',
            ],
            [
                'name'   => 'OpenSSL Extension',
                'status' => extension_loaded('openssl'),
                'value'  => extension_loaded('openssl') ? 'Available' : 'Missing',
            ],
            [
                'name'   => 'cURL Extension',
                'status' => extension_loaded('curl'),
                'value'  => extension_loaded('curl') ? 'Available' : 'Missing',
            ],
            [
                'name'   => 'Zip Extension',
                'status' => extension_loaded('zip'),
                'value'  => extension_loaded('zip') ? 'Available' : 'Missing',
            ],
            [
                'name'   => 'Mbstring Extension',
                'status' => extension_loaded('mbstring'),
                'value'  => extension_loaded('mbstring') ? 'Available' : 'Missing',
            ],
            [
                'name'   => 'GD / Imagick Extension',
                'status' => extension_loaded('gd') || extension_loaded('imagick'),
                'value'  => extension_loaded('gd') ? 'GD Available' : (extension_loaded('imagick') ? 'Imagick Available' : 'Missing'),
            ],
            [
                'name'   => 'storage/ Writable',
                'status' => is_writable(storage_path()),
                'value'  => is_writable(storage_path()) ? 'Writable' : 'Not Writable',
            ],
            [
                'name'   => 'bootstrap/cache/ Writable',
                'status' => is_writable(base_path('bootstrap/cache')),
                'value'  => is_writable(base_path('bootstrap/cache')) ? 'Writable' : 'Not Writable',
            ],
        ];
    }

    /**
     * Write key=value pairs to bootstrap/install.env.php.
     * artisan serve ONLY watches .env — this file is invisible to the watcher,
     * so writing here never triggers a server restart.
     * public/index.php reads this file and applies values via putenv() before boot.
     */
    private function writeInstallEnvFile(array $data): void
    {
        $path    = base_path('bootstrap/install.env.php');
        $existing = [];

        if (file_exists($path)) {
            try { $existing = (array) (require $path); } catch (\Throwable) {}
        }

        $merged  = array_merge($existing, $data);
        $export  = var_export($merged, true);
        file_put_contents($path, "<?php
// Generated by install wizard — do not edit manually.
return {$export};
");
    }

    private function updateEnvFile(array $data): void
    {
        $envPath = base_path('.env');
        $content = file_get_contents($envPath);

        foreach ($data as $key => $value) {
            $value = str_contains((string) $value, ' ') ? '"' . $value . '"' : $value;

            if (preg_match("/^{$key}=.*/m", $content)) {
                $content = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $content);
            } else {
                $content .= "
{$key}={$value}";
            }
        }

        file_put_contents($envPath, $content);
    }
}
