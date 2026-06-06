<?php

namespace App\Services;

use App\Models\PreAlert;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Parses a phpMyAdmin SQL dump from Deprixa Pro and imports
 * cdb_pre_alert rows into the deprixa-plus pre_alerts table.
 *
 * Requires:
 *   - cdb_pre_alert  -> the pre-alert rows
 *   - cdb_users      -> to resolve old customer_id -> email -> new User
 */
class DeprixaProPreAlertImporter
{
    private string $sql;
    private int    $orgId;

    public function __construct(string $sql, int $orgId)
    {
        $this->sql   = $sql;
        $this->orgId = $orgId;
    }

    /**
     * Run the import.
     * Returns ['imported' => n, 'skipped' => n, 'skippedRows' => [...]]
     */
    public function import(): array
    {
        $preAlerts = $this->parseTable('cdb_pre_alert');
        $users     = $this->parseTable('cdb_users');

        $hasCdbUsers = !empty($users);

        // ── Auto-import customers from cdb_users if present ─────────────────
        if ($hasCdbUsers) {
            foreach ($users as $u) {
                $uEmail = strtolower(trim($u['email'] ?? ''));
                if (empty($uEmail) || !filter_var($uEmail, FILTER_VALIDATE_EMAIL)) {
                    continue;
                }
                if ((int)($u['userlevel'] ?? 0) !== 1) {
                    continue;
                }
                $existing = User::where('email', $uEmail)->first();
                if ($existing) {
                    continue; // skip duplicates silently
                }
                $fname = trim($u['fname'] ?? '');
                $lname = trim($u['lname'] ?? '');
                $uName = trim("$fname $lname") ?: trim($u['username'] ?? '');
                if (empty($uName)) {
                    continue;
                }
                $rawPwd   = $u['password'] ?? '';
                $password = (strlen($rawPwd) > 20 && str_starts_with($rawPwd, '$2'))
                    ? $rawPwd
                    : Hash::make(Str::random(16));

                $newUser = User::create([
                    'name'              => $uName,
                    'email'             => $uEmail,
                    'password'          => $password,
                    'phone'             => trim(strip_tags((string)($u['phone'] ?? ''))),
                    'is_active'         => ((int)($u['active'] ?? 1)) === 1,
                    'organization_id'   => $this->orgId,
                    'email_verified_at' => now(),
                ]);
                $newUser->assignRole('customer');
            }
        } else {
            // No cdb_users in SQL — check if customers exist in the DB
            $existingCustomerCount = User::where('organization_id', $this->orgId)
                ->whereHas('roles', fn($q) => $q->where('name', 'customer'))
                ->count();
            if ($existingCustomerCount === 0) {
                throw new \RuntimeException(
                    'No customers found in the system and cdb_users.sql was not included. '
                    . 'Please import customers first or include cdb_users.sql with your pre-alert files.'
                );
            }
        }

        // Build old customer_id -> email map from cdb_users
        $oldUserEmails = [];
        if ($hasCdbUsers) {
            foreach ($users as $row) {
                $id    = $row['id'] ?? null;
                $email = strtolower(trim($row['email'] ?? ''));
                if ($id !== null && $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $oldUserEmails[$id] = $email;
                }
            }
        }

        // Cache: email -> new User id (avoid repeated DB lookups)
        $emailToNewUserId = [];

        $imported    = 0;
        $skipped     = 0;
        $skippedRows = [];

        foreach ($preAlerts as $row) {
            $tracking = $this->clean($row['tracking'] ?? '');

            // Skip rows without tracking
            if (empty($tracking)) {
                $skipped++;
                $skippedRows[] = "Empty tracking number (pre_alert_id: " . ($row['pre_alert_id'] ?? '?') . ")";
                continue;
            }

            // Skip duplicates: same store_tracking_number for this org
            if (PreAlert::where('organization_id', $this->orgId)
                ->where('store_tracking_number', $tracking)
                ->exists()
            ) {
                $skipped++;
                $skippedRows[] = "Duplicate tracking: {$tracking}";
                continue;
            }

            // Resolve customer
            $oldCustomerId = $row['customer_id'] ?? null;
            $newCustomerId = null;

            if ($hasCdbUsers && $oldCustomerId !== null && isset($oldUserEmails[$oldCustomerId])) {
                $email = $oldUserEmails[$oldCustomerId];

                if (!array_key_exists($email, $emailToNewUserId)) {
                    $emailToNewUserId[$email] = User::where('email', $email)
                        ->where('organization_id', $this->orgId)
                        ->value('id');
                }

                $newCustomerId = $emailToNewUserId[$email];
            }

            // Fallback: if no cdb_users or customer not found via email,
            // try direct DB lookup by old customer ID (in case IDs match)
            if ($newCustomerId === null && $oldCustomerId !== null) {
                $cacheKey = '__db_id_' . $oldCustomerId;
                if (!array_key_exists($cacheKey, $emailToNewUserId)) {
                    $emailToNewUserId[$cacheKey] = User::where('organization_id', $this->orgId)
                        ->where('id', (int)$oldCustomerId)
                        ->whereHas('roles', fn($q) => $q->where('name', 'customer'))
                        ->value('id');
                }
                $newCustomerId = $emailToNewUserId[$cacheKey];
            }

            if ($newCustomerId === null) {
                $skipped++;
                $emailHint = $oldCustomerId !== null ? ($oldUserEmails[$oldCustomerId] ?? 'unknown') : 'no-id';
                $skippedRows[] = "Customer not found for tracking {$tracking} (old_id: {$oldCustomerId}, email: {$emailHint})";
                continue;
            }

            // Map status
            $isPackage = (int)($row['is_package'] ?? 0);
            $status    = $isPackage === 1 ? 'received' : 'pending';

            // received_at
            $receivedAt = null;
            if ($isPackage === 1) {
                $estimatedDate = $row['estimated_date'] ?? null;
                if ($estimatedDate && $estimatedDate !== '' && strtoupper($estimatedDate) !== 'NULL') {
                    $receivedAt = $estimatedDate;
                }
            }

            // created_at from prealert_date
            $createdAt = $row['prealert_date'] ?? null;
            if (!$createdAt || strtoupper((string)$createdAt) === 'NULL' || $createdAt === '0000-00-00 00:00:00') {
                $createdAt = now();
            }

            // Generate pre_alert_number using a temp approach (update after insert using ID)
            $preAlert = PreAlert::create([
                'organization_id'       => $this->orgId,
                'customer_id'           => $newCustomerId,
                'locker_id'             => null,
                'store_name'            => $this->clean($row['provider_shop'] ?? 'Unknown'),
                'store_tracking_number' => $tracking,
                'store_url'             => null,
                'declared_value'        => (float)($row['purchase_price'] ?? 0),
                'declared_currency'     => 'USD',
                'declared_weight_kg'    => null,
                'description'           => $this->clean($row['package_description'] ?? ''),
                'notes'                 => null,
                'invoice_data'          => null,
                'status'                => $status,
                'received_at'           => $receivedAt,
                'converted_at'          => null,
                'shipment_id'           => null,
            ]);

            // Assign pre_alert_number using the DB-generated ID (same pattern as store())
            $preAlert->pre_alert_number = 'PA-' . date('Y') . '-' . str_pad($preAlert->id, 5, '0', STR_PAD_LEFT);

            // Override created_at timestamp
            $preAlert->created_at = $createdAt;
            $preAlert->save();

            $imported++;
        }

        return compact('imported', 'skipped', 'skippedRows');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SQL PARSER (copied from DeprixaProImporter to avoid refactor risk)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Extract all rows from an INSERT INTO `tableName` block as associative arrays.
     */
    private function parseTable(string $tableName): array
    {
        $escaped = preg_quote($tableName, '/');
        $pattern = '/INSERT\s+INTO\s+[`"]?' . $escaped . '[`"]?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/i';

        if (!preg_match($pattern, $this->sql, $match)) {
            return [];
        }

        $columns = array_map(
            fn($c) => trim(trim(trim($c), '`"\'')),
            explode(',', $match[1])
        );

        $rowStrings = $this->extractRows($match[2]);

        $rows = [];
        foreach ($rowStrings as $rowStr) {
            $values = $this->splitValues($rowStr);
            if (count($values) === count($columns)) {
                $rows[] = array_combine($columns, $values);
            }
        }

        return $rows;
    }

    /**
     * Extract each (...) group from the VALUES block as a raw string (without outer parens).
     */
    private function extractRows(string $block): array
    {
        $rows     = [];
        $current  = '';
        $depth    = 0;
        $inString = false;
        $strChar  = '';
        $escaped  = false;
        $len      = strlen($block);

        for ($i = 0; $i < $len; $i++) {
            $ch = $block[$i];

            if ($escaped) {
                $current .= $ch;
                $escaped  = false;
                continue;
            }

            if ($ch === '\\' && $inString) {
                $current .= $ch;
                $escaped  = true;
                continue;
            }

            if (!$inString && ($ch === "'" || $ch === '"')) {
                $inString = true;
                $strChar  = $ch;
                $current .= $ch;
                continue;
            }

            if ($inString && $ch === $strChar) {
                if (isset($block[$i + 1]) && $block[$i + 1] === $strChar) {
                    $current .= $ch . $strChar;
                    $i++;
                    continue;
                }
                $inString = false;
                $current .= $ch;
                continue;
            }

            if ($inString) {
                $current .= $ch;
                continue;
            }

            if ($ch === '(') {
                $depth++;
                if ($depth === 1) {
                    $current = '';
                    continue;
                }
            }

            if ($ch === ')') {
                $depth--;
                if ($depth === 0) {
                    $rows[]  = $current;
                    $current = '';
                    continue;
                }
            }

            $current .= $ch;
        }

        return $rows;
    }

    /**
     * Split a row string by commas, respecting quoted strings.
     */
    private function splitValues(string $row): array
    {
        $values   = [];
        $current  = '';
        $inString = false;
        $strChar  = '';
        $escaped  = false;
        $len      = strlen($row);

        for ($i = 0; $i < $len; $i++) {
            $ch = $row[$i];

            if ($escaped) {
                $current .= $ch;
                $escaped  = false;
                continue;
            }

            if ($ch === '\\') {
                $escaped = true;
                if ($inString) $current .= $ch;
                continue;
            }

            if (!$inString && ($ch === "'" || $ch === '"')) {
                $inString = true;
                $strChar  = $ch;
                continue;
            }

            if ($inString && $ch === $strChar) {
                if (isset($row[$i + 1]) && $row[$i + 1] === $strChar) {
                    $current .= $strChar;
                    $i++;
                    continue;
                }
                $inString = false;
                continue;
            }

            if ($inString) {
                $current .= $ch;
                continue;
            }

            if ($ch === ',') {
                $values[] = $this->castValue($current);
                $current  = '';
                continue;
            }

            $current .= $ch;
        }

        $values[] = $this->castValue($current);

        return $values;
    }

    private function castValue(string $raw): ?string
    {
        $trimmed = trim($raw);
        if (strtoupper($trimmed) === 'NULL') return null;
        return $trimmed;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    private function clean(mixed $value): string
    {
        return trim(strip_tags((string)($value ?? '')));
    }
}
