<?php

namespace App\Services;

use App\Models\City;
use App\Models\Country;
use App\Models\State;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Parses a phpMyAdmin SQL dump from MasarX Pro and imports
 * userlevel=1 (customers) into the masarx-plus users table.
 *
 * Handles:
 *   - cdb_users              → name, email, password, phone, document, gender
 *   - cdb_senders_addresses  → address, zip_code, country/state/city (optional)
 *   - cdb_country / cdb_state / cdb_city  → location name resolution (optional)
 */
class MasarXProImporter
{
    private string $sql;
    private int    $orgId;

    public function __construct(string $sql, int $orgId)
    {
        $this->sql   = $sql;
        $this->orgId = $orgId;
    }

    /** Run the import. Returns ['imported'=>n, 'skipped'=>n, 'skipped_rows'=>[...], 'preview'=>[...]] */
    public function import(bool $dryRun = false): array
    {
        $users     = $this->parseTable('cdb_users');
        $addresses = $this->parseTable('cdb_senders_addresses');

        // ── Location reference tables (optional in the uploaded SQL) ───────────
        // Try both singular and plural table names used by different MasarX Pro versions.
        $oldCountries = $this->parseTable('cdb_country')   ?: $this->parseTable('cdb_countries');
        $oldStates    = $this->parseTable('cdb_state')     ?: $this->parseTable('cdb_states');
        $oldCities    = $this->parseTable('cdb_city')      ?: $this->parseTable('cdb_cities');

        // Build old_id → name maps (common column name variants)
        $oldCountryNames = $this->buildNameMap($oldCountries, ['country_name', 'name', 'title']);
        $oldStateNames   = $this->buildNameMap($oldStates,    ['state_name',   'name', 'title']);
        $oldCityNames    = $this->buildNameMap($oldCities,    ['city_name',    'name', 'title']);

        // Runtime caches to avoid repeated DB lookups for same names
        $countryCache = [];
        $stateCache   = [];
        $cityCache    = [];

        // Index addresses by user_id for O(1) lookup
        $addrByUser = [];
        foreach ($addresses as $addr) {
            $uid = $addr['user_id'] ?? null;
            if ($uid !== null && !isset($addrByUser[$uid])) {
                $addrByUser[$uid] = $addr;
            }
        }

        $imported    = 0;
        $skipped     = 0;
        $skippedRows = [];
        $preview     = [];

        foreach ($users as $row) {
            // Only customers (userlevel = 1)
            if ((int)($row['userlevel'] ?? 0) !== 1) {
                continue;
            }

            $email = strtolower(trim($row['email'] ?? ''));
            $fname = trim($row['fname'] ?? '');
            $lname = trim($row['lname'] ?? '');
            $name  = trim("$fname $lname");

            // Fallback to username if no first/last name
            if (empty($name)) {
                $name = trim($row['username'] ?? '');
            }
            if (empty($name)) {
                $skipped++;
                $skippedRows[] = "Sin nombre — email: {$email}";
                continue;
            }

            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $skipped++;
                $skippedRows[] = "Email inválido u omitido: '{$email}' ({$name})";
                continue;
            }

            if (User::where('email', $email)->exists()) {
                $skipped++;
                $skippedRows[] = "Email ya existe: {$email}";
                continue;
            }

            // Address from senders_addresses (join by old user id)
            $oldId = $row['id'] ?? null;
            $addr  = $oldId !== null ? ($addrByUser[$oldId] ?? []) : [];

            // ── Resolve country / state / city ─────────────────────────────────
            [$newCountryId, $countryName, $newStateId, $stateName, $newCityId, $cityName]
                = $this->resolveLocation(
                    $addr,
                    $oldCountryNames, $oldStateNames, $oldCityNames,
                    $countryCache, $stateCache, $cityCache
                );

            // Password: $2y$ hashes from PHP password_hash() are bcrypt
            // and 100% compatible with Laravel Hash::check() — use directly.
            $rawPwd   = $row['password'] ?? '';
            $password = (strlen($rawPwd) > 20 && str_starts_with($rawPwd, '$2'))
                ? $rawPwd                        // reuse existing bcrypt hash
                : Hash::make(Str::random(16));   // blank/invalid → new random

            $mapped = [
                'name'             => $name,
                'email'            => $email,
                'password'         => $password,
                'phone'            => $this->clean($row['phone'] ?? ''),
                'document_type'    => strtoupper($this->clean($row['document_type'] ?? '')),
                'document_id'      => $this->clean($row['document_number'] ?? ''),
                'gender'           => $this->normalizeGender($row['gender'] ?? ''),
                'is_active'        => ((int)($row['active'] ?? 1)) === 1,
                'address'          => $this->clean($addr['address'] ?? ''),
                'zip_code'         => $this->clean($addr['zip_code'] ?? ''),
                'country'          => $countryName,
                'country_id'       => $newCountryId,
                'state'            => $stateName,
                'state_id'         => $newStateId,
                'city'             => $cityName,
                'city_id'          => $newCityId,
                'organization_id'  => $this->orgId,
                'email_verified_at' => now(),
            ];

            $preview[] = [
                'name'    => $mapped['name'],
                'email'   => $mapped['email'],
                'phone'   => $mapped['phone'],
                'country' => $mapped['country'],
                'city'    => $mapped['city'],
            ];

            if (!$dryRun) {
                $user = User::create($mapped);
                $user->assignRole('customer');
            }

            $imported++;
        }

