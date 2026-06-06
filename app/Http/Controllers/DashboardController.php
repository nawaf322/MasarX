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

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Shipment;
use App\Models\ShipmentStatus as ShipmentStatusModel;
use App\Enums\ShipmentStatus;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /** Per-request cache for shipment_statuses lookups — avoids repeated queries for the same codes. */
    private array $statusIdCache = [];

    public function index(Request $request)
    {
        // Customers have their own portal — redirect to my-locker.
        // Inertia::location() is required here: redirect() sends a raw 302 which axes follows
        // transparently, leaving the browser URL at /dashboard while rendering MyLocker/Index.
        // Inertia::location() sends 409+X-Inertia-Location for XHR (full page visit) and a
        // standard redirect for regular browser requests, keeping URL and history in sync.
        // Customers and users without admin/employee/driver roles → customer portal
        $user = Auth::user();
        $isStaffOrDriver = $user->hasRole('super-admin') || $user->hasRole('admin') || $user->hasRole('Employee') || $user->hasRole('Driver');
        if (!$isStaffOrDriver) {
            return Inertia::location(route('my-locker.index'));
        }

        if (Auth::user()->hasRole('Driver')) {
            return $this->driverDashboard($request);
        }

        // Redirigir al dashboard logístico (mismo request para filtros de fecha/mes)
        return $this->logistics($request);
    }

    /**
     * Driver-specific dashboard: only personal stats & assigned work.
     */
    private function driverDashboard(Request $request)
    {
        $user = Auth::user();
        $orgId = $user->organization_id;
        $today = now()->startOfDay();

        $manifests = \App\Models\Manifest::where('driver_id', $user->id)
            ->where('organization_id', $orgId)
            ->whereIn('status', ['open', 'dispatched'])
            ->with(['shipments' => fn($q) => $q->with('shipmentStatus')])
            ->get();

        $assignedShipments = $manifests->flatMap->shipments;

        $pickups = \App\Models\OriginPickup::where('driver_id', $user->id)
            ->where('organization_id', $orgId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->with('shipment')
            ->orderBy('scheduled_for')
            ->get();

        $deliveredToday = $assignedShipments->filter(fn($s) =>
            $s->delivered_at && $s->delivered_at->gte($today)
        )->count();

        $deliveredWeek = \App\Models\Shipment::whereIn('manifest_id', $manifests->pluck('id'))
            ->where('organization_id', $orgId)
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '>=', now()->startOfWeek())
            ->count();

        $deliveredMonth = \App\Models\Shipment::whereIn('manifest_id', $manifests->pluck('id'))
            ->where('organization_id', $orgId)
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '>=', now()->startOfMonth())
            ->count();

        $pending = $assignedShipments->filter(fn($s) =>
            in_array($s->status, ['pending', 'picked_up', 'in_transit', 'out_for_delivery'])
        )->count();

        return Inertia::render('Dashboard/DriverDashboard', [
            'assigned_shipments' => $assignedShipments->values(),
            'assigned_pickups' => $pickups,
            'stats' => [
                'deliveries_today' => $deliveredToday,
                'deliveries_week' => $deliveredWeek,
                'deliveries_month' => $deliveredMonth,
                'pending_deliveries' => $pending,
                'pickups_pending' => $pickups->count(),
            ],
        ]);
    }

    /**
     * Helper: Obtener IDs de estados por código desde shipment_statuses
     */
    private function getStatusIdsByCodes($orgId, array $codes): array
    {
        $cacheKey = $orgId . '|' . implode(',', $codes);
        if (!isset($this->statusIdCache[$cacheKey])) {
            $this->statusIdCache[$cacheKey] = ShipmentStatusModel::where('organization_id', $orgId)
                ->whereIn('code', $codes)
                ->where('is_active', true)
                ->pluck('id')
                ->toArray();
        }
        return $this->statusIdCache[$cacheKey];
    }

    /**
     * Helper: Consultar shipments por códigos de estado (usa status_id cuando está disponible, fallback a status)
     */
    private function queryByStatusCodes($query, $orgId, array $codes): \Illuminate\Database\Eloquent\Builder
    {
        $statusIds = $this->getStatusIdsByCodes($orgId, $codes);
        
        if (!empty($statusIds)) {
            // Usar status_id cuando hay estados en shipment_statuses
            return $query->where(function ($q) use ($statusIds, $codes) {
                $q->whereIn('status_id', $statusIds)
                  ->orWhereIn('status', $codes); // Fallback para compatibilidad
            });
        }
        
        // Fallback: solo usar campo status si no hay shipment_statuses configurados
        return $query->whereIn('status', $codes);
    }

    /**
     * Logistics Dashboard - Datos agregados para dashboard logístico
     */
    public function logistics(Request $request)
    {
        // Distributed verification points #3 and #4
        if (app(\App\Services\LicenseVerificationService::class)->getHash() === '') {
            return Inertia::render('Dashboard/Logistics', ['stats' => [], '_app_restricted' => true]);
        }

        $orgId = Auth::user()->organization_id;
        if (!$orgId) {
            abort(403, 'Organization not assigned to authenticated user.');
        }

        try {
        $now = Carbon::now();
        $lastWeek = $now->copy()->subWeek();

        // Filtro de mes (YYYY-MM), por defecto mes actual
        $monthParam = $request->input('month');
        try {
            $currentMonth = $monthParam ? Carbon::createFromFormat('Y-m', $monthParam) : $now->copy();
        } catch (\Throwable $e) {
            $currentMonth = $now->copy();
        }
        $monthStart = $currentMonth->copy()->startOfMonth();
        $monthEnd = $currentMonth->copy()->endOfMonth();

        // ===== KPI CARDS (4) =====
        // 1. On route vehicles (IN_TRANSIT + OUT_FOR_DELIVERY)
        $onRouteNow = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::IN_TRANSIT->value, ShipmentStatus::OUT_FOR_DELIVERY->value]
        )->count();
        $onRouteLastWeek = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('created_at', [$lastWeek->copy()->subWeek(), $lastWeek]),
            $orgId,
            [ShipmentStatus::IN_TRANSIT->value, ShipmentStatus::OUT_FOR_DELIVERY->value]
        )->count();
        $onRouteDelta = $onRouteLastWeek > 0 ? (($onRouteNow - $onRouteLastWeek) / $onRouteLastWeek) * 100 : ($onRouteNow > 0 ? 100 : 0);

        // 2. Vehicles with errors (EXCEPTION + ON_HOLD)
        $withErrorsNow = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::EXCEPTION->value, ShipmentStatus::ON_HOLD->value]
        )->count();
        $withErrorsLastWeek = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('created_at', [$lastWeek->copy()->subWeek(), $lastWeek]),
            $orgId,
            [ShipmentStatus::EXCEPTION->value, ShipmentStatus::ON_HOLD->value]
        )->count();
        $withErrorsDelta = $withErrorsLastWeek > 0 ? (($withErrorsNow - $withErrorsLastWeek) / $withErrorsLastWeek) * 100 : ($withErrorsNow > 0 ? 100 : 0);

        // 3. Deviated from route (RETURNED o delayed)
        $returnedStatusIds = $this->getStatusIdsByCodes($orgId, [ShipmentStatus::RETURNED->value]);
        $deliveredStatusIds = $this->getStatusIdsByCodes($orgId, [ShipmentStatus::DELIVERED->value]);
        
        $deviatedNow = Shipment::where('organization_id', $orgId)
            ->where(function ($q) use ($now, $returnedStatusIds, $deliveredStatusIds, $orgId) {
                // RETURNED por status_id o status
                if (!empty($returnedStatusIds)) {
                    $q->whereIn('status_id', $returnedStatusIds)
                      ->orWhere('status', ShipmentStatus::RETURNED->value);
                } else {
                    $q->where('status', ShipmentStatus::RETURNED->value);
                }
                
                // O delayed (estimated_delivery_date pasado y no delivered)
                $q->orWhere(function ($q2) use ($now, $deliveredStatusIds) {
                    $q2->where('estimated_delivery_date', '<', $now)
                        ->whereNotNull('estimated_delivery_date');
                    
                    // Excluir DELIVERED por status_id o status
                    if (!empty($deliveredStatusIds)) {
                        $q2->whereNotIn('status_id', $deliveredStatusIds)
                           ->where('status', '!=', ShipmentStatus::DELIVERED->value);
                    } else {
                        $q2->where('status', '!=', ShipmentStatus::DELIVERED->value);
                    }
                });
            })
            ->count();
        $deviatedLastWeek = Shipment::where('organization_id', $orgId)
            ->where(function ($q) use ($lastWeek, $returnedStatusIds, $deliveredStatusIds) {
                if (!empty($returnedStatusIds)) {
                    $q->whereIn('status_id', $returnedStatusIds)
                      ->orWhere('status', ShipmentStatus::RETURNED->value);
                } else {
                    $q->where('status', ShipmentStatus::RETURNED->value);
                }
                
                $q->orWhere(function ($q2) use ($lastWeek, $deliveredStatusIds) {
                    $q2->where('estimated_delivery_date', '<', $lastWeek)
                        ->whereNotNull('estimated_delivery_date');
                    
                    if (!empty($deliveredStatusIds)) {
                        $q2->whereNotIn('status_id', $deliveredStatusIds)
                           ->where('status', '!=', ShipmentStatus::DELIVERED->value);
                    } else {
                        $q2->where('status', '!=', ShipmentStatus::DELIVERED->value);
                    }
                });
            })
            ->whereBetween('created_at', [$lastWeek->copy()->subWeek(), $lastWeek])
            ->count();
        $deviatedDelta = $deviatedLastWeek > 0 ? (($deviatedNow - $deviatedLastWeek) / $deviatedLastWeek) * 100 : ($deviatedNow > 0 ? 100 : 0);

        // 4. Late vehicles (estimated_delivery_date pasado y no delivered)
        $deliveredStatusIds = $this->getStatusIdsByCodes($orgId, [ShipmentStatus::DELIVERED->value]);
        $lateNow = Shipment::where('organization_id', $orgId)
            ->where('estimated_delivery_date', '<', $now)
            ->whereNotNull('estimated_delivery_date')
            ->where(function ($q) use ($deliveredStatusIds) {
                if (!empty($deliveredStatusIds)) {
                    $q->whereNotIn('status_id', $deliveredStatusIds)
                      ->where('status', '!=', ShipmentStatus::DELIVERED->value);
                } else {
                    $q->where('status', '!=', ShipmentStatus::DELIVERED->value);
                }
            })
            ->count();
        $lateLastWeek = Shipment::where('organization_id', $orgId)
            ->where('estimated_delivery_date', '<', $lastWeek)
            ->whereNotNull('estimated_delivery_date')
            ->whereBetween('created_at', [$lastWeek->copy()->subWeek(), $lastWeek])
            ->where(function ($q) use ($deliveredStatusIds) {
                if (!empty($deliveredStatusIds)) {
                    $q->whereNotIn('status_id', $deliveredStatusIds)
                      ->where('status', '!=', ShipmentStatus::DELIVERED->value);
                } else {
                    $q->where('status', '!=', ShipmentStatus::DELIVERED->value);
                }
            })
            ->count();
        $lateDelta = $lateLastWeek > 0 ? (($lateNow - $lateLastWeek) / $lateLastWeek) * 100 : ($lateNow > 0 ? 100 : 0);

        // ===== VEHICLES OVERVIEW (Stacked bar) =====
        $vehiclesOverview = [
            'on_the_way' => $this->queryByStatusCodes(
                Shipment::where('organization_id', $orgId),
                $orgId,
                [ShipmentStatus::IN_TRANSIT->value]
            )->count(),
            'unloading' => $this->queryByStatusCodes(
                Shipment::where('organization_id', $orgId),
                $orgId,
                [ShipmentStatus::OUT_FOR_DELIVERY->value]
            )->count(),
            'loading' => $this->queryByStatusCodes(
                Shipment::where('organization_id', $orgId),
                $orgId,
                [ShipmentStatus::PICKED_UP->value, ShipmentStatus::PROCESSED->value]
            )->count(),
            'waiting' => $this->queryByStatusCodes(
                Shipment::where('organization_id', $orgId),
                $orgId,
                [ShipmentStatus::PENDING->value]
            )->count(),
        ];
        $totalVehicles = array_sum($vehiclesOverview);
        $vehiclesOverviewPercent = array_map(function ($count) use ($totalVehicles) {
            return $totalVehicles > 0 ? round(($count / $totalVehicles) * 100, 1) : 0;
        }, $vehiclesOverview);

        // Average duration por estado (si hay timestamps) - usa códigos reales
        $vehiclesOverviewDuration = [
            'on_the_way' => $this->getAverageDurationByCodes($orgId, [ShipmentStatus::IN_TRANSIT->value]),
            'unloading' => $this->getAverageDurationByCodes($orgId, [ShipmentStatus::OUT_FOR_DELIVERY->value]),
            'loading' => $this->getAverageDurationByCodes($orgId, [ShipmentStatus::PICKED_UP->value, ShipmentStatus::PROCESSED->value]),
            'waiting' => $this->getAverageDurationByCodes($orgId, [ShipmentStatus::PENDING->value]),
        ];

        // ===== SHIPMENT STATISTICS (por día del mes seleccionado) =====
        // Two aggregated GROUP BY queries replace a per-day loop of 60+ individual queries.
        $createdByDay = Shipment::where('organization_id', $orgId)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day')
            ->toArray();

        $deliveredByDay = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)->whereNotNull('delivered_at')
                ->whereBetween('delivered_at', [$monthStart, $monthEnd]),
            $orgId,
            [ShipmentStatus::DELIVERED->value]
        )->selectRaw('DATE(delivered_at) as day, COUNT(*) as total')
         ->groupBy('day')
         ->pluck('total', 'day')
         ->toArray();

        $shipmentStats = [];
        $period = \Carbon\CarbonPeriod::create($monthStart, '1 day', $monthEnd);
        foreach ($period as $date) {
            $key = $date->format('Y-m-d');
            $shipmentStats[] = [
                'date'      => $date->format('j M'),
                'day'       => $date->format('j'),
                'month'     => $date->format('M'),
                'created'   => $createdByDay[$key] ?? 0,
                'delivered' => $deliveredByDay[$key] ?? 0,
            ];
        }

        // ===== DELIVERY PERFORMANCE =====
        // Calcular porcentaje de aumento mensual (mes actual vs mes anterior)
        $previousMonthStart = $currentMonth->copy()->subMonth()->startOfMonth();
        $previousMonthEnd = $currentMonth->copy()->subMonth()->endOfMonth();
        
        $deliveredThisMonth = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('delivered_at', [$monthStart, $monthEnd]),
            $orgId,
            [ShipmentStatus::DELIVERED->value]
        )->count();
        
        $deliveredPreviousMonth = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('delivered_at', [$previousMonthStart, $previousMonthEnd]),
            $orgId,
            [ShipmentStatus::DELIVERED->value]
        )->count();
        
        $monthlyIncreasePercent = $deliveredPreviousMonth > 0 
            ? round((($deliveredThisMonth - $deliveredPreviousMonth) / $deliveredPreviousMonth) * 100, 1)
            : ($deliveredThisMonth > 0 ? 100 : 0);
        
        $packagesInTransit = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::IN_TRANSIT->value]
        )->count();
        $packagesOutForDelivery = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::OUT_FOR_DELIVERY->value]
        )->count();
        $packagesDelivered = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::DELIVERED->value]
        )->count();
        
        $cancelledStatusIds = $this->getStatusIdsByCodes($orgId, [ShipmentStatus::CANCELLED->value]);
        $totalPackagesQuery = Shipment::where('organization_id', $orgId);
        if (!empty($cancelledStatusIds)) {
            $totalPackagesQuery->where(function ($q) use ($cancelledStatusIds) {
                $q->whereNotIn('status_id', $cancelledStatusIds)
                  ->where('status', '!=', ShipmentStatus::CANCELLED->value);
            });
        } else {
            $totalPackagesQuery->where('status', '!=', ShipmentStatus::CANCELLED->value);
        }
        $totalPackages = $totalPackagesQuery->count();
        $successRate = $totalPackages > 0 ? round(($packagesDelivered / $totalPackages) * 100, 1) : 0;

        // Average delivery time — single SQL AVG avoids loading all delivered shipments into PHP.
        $driverName = \DB::getDriverName();
        $avgDaysExpr = $driverName === 'sqlite'
            ? 'AVG(JULIANDAY(delivered_at) - JULIANDAY(created_at)) as avg_days'
            : 'AVG(DATEDIFF(delivered_at, created_at)) as avg_days';
        $avgDeliveryDays = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)->whereNotNull('delivered_at'),
            $orgId,
            [ShipmentStatus::DELIVERED->value]
        )->selectRaw($avgDaysExpr)
         ->value('avg_days');

        $avgDeliveryTimeFormatted = $avgDeliveryDays !== null
            ? round($avgDeliveryDays, 1) . ' Days'
            : '—';

        // Customer satisfaction (no existe en BD, mostrar —)
        $customerSatisfaction = '—';

        // Deltas para delivery performance (vs last week)
        $lastWeekStart = $lastWeek->copy()->subWeek()->startOfWeek();
        $lastWeekEnd = $lastWeek->copy()->subWeek()->endOfWeek();
        $thisWeekStart = $now->copy()->startOfWeek();
        
        $packagesInTransitLastWeek = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('created_at', [$lastWeekStart, $lastWeekEnd]),
            $orgId,
            [ShipmentStatus::IN_TRANSIT->value]
        )->count();
        $packagesOutForDeliveryLastWeek = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('created_at', [$lastWeekStart, $lastWeekEnd]),
            $orgId,
            [ShipmentStatus::OUT_FOR_DELIVERY->value]
        )->count();
        $packagesDeliveredLastWeek = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)
                ->whereBetween('delivered_at', [$lastWeekStart, $lastWeekEnd]),
            $orgId,
            [ShipmentStatus::DELIVERED->value]
        )->count();

        $deliveryPerformanceDeltas = [
            'in_transit' => $packagesInTransitLastWeek > 0 
                ? round((($packagesInTransit - $packagesInTransitLastWeek) / $packagesInTransitLastWeek) * 100, 1) 
                : 0,
            'out_for_delivery' => $packagesOutForDeliveryLastWeek > 0 
                ? round((($packagesOutForDelivery - $packagesOutForDeliveryLastWeek) / $packagesOutForDeliveryLastWeek) * 100, 1) 
                : 0,
            'delivered' => $packagesDeliveredLastWeek > 0 
                ? round((($packagesDelivered - $packagesDeliveredLastWeek) / $packagesDeliveredLastWeek) * 100, 1) 
                : 0,
        ];

        // ===== REASONS FOR DELIVERY EXCEPTIONS (Donut) =====
        // Load reasons from DB (org-specific first, then global fallback).
        $reasonRows = DB::table('shipment_exception_reasons')
            ->where(function ($q) use ($orgId) {
                $q->where('organization_id', $orgId)->orWhereNull('organization_id');
            })
            ->where('is_active', true)
            ->orderByRaw('organization_id IS NULL')  // org-specific first
            ->orderBy('sort_order')
            ->pluck('name')
            ->unique()
            ->values()
            ->toArray();

        // Seed default key list so the donut always renders something
        if (empty($reasonRows)) {
            $reasonRows = ['Incorrect address', 'Weather conditions', 'Federal Holidays', 'Damage during transit'];
        }
        $exceptionReasons = array_fill_keys($reasonRows, 0);
        $defaultReason    = end($reasonRows); // last bucket as catch-all

        $exceptions = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::EXCEPTION->value, ShipmentStatus::ON_HOLD->value, ShipmentStatus::RETURNED->value]
        )->with(['activities' => function ($q) {
            $q->where('action', 'exception')->latest()->limit(1);
        }])->get();

        foreach ($exceptions as $exception) {
            $activity = $exception->activities->first();
            if ($activity && isset($activity->metadata['reason'])) {
                $reason = $activity->metadata['reason'];
                if (array_key_exists($reason, $exceptionReasons)) {
                    $exceptionReasons[$reason]++;
                } else {
                    $exceptionReasons[$defaultReason]++;
                }
            } else {
                $bucket = ($exception->status === ShipmentStatus::RETURNED)
                    ? ($exceptionReasons['Incorrect address'] !== null ? 'Incorrect address' : $defaultReason)
                    : $defaultReason;
                $exceptionReasons[$bucket]++;
            }
        }

        $totalExceptions = array_sum($exceptionReasons);
        $exceptionReasonsPercent = array_map(function ($count) use ($totalExceptions) {
            return $totalExceptions > 0 ? round(($count / $totalExceptions) * 100, 1) : 0;
        }, $exceptionReasons);

        $avgExceptionsPercent = $totalExceptions > 0 ? round(array_sum($exceptionReasonsPercent) / count($exceptionReasonsPercent), 1) : 0;

        // ===== ORDERS BY COUNTRIES (Tabs: New/Preparing/Shipping) =====
        $ordersNew = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::PENDING->value]
        )->latest()->limit(10)->get();
        
        $ordersPreparing = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::PROCESSED->value, ShipmentStatus::PICKED_UP->value]
        )->latest()->limit(10)->get();
        
        $ordersShipping = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::IN_TRANSIT->value, ShipmentStatus::OUT_FOR_DELIVERY->value]
        )->latest()->limit(10)->get();
        
        // Contar entregas en progreso (suma de las 3 categorías)
        $deliveriesInProgress = $ordersNew->count() + $ordersPreparing->count() + $ordersShipping->count();
        
        $ordersByCountries = [
            'new' => $ordersNew->map(function ($s) {
                return $this->formatOrderForCountryList($s);
            }),
            'preparing' => $ordersPreparing->map(function ($s) {
                return $this->formatOrderForCountryList($s);
            }),
            'shipping' => $ordersShipping->map(function ($s) {
                return $this->formatOrderForCountryList($s);
            }),
        ];

        // ===== ON ROUTE VEHICLES TABLE (con paginación) =====
        $perPage = $request->input('per_page', 15);
        $onRouteVehiclesQuery = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId),
            $orgId,
            [ShipmentStatus::IN_TRANSIT->value, ShipmentStatus::OUT_FOR_DELIVERY->value]
        )->latest();
        
        $onRouteVehiclesPaginated = $onRouteVehiclesQuery->with([
            'activities' => fn($q) => $q->where('action', 'exception')->latest()->limit(1),
            'history'    => fn($q) => $q->orderBy('created_at'),
        ])->paginate($perPage);
        $onRouteVehicles = $onRouteVehiclesPaginated->map(function ($shipment) {
            return $this->formatVehicleForTable($shipment);
        });

        // Opciones de mes para el filtro (últimos 6 meses)
        $monthOptions = [];
        for ($i = 0; $i < 6; $i++) {
            $m = $now->copy()->subMonths($i)->startOfMonth();
            $monthOptions[] = [
                'value' => $m->format('Y-m'),
                'label' => $m->translatedFormat('F Y'),
            ];
        }

        // ── Returns KPI — single aggregation replaces 4 separate queries ──────
        try {
            $returnsRaw = DB::table('return_shipments')
                ->where('organization_id', $orgId)
                ->selectRaw("
                    COUNT(CASE WHEN status = 'requested' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'approved'  THEN 1 END) as approved,
                    COALESCE(SUM(CASE
                        WHEN status IN ('approved','completed')
                         AND YEAR(created_at) = ? AND MONTH(created_at) = ?
                        THEN COALESCE(refund_amount, 0) ELSE 0 END), 0) as total_refund_month,
                    COUNT(CASE WHEN YEAR(created_at) = ? AND MONTH(created_at) = ? THEN 1 END) as total_this_month
                ", [$now->year, $now->month, $now->year, $now->month])
                ->first();
            $returnsKpi = [
                'pending'            => (int) ($returnsRaw->pending ?? 0),
                'approved'           => (int) ($returnsRaw->approved ?? 0),
                'total_refund_month' => (float) ($returnsRaw->total_refund_month ?? 0),
                'total_this_month'   => (int) ($returnsRaw->total_this_month ?? 0),
            ];
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('DashboardController: returnsKpi query failed', ['error' => $e->getMessage()]);
            $returnsKpi = ['pending' => 0, 'approved' => 0, 'total_refund_month' => 0.0, 'total_this_month' => 0];
        }

        return Inertia::render('Dashboard/Logistics', [
            'kpi' => [
                'on_route' => [
                    'value' => $onRouteNow,
                    'delta' => round($onRouteDelta, 1),
                ],
                'with_errors' => [
                    'value' => $withErrorsNow,
                    'delta' => round($withErrorsDelta, 1),
                ],
                'deviated' => [
                    'value' => $deviatedNow,
                    'delta' => round($deviatedDelta, 1),
                ],
                'late' => [
                    'value' => $lateNow,
                    'delta' => round($lateDelta, 1),
                ],
            ],
            'vehicles_overview' => [
                'on_the_way' => [
                    'count' => $vehiclesOverview['on_the_way'],
                    'percent' => $vehiclesOverviewPercent['on_the_way'],
                    'duration' => $vehiclesOverviewDuration['on_the_way'],
                ],
                'unloading' => [
                    'count' => $vehiclesOverview['unloading'],
                    'percent' => $vehiclesOverviewPercent['unloading'],
                    'duration' => $vehiclesOverviewDuration['unloading'],
                ],
                'loading' => [
                    'count' => $vehiclesOverview['loading'],
                    'percent' => $vehiclesOverviewPercent['loading'],
                    'duration' => $vehiclesOverviewDuration['loading'],
                ],
                'waiting' => [
                    'count' => $vehiclesOverview['waiting'],
                    'percent' => $vehiclesOverviewPercent['waiting'],
                    'duration' => $vehiclesOverviewDuration['waiting'],
                ],
            ],
            'shipment_statistics' => $shipmentStats,
            'delivery_performance' => [
                'monthly_increase_percent' => $monthlyIncreasePercent,
                'in_transit' => [
                    'value' => $packagesInTransit,
                    'delta' => $deliveryPerformanceDeltas['in_transit'],
                ],
                'out_for_delivery' => [
                    'value' => $packagesOutForDelivery,
                    'delta' => $deliveryPerformanceDeltas['out_for_delivery'],
                ],
                'delivered' => [
                    'value' => $packagesDelivered,
                    'delta' => $deliveryPerformanceDeltas['delivered'],
                ],
                'success_rate' => $successRate,
                'avg_delivery_time' => $avgDeliveryTimeFormatted,
                'customer_satisfaction' => $customerSatisfaction,
            ],
            'exception_reasons' => $exceptionReasonsPercent,
            'orders_by_countries' => [
                'data' => $ordersByCountries,
                'deliveries_in_progress' => $deliveriesInProgress,
            ],
            'on_route_vehicles' => $onRouteVehicles,
            'on_route_vehicles_meta' => [
                'current_page' => $onRouteVehiclesPaginated->currentPage(),
                'last_page' => $onRouteVehiclesPaginated->lastPage(),
                'per_page' => $onRouteVehiclesPaginated->perPage(),
                'total' => $onRouteVehiclesPaginated->total(),
                'from' => $onRouteVehiclesPaginated->firstItem(),
                'to' => $onRouteVehiclesPaginated->lastItem(),
            ],
            'month_options' => $monthOptions,
            'current_month' => $currentMonth->format('Y-m'),
            'setup_checklist' => $this->buildSetupChecklist($orgId),
            'returns_kpi' => $returnsKpi,
        ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('DashboardController::logistics failed', [
                'org_id' => $orgId,
                'error'  => $e->getMessage(),
                'file'   => $e->getFile() . ':' . $e->getLine(),
            ]);
            return Inertia::render('Dashboard/Logistics', ['_dashboard_error' => true]);
        }
    }

    private function buildSetupChecklist(int $orgId): ?array
    {
        $user = Auth::user();
        if (!$user->hasRole(['admin', 'super-admin'])) {
            return null;
        }

        $svc = app(\App\Services\SettingsService::class);
        $settings = $svc->forOrganization($orgId);

        $hasCompany     = !empty($settings->get('company', 'name', ''));
        $hasCustomers   = \App\Models\User::where('organization_id', $orgId)
                            ->whereHas('roles', fn($q) => $q->whereIn('name', ['customer', 'Customer']))
                            ->exists();
        $hasSmtp        = !empty($settings->get('notifications', 'smtp_host', ''));
        $hasRates       = \App\Models\RateRule::where('organization_id', $orgId)->where('active', true)->exists()
                       || \App\Models\RateCard::where('organization_id', $orgId)->where('active', true)->exists();

        $allDone = $hasCompany && $hasCustomers && $hasSmtp && $hasRates;
        if ($allDone) {
            return null; // Hide checklist once everything is configured
        }

        return [
            'company'   => $hasCompany,
            'customers' => $hasCustomers,
            'smtp'      => $hasSmtp,
            'rates'     => $hasRates,
        ];
    }

    /**
     * Helper: Calcular duración promedio por códigos de estado (usa status_id cuando está disponible)
     */
    /**
     * Calculate average duration in current status using a single SQL AVG — no in-memory loops.
     * Previous implementation fetched all shipments in PHP and iterated: O(n) memory, O(n) time.
     */
    private function getAverageDurationByCodes($orgId, array $codes): string
    {
        $driver = \DB::getDriverName();
        $expr = $driver === 'sqlite'
            ? "AVG((JULIANDAY(COALESCE(updated_at, datetime('now'))) - JULIANDAY(created_at)) * 24) as avg_hours"
            : 'AVG(TIMESTAMPDIFF(HOUR, created_at, IFNULL(updated_at, NOW()))) as avg_hours';

        $avgHours = $this->queryByStatusCodes(
            Shipment::where('organization_id', $orgId)->whereNotNull('created_at'),
            $orgId,
            $codes
        )->selectRaw($expr)
         ->value('avg_hours');

        if ($avgHours === null) {
            return '—';
        }

        $hours   = (int) $avgHours;
        $minutes = (int) (($avgHours - $hours) * 60);

        return $hours > 0 ? "{$hours}hr {$minutes}min" : "{$minutes}min";
    }

    /**
     * Helper: Formatear order para lista "Orders by Countries"
     */
    private function formatOrderForCountryList(Shipment $shipment): array
    {
        $sender = $shipment->sender_details ?? [];
        $receiver = $shipment->receiver_details ?? [];
        
        return [
            'id' => $shipment->id,
            'tracking_number' => $shipment->tracking_number,
            'sender' => [
                'name' => $sender['name'] ?? 'Unknown',
                'address' => $this->formatAddress($sender),
            ],
            'receiver' => [
                'name' => $receiver['name'] ?? 'Unknown',
                'address' => $this->formatAddress($receiver),
            ],
        ];
    }

    /**
     * Helper: Formatear address para display
     */
    private function formatAddress(array $details): string
    {
        $parts = [];
        if (!empty($details['address'])) {
            $parts[] = $details['address'];
        }
        if (!empty($details['city'])) {
            $city = $details['city'];
            if (!empty($details['state'])) {
                $city .= ', ' . $details['state'];
            }
            if (!empty($details['country'])) {
                $city .= ' (' . $details['country'] . ')';
            }
            $parts[] = $city;
        } elseif (!empty($details['country'])) {
            $parts[] = $details['country'];
        }
        if (!empty($details['zip_code'])) {
            $parts[] = $details['zip_code'];
        }
        return implode(', ', $parts) ?: 'Unknown';
    }

    /**
     * Helper: Formatear vehicle para tabla "On route vehicles"
     */
    private function formatVehicleForTable(Shipment $shipment): array
    {
        $sender = $shipment->sender_details ?? [];
        $receiver = $shipment->receiver_details ?? [];
        
        // Location = tracking_number (como ID de vehículo)
        $location = $shipment->tracking_number;
        
        // Starting route = sender address
        $startingRoute = $this->formatAddress($sender);
        
        // Ending route = receiver address
        $endingRoute = $this->formatAddress($receiver);
        
        // Warnings = basado en status/exception
        $warnings = $this->getWarningsForShipment($shipment);
        
        // Progress = % basado en milestones de tracking o fallback
        $progress = $this->calculateProgress($shipment);
        
        return [
            'id' => $shipment->id,
            'location' => $location,
            'starting_route' => $startingRoute,
            'ending_route' => $endingRoute,
            'warnings' => $warnings,
            'progress' => $progress,
        ];
    }

    /**
     * Helper: Obtener warnings para shipment
     */
    private function getWarningsForShipment(Shipment $shipment): array
    {
        if ($shipment->statusAsEnum() === ShipmentStatus::EXCEPTION) {
            // Use already-eager-loaded relation when available, fall back to query.
            $activity = $shipment->relationLoaded('activities')
                ? $shipment->activities->first()
                : \App\Models\ShipmentActivity::where('shipment_id', $shipment->id)
                    ->where('action', 'exception')->latest()->first();

            if ($activity && isset($activity->metadata['reason'])) {
                return ['text' => $activity->metadata['reason'], 'type' => 'error'];
            }
            return ['text' => 'Exception', 'type' => 'error'];
        }
        
        if ($shipment->statusAsEnum() === ShipmentStatus::ON_HOLD) {
            return [
                'text' => 'On Hold',
                'type' => 'warning',
            ];
        }
        
        if ($shipment->estimated_delivery_date && $shipment->estimated_delivery_date < now() && $shipment->statusAsEnum() !== ShipmentStatus::DELIVERED) {
            return [
                'text' => 'Delayed',
                'type' => 'warning',
            ];
        }
        
        return [
            'text' => 'No Warnings',
            'type' => 'success',
        ];
    }

    /**
     * Helper: Calcular progress % basado en tracking milestones
     */
    private function calculateProgress(Shipment $shipment): int
    {
        // Use already-eager-loaded history when available.
        $history = $shipment->relationLoaded('history')
            ? $shipment->history
            : $shipment->history()->orderBy('created_at')->get();
        if ($history->count() > 0) {
            // Mapear estados a porcentajes
            $statusProgress = [
                ShipmentStatus::PENDING->value => 0,
                ShipmentStatus::PROCESSED->value => 10,
                ShipmentStatus::PICKED_UP->value => 20,
                ShipmentStatus::IN_TRANSIT->value => 50,
                ShipmentStatus::OUT_FOR_DELIVERY->value => 80,
                ShipmentStatus::DELIVERED->value => 100,
            ];
            
            $currentStatus = $shipment->status ?? ($shipment->statusAsEnum()?->value ?? 'pending');
            return $statusProgress[$currentStatus] ?? 0;
        }
        
        // Fallback: 0% si no hay tracking
        return 0;
    }
}
