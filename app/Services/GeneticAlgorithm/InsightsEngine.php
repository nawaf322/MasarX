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

use App\Models\Shipment;
use App\Models\ShipmentActivity;
use App\Enums\ShipmentStatus;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Insights Engine — analyses historical shipment data and uses heuristics
 * (backed by GA results) to produce actionable recommendations for the dashboard.
 *
 * All results are cached per organization to avoid heavy queries on every page load.
 */
class InsightsEngine
{
    private int   $organizationId;
    private int   $historyDays;
    private int   $cacheMinutes;
    private float $delayThresholdHours;

    public function __construct(int $organizationId, array $config = [])
    {
        $this->organizationId       = $organizationId;
        $this->historyDays          = $config['history_days']          ?? 30;
        $this->cacheMinutes         = $config['cache_minutes']          ?? 30;
        $this->delayThresholdHours  = $config['delay_threshold_hours']  ?? 2.0;
    }

    // ──────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────

    /**
     * Return all insights for the dashboard panel.
     * Results are cached for `cacheMinutes`.
     */
    public function all(): array
    {
        $cacheKey = "ga_insights:{$this->organizationId}";
        return Cache::remember($cacheKey, $this->cacheMinutes * 60, function () {
            return [
                'delivery_forecast'      => $this->deliveryForecast(),
                'delay_risk'             => $this->delayRisk(),
                'peak_hours'             => $this->peakHours(),
                'exception_hotspots'     => $this->exceptionHotspots(),
                'carrier_performance'    => $this->carrierPerformance(),
                'workload_balance'       => $this->workloadBalance(),
                'route_efficiency'       => $this->routeEfficiency(),
                'generated_at'           => now()->toIso8601String(),
            ];
        });
    }

    /** Force cache refresh */
    public function refresh(): array
    {
        Cache::forget("ga_insights:{$this->organizationId}");
        return $this->all();
    }

    // ──────────────────────────────────────────────
    // Individual insight generators
    // ──────────────────────────────────────────────

    /**
     * Delivery forecast for the next 7 days based on historical weekly averages.
     */
    private function deliveryForecast(): array
    {
        $orgId = $this->organizationId;
        $from  = now()->subDays($this->historyDays);

        $dailyCreated = Shipment::where('organization_id', $orgId)
            ->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as cnt')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('cnt', 'date')
            ->toArray();

        $avgPerDay = count($dailyCreated) > 0
            ? round(array_sum($dailyCreated) / count($dailyCreated))
            : 0;

        $forecast = [];
        for ($d = 1; $d <= 7; $d++) {
            $day = now()->addDays($d);
            // Deterministic day-of-week seasonal factor: weekdays +10%, weekends -20%
            $dow    = (int) $day->dayOfWeek; // 0=Sun, 6=Sat
            $factor = in_array($dow, [0, 6]) ? 0.8 : 1.1;
            $forecast[] = [
                'date'  => $day->toDateString(),
                'label' => $day->format('D'),
                'count' => (int) round($avgPerDay * $factor),
            ];
        }

        return [
            'avg_per_day' => $avgPerDay,
            'next_7_days' => $forecast,
        ];
    }

    /**
     * Identify shipments at risk of delay (estimated_delivery_date is today or past,
     * not yet delivered). Returns count and severity.
     */
    private function delayRisk(): array
    {
        $orgId = $this->organizationId;

        $atRisk = Shipment::where('organization_id', $orgId)
            ->whereNotIn('status', [
                ShipmentStatus::DELIVERED->value,
                ShipmentStatus::CANCELLED->value,
            ])
            ->whereNotNull('estimated_delivery_date')
            ->where('estimated_delivery_date', '<=', now()->addHours($this->delayThresholdHours))
            ->count();

        $total = Shipment::where('organization_id', $orgId)
            ->whereNotIn('status', [
                ShipmentStatus::DELIVERED->value,
                ShipmentStatus::CANCELLED->value,
            ])
            ->count();

        $riskPct = $total > 0 ? round(($atRisk / $total) * 100, 1) : 0.0;

        $severity = 'low';
        if ($riskPct > 30) $severity = 'high';
        elseif ($riskPct > 15) $severity = 'medium';

        return [
            'at_risk_count' => $atRisk,
            'total_active'  => $total,
            'risk_pct'      => $riskPct,
            'severity'      => $severity,
        ];
    }

    /**
     * Identify peak dispatch hours from historical data (hour of created_at).
     */
    private function peakHours(): array
    {
        $orgId = $this->organizationId;
        $from  = now()->subDays($this->historyDays);

        $hourly = Shipment::where('organization_id', $orgId)
            ->where('created_at', '>=', $from)
            ->selectRaw('HOUR(created_at) as hour, COUNT(*) as cnt')
            ->groupBy('hour')
            ->orderBy('cnt', 'desc')
            ->limit(3)
            ->get()
            ->map(fn($r) => ['hour' => (int)$r->hour, 'count' => (int)$r->cnt])
            ->toArray();

        $topHour = $hourly[0]['hour'] ?? null;

        return [
            'top_hours'        => $hourly,
            'recommended_dispatch' => $topHour !== null
                ? sprintf('%02d:00 – %02d:00', $topHour, $topHour + 2)
                : null,
        ];
    }

