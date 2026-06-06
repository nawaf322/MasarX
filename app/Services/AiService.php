<?php

namespace App\Services;

use App\Models\Shipment;
use App\Models\User;
use App\Enums\ShipmentStatus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AI Analysis Service for DEPRIXA PLUS.
 *
 * Provides actionable insights for logistics operations.
 * When an AI provider is configured (provider + api_key in the 'ai' settings group)
 * it calls the LLM to generate natural-language analysis.
 *
 * When no provider is configured it returns structured rule-based analysis
 * that is honest, deterministic, and operationally useful — NOT fake "AI-ish" text.
 *
 * Supported providers: 'openai' (GPT-4o), 'anthropic' (Claude 3.5 Sonnet)
 */
class AiService
{
    private SettingsService $settings;
    private int $orgId;

    private string $provider;
    private string $apiKey;
    private string $model;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
        $this->orgId    = $settings->getOrganizationId() ?? 0;

        $this->provider = $settings->get('ai', 'provider', '');
        $this->apiKey   = $this->decryptKey($settings->get('ai', 'api_key', ''));
        $this->model    = $settings->get('ai', 'model', '');
    }

    public function forOrganization(int $orgId): static
    {
        $this->orgId    = $orgId;
        $this->settings->forOrganization($orgId);
        $this->provider = $this->settings->get('ai', 'provider', '');
        $this->apiKey   = $this->decryptKey($this->settings->get('ai', 'api_key', ''));
        $this->model    = $this->settings->get('ai', 'model', '');
        return $this;
    }

    /** Decrypt key stored by saveSettings(). Falls back to raw value for backward compat. */
    private function decryptKey(string $raw): string
    {
        if (empty($raw)) return '';
        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($raw);
        } catch (\Throwable $e) {
            return $raw; // Legacy plain-text key
        }
    }

    public function isConfigured(): bool
    {
        return !empty($this->provider) && !empty($this->apiKey);
    }

    /**
     * Makes a minimal LLM call to verify the API key is valid.
     * Returns a short confirmation string on success, throws on failure.
     */
    public function testConnection(): string
    {
        $response = $this->callLlm('Reply with exactly: OK');
        return trim(strip_tags($response)) ?: 'Connected';
    }

    // ──────────────────────────────────────────────
    // Shipment Risk Analysis
    // ──────────────────────────────────────────────

    /**
     * Analyse a single shipment and return risk + recommendations.
     */
    public function analyzeShipment(Shipment $shipment): array
    {
        $facts = $this->buildShipmentFacts($shipment);

        if ($this->isConfigured()) {
            try {
                return $this->callLlmForShipment($facts);
            } catch (\Throwable $e) {
                Log::warning('AiService LLM call failed, falling back to rule-based', ['error' => $e->getMessage()]);
            }
        }

        return $this->ruleBasedShipmentAnalysis($facts);
    }

    // ──────────────────────────────────────────────
    // Operational Dashboard Summary
    // ──────────────────────────────────────────────

    /**
     * Returns an operational summary for the org's current state.
     * Used by the GA/Dispatch dashboard.
     */
    public function operationalSummary(): array
    {
        try {
            $facts = $this->buildOperationalFacts();
        } catch (\Throwable $e) {
            Log::warning('AiService: buildOperationalFacts failed', ['error' => $e->getMessage()]);
            $facts = ['active' => 0, 'atRisk' => 0, 'exceptions' => 0, 'unassigned' => 0, 'pendingPayment' => 0, 'drivers' => 0, 'deliveredToday' => 0];
        }

        if ($this->isConfigured()) {
            try {
                return $this->callLlmForOperations($facts);
            } catch (\Throwable $e) {
                Log::warning('AiService LLM call failed for operations, using rule-based', ['error' => $e->getMessage()]);
            }
        }

        return $this->ruleBasedOperationalSummary($facts);
    }

    // ──────────────────────────────────────────────
    // Data collectors
    // ──────────────────────────────────────────────

    private function buildShipmentFacts(Shipment $shipment): array
    {
        $status  = $shipment->getRawOriginal('status') ?? (string) $shipment->status;
        $history = $shipment->history()
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['status', 'location', 'description', 'created_at'])
            ->toArray();

        $estimatedDelivery = $shipment->estimated_delivery_date;
        $isLate = $estimatedDelivery
            && now()->gt(\Carbon\Carbon::parse($estimatedDelivery))
            && !in_array($status, [ShipmentStatus::DELIVERED->value, ShipmentStatus::CANCELLED->value]);

        $daysUntilDeadline = $estimatedDelivery
            ? (int) now()->diffInDays(\Carbon\Carbon::parse($estimatedDelivery), false)
            : null;

        $totalPaid  = $shipment->payments()->sum('amount');
        $balanceDue = max(0, (float) ($shipment->total ?? 0) - $totalPaid);

        return [
            'tracking_number'      => $shipment->tracking_number,
            'status'               => $status,
            'payment_status'       => $shipment->getRawOriginal('payment_status') ?? (string) ($shipment->payment_status ?? 'unknown'),
            'total'                => $shipment->total,
            'currency'             => $shipment->currency ?? 'USD',
            'balance_due'          => $balanceDue,
            'sender_country'       => $shipment->sender_details['country'] ?? 'N/A',
            'receiver_country'     => $shipment->receiver_details['country'] ?? 'N/A',
            'receiver_city'        => $shipment->receiver_details['city'] ?? 'N/A',
            'service_type'         => $shipment->service_type ?? 'standard',
            'estimated_delivery'   => $estimatedDelivery,
            'is_late'              => $isLate,
            'days_until_deadline'  => $daysUntilDeadline,
            'history_count'        => count($history),
            'latest_event'         => $history[0] ?? null,
            'has_exceptions'       => collect($history)->contains(fn($h) => $h['status'] === ShipmentStatus::EXCEPTION->value),
            'created_days_ago'     => (int) $shipment->created_at->diffInDays(now()),
            'weight_kg'            => $shipment->package_details['weight'] ?? null,
        ];
    }

    private function buildOperationalFacts(): array
    {
        $orgId = $this->orgId;

        $active = Shipment::where('organization_id', $orgId)
            ->whereNotIn('status', [ShipmentStatus::DELIVERED->value, ShipmentStatus::CANCELLED->value])
            ->count();

        $atRisk = Shipment::where('organization_id', $orgId)
            ->whereNotIn('status', [ShipmentStatus::DELIVERED->value, ShipmentStatus::CANCELLED->value])
            ->whereNotNull('estimated_delivery_date')
            ->where('estimated_delivery_date', '<', now())
            ->count();

        $exceptions = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::EXCEPTION->value)
            ->count();

        $unassigned = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::PROCESSED->value)
            ->whereNull('manifest_id')
            ->count();

        $pendingPayment = Shipment::where('organization_id', $orgId)
            ->where('payment_status', 'unpaid')
            ->count();

        $drivers = User::role('Driver')
            ->where('organization_id', $orgId)
            ->count();

        $deliveredToday = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::DELIVERED->value)
            ->whereDate('updated_at', today())
            ->count();

        return compact('active', 'atRisk', 'exceptions', 'unassigned', 'pendingPayment', 'drivers', 'deliveredToday');
    }

    // ──────────────────────────────────────────────
    // Rule-based analysis (no external API needed)
    // ──────────────────────────────────────────────

    private function ruleBasedShipmentAnalysis(array $facts): array
    {
        $risks = [];
        $actions = [];
        $riskLevel = 'low';

        // Late delivery
        if ($facts['is_late']) {
            $risks[] = 'Shipment has passed its estimated delivery date and is not yet delivered.';
            $actions[] = 'Contact the carrier to request a status update and updated ETA.';
            $riskLevel = 'high';
        } elseif ($facts['days_until_deadline'] !== null && $facts['days_until_deadline'] <= 1 && $facts['days_until_deadline'] >= 0) {
            $risks[] = 'Delivery deadline is within 24 hours.';
            $actions[] = 'Verify the shipment is currently out for delivery.';
            $riskLevel = 'medium';
        }

        // Exception status
        if ($facts['has_exceptions']) {
            $risks[] = 'Shipment has experienced at least one exception event in its history.';
            $actions[] = 'Review exception details and coordinate resolution with the carrier or recipient.';
            $riskLevel = max($riskLevel, 'high') === 'high' ? 'high' : 'medium';
        }

        // Pending payment
        if ($facts['balance_due'] > 0) {
            $risks[] = sprintf('Outstanding balance of %s %s has not been collected.', number_format($facts['balance_due'], 2), $facts['currency']);
            $actions[] = 'Send a payment reminder to the recipient before releasing the shipment.';
            if ($riskLevel === 'low') $riskLevel = 'medium';
        }

        // Stale (no movement)
        if ($facts['created_days_ago'] > 5 && !in_array($facts['status'], [ShipmentStatus::DELIVERED->value, ShipmentStatus::CANCELLED->value, ShipmentStatus::IN_TRANSIT->value])) {
            $risks[] = sprintf('Shipment created %d days ago but has not reached in-transit status.', $facts['created_days_ago']);
            $actions[] = 'Investigate why the shipment has not been dispatched yet.';
            if ($riskLevel === 'low') $riskLevel = 'medium';
        }

        // Positive signals
        $signals = [];
        if ($facts['days_until_deadline'] !== null && $facts['days_until_deadline'] > 3) {
            $signals[] = sprintf('%d days remaining before deadline — on track.', $facts['days_until_deadline']);
        }
        if ($facts['balance_due'] == 0 && $facts['total'] > 0) {
            $signals[] = 'Payment collected in full.';
        }

        if (empty($risks)) {
            $risks[] = 'No significant risks identified at this time.';
        }
        if (empty($actions)) {
            $actions[] = 'Continue monitoring. No immediate action required.';
        }

        return [
            'risk_level'    => $riskLevel,
            'risks'         => $risks,
            'actions'       => $actions,
            'positive'      => $signals,
            'source'        => 'rule_based',
            'generated_at'  => now()->toIso8601String(),
        ];
    }

    private function ruleBasedOperationalSummary(array $f): array
    {
        $alerts = [];
        $recommendations = [];
        $overallStatus = 'normal';

        if ($f['atRisk'] > 0) {
            $pct = $f['active'] > 0 ? round($f['atRisk'] / $f['active'] * 100) : 0;
            $alerts[] = "{$f['atRisk']} shipment(s) ({$pct}%) have passed their estimated delivery date.";
            $overallStatus = $f['atRisk'] >= 5 ? 'critical' : 'warning';
        }

        if ($f['exceptions'] > 0) {
            $alerts[] = "{$f['exceptions']} shipment(s) are in exception status and require attention.";
            if ($overallStatus === 'normal') $overallStatus = 'warning';
        }

        if ($f['unassigned'] > 0) {
            $alerts[] = "{$f['unassigned']} shipment(s) are processed but not yet assigned to a manifest/driver.";
            $recommendations[] = 'Run dispatch auto-optimize to distribute unassigned shipments across available drivers.';
        }

        if ($f['drivers'] === 0 && $f['unassigned'] > 0) {
            $recommendations[] = 'No drivers registered. Add driver accounts in Settings → Users before running auto-optimize.';
        }

        if ($f['pendingPayment'] > 0) {
            $recommendations[] = "{$f['pendingPayment']} shipment(s) have unpaid balances. Consider sending payment reminders.";
        }

        if ($f['deliveredToday'] > 0) {
            $summary = "{$f['deliveredToday']} delivery(ies) completed today.";
        } else {
            $summary = 'No deliveries completed today yet.';
        }

        return [
            'overall_status'  => $overallStatus,
            'summary'         => $summary,
            'alerts'          => $alerts,
            'recommendations' => $recommendations,
            'stats'           => $f,
            'source'          => 'rule_based',
            'generated_at'    => now()->toIso8601String(),
        ];
    }

    // ──────────────────────────────────────────────
    // LLM Calls (when API key is configured)
    // ──────────────────────────────────────────────

    private function callLlmForShipment(array $facts): array
    {
        $prompt = "You are a logistics operations analyst. Given this shipment data:\n"
            . json_encode($facts, JSON_PRETTY_PRINT)
            . "\n\nProvide a JSON response with keys: risk_level (low|medium|high), risks (array of strings), actions (array of actionable strings), positive (array of good signals). Be concise and specific. Respond only with valid JSON.";

        $response = $this->callLlm($prompt);
        $parsed   = json_decode($response, true);

        if (!is_array($parsed) || !isset($parsed['risk_level'])) {
            throw new \RuntimeException('LLM returned unparseable response');
        }

        $parsed['source']       = 'llm:' . $this->provider;
        $parsed['generated_at'] = now()->toIso8601String();
        return $parsed;
    }

    private function callLlmForOperations(array $facts): array
    {
        $prompt = "You are a logistics operations manager. Current operational snapshot:\n"
            . json_encode($facts, JSON_PRETTY_PRINT)
            . "\n\nProvide a JSON response with keys: overall_status (normal|warning|critical), summary (1 sentence), alerts (array), recommendations (array of actionable items). Be direct and useful. Respond only with valid JSON.";

        $response = $this->callLlm($prompt);
        $parsed   = json_decode($response, true);

        if (!is_array($parsed) || !isset($parsed['overall_status'])) {
            throw new \RuntimeException('LLM returned unparseable response');
        }

        $parsed['stats']        = $facts;
        $parsed['source']       = 'llm:' . $this->provider;
        $parsed['generated_at'] = now()->toIso8601String();
        return $parsed;
    }

    private function callLlm(string $prompt): string
    {
        if ($this->provider === 'anthropic') {
            $model = $this->model ?: 'claude-haiku-4-5-20251001';
            $response = Http::withHeaders([
                'x-api-key'         => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'      => $model,
                'max_tokens' => 512,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

            if (!$response->successful()) {
                throw new \RuntimeException('Anthropic API error: ' . $response->status());
            }

            return $response->json('content.0.text', '{}');
        }

        // Default: OpenAI-compatible
        $model = $this->model ?: 'gpt-4o-mini';
        $response = Http::withToken($this->apiKey)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'       => $model,
                'messages'    => [['role' => 'user', 'content' => $prompt]],
                'max_tokens'  => 512,
                'temperature' => 0.2,
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('OpenAI API error: ' . $response->status());
        }

        return $response->json('choices.0.message.content', '{}');
    }
}
