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
 * Genetic Algorithm for Workload Load Balancing.
 *
 * Problem: Assign N shipments to M agents (drivers/branches) to minimise
 * the maximum load deviation across agents (balance workload).
 *
 * Encoding  : Integer array of length N, each element in [0..M-1].
 * Fitness   : Minimise variance of workload distribution.
 * Selection : Tournament.
 * Crossover : Uniform crossover.
 * Mutation  : Random reassignment of one shipment.
 */
class LoadBalancerGA
{
    private int   $populationSize;
    private int   $generations;
    private float $mutationRate;

    public function __construct(array $config)
    {
        $this->populationSize = $config['population_size'] ?? 40;
        $this->generations    = $config['generations']     ?? 80;
        $this->mutationRate   = $config['mutation_rate']   ?? 0.08;
    }

    /**
     * @param  array $shipments  [['id', 'weight'], ...]  — weight = shipment cost/size proxy
     * @param  array $agents     [['id', 'name', 'current_load'], ...]
     * @return array             ['assignments' => [...], 'balance_score', 'variance']
     */
    public function balance(array $shipments, array $agents): array
    {
        $ns = count($shipments);
        $na = count($agents);

        if ($ns === 0 || $na === 0) {
            return ['assignments' => [], 'balance_score' => 1.0, 'variance' => 0.0];
        }

        if ($na === 1) {
            return [
                'assignments' => array_fill(0, $ns, 0),
                'balance_score' => 1.0,
                'variance' => 0.0,
            ];
        }

        $shipmentWeights = array_column($shipments, 'weight');
        $baseLads        = array_column($agents, 'current_load');

        $variance = function (array $chromosome) use ($shipmentWeights, $baseLads, $na): float {
            $loads = $baseLads;
            foreach ($chromosome as $shipIdx => $agentIdx) {
                $loads[$agentIdx] = ($loads[$agentIdx] ?? 0) + ($shipmentWeights[$shipIdx] ?? 1);
            }
            $mean = array_sum($loads) / $na;
            $var  = 0.0;
            foreach ($loads as $l) {
                $var += ($l - $mean) ** 2;
            }
            return $var / $na;
        };

        $fitness = fn(array $ch): float => 1.0 / (1.0 + $variance($ch));

        // Initial population
        $population = [];
        for ($i = 0; $i < $this->populationSize; $i++) {
            $ch = [];
            for ($j = 0; $j < $ns; $j++) {
                $ch[] = random_int(0, $na - 1);
            }
            $population[] = $ch;
        }

        $fitValues = array_map($fitness, $population);

        for ($gen = 0; $gen < $this->generations; $gen++) {
            array_multisort($fitValues, SORT_DESC, $population);

            $newPop = [$population[0]];
            $newFit = [$fitValues[0]];

            while (count($newPop) < $this->populationSize) {
                $p1 = $this->tournamentSelect($population, $fitValues);
                $p2 = $this->tournamentSelect($population, $fitValues);

                $child = [];
                for ($j = 0; $j < $ns; $j++) {
                    $child[] = mt_rand(0, 1) ? $p1[$j] : $p2[$j];
                }

                // Mutation
                if (mt_rand() / mt_getrandmax() < $this->mutationRate) {
                    $pos = random_int(0, $ns - 1);
                    $child[$pos] = random_int(0, $na - 1);
                }

                $newPop[] = $child;
                $newFit[] = $fitness($child);
            }

            $population = $newPop;
            $fitValues  = $newFit;
        }

        $bestIdx = array_keys($fitValues, max($fitValues))[0];
        $best    = $population[$bestIdx];
        $var     = $variance($best);

        // Build assignment map
        $assignments = [];
        foreach ($best as $shipIdx => $agentIdx) {
            $assignments[] = [
                'shipment_id' => $shipments[$shipIdx]['id'],
                'agent_id'    => $agents[$agentIdx]['id'],
                'agent_name'  => $agents[$agentIdx]['name'],
            ];
        }

        // Workload summary per agent
        $loads = $baseLads;
        foreach ($best as $shipIdx => $agentIdx) {
            $loads[$agentIdx] = ($loads[$agentIdx] ?? 0) + ($shipmentWeights[$shipIdx] ?? 1);
        }
        $agentLoads = [];
        foreach ($agents as $i => $agent) {
            $agentLoads[] = [
                'id'           => $agent['id'],
                'name'         => $agent['name'],
                'total_load'   => round($loads[$i] ?? 0, 2),
            ];
        }

        return [
            'assignments'   => $assignments,
            'agent_loads'   => $agentLoads,
            'balance_score' => round($fitValues[$bestIdx], 4),
            'variance'      => round($var, 4),
        ];
    }

    private function tournamentSelect(array $pop, array $fitness, int $k = 3): array
    {
        $best = null; $bestF = -INF;
        for ($i = 0; $i < $k; $i++) {
            $idx = random_int(0, count($pop) - 1);
            if ($fitness[$idx] > $bestF) { $bestF = $fitness[$idx]; $best = $pop[$idx]; }
        }
        return $best;
    }
}