    /**
     * Exception hotspots — destination cities with highest exception rates.
     */
    private function exceptionHotspots(): array
    {
        $orgId = $this->organizationId;
        $from  = now()->subDays($this->historyDays);

        $exceptions = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::EXCEPTION->value)
            ->where('created_at', '>=', $from)
            ->get(['receiver_details'])
            ->groupBy(function ($s) {
                $details = $s->receiver_details;
                if (is_string($details)) $details = json_decode($details, true);
                return $details['city'] ?? 'Unknown';
            })
            ->map(fn($group) => $group->count())
            ->sortDesc()
            ->take(5)
            ->map(fn($count, $city) => ['city' => $city, 'exception_count' => $count])
            ->values()
            ->toArray();

        return [
            'hotspots' => $exceptions,
        ];
    }

    /**
     * Carrier performance based on on-time delivery rate.
     */
    private function carrierPerformance(): array
    {
        $orgId = $this->organizationId;
        $from  = now()->subDays($this->historyDays);

        $delivered = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::DELIVERED->value)
            ->where('delivered_at', '>=', $from)
            ->whereNotNull('service_type')
            ->get(['service_type', 'estimated_delivery_date', 'delivered_at']);

        if ($delivered->isEmpty()) {
            return ['carriers' => []];
        }

        $byCarrier = $delivered->groupBy('service_type');
        $carriers  = [];

        foreach ($byCarrier as $carrier => $shipments) {
            $total  = $shipments->count();
            $onTime = $shipments->filter(function ($s) {
                return $s->estimated_delivery_date
                    && $s->delivered_at
                    && Carbon::parse($s->delivered_at)->lte(Carbon::parse($s->estimated_delivery_date));
            })->count();

            $carriers[] = [
                'name'         => $carrier,
                'total'        => $total,
                'on_time'      => $onTime,
                'on_time_rate' => $total > 0 ? round(($onTime / $total) * 100, 1) : 0.0,
            ];
        }

        usort($carriers, fn($a, $b) => $b['on_time_rate'] <=> $a['on_time_rate']);

        return ['carriers' => array_slice($carriers, 0, 5)];
    }

    /**
     * Workload balance — how evenly shipments are distributed across branches.
     */
    private function workloadBalance(): array
    {
        $orgId = $this->organizationId;

        $byBranch = Shipment::where('organization_id', $orgId)
            ->whereNotIn('status', [ShipmentStatus::DELIVERED->value, ShipmentStatus::CANCELLED->value])
            ->whereNotNull('department_id')
            ->selectRaw('department_id, COUNT(*) as cnt')
            ->groupBy('department_id')
            ->pluck('cnt', 'department_id')
            ->toArray();

        if (empty($byBranch)) {
            return ['variance' => 0.0, 'branches' => [], 'is_balanced' => true];
        }

        $counts = array_values($byBranch);
        $mean   = array_sum($counts) / count($counts);
        $var    = array_sum(array_map(fn($v) => ($v - $mean) ** 2, $counts)) / count($counts);

        $isBalanced = $var < ($mean * 0.25); // balanced if std < 50% of mean

        return [
            'variance'    => round($var, 2),
            'mean_load'   => round($mean, 1),
            'is_balanced' => $isBalanced,
            'branches'    => $byBranch,
        ];
    }

    /**
     * Route efficiency — compares avg delivery time to estimated, proxy for route quality.
     */
    private function routeEfficiency(): array
    {
        $orgId = $this->organizationId;
        $from  = now()->subDays($this->historyDays);

        $delivered = Shipment::where('organization_id', $orgId)
            ->where('status', ShipmentStatus::DELIVERED->value)
            ->where('delivered_at', '>=', $from)
            ->whereNotNull('estimated_delivery_date')
            ->whereNotNull('delivered_at')
            ->get(['estimated_delivery_date', 'delivered_at', 'created_at']);

        if ($delivered->isEmpty()) {
            return ['efficiency_score' => null, 'avg_delay_hours' => null];
        }

        $delays = $delivered->map(function ($s) {
            $est     = Carbon::parse($s->estimated_delivery_date);
            $actual  = Carbon::parse($s->delivered_at);
            return $actual->diffInHours($est, false); // negative = on time/early
        });

        $avgDelay    = round($delays->avg(), 1);
        $onTimePct   = $delays->filter(fn($d) => $d <= 0)->count() / $delivered->count() * 100;
        $efficiencyScore = round(min(100, max(0, $onTimePct)), 1);

        return [
            'efficiency_score' => $efficiencyScore,
            'avg_delay_hours'  => $avgDelay,
            'on_time_pct'      => round($onTimePct, 1),
            'sample_size'      => $delivered->count(),
        ];
    }
}
