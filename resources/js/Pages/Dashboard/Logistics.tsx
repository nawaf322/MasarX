import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/UI/card";
import { Badge } from "@/Components/UI/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/UI/tabs";
import {
    Truck,
    AlertTriangle,
    Users,
    Clock,
    ArrowUp,
    ArrowDown,
    MoreVertical,
    CheckCircle2,
    MapPin,
    Package,
    TrendingUp,
    Car,
    ArrowDownCircle,
    ArrowUpCircle,
    RotateCcw,
} from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { Progress } from "@/Components/UI/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/UI/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/UI/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { router } from "@inertiajs/react";
import React, { useState } from "react";
import { AppPagination } from "@/Components/Shared/AppPagination";

interface LogisticsDashboardProps {
    kpi: {
        on_route: { value: number; delta: number };
        with_errors: { value: number; delta: number };
        deviated: { value: number; delta: number };
        late: { value: number; delta: number };
    };
    vehicles_overview: {
        on_the_way: { count: number; percent: number; duration: string };
        unloading: { count: number; percent: number; duration: string };
        loading: { count: number; percent: number; duration: string };
        waiting: { count: number; percent: number; duration: string };
    };
    shipment_statistics: Array<{
        date: string;
        day: string;
        month: string;
        created: number;
        delivered: number;
    }>;
    delivery_performance: {
        monthly_increase_percent: number;
        in_transit: { value: number; delta: number };
        out_for_delivery: { value: number; delta: number };
        delivered: { value: number; delta: number };
        success_rate: number;
        avg_delivery_time: string;
        customer_satisfaction: string;
    };
    exception_reasons: {
        'Incorrect address': number;
        'Weather conditions': number;
        'Federal Holidays': number;
        'Damage during transit': number;
    };
    orders_by_countries: {
        data: {
            new: Array<{ id: number; tracking_number: string; sender: { name: string; address: string }; receiver: { name: string; address: string } }>;
            preparing: Array<{ id: number; tracking_number: string; sender: { name: string; address: string }; receiver: { name: string; address: string } }>;
            shipping: Array<{ id: number; tracking_number: string; sender: { name: string; address: string }; receiver: { name: string; address: string } }>;
        };
        deliveries_in_progress: number;
    };
    on_route_vehicles: Array<{
        id: number;
        location: string;
        starting_route: string;
        ending_route: string;
        warnings: { text: string; type: 'success' | 'warning' | 'error' };
        progress: number;
    }>;
    on_route_vehicles_meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
    };
    month_options: { value: string; label: string }[];
    current_month: string;
    setup_checklist?: { company: boolean; customers: boolean; smtp: boolean; rates: boolean } | null;
    returns_kpi?: {
        pending: number;
        approved: number;
        total_refund_month: number;
        total_this_month: number;
    };
}

