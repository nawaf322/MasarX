<?php

namespace App\Services;

use App\Models\Locker;
use Illuminate\Support\Str;

class LockerCodeService
{
    /**
     * Default settings used when no org-level config is found.
     */
    private const DEFAULTS = [
        'code_prefix'    => 'LCK',
        'code_format'    => 'random',   // 'random' | 'sequential'
        'code_length'    => 6,           // digits for sequential padding or chars for random suffix
    ];

    protected SettingsService $settings;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
    }

    /**
     * Get the effective locker settings for an org.
     */
    public function getSettings(int $orgId): array
    {
        $this->settings->forOrganization($orgId);
        $group = $this->settings->getGroup('lockers');

        return [
            'code_prefix' => $group['code_prefix'] ?? self::DEFAULTS['code_prefix'],
            'code_format' => $group['code_format'] ?? self::DEFAULTS['code_format'],
            'code_length' => (int) ($group['code_length'] ?? self::DEFAULTS['code_length']),
        ];
    }

    /**
     * Generate a unique locker code for the given organization.
     */
    public function generate(int $orgId): string
    {
        $cfg = $this->getSettings($orgId);

        $maxAttempts = 20;
        for ($i = 0; $i < $maxAttempts; $i++) {
            $code = $cfg['code_format'] === 'sequential'
                ? $this->nextSequential($orgId, $cfg)
                : $this->randomCode($cfg);

            // Ensure uniqueness per org
            if (! Locker::where('organization_id', $orgId)->where('code', $code)->exists()) {
                return $code;
            }
        }

        // Fallback: append timestamp to guarantee uniqueness
        return strtoupper($cfg['code_prefix']) . '-' . strtoupper(Str::random(8));
    }

    /**
     * Preview the NEXT code that would be generated (without persisting).
     */
    public function preview(int $orgId): string
    {
        $cfg = $this->getSettings($orgId);

        if ($cfg['code_format'] === 'sequential') {
            return $this->nextSequential($orgId, $cfg);
        }

        return strtoupper($cfg['code_prefix']) . '-' . strtoupper(Str::random($cfg['code_length']));
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function nextSequential(int $orgId, array $cfg): string
    {
        $prefix    = strtoupper($cfg['code_prefix']);
        $length    = max(1, (int) $cfg['code_length']);
        $pattern   = $prefix . '-%';

        // Find the highest numeric suffix among existing codes with this prefix
        $last = Locker::where('organization_id', $orgId)
            ->where('code', 'like', $pattern)
            ->get(['code'])
            ->map(fn($l) => (int) preg_replace('/[^0-9]/', '', $l->code))
            ->max() ?? 0;

        $next = $last + 1;

        return $prefix . '-' . str_pad((string) $next, $length, '0', STR_PAD_LEFT);
    }

    private function randomCode(array $cfg): string
    {
        $prefix = strtoupper($cfg['code_prefix']);
        $length = max(4, (int) $cfg['code_length']);

        // Alphanumeric: uppercase letters + digits, no ambiguous chars (0,O,I,L)
        $chars  = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $suffix = '';
        for ($i = 0; $i < $length; $i++) {
            $suffix .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return $prefix . '-' . $suffix;
    }
}