        return compact('imported', 'skipped', 'skippedRows', 'preview');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LOCATION RESOLUTION
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Build a map of [ old_id => name ] from a parsed table,
     * trying each candidate column name in order until one is found.
     */
    private function buildNameMap(array $rows, array $nameCandidates): array
    {
        $map = [];
        foreach ($rows as $row) {
            $id = $row['id'] ?? null;
            if ($id === null) continue;
            foreach ($nameCandidates as $col) {
                if (isset($row[$col]) && $row[$col] !== null && $row[$col] !== '') {
                    $map[$id] = $row[$col];
                    break;
                }
            }
        }
        return $map;
    }

    /**
     * Resolve country/state/city from an address row.
     * Returns [countryId, countryName, stateId, stateName, cityId, cityName].
     * Values default to null / '' when resolution fails.
     *
     * @param array<string,string|null> $addr
     * @param array<string,string>      $oldCountryNames
     * @param array<string,string>      $oldStateNames
     * @param array<string,string>      $oldCityNames
     * @param array<string,mixed>       &$countryCache  (mutable)
     * @param array<string,mixed>       &$stateCache    (mutable)
     * @param array<string,mixed>       &$cityCache     (mutable)
     */
    private function resolveLocation(
        array $addr,
        array $oldCountryNames, array $oldStateNames, array $oldCityNames,
        array &$countryCache, array &$stateCache, array &$cityCache
    ): array {
        $oldCid = $addr['country'] ?? null;
        $oldSid = $addr['state']   ?? null;
        $oldPid = $addr['city']    ?? null;

        $countryName = $oldCid ? ($oldCountryNames[$oldCid] ?? null) : null;
        $stateName   = $oldSid ? ($oldStateNames[$oldSid]   ?? null) : null;
        $cityName    = $oldPid ? ($oldCityNames[$oldPid]     ?? null) : null;

        // If no reference tables were uploaded, nothing to resolve
        if ($countryName === null && $stateName === null && $cityName === null) {
            return [null, '', null, '', null, ''];
        }

        // Look up Country in new system (cached)
        $newCountry = null;
        if ($countryName !== null) {
            if (!array_key_exists($countryName, $countryCache)) {
                $countryCache[$countryName] = Country::whereRaw('LOWER(name) = ?', [strtolower($countryName)])->first();
            }
            $newCountry = $countryCache[$countryName];
        }

        // Look up State (scoped to resolved country when possible, cached)
        $newState = null;
        if ($stateName !== null) {
            $cacheKey = ($newCountry?->id ?? 'any') . '|' . $stateName;
            if (!array_key_exists($cacheKey, $stateCache)) {
                $q = State::whereRaw('LOWER(name) = ?', [strtolower($stateName)]);
                if ($newCountry) {
                    $q->where('country_id', $newCountry->id);
                }
                $stateCache[$cacheKey] = $q->first();
            }
            $newState = $stateCache[$cacheKey];
        }

        // Look up City (scoped to resolved state when possible, cached)
        $newCity = null;
        if ($cityName !== null) {
            $cacheKey = ($newState?->id ?? 'any') . '|' . $cityName;
            if (!array_key_exists($cacheKey, $cityCache)) {
                $q = City::whereRaw('LOWER(name) = ?', [strtolower($cityName)]);
                if ($newState) {
                    $q->where('state_id', $newState->id);
                }
                $cityCache[$cacheKey] = $q->first();
            }
            $newCity = $cityCache[$cacheKey];
        }

        return [
            $newCountry?->id,
            $newCountry?->name ?? $countryName ?? '',
            $newState?->id,
            $newState?->name  ?? $stateName   ?? '',
            $newCity?->id,
            $newCity?->name   ?? $cityName    ?? '',
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SQL PARSER
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Extract all rows from an INSERT INTO `tableName` block as associative arrays.
     */
    private function parseTable(string $tableName): array
    {
        // Match INSERT INTO `tableName` (cols) VALUES (...), (...);
        $escaped = preg_quote($tableName, '/');
        $pattern = '/INSERT\s+INTO\s+[`"]?' . $escaped . '[`"]?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/i';

        if (!preg_match($pattern, $this->sql, $match)) {
            return [];
        }

        // Column names — strip backticks/quotes
        $columns = array_map(
            fn($c) => trim(trim(trim($c), '`"\'')),
            explode(',', $match[1])
        );

        // Extract individual row strings from the VALUES block
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
                // Handle MySQL '' escape inside strings
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
                    $current = ''; // start collecting row content
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
     * Returns array of PHP values (null for SQL NULL, string otherwise).
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
                // Keep backslash only inside strings
                if ($inString) $current .= $ch;
                continue;
            }

            if (!$inString && ($ch === "'" || $ch === '"')) {
                $inString = true;
                $strChar  = $ch;
                continue; // open quote — don't add to value
            }

            if ($inString && $ch === $strChar) {
                // MySQL '' escape
                if (isset($row[$i + 1]) && $row[$i + 1] === $strChar) {
                    $current .= $strChar;
                    $i++;
                    continue;
                }
                $inString = false;
                continue; // close quote — don't add to value
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

    private function normalizeGender(?string $value): string
    {
        $v = strtolower(trim((string)($value ?? '')));
        if ($v === 'male'   || $v === 'm' || $v === 'masculino') return 'Male';
        if ($v === 'female' || $v === 'f' || $v === 'femenino')  return 'Female';
        return '';
    }
}
