<?php

namespace App\Services;

use App\Models\Shipment;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Parses phpMyAdmin SQL dumps from MasarX Pro and imports shipments.
 *
 * Required:  cdb_add_order
 * Optional:  cdb_add_order_item  → package dimensions / content
 *            cdb_users           → sender/receiver name, phone, email
 *            cdb_senders_addresses → address, zip, location IDs
 *            cdb_country / cdb_state / cdb_city → location name resolution
 *
 * Workflow:  Import customers first via /customers → MasarX Pro tab,
 *            then run this importer so new-system users can be matched by email.
 */
class MasarXProShipmentImporter
{
    private string $sql;
    private int    $orgId;
    private int    $createdBy;

    // MasarX Pro status_courier → new system status
    private const STATUS_MAP = [
        1 => 'pending',
        2 => 'processed',
        3 => 'in_transit',
        4 => 'delivered',
        5 => 'cancelled',
        6 => 'on_hold',
        7 => 'exception',
    ];

    // MasarX Pro status_invoice → new system payment_status
    private const PAYMENT_MAP = [
        1 => 'paid',
        2 => 'unpaid',
        3 => 'partial',
    ];

    public function __construct(string $sql, int $orgId, int $createdBy)
    {
        $this->sql       = $sql;
        $this->orgId     = $orgId;
        $this->createdBy = $createdBy;
    }