export default function Logistics({
    kpi,
    vehicles_overview,
    shipment_statistics,
    delivery_performance,
    exception_reasons,
    orders_by_countries,
    on_route_vehicles,
    on_route_vehicles_meta,
    month_options,
    current_month,
    setup_checklist,
    returns_kpi,
}: LogisticsDashboardProps) {
    const { t } = useTranslation();
    // Colores para donut chart (verdes según imagen)
    const EXCEPTION_COLORS = ['#10b981', '#34d399', '#059669', '#047857'];
    // Mapeo de nombres de excepciones a claves de traducción
    const exceptionNameMap: Record<string, string> = {
        'Incorrect address': 'incorrect_address',
        'Weather conditions': 'weather_conditions',
        'Federal Holidays': 'federal_holidays',
        'Damage during transit': 'damage_during_transit',
    };
    const exceptionData = Object.entries(exception_reasons).map(([name, value], idx) => ({
        name,
        translatedName: t(`dashboard.${exceptionNameMap[name] || name.toLowerCase().replace(/\s+/g, '_')}`) || name,
        value,
        color: EXCEPTION_COLORS[idx % EXCEPTION_COLORS.length]
    }));

    const totalExceptions = Object.values(exception_reasons).reduce((a, b) => a + b, 0);
    const avgExceptions = totalExceptions > 0 ? Math.round((totalExceptions / 4) * 10) / 10 : 0;
    
    // Asegurar que los porcentajes sumen 100% para el donut
    const totalPercent = Object.values(exception_reasons).reduce((a, b) => a + b, 0);
    const normalizedExceptionData = totalPercent > 0 
        ? exceptionData.map(item => ({ ...item, value: item.value }))
        : exceptionData;

    // Badge colors para warnings
    const getWarningBadgeClass = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'warning':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'error':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const formatDelta = (delta: number) => {
        const isPositive = delta >= 0;
        const Icon = isPositive ? ArrowUp : ArrowDown;
        return (
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <Icon className="h-3 w-3" />
                {Math.abs(delta).toFixed(1)}%
            </span>
        );
    };

    // Preparar datos para stacked bar (horizontal)
    const vehiclesPerc = {
        on_the_way: vehicles_overview.on_the_way.percent || 0,
        unloading: vehicles_overview.unloading.percent || 0,
        loading: vehicles_overview.loading.percent || 0,
        waiting: vehicles_overview.waiting.percent || 0,
    };

    const [showShipment, setShowShipment] = useState(true);
    const [showDelivery, setShowDelivery] = useState(true);

    return (
        <AuthenticatedLayout>
            <Head title={t("dashboard.title")} />

            <div className="space-y-6 p-0">

                {/* ── Setup Checklist (shown until all items are configured) ── */}
                {setup_checklist && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🚀</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-3">
                                    {t('dashboard.setup_title')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                    {[
                                        { done: setup_checklist.company,   icon: '🏢', label: t('dashboard.setup_company'),   href: '/settings/company' },
                                        { done: setup_checklist.customers, icon: '👥', label: t('dashboard.setup_customers'), href: '/customers' },
                                        { done: setup_checklist.smtp,      icon: '📧', label: t('dashboard.setup_smtp'),      href: '/settings/notifications' },
                                        { done: setup_checklist.rates,     icon: '💲', label: t('dashboard.setup_rates'),     href: '/rates' },
                                    ].map(({ done, icon, label, href }) => (
                                        <a
                                            key={href}
                                            href={done ? '#' : href}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                                                done
                                                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400 cursor-default'
                                                    : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 dark:bg-gray-900 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40'
                                            }`}
                                        >
                                            <span>{done ? '✅' : icon}</span>
                                            <span className={done ? 'line-through opacity-60' : ''}>{label}</span>
                                            {!done && <span className="ml-auto text-amber-400">→</span>}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* KPI Cards - Top Row (4 cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* On route vehicles - Purple truck */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-purple-100">
                                        <Truck className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">{t("dashboard.on_route_vehicles")}</p>
                                        <p className="text-3xl font-bold text-gray-900">{kpi.on_route.value}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {formatDelta(kpi.on_route.delta)}
                                <span className="text-xs text-gray-500">{t("dashboard.than_last_week")}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vehicles with errors - Yellow/Orange warning */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-yellow-100">
                                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">{t("dashboard.vehicles_with_errors")}</p>
                                        <p className="text-3xl font-bold text-gray-900">{kpi.with_errors.value}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {formatDelta(kpi.with_errors.delta)}
                                <span className="text-xs text-gray-500">{t("dashboard.than_last_week")}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Deviated from route - Red users/route */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-red-100">
                                        <Users className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">{t("dashboard.deviated_from_route")}</p>
                                        <p className="text-3xl font-bold text-gray-900">{kpi.deviated.value}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {formatDelta(kpi.deviated.delta)}
                                <span className="text-xs text-gray-500">{t("dashboard.than_last_week")}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Late vehicles - Blue/Teal clock */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-blue-100">
                                        <Clock className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">{t("dashboard.late_vehicles")}</p>
                                        <p className="text-3xl font-bold text-gray-900">{kpi.late.value}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {formatDelta(kpi.late.delta)}
                                <span className="text-xs text-gray-500">{t("dashboard.than_last_week")}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Returns KPI Row */}
                {returns_kpi !== undefined && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-orange-100 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/40 shrink-0">
                                    <RotateCcw className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('returns.pending_approval')}</p>
                                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{returns_kpi.pending}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-blue-100 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('returns.status_approved')}</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{returns_kpi.approved}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-purple-100 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 shrink-0">
                                    <Package className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('returns.title')} {t('common.this_month')}</p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{returns_kpi.total_this_month}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-red-100 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 shrink-0">
                                    <TrendingUp className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('returns.refund_amount')} ({t('common.this_month')})</p>
                                    <p className="text-xl font-bold text-red-700 dark:text-red-400">
                                        ${returns_kpi.total_refund_month.toFixed(2)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Row 2: Vehicles Overview (Left) + Shipment Statistics (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vehicles Overview - barra horizontal por porcentaje */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-lg font-semibold">{t("dashboard.vehicles_overview") || "Vehicles Overview"}</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1 rounded-md hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.reload()}>{t("common.refresh") || "Refresh"}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Preparar items con valores > 0 para mostrar dinámicamente */}
                            {(() => {
                                const items = [
                                    { 
                                        key: 'on_the_way', 
                                        percent: vehicles_overview.on_the_way.percent || 0, 
                                        label: t("dashboard.on_the_way") || "On the way",
                                        color: 'bg-purple-600',
                                        textColor: 'text-white'
                                    },
                                    { 
                                        key: 'unloading', 
                                        percent: vehicles_overview.unloading.percent || 0, 
                                        label: t("dashboard.unloading") || "Unloading",
                                        color: 'bg-red-500',
                                        textColor: 'text-white'
                                    },
                                    { 
                                        key: 'loading', 
                                        percent: vehicles_overview.loading.percent || 0, 
                                        label: t("dashboard.loading") || "Loading",
                                        color: 'bg-green-500',
                                        textColor: 'text-white'
                                    },
                                    { 
                                        key: 'waiting', 
                                        percent: vehicles_overview.waiting.percent || 0, 
                                        label: t("dashboard.waiting") || "Waiting",
                                        color: 'bg-gray-300',
                                        textColor: 'text-gray-900'
                                    }
                                ].filter(item => item.percent > 0);
                                
                                return (
                                    <div className="relative">
                                        {/* Etiquetas arriba solo para items con valor > 0 */}
                                        {items.length > 0 && (
                                            <div className="flex text-xs text-gray-600 font-medium mb-2">
                                                {items.map((item, idx) => (
                                                    <div 
                                                        key={item.key} 
                                                        className="flex flex-col items-start relative" 
                                                        style={{ width: `${item.percent}%` }}
                                                    >
                                                        <span className="mb-1">{item.label}</span>
                                                        <div className="absolute bottom-0 left-0 w-px h-2 bg-gray-300"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Barra horizontal segmentada con colores correctos */}
                                        <div className="w-full h-10 rounded-lg overflow-hidden flex text-sm font-semibold">
                                            {items.map((item) => (
                                                <div
                                                    key={item.key}
                                                    className={`flex items-center justify-center ${item.color} ${item.textColor}`}
                                                    style={{ width: `${item.percent}%` }}
                                                >
                                                    {`${item.percent.toFixed(1)}%`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            {/* Lista detallada solo para items con valor > 0 */}
                            {(() => {
                                const listItems = [
                                    { 
                                        key: 'on_the_way', 
                                        percent: vehicles_overview.on_the_way.percent || 0,
                                        duration: vehicles_overview.on_the_way.duration,
                                        label: t("dashboard.on_the_way"),
                                        icon: Car,
                                        iconColor: 'text-purple-600'
                                    },
                                    { 
                                        key: 'unloading', 
                                        percent: vehicles_overview.unloading.percent || 0,
                                        duration: vehicles_overview.unloading.duration,
                                        label: t("dashboard.unloading"),
                                        icon: ArrowDownCircle,
                                        iconColor: 'text-red-500'
                                    },
                                    { 
                                        key: 'loading', 
                                        percent: vehicles_overview.loading.percent || 0,
                                        duration: vehicles_overview.loading.duration,
                                        label: t("dashboard.loading"),
                                        icon: ArrowUpCircle,
                                        iconColor: 'text-green-600'
                                    },
                                    { 
                                        key: 'waiting', 
                                        percent: vehicles_overview.waiting.percent || 0,
                                        duration: vehicles_overview.waiting.duration,
                                        label: t("dashboard.waiting"),
                                        icon: Clock,
                                        iconColor: 'text-gray-600'
                                    }
                                ].filter(item => item.percent > 0);
                                
                                return (
                                    <div className="space-y-5 pt-2">
                                        {listItems.map((item, idx) => {
                                            const IconComponent = item.icon;
                                            return (
                                                <div 
                                                    key={item.key} 
                                                    className={`flex items-center justify-between py-1 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <IconComponent className={`h-5 w-5 ${item.iconColor} flex-shrink-0`} />
                                                        <span className="text-sm font-medium text-gray-900">{item.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <span className="text-sm text-gray-600 text-right min-w-[80px]">{item.duration}</span>
                                                        <span className="text-sm font-semibold text-gray-900 min-w-[55px] text-right">{item.percent.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    {/* Shipment Statistics - Chart con barras naranjas + línea morada */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg font-semibold">{t("dashboard.shipment_statistics") || "Shipment statistics"}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">
                                    {(() => {
                                        const total = shipment_statistics.reduce((sum, d) => sum + Number(d.delivered || 0), 0);
                                        const formatted = total >= 1000 ? (total / 1000).toFixed(1) + 'k' : String(total);
                                        return t("dashboard.shipment_statistics_total", { total: formatted }) || `Total number of deliveries ${formatted}`;
                                    })()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Filtro por mes */}
                                <select
                                    value={current_month}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        router.get(route("dashboard.logistics"), { month: value }, { preserveScroll: true });
                                    }}
                                    className="text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    {month_options.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1 rounded-md hover:bg-gray-100">
                                            <MoreVertical className="h-4 w-4 text-gray-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.reload()}>{t("common.refresh") || "Refresh"}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <ComposedChart data={shipment_statistics} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'white', 
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }} 
                                    />
                                    {showShipment && (
                                        <Bar dataKey="created" fill="#f97316" name={t("dashboard.series_shipment") || "Shipment"} radius={[4, 4, 0, 0]} />
                                    )}
                                    {showDelivery && (
                                        <Line 
                                            type="monotone" 
                                            dataKey="delivered" 
                                            stroke="#6366f1" 
                                            strokeWidth={2} 
                                            name={t("dashboard.series_delivery") || "Delivery"} 
                                            dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6 }}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                            {/* Leyenda tipo botón para activar/desactivar series */}
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowShipment((v) => !v)}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                                        showShipment ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-gray-400 border-gray-200'
                                    }`}
                                >
                                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                                    {t("dashboard.series_shipment") || "Shipment"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDelivery((v) => !v)}
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                                        showDelivery ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-gray-400 border-gray-200'
                                    }`}
                                >
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                    {t("dashboard.series_delivery") || "Delivery"}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 3: Delivery Performance + Reasons + Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Delivery Performance */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-lg font-semibold">{t("dashboard.delivery_performance")}</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1 rounded-md hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.reload()}>{t("common.refresh") || "Refresh"}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-6">
                                {t("dashboard.increase_in_month", { percent: delivery_performance.monthly_increase_percent })}
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                            <Package className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">{t("dashboard.packages_in_transit")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {delivery_performance.in_transit.value >= 1000 
                                                ? (delivery_performance.in_transit.value / 1000).toFixed(1) + 'k' 
                                                : delivery_performance.in_transit.value}
                                        </span>
                                        {formatDelta(delivery_performance.in_transit.delta)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                                            <Truck className="h-5 w-5 text-cyan-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">{t("dashboard.packages_out_for_delivery")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {delivery_performance.out_for_delivery.value >= 1000 
                                                ? (delivery_performance.out_for_delivery.value / 1000).toFixed(1) + 'k' 
                                                : delivery_performance.out_for_delivery.value}
                                        </span>
                                        {formatDelta(delivery_performance.out_for_delivery.delta)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">{t("dashboard.packages_delivered")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {delivery_performance.delivered.value >= 1000 
                                                ? (delivery_performance.delivered.value / 1000).toFixed(1) + 'k' 
                                                : delivery_performance.delivered.value}
                                        </span>
                                        {formatDelta(delivery_performance.delivered.delta)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                            <TrendingUp className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">{t("dashboard.delivery_success_rate")}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{delivery_performance.success_rate}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <Clock className="h-5 w-5 text-gray-700" />
                                        </div>
                                        <span className="text-sm text-gray-700">{t("dashboard.average_delivery_time")}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{delivery_performance.avg_delivery_time}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                                            <Users className="h-5 w-5 text-red-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">{t("dashboard.customer_satisfaction")}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{delivery_performance.customer_satisfaction}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reasons for delivery exceptions - Donut chart */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-lg font-semibold">{t("dashboard.reasons_for_delivery_exceptions")}</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1 rounded-md hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.reload()}>{t("common.refresh") || "Refresh"}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center h-48 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={exceptionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {exceptionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-gray-900">{avgExceptions}%</p>
                                        <p className="text-xs text-gray-500 uppercase">{t("dashboard.avg_exceptions")}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {exceptionData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-sm text-gray-700">{item.translatedName}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Orders by Countries */}
                    <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg font-semibold">{t("dashboard.orders_by_countries")}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">
                                    {t("dashboard.deliveries_in_progress", { count: orders_by_countries.deliveries_in_progress })}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1 rounded-md hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.reload()}>{t("common.refresh") || "Refresh"}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="new" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
                                    <TabsTrigger value="new" className="data-[state=active]:bg-white data-[state=active]:text-purple-600">{t("dashboard.new")}</TabsTrigger>
                                    <TabsTrigger value="preparing" className="data-[state=active]:bg-white data-[state=active]:text-purple-600">{t("dashboard.preparing")}</TabsTrigger>
                                    <TabsTrigger value="shipping" className="data-[state=active]:bg-white data-[state=active]:text-purple-600">{t("dashboard.shipping")}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="new" className="mt-4 space-y-4 max-h-64 overflow-y-auto">
                                    {orders_by_countries.data.new.length > 0 ? (
                                        orders_by_countries.data.new.map((order, idx) => (
                                            <div key={order.id} className="relative pb-4 last:pb-0">
                                                {idx < orders_by_countries.data.new.length - 1 && (
                                                    <div className="absolute bottom-0 left-0 right-0 border-b border-dashed border-gray-300"></div>
                                                )}
                                                <div className="flex items-start gap-3 relative">
                                                    <div className="flex flex-col items-center flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        </div>
                                                        <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300 my-1"></div>
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                            <MapPin className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                                                        <div>
                                                            <Badge className="bg-green-100 text-green-700 text-xs font-semibold mb-1 px-2 py-0.5">{t("dashboard.sender")}</Badge>
                                                            <p className="text-sm font-semibold text-gray-900">{order.sender.name}</p>
                                                            <p className="text-xs text-gray-500">{order.sender.address}</p>
                                                        </div>
                                                        <div>
                                                            <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold mb-1 px-2 py-0.5">{t("dashboard.receiver")}</Badge>
                                                            <p className="text-sm font-semibold text-gray-900">{order.receiver.name}</p>
                                                            <p className="text-xs text-gray-500">{order.receiver.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-gray-500">{t("dashboard.no_data")}</p>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="preparing" className="mt-4 space-y-4 max-h-64 overflow-y-auto">
                                    {orders_by_countries.data.preparing.length > 0 ? (
                                        orders_by_countries.data.preparing.map((order, idx) => (
                                            <div key={order.id} className="relative pb-4 last:pb-0">
                                                {idx < orders_by_countries.data.preparing.length - 1 && (
                                                    <div className="absolute bottom-0 left-0 right-0 border-b border-dashed border-gray-300"></div>
                                                )}
                                                <div className="flex items-start gap-3 relative">
                                                    <div className="flex flex-col items-center flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        </div>
                                                        <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300 my-1"></div>
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                            <MapPin className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                                                        <div>
                                                            <Badge className="bg-green-100 text-green-700 text-xs font-semibold mb-1 px-2 py-0.5">{t("dashboard.sender")}</Badge>
                                                            <p className="text-sm font-semibold text-gray-900">{order.sender.name}</p>
                                                            <p className="text-xs text-gray-500">{order.sender.address}</p>
                                                        </div>
                                                        <div>
                                                            <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold mb-1 px-2 py-0.5">{t("dashboard.receiver")}</Badge>
                                                            <p className="text-sm font-semibold text-gray-900">{order.receiver.name}</p>
                                                            <p className="text-xs text-gray-500">{order.receiver.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-gray-500">{t("dashboard.no_data")}</p>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="shipping" className="mt-4 space-y-4 max-h-64 overflow-y-auto">
                                    {orders_by_countries.data.shipping.length > 0 ? (
                                        orders_by_countries.data.shipping.map((order, idx) => (
                                            <div key={order.id} className="relative pb-4 last:pb-0">
                                                {idx < orders_by_countries.data.shipping.length - 1 && (
                                                    <div className="absolute bottom-0 left-0 right-0 border-b border-dashed border-gray-300"></div>
                                                )}
                                                <div className="flex items-start gap-3 relative">
                                                    <div className="flex flex-col items-center flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        </div>
                                                        <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300 my-1"></div>
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                            <MapPin className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                                                        <div>
                                                            <Badge className="bg-green-100 text-green-700 text-xs font-semibold mb-1 px-2 py-0.5">{t("dashboard.sender")}</Badge>
                                                            <p className="text-sm font-semibold text-gray-900">{order.sender.name}</p>
                                                            <p className="text-xs text-gray-500">{order.sender.address}</p>
                                                        </div>
                                                        <div>
                                                            <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold mb-1 px-2 py-0.5">{t("dashboard.receiver")}</Badge>
                                                            <p className="text-sm font-semibold text-gray-900">{order.receiver.name}</p>
                                                            <p className="text-xs text-gray-500">{order.receiver.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-gray-500">{t("dashboard.no_data")}</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* On route vehicles table */}
                <Card className="bg-white border-0 shadow-md">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">{t("dashboard.on_route_vehicles")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {on_route_vehicles.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200">
                                                <TableHead className="font-semibold text-gray-700">{t("dashboard.location")}</TableHead>
                                                <TableHead className="font-semibold text-gray-700">{t("dashboard.starting_route")}</TableHead>
                                                <TableHead className="font-semibold text-gray-700">{t("dashboard.ending_route")}</TableHead>
                                                <TableHead className="font-semibold text-gray-700">{t("dashboard.warnings")}</TableHead>
                                                <TableHead className="font-semibold text-gray-700">{t("dashboard.progress")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {on_route_vehicles.map((vehicle) => (
                                                <TableRow key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Truck className="h-4 w-4 text-gray-600" />
                                                            <span className="font-medium text-gray-900">{vehicle.location}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-gray-700">{vehicle.starting_route}</TableCell>
                                                    <TableCell className="py-4 text-gray-700">{vehicle.ending_route}</TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge className={`${getWarningBadgeClass(vehicle.warnings.type)} border px-3 py-1 rounded-full text-xs font-medium`}>
                                                            {vehicle.warnings.text}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 max-w-32">
                                                                <Progress value={vehicle.progress} className="h-2" />
                                                            </div>
                                                            <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">{vehicle.progress}%</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {on_route_vehicles_meta && (
                                    <AppPagination
                                        variant="server"
                                        meta={on_route_vehicles_meta}
                                        pageSizeOptions={[10, 15, 25, 50]}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm text-gray-500">{t("dashboard.no_data")}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>


            </div>
        </AuthenticatedLayout>
    );
}
