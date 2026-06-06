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

namespace App\Services\GeneticAlgorithm;

use App\Models\GaRunLog;
use App\Models\Shipment;
use App\Models\CarrierAccount;
use App\Services\GeocodingService;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Auth;

/**
 * Main orchestrator for all Genetic Algorithm operations.
 * Delegates to specialised GA classes and logs every run to ga_run_logs.
 */
class GeneticAlgorithmService
{
    private GeneticAlgorithmConfig $config;
    private GeocodingService       $geocoding;
    private int                    $orgId;

    public function __construct(SettingsService $settings, GeocodingService $geocoding)
    {
        $this->orgId     = Auth::user()->organization_id;
        $this->config    = (new GeneticAlgorithmConfig($settings))->forOrganization($this->orgId);
        $this->geocoding = $geocoding->forOrganization($this->orgId);
    }

    public function forOrganization(int $orgId): static
    {
        $this->orgId = $orgId;
        $this->config->forOrganization($orgId);
        $this->geocoding = $this->geocoding->forOrganization($orgId);
        return $this;
    }

    // ──────────────────────────────────────────────
    // Route Optimization
    // ──────────────────────────────────────────────

    /**
     * Optimise delivery order for a list of shipment IDs.
     *
     * @param  int[] $shipmentIds
     * @return array  GA result + input summary
     */
    public function optimizeRoutes(array $shipmentIds): array
    {
        $cfg       = $this->config->routeOptimizerConfig();
        $startTime = microtime(true);

        $shipments = Shipment::where('organization_id', $this->orgId)
            ->whereIn('id', $shipmentIds)
            ->get(['id', 'tracking_number', 'receiver_details']);

        $stops = [];
        foreach ($shipments as $s) {
            $details = $s->receiver_details;
            if (is_string($details)) $details = json_decode($details, true);

            $address = GeocodingService::buildAddressFromDetails($details ?? []);
            if (!$address) continue;

            $coords = $this->geocoding->geocode($address);
            if (!$coords) continue;

            $stops[] = [
                'id'    => $s->id,
                'label' => $s->tracking_number,
                'lat'   => (float) $coords['lat'],
                'lng'   => (float) $coords['lng'],
            ];
        }

        if (count($stops) < 2) {
            return ['error' => 'insufficient_geocodable_stops', 'stops_found' => count($stops)];
        }

        $ga     = new RouteOptimizerGA($cfg);
        $result = $ga->solve($stops);

        $elapsed = (int) ((microtime(true) - $startTime) * 1000);

        GaRunLog::create([
            'organization_id' => $this->orgId,
            'type'            => 'route_optimizer',
            'input_summary'   => ['shipment_count' => count($stops)],
            'output_summary'  => [
                'distance_km'     => $result['distance_km'],
                'improvement_pct' => $result['improvement_pct'],
            ],
            'fitness_score'   => $result['fitness'],
            'generation_count' => $result['generations'],
            'execution_time_ms' => $elapsed,
        ]);

        return $result;
    }

    // ──────────────────────────────────────────────
    // Carrier Selection
    // ──────────────────────────────────────────────

    /**
     * Recommend the best carrier for a shipment.
     *
     * @param  array $shipmentReqs  ['weight_kg', 'declared_value', 'urgency_days', 'distance_km']
     * @return array
     */
    public function recommendCarrier(array $shipmentReqs): array
    {
        $cfg       = $this->config->carrierSelectorConfig();
        $startTime = microtime(true);

        $candidates = $this->buildCarrierCandidates($shipmentReqs);

        if (empty($candidates)) {
            return ['error' => 'no_carrier_candidates'];
        }

        $ga     = new CarrierSelectorGA($cfg);
        $best   = $ga->selectBest($shipmentReqs, $candidates);
        $ranked = $ga->rankAll($candidates);

        $elapsed = (int) ((microtime(true) - $startTime) * 1000);

        GaRunLog::create([
            'organization_id'  => $this->orgId,
            'type'             => 'carrier_selector',
            'input_summary'    => $shipmentReqs,
            'output_summary'   => ['best_carrier' => $best['code'] ?? null, 'score' => $best['score'] ?? null],
            'fitness_score'    => $best['score'] ?? null,
            'generation_count' => $cfg['generations'],
            'execution_time_ms' => $elapsed,
        ]);

        return [
            'best'   => $best,
            'ranked' => $ranked,
        ];
    }