    /** Run the import. Returns ['imported'=>n, 'skipped'=>n, 'skipped_rows'=>[...], 'preview'=>[...]] */
    public function import(bool $dryRun = false): array
    {
        // ── Parse all uploaded tables ─────────────────────────────────────────
        $orders    = $this->parseTable('cdb_add_order');
        $items     = $this->parseTable('cdb_add_order_item');
        $oldUsers  = $this->parseTable('cdb_users');
        $addresses = $this->parseTable('cdb_senders_addresses');

        $oldCountries = $this->parseTable('cdb_country')   ?: $this->parseTable('cdb_countries');
        $oldStates    = $this->parseTable('cdb_state')     ?: $this->parseTable('cdb_states');
        $oldCities    = $this->parseTable('cdb_city')      ?: $this->parseTable('cdb_cities');

        // ── Auto-import customers from cdb_users if present ─────────────────
        $hasCdbUsers = !empty($oldUsers);

        if ($hasCdbUsers) {
            // Auto-import any new customers from cdb_users (skip duplicates by email)
            foreach ($oldUsers as $u) {
                $uEmail = strtolower(trim($u['email'] ?? ''));
                if (empty($uEmail) || !filter_var($uEmail, FILTER_VALIDATE_EMAIL)) {
                    continue;
                }
                // Only import customer-level users (userlevel = 1)
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
                    'phone'             => $this->clean($u['phone'] ?? ''),
                    'is_active'         => ((int)($u['active'] ?? 1)) === 1,
                    'organization_id'   => $this->orgId,
                    'email_verified_at' => now(),
                ]);
                $newUser->assignRole('customer');
            }
        } else {
            // No cdb_users in SQL — check if customers exist in the DB for this org
            $existingCustomerCount = User::where('organization_id', $this->orgId)
                ->whereHas('roles', fn($q) => $q->where('name', 'customer'))
                ->count();
            if ($existingCustomerCount === 0) {
                throw new \RuntimeException(
                    'No customers found in the system and cdb_users.sql was not included. '
                    . 'Please import customers first or include cdb_users.sql with your shipment files.'
                );
            }
        }

        // ── Build lookup maps ─────────────────────────────────────────────────

        // Items indexed by order_id
        $itemsByOrder = [];
        foreach ($items as $item) {
            $oid = $item['order_id'] ?? null;
            if ($oid !== null) {
                $itemsByOrder[$oid][] = $item;
            }
        }

        // Old users: id → {name, phone, email}
        // If cdb_users was provided, build from SQL data; otherwise build from DB
        $oldUserMap = [];
        if ($hasCdbUsers) {
            foreach ($oldUsers as $u) {
                $id = $u['id'] ?? null;
                if ($id === null) continue;
                $fname = trim($u['fname'] ?? '');
                $lname = trim($u['lname'] ?? '');
                $name  = trim("$fname $lname") ?: trim($u['username'] ?? '');
                $oldUserMap[$id] = [
                    'name'  => $name,
                    'phone' => $this->clean($u['phone'] ?? ''),
                    'email' => strtolower(trim($u['email'] ?? '')),
                ];
            }
        }

        // Old addresses: id_addresses → row
        $addrMap = [];
        foreach ($addresses as $addr) {
            $id = $addr['id_addresses'] ?? $addr['id'] ?? null;
            if ($id !== null) {
                $addrMap[$id] = $addr;
            }
        }

        // Location name maps: old_id → name
        $oldCountryNames = $this->buildNameMap($oldCountries, ['country_name', 'name', 'title']);
        $oldStateNames   = $this->buildNameMap($oldStates,    ['state_name',   'name', 'title']);
        $oldCityNames    = $this->buildNameMap($oldCities,    ['city_name',    'name', 'title']);

        // When no cdb_users SQL was provided, build oldUserMap from DB customers
        // so that resolveParty can still function using DB-based email lookups
        if (!$hasCdbUsers) {
            // We don't have old IDs, so oldUserMap stays empty.
            // resolveParty will fall through to Step 2 (DB lookup) — but it needs
            // an email first. We'll handle this in resolveParty with a DB fallback.
        }

        // Runtime caches
        $newUserCache  = []; // email → User|null
        $countryCache  = [];
        $stateCache    = [];
        $cityCache     = [];

        $imported    = 0;
        $skipped     = 0;
        $skippedRows = [];
        $preview     = [];

        foreach ($orders as $order) {
            // Skip deleted
            if ((int)($order['is_deleted'] ?? 0) === 1) {
                continue;
            }

            // Build tracking number
            $prefix    = trim($order['order_prefix'] ?? '');
            $orderNo   = trim($order['order_no'] ?? '');
            if (empty($orderNo)) {
                $skipped++;
                $skippedRows[] = "Order #{$order['order_id']}: sin número de orden";
                continue;
            }
            $trackingNumber = $prefix ? "{$prefix}-{$orderNo}" : $orderNo;

            // Deduplicate by tracking number
            if (Shipment::where('tracking_number', $trackingNumber)->exists()) {
                $skipped++;
                $skippedRows[] = "Tracking ya existe: {$trackingNumber}";
                continue;
            }

            // ── Resolve parties ───────────────────────────────────────────────
            $senderDetails = $this->resolveParty(
                $order['sender_id']          ?? null,
                $order['sender_address_id']  ?? null,
                $oldUserMap, $addrMap,
                $oldCountryNames, $oldStateNames, $oldCityNames,
                $newUserCache, $countryCache, $stateCache, $cityCache
            );

            $receiverDetails = $this->resolveParty(
                $order['receiver_id']         ?? null,
                $order['receiver_address_id'] ?? null,
                $oldUserMap, $addrMap,
                $oldCountryNames, $oldStateNames, $oldCityNames,
                $newUserCache, $countryCache, $stateCache, $cityCache
            );

            // ── Package details ───────────────────────────────────────────────
            $orderItems     = $itemsByOrder[$order['order_id']] ?? [];
            $packageDetails = $this->buildPackageDetails($order, $orderItems);

            // ── Status mapping ────────────────────────────────────────────────
            $statusInt    = (int)($order['status_courier'] ?? 0);
            $status       = self::STATUS_MAP[$statusInt] ?? 'pending';

            $paymentInt   = (int)($order['status_invoice'] ?? 0);
            $paymentStatus = self::PAYMENT_MAP[$paymentInt] ?? 'unpaid';

            $deliveredAt = ($status === 'delivered')
                ? ($order['payment_date'] ?? null)
                : null;

            $mapped = [
                'uuid'                    => Str::uuid(),
                'tracking_number'         => $trackingNumber,
                'organization_id'         => $this->orgId,
                'created_by'              => $this->createdBy,
                'sender_details'          => $senderDetails,
                'receiver_details'        => $receiverDetails,
                'package_details'         => $packageDetails,
                'status'                  => $status,
                'payment_status'          => $paymentStatus,
                'service_type'            => 'economy',
                'subtotal'                => (float)($order['sub_total']           ?? 0),
                'tax'                     => (float)($order['total_tax']           ?? 0),
                'discount'                => (float)($order['total_tax_discount']  ?? 0),
                'total'                   => (float)($order['total_order']         ?? 0),
                'currency'                => 'USD',
                'ship_date'               => $order['order_datetime']              ?? now(),
                'estimated_delivery_date' => $order['due_date']                    ?? null,
                'delivered_at'            => $deliveredAt,
            ];

            $preview[] = [
                'tracking'  => $trackingNumber,
                'sender'    => $senderDetails['name'] ?? '',
                'receiver'  => $receiverDetails['name'] ?? '',
                'total'     => $mapped['total'],
                'status'    => $status,
            ];

            if (!$dryRun) {
                $shipment = Shipment::create($mapped);

                // Create ShipmentPackage rows from items
                foreach ($orderItems as $item) {
                    $len = (float)($item['order_item_length'] ?? 0);
                    $wid = (float)($item['order_item_width']  ?? 0);
                    $hgt = (float)($item['order_item_height'] ?? 0);

                    $shipment->packages()->create([
                        'organization_id'     => $this->orgId,
                        'weight'              => (float)($item['order_item_weight']   ?? 0),
                        'pieces'              => max(1, (int)($item['order_item_quantity'] ?? 1)),
                        'declared_value'      => (float)($item['order_item_declared_value'] ?? 0),
                        'length'              => $len > 0 ? $len : null,
                        'width'               => $wid > 0 ? $wid : null,
                        'height'              => $hgt > 0 ? $hgt : null,
                        'content_description' => $this->clean($item['order_item_description'] ?? ''),
                        'currency'            => 'USD',
                    ]);
                }

                // If no items uploaded, create one package from order totals
                if (empty($orderItems)) {
                    $shipment->packages()->create([
                        'organization_id'     => $this->orgId,
                        'weight'              => (float)($order['total_weight'] ?? 0),
                        'pieces'              => 1,
                        'declared_value'      => (float)($order['declared_value'] ?? 0),
                        'content_description' => $this->clean($order['notes'] ?? ''),
                        'currency'            => 'USD',
                    ]);
                }
            }

            $imported++;
        }

        return compact('imported', 'skipped', 'skippedRows', 'preview');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PARTY RESOLUTION
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Resolve sender or receiver details from old system user ID and address ID.
     *
     * Strategy:
     *   1. Name/phone/email from cdb_users by old user ID
     *   2. Look up that email in the new users table → get full address
     *   3. Override address/location from cdb_senders_addresses (more accurate)
     */
    private function resolveParty(
        ?string $userId,
        ?string $addrId,
        array   $oldUserMap,
        array   $addrMap,
        array   $oldCountryNames,
        array   $oldStateNames,
        array   $oldCityNames,
        array   &$newUserCache,
        array   &$countryCache,
        array   &$stateCache,
        array   &$cityCache
    ): array {
        $d = [
            'name' => '', 'phone' => '', 'email' => '', 'company' => '',
            'address' => '', 'city' => '', 'state' => '', 'country' => '',
            'zip_code' => '', 'country_code' => '',
        ];

        // Step 1: From old cdb_users (if cdb_users was in the SQL)
        if ($userId !== null && isset($oldUserMap[$userId])) {
            $old = $oldUserMap[$userId];
            $d['name']  = $old['name']  ?? '';
            $d['phone'] = $old['phone'] ?? '';
            $d['email'] = $old['email'] ?? '';
        }

        // Step 2: Enrich from new system user if email found
        $email = $d['email'];
        if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            if (!array_key_exists($email, $newUserCache)) {
                $newUserCache[$email] = User::where('email', $email)->first();
            }
            $newUser = $newUserCache[$email];
            if ($newUser) {
                $d['name']    = $newUser->name    ?: $d['name'];
                $d['phone']   = $newUser->phone   ?: $d['phone'];
                $d['address'] = $newUser->address ?: '';
                $d['city']    = $newUser->city    ?: '';
                $d['country'] = $newUser->country ?: '';
                $d['zip_code'] = $newUser->zip_code ?: '';
            }
        }

        // Step 2b: If no cdb_users data and no email resolved, try to find
        // a matching DB customer by old user ID (in case IDs happen to match)
        // or return empty details gracefully
        if (empty($oldUserMap) && empty($d['name']) && $userId !== null) {
            $cacheKey = '__db_user_' . $userId;
            if (!array_key_exists($cacheKey, $newUserCache)) {
                $newUserCache[$cacheKey] = User::where('organization_id', $this->orgId)
                    ->where('id', (int)$userId)
                    ->first();
            }
            $dbUser = $newUserCache[$cacheKey];
            if ($dbUser) {
                $d['name']     = $dbUser->name    ?: '';
                $d['phone']    = $dbUser->phone   ?: '';
                $d['email']    = $dbUser->email   ?: '';
                $d['address']  = $dbUser->address ?: '';
                $d['city']     = $dbUser->city    ?: '';
                $d['country']  = $dbUser->country ?: '';
                $d['zip_code'] = $dbUser->zip_code ?: '';
            }
        }

        // Step 3: Override/supplement from cdb_senders_addresses
        if ($addrId !== null && isset($addrMap[$addrId])) {
            $addr = $addrMap[$addrId];

            $rawAddr = $this->clean($addr['address'] ?? '');
            $rawZip  = $this->clean($addr['zip_code'] ?? '');
            if ($rawAddr) $d['address']  = $rawAddr;
            if ($rawZip)  $d['zip_code'] = $rawZip;

            // Resolve location names from optional reference tables
            $oldCid = $addr['country'] ?? null;
            $oldSid = $addr['state']   ?? null;
            $oldPid = $addr['city']    ?? null;

            $countryName = $oldCid ? ($oldCountryNames[$oldCid] ?? null) : null;
            $stateName   = $oldSid ? ($oldStateNames[$oldSid]   ?? null) : null;
            $cityName    = $oldPid ? ($oldCityNames[$oldPid]     ?? null) : null;

            if ($countryName !== null) $d['country'] = $countryName;
            if ($stateName   !== null) $d['state']   = $stateName;
            if ($cityName    !== null) $d['city']    = $cityName;
        }

        return $d;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PACKAGE DETAILS
    // ──────────────────────────────────────────────────────────────────────────

    private function buildPackageDetails(array $order, array $items): array
    {
        if (empty($items)) {
            return [
                'weight'              => (float)($order['total_weight'] ?? 0),
                'pieces'              => 1,
                'content_description' => $this->clean($order['notes'] ?? ''),
                'declared_value'      => (float)($order['declared_value'] ?? 0),
            ];
        }

        $descs  = array_values(array_filter(
            array_map(fn($i) => $this->clean($i['order_item_description'] ?? ''), $items)
        ));
        $weight = array_sum(array_map(fn($i) => (float)($i['order_item_weight'] ?? 0), $items));
        $pieces = (int) array_sum(array_map(fn($i) => max(1, (float)($i['order_item_quantity'] ?? 1)), $items));

        return [
            'weight'              => $weight ?: (float)($order['total_weight'] ?? 0),
            'pieces'              => $pieces  ?: 1,
            'content_description' => implode(', ', $descs) ?: $this->clean($order['notes'] ?? ''),
            'declared_value'      => (float)($order['declared_value'] ?? 0),
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    private function buildNameMap(array $rows, array $candidates): array
    {
        $map = [];
        foreach ($rows as $row) {
            $id = $row['id'] ?? null;
            if ($id === null) continue;
            foreach ($candidates as $col) {
                if (!empty($row[$col])) {
                    $map[$id] = $row[$col];
                    break;
                }
            }
        }
        return $map;
    }

    private function clean(mixed $value): string
    {
        return trim(strip_tags((string)($value ?? '')));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SQL PARSER  (same state-machine as MasarXProImporter)
    // ──────────────────────────────────────────────────────────────────────────

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

        $rows = [];
        foreach ($this->extractRows($match[2]) as $rowStr) {
            $values = $this->splitValues($rowStr);
            if (count($values) === count($columns)) {
                $rows[] = array_combine($columns, $values);
            }
        }

        return $rows;
    }

    private function extractRows(string $block): array
    {
        $rows = []; $current = ''; $depth = 0;
        $inString = false; $strChar = ''; $escaped = false;
        $len = strlen($block);

        for ($i = 0; $i < $len; $i++) {
            $ch = $block[$i];
            if ($escaped) { $current .= $ch; $escaped = false; continue; }
            if ($ch === '\\' && $inString) { $current .= $ch; $escaped = true; continue; }
            if (!$inString && ($ch === "'" || $ch === '"')) { $inString = true; $strChar = $ch; $current .= $ch; continue; }
            if ($inString && $ch === $strChar) {
                if (isset($block[$i+1]) && $block[$i+1] === $strChar) { $current .= $ch . $strChar; $i++; continue; }
                $inString = false; $current .= $ch; continue;
            }
            if ($inString) { $current .= $ch; continue; }
            if ($ch === '(') { $depth++; if ($depth === 1) { $current = ''; continue; } }
            if ($ch === ')') { $depth--; if ($depth === 0) { $rows[] = $current; $current = ''; continue; } }
            $current .= $ch;
        }
        return $rows;
    }

    private function splitValues(string $row): array
    {
        $values = []; $current = '';
        $inString = false; $strChar = ''; $escaped = false;
        $len = strlen($row);

        for ($i = 0; $i < $len; $i++) {
            $ch = $row[$i];
            if ($escaped) { $current .= $ch; $escaped = false; continue; }
            if ($ch === '\\') { $escaped = true; if ($inString) $current .= $ch; continue; }
            if (!$inString && ($ch === "'" || $ch === '"')) { $inString = true; $strChar = $ch; continue; }
            if ($inString && $ch === $strChar) {
                if (isset($row[$i+1]) && $row[$i+1] === $strChar) { $current .= $strChar; $i++; continue; }
                $inString = false; continue;
            }
            if ($inString) { $current .= $ch; continue; }
            if ($ch === ',') { $values[] = $this->castValue($current); $current = ''; continue; }
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
}
