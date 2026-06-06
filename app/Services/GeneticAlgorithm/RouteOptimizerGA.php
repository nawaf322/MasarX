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
 * Genetic Algorithm for Route Optimization.
 *
 * Problem: Given N delivery stops (each with lat/lng), find the order that
 * minimises total haversine distance.
 *
 * Encoding  : Permutation of stop indices [0 .. N-1].
 * Fitness   : 1 / totalDistance  (maximise → minimise distance).
 * Selection : Tournament selection.
 * Crossover : Order Crossover (OX1).
 * Mutation  : Random swap of two positions.
 */
class RouteOptimizerGA
{
    private int   $populationSize;
    private int   $generations;
    private float $mutationRate;
    private float $crossoverRate;
    private int   $eliteCount;
    private int   $tournamentK;

    /** @var array<int, array{lat:float,lng:float,id:mixed,label:string}> */
    private array $stops;
    private int   $n;

    /** Distance matrix [i][j] in km */
    private array $dist = [];

    private float $bestFitness  = 0.0;
    private array $bestRoute    = [];
    private int   $generationsRun = 0;

    public function __construct(array $config)
    {
        $this->populationSize = $config['population_size'] ?? 50;
        $this->generations    = $config['generations']     ?? 100;
        $this->mutationRate   = $config['mutation_rate']   ?? 0.05;
        $this->crossoverRate  = $config['crossover_rate']  ?? 0.8;
        $this->eliteCount     = $config['elite_count']     ?? 2;
        $this->tournamentK    = $config['tournament_k']    ?? 3;
    }

    /**
     * @param array<int, array{lat:float,lng:float,id:mixed,label:string}> $stops
     */
    public function solve(array $stops): array
    {
        $this->stops = array_values($stops);
        $this->n     = count($this->stops);

        if ($this->n <= 1) {
            return [
                'route'       => $this->stops,
                'distance_km' => 0.0,
                'fitness'     => 1.0,
                'generations' => 0,
                'improvement_pct' => 0.0,
            ];
        }

        $this->buildDistanceMatrix();

        // Initial population
        $population = $this->initPopulation();

        // Evaluate fitness for initial population
        $fitness = array_map(fn($ch) => $this->fitness($ch), $population);

        // Track initial best for improvement metric
        $initialBestDist = 1.0 / (max($fitness) ?: 1e-9);

        for ($gen = 0; $gen < $this->generations; $gen++) {
            // Sort by fitness desc
            array_multisort($fitness, SORT_DESC, $population);

            // Elite carry-over
            $newPop = array_slice($population, 0, $this->eliteCount);
            $newFit = array_slice($fitness, 0, $this->eliteCount);

            while (count($newPop) < $this->populationSize) {
                $p1 = $this->tournamentSelect($population, $fitness);
                $p2 = $this->tournamentSelect($population, $fitness);

                if (mt_rand() / mt_getrandmax() < $this->crossoverRate) {
                    [$c1, $c2] = $this->oxCrossover($p1, $p2);
                } else {
                    [$c1, $c2] = [$p1, $p2];
                }

                $c1 = $this->mutate($c1);
                $c2 = $this->mutate($c2);

                $newPop[] = $c1;
                $newFit[] = $this->fitness($c1);

                if (count($newPop) < $this->populationSize) {
                    $newPop[] = $c2;
                    $newFit[] = $this->fitness($c2);
                }
            }

            $population = $newPop;
            $fitness    = $newFit;
        }

        $this->generationsRun = $this->generations;

        // Best solution
        $bestIdx          = array_keys($fitness, max($fitness))[0];
        $bestChromosome   = $population[$bestIdx];
        $this->bestFitness = $fitness[$bestIdx];

        $bestDist = $this->totalDistance($bestChromosome);
        $this->bestRoute = $bestChromosome;

        $improvementPct = $initialBestDist > 0
            ? round((($initialBestDist - $bestDist) / $initialBestDist) * 100, 1)
            : 0.0;

        $orderedStops = array_map(fn($i) => $this->stops[$i], $bestChromosome);

        return [
            'route'           => $orderedStops,
            'distance_km'     => round($bestDist, 2),
            'fitness'         => round($this->bestFitness, 6),
            'generations'     => $this->generationsRun,
            'improvement_pct' => $improvementPct,
        ];
    }

    // ──────────────────────────────────────────────
    // GA internals
    // ──────────────────────────────────────────────

    private function buildDistanceMatrix(): void
    {
        $this->dist = [];
        for ($i = 0; $i < $this->n; $i++) {
            for ($j = 0; $j < $this->n; $j++) {
                $this->dist[$i][$j] = ($i === $j)
                    ? 0.0
                    : $this->haversine(
                        $this->stops[$i]['lat'], $this->stops[$i]['lng'],
                        $this->stops[$j]['lat'], $this->stops[$j]['lng']
                    );
            }
        }
    }

    private function initPopulation(): array
    {
        $base = range(0, $this->n - 1);
        $pop  = [];
        for ($i = 0; $i < $this->populationSize; $i++) {
            $chromosome = $base;
            shuffle($chromosome);
            $pop[] = $chromosome;
        }
        return $pop;
    }

    private function fitness(array $chromosome): float
    {
        $dist = $this->totalDistance($chromosome);
        return $dist > 0 ? 1.0 / $dist : PHP_FLOAT_MAX;
    }

    private function totalDistance(array $chromosome): float
    {
        $total = 0.0;
        for ($i = 0; $i < $this->n - 1; $i++) {
            $total += $this->dist[$chromosome[$i]][$chromosome[$i + 1]];
        }
        return $total;
    }

    private function tournamentSelect(array $population, array $fitness): array
    {
        $best = null;
        $bestF = -1.0;
        for ($k = 0; $k < $this->tournamentK; $k++) {
            $idx = random_int(0, count($population) - 1);
            if ($fitness[$idx] > $bestF) {
                $bestF = $fitness[$idx];
                $best  = $population[$idx];
            }
        }
        return $best;
    }

    /**
     * Order Crossover (OX1): preserves relative order of genes from one parent.
     */
    private function oxCrossover(array $p1, array $p2): array
    {
        $n = $this->n;
        $a = random_int(0, $n - 1);
        $b = random_int(0, $n - 1);
        if ($a > $b) [$a, $b] = [$b, $a];

        $build = function (array $donor, array $receiver) use ($a, $b, $n): array {
            $child  = array_fill(0, $n, -1);
            $segment = array_slice($donor, $a, $b - $a + 1);
            for ($i = $a; $i <= $b; $i++) {
                $child[$i] = $donor[$i];
            }
            $used = array_flip($segment);
            $pos  = ($b + 1) % $n;
            $recPos = ($b + 1) % $n;
            $filled = 0;
            while ($filled < $n - count($segment)) {
                $gene = $receiver[$recPos];
                if (!isset($used[$gene])) {
                    $child[$pos] = $gene;
                    $pos = ($pos + 1) % $n;
                    $filled++;
                }
                $recPos = ($recPos + 1) % $n;
            }
            return $child;
        };

        return [$build($p1, $p2), $build($p2, $p1)];
    }

    private function mutate(array $chromosome): array
    {
        if (mt_rand() / mt_getrandmax() < $this->mutationRate) {
            $i = random_int(0, $this->n - 1);
            $j = random_int(0, $this->n - 1);
            [$chromosome[$i], $chromosome[$j]] = [$chromosome[$j], $chromosome[$i]];
        }
        return $chromosome;
    }

    // ──────────────────────────────────────────────
    // Geo helpers
    // ──────────────────────────────────────────────

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
