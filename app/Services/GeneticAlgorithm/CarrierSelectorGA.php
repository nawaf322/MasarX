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

/**
 * Genetic Algorithm for Carrier/Service Selection.
 *
 * Problem: Given a shipment's requirements (weight, dims, origin, destination,
 * urgency), choose the best combination of (carrier, service_level) that
 * minimises weighted cost = costW*normCost + timeW*normTime - relW*normReliability.
 *
 * Encoding  : Integer array [carrierIndex, serviceLevelIndex]
 *             — one gene per shipment when batch-solving.
 * Fitness   : Maximise (1 - weighted_penalty).
 * Selection : Tournament.
 * Crossover : Uniform.
 * Mutation  : Random reset of one gene.
 */
class CarrierSelectorGA
{
    private int   $populationSize;
    private int   $generations;
    private float $mutationRate;
    private float $costWeight;
    private float $timeWeight;
    private float $reliabilityWeight;

    public function __construct(array $config)
    {
        $this->populationSize    = $config['population_size']    ?? 30;
        $this->generations       = $config['generations']        ?? 60;
        $this->mutationRate      = $config['mutation_rate']      ?? 0.1;
        $this->costWeight        = $config['cost_weight']        ?? 0.5;
        $this->timeWeight        = $config['time_weight']        ?? 0.3;
        $this->reliabilityWeight = $config['reliability_weight'] ?? 0.2;
    }

    /**
     * Select the best carrier option for a shipment.
     *
     * @param  array $shipmentReqs  ['weight_kg', 'declared_value', 'urgency_days', 'distance_km']
     * @param  array $candidates    [['name','code','base_cost','estimated_days','reliability_score'], ...]
     * @return array                ['carrier','score','cost_estimate','estimated_days','reliability']
     */
    public function selectBest(array $shipmentReqs, array $candidates): array
    {
        $n = count($candidates);

        if ($n === 0) {
            return [];
        }

        if ($n === 1) {
            return $this->formatResult($candidates[0], 1.0);
        }

        // Pre-compute normalised metrics
        $costs      = array_column($candidates, 'base_cost');
        $times      = array_column($candidates, 'estimated_days');
        $reliability = array_column($candidates, 'reliability_score');

        $minCost = min($costs) ?: 1;
        $maxCost = max($costs) ?: 1;
        $minTime = min($times) ?: 1;
        $maxTime = max($times) ?: 1;
        $maxRel  = max($reliability) ?: 1;

        $normCost = fn(int $i) => ($maxCost !== $minCost)
            ? ($costs[$i] - $minCost) / ($maxCost - $minCost)
            : 0.0;
        $normTime = fn(int $i) => ($maxTime !== $minTime)
            ? ($times[$i] - $minTime) / ($maxTime - $minTime)
            : 0.0;
        $normRel  = fn(int $i) => $maxRel > 0 ? $reliability[$i] / $maxRel : 0.0;

        $fitnessOf = function (int $idx) use ($normCost, $normTime, $normRel): float {
            $penalty = $this->costWeight * $normCost($idx)
                + $this->timeWeight * $normTime($idx)
                - $this->reliabilityWeight * $normRel($idx);
            return 1.0 - $penalty;
        };

        // GA over carrier indices
        $population = [];
        for ($i = 0; $i < $this->populationSize; $i++) {
            $population[] = random_int(0, $n - 1);
        }

        $fitness = array_map($fitnessOf, $population);

        for ($gen = 0; $gen < $this->generations; $gen++) {
            array_multisort($fitness, SORT_DESC, $population);

            $newPop = [$population[0]]; // elite
            $newFit = [$fitness[0]];

            while (count($newPop) < $this->populationSize) {
                $p1 = $this->tournamentSelect($population, $fitness);
                $p2 = $this->tournamentSelect($population, $fitness);

                // Uniform crossover (for integer encoding just pick one parent)
                $child = mt_rand(0, 1) ? $p1 : $p2;

                // Mutation: random reset
                if (mt_rand() / mt_getrandmax() < $this->mutationRate) {
                    $child = random_int(0, $n - 1);
                }

                $newPop[] = $child;
                $newFit[] = $fitnessOf($child);
            }

            $population = $newPop;
            $fitness    = $newFit;
        }

        $bestIdx      = array_keys($fitness, max($fitness))[0];
        $bestCarrierIdx = $population[$bestIdx];
        $bestScore    = $fitness[$bestIdx];

        return $this->formatResult($candidates[$bestCarrierIdx], $bestScore);
    }

    /**
     * Rank all candidates (for comparison table in UI).
     *
     * @param  array $candidates
     * @return array Sorted by fitness desc
     */
    public function rankAll(array $candidates): array
    {
        $n = count($candidates);
        if ($n === 0) return [];

        $costs      = array_column($candidates, 'base_cost');
        $times      = array_column($candidates, 'estimated_days');
        $reliability = array_column($candidates, 'reliability_score');

        $minCost = min($costs) ?: 1;
        $maxCost = max($costs) ?: 1;
        $minTime = min($times) ?: 1;
        $maxTime = max($times) ?: 1;
        $maxRel  = max($reliability) ?: 1;

        $ranked = [];
        foreach ($candidates as $i => $c) {
            $normCost = ($maxCost !== $minCost) ? ($costs[$i] - $minCost) / ($maxCost - $minCost) : 0.0;
            $normTime = ($maxTime !== $minTime) ? ($times[$i] - $minTime) / ($maxTime - $minTime) : 0.0;
            $normRel  = $maxRel > 0 ? $reliability[$i] / $maxRel : 0.0;
            $penalty  = $this->costWeight * $normCost + $this->timeWeight * $normTime - $this->reliabilityWeight * $normRel;
            $score    = round(1.0 - $penalty, 4);
            $ranked[] = array_merge($c, ['score' => $score]);
        }

        usort($ranked, fn($a, $b) => $b['score'] <=> $a['score']);
        return $ranked;
    }

    private function tournamentSelect(array $pop, array $fitness, int $k = 3): int
    {
        $best = null; $bestF = -INF;
        for ($i = 0; $i < $k; $i++) {
            $idx = random_int(0, count($pop) - 1);
            if ($fitness[$idx] > $bestF) { $bestF = $fitness[$idx]; $best = $pop[$idx]; }
        }
        return $best;
    }

    private function formatResult(array $carrier, float $score): array
    {
        return [
            'name'             => $carrier['name']             ?? '—',
            'code'             => $carrier['code']             ?? '—',
            'score'            => round($score, 4),
            'cost_estimate'    => $carrier['base_cost']        ?? 0,
            'estimated_days'   => $carrier['estimated_days']   ?? 0,
            'reliability'      => $carrier['reliability_score'] ?? 0,
        ];
    }
}
