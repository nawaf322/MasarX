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

use App\Services\SettingsService;

/**
 * Reads and writes all Genetic Algorithm configuration from OrganizationSetting.
 * Group used in DB: "genetic_algorithm"
 */
class GeneticAlgorithmConfig
{
    public const GROUP = 'genetic_algorithm';

    private SettingsService $settings;

    public function __construct(SettingsService $settings)
    {
        $this->settings = $settings;
    }

    public function forOrganization(int $orgId): static
    {
        $this->settings->forOrganization($orgId);
        return $this;
    }

    /** General GA parameters */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->settings->get(self::GROUP, $key, $default);
    }

    public function set(string $key, mixed $value): void
    {
        $this->settings->set(self::GROUP, $key, $value);
    }

    /** Route Optimizer defaults */
    public function routeOptimizerConfig(): array
    {
        return [
            'enabled'          => (bool) $this->get('route_enabled', true),
            'population_size'  => (int)  $this->get('route_population_size', 50),
            'generations'      => (int)  $this->get('route_generations', 100),
            'mutation_rate'    => (float) $this->get('route_mutation_rate', 0.05),
            'crossover_rate'   => (float) $this->get('route_crossover_rate', 0.8),
            'elite_count'      => (int)  $this->get('route_elite_count', 2),
            'tournament_k'     => (int)  $this->get('route_tournament_k', 3),
        ];
    }

    /** Carrier Selector defaults */
    public function carrierSelectorConfig(): array
    {
        return [
            'enabled'          => (bool) $this->get('carrier_enabled', true),
            'population_size'  => (int)  $this->get('carrier_population_size', 30),
            'generations'      => (int)  $this->get('carrier_generations', 60),
            'mutation_rate'    => (float) $this->get('carrier_mutation_rate', 0.1),
            'cost_weight'      => (float) $this->get('carrier_cost_weight', 0.5),
            'time_weight'      => (float) $this->get('carrier_time_weight', 0.3),
            'reliability_weight' => (float) $this->get('carrier_reliability_weight', 0.2),
        ];
    }

    /** Insights Engine defaults */
    public function insightsConfig(): array
    {
        return [
            'enabled'               => (bool) $this->get('insights_enabled', true),
            'cache_minutes'         => (int)  $this->get('insights_cache_minutes', 30),
            'history_days'          => (int)  $this->get('insights_history_days', 30),
            'delay_threshold_hours' => (float) $this->get('insights_delay_threshold_hours', 2.0),
        ];
    }

    /** Load Balancer defaults */
    public function loadBalancerConfig(): array
    {
        return [
            'enabled'         => (bool) $this->get('lb_enabled', true),
            'population_size' => (int)  $this->get('lb_population_size', 40),
            'generations'     => (int)  $this->get('lb_generations', 80),
            'mutation_rate'   => (float) $this->get('lb_mutation_rate', 0.08),
        ];
    }

    /**
     * Return full config snapshot for the settings page.
     */
    public function toArray(): array
    {
        return [
            'route'    => $this->routeOptimizerConfig(),
            'carrier'  => $this->carrierSelectorConfig(),
            'insights' => $this->insightsConfig(),
            'load_balancer' => $this->loadBalancerConfig(),
        ];
    }

    /**
     * Save multiple keys at once from the settings page request.
     */
    public function saveMany(array $data): void
    {
        foreach ($data as $key => $value) {
            $this->set($key, $value);
        }
    }
}