    // ──────────────────────────────────────────────
    // Load Balancing
    // ──────────────────────────────────────────────

    /**
     * Balance unassigned shipments across available drivers/branches.
     */
    public function balanceWorkload(array $agentIds = []): array
    {
        $cfg       = $this->config->loadBalancerConfig();
        $startTime = microtime(true);

        $shipments = Shipment::where('organization_id', $this->orgId)
            ->where('status', \App\Enums\ShipmentStatus::PROCESSED->value)
            ->whereNull('manifest_id')
            ->get(['id', 'total'])
            ->map(fn($s) => ['id' => $s->id, 'weight' => (float) ($s->total ?? 1)])
            ->toArray();

        $agents = \App\Models\User::role('Driver')
            ->where('organization_id', $this->orgId)
            ->when(!empty($agentIds), fn($q) => $q->whereIn('id', $agentIds))
            ->get(['id', 'name'])
            ->map(fn($u) => ['id' => $u->id, 'name' => $u->name, 'current_load' => 0])
            ->toArray();

        if (empty($shipments) || empty($agents)) {
            return ['error' => 'no_data', 'shipments' => count($shipments), 'agents' => count($agents)];
        }

        $ga     = new LoadBalancerGA($cfg);
        $result = $ga->balance($shipments, $agents);

        $elapsed = (int) ((microtime(true) - $startTime) * 1000);

        GaRunLog::create([
            'organization_id'  => $this->orgId,
            'type'             => 'load_balancer',
            'input_summary'    => ['shipments' => count($shipments), 'agents' => count($agents)],
            'output_summary'   => ['variance' => $result['variance'], 'balance_score' => $result['balance_score']],
            'fitness_score'    => $result['balance_score'],
            'generation_count' => $cfg['generations'],
            'execution_time_ms' => $elapsed,
        ]);

        return $result;
    }

    // ──────────────────────────────────────────────
    // Insights
    // ──────────────────────────────────────────────

    public function insights(bool $forceRefresh = false): array
    {
        $insightsCfg = $this->config->insightsConfig();
        $engine      = new InsightsEngine($this->orgId, $insightsCfg);
        return $forceRefresh ? $engine->refresh() : $engine->all();
    }

    // ──────────────────────────────────────────────
    // Settings
    // ──────────────────────────────────────────────

    public function getConfig(): array
    {
        return $this->config->toArray();
    }

    public function saveConfig(array $data): void
    {
        $this->config->saveMany($data);
    }

    // ──────────────────────────────────────────────
    // History
    // ──────────────────────────────────────────────

    public function runHistory(int $limit = 20): array
    {
        return GaRunLog::where('organization_id', $this->orgId)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    private function buildCarrierCandidates(array $reqs): array
    {
        // CarrierAccount uses `status` (boolean) as the active flag, not `is_active`.
        $accounts = CarrierAccount::where('organization_id', $this->orgId)
            ->where('status', true)
            ->get(['id', 'carrier_code', 'nickname', 'settings']);

        $candidates = [];
        foreach ($accounts as $account) {
            $settings = $account->settings ?? [];
            if (is_string($settings)) $settings = json_decode($settings, true) ?? [];

            $baseCost   = (float) ($settings['base_cost']        ?? 10.0);
            $estDays    = (int)   ($settings['estimated_days']   ?? 3);
            $reliability = (float) ($settings['reliability_score'] ?? 0.8);

            // Adjust for weight
            $weightKg = $reqs['weight_kg'] ?? 0;
            $baseCost += $weightKg * (float) ($settings['cost_per_kg'] ?? 0.5);

            // Adjust for urgency — penalise slow carriers
            $urgencyDays = $reqs['urgency_days'] ?? PHP_INT_MAX;
            if ($estDays > $urgencyDays) {
                $reliability -= 0.2; // penalise
            }

            $candidates[] = [
                'name'              => $account->nickname ?: $account->carrier_code,
                'code'              => $account->carrier_code,
                'base_cost'         => round($baseCost, 2),
                'estimated_days'    => $estDays,
                'reliability_score' => max(0.0, min(1.0, $reliability)),
            ];
        }

        return $candidates;
    }
}
