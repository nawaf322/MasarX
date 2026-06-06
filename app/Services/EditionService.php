<?php
namespace App\Services;

/**
 * EditionService — single source of truth for feature availability.
 *
 * Usage:
 *   app(EditionService::class)->has('commissions')      // bool
 *   edition()->has('commissions')                       // via helper
 *   Edition::check('commissions')                       // static facade
 *
 * The edition is controlled by APP_EDITION env var: 'premium' | 'envato'.
 * Premium is the default. Any unknown edition falls back to premium.
 */
class EditionService
{
    private string $edition;
    private array  $features;

    public function __construct()
    {
        $this->edition  = config('edition.current', 'premium');
        $this->features = config('edition.features', []);
    }

    public function edition(): string
    {
        return $this->edition;
    }

    public function isPremium(): bool
    {
        return in_array($this->edition, ['premium', 'Plus'], true);
    }

    public function isEnvato(): bool
    {
        return $this->edition === 'envato';
    }

    public function isPlus(): bool
    {
        return $this->edition === 'Plus';
    }

    /**
     * Check if a feature is available in the current edition.
     */
    public function has(string $feature): bool
    {
        if (!isset($this->features[$feature])) {
            return false;
        }

        return (bool) ($this->features[$feature][$this->edition] ?? false);
    }

    /**
     * Assert a feature is available; abort 403 if not.
     */
    public function require(string $feature): void
    {
        abort_unless($this->has($feature), 403, "Feature '{$feature}' is not available in the {$this->edition} edition.");
    }

    /**
     * Return features available in the current edition.
     */
    public function available(): array
    {
        return array_keys(array_filter(
            $this->features,
            fn($caps) => (bool) ($caps[$this->edition] ?? false)
        ));
    }
}
