import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Scan, FileText, Package, AlertCircle, Truck, ArrowRight, Clock } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';

function timeAgo(dateStr: string, t: (k: string) => string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
    if (diff < 2)  return t('warehouse.just_now');
    if (diff < 60) return `${diff} ${t('warehouse.ago_mins')}`;
    return `${Math.floor(diff / 60)} ${t('warehouse.ago_hours')}`;
}

export default function Index({
    stats = { inventory_count: 0, aging_count: 0, open_manifests: 0, dispatched_today: 0 },
    recent_scans = [],
}: {
    stats?: { inventory_count: number; aging_count: number; open_manifests: number; dispatched_today: number };
    recent_scans?: any[];
}) {
    const { t } = useTranslation();

    const kpis = [
        {
            label: t('warehouse.kpi_inventory'),
            value: stats.inventory_count,
            icon: Package,
            bg: 'bg-orange-50',
            iconColor: 'text-orange-500',
            border: 'border-orange-100',
        },
        {
            label: t('warehouse.kpi_aging'),
            value: stats.aging_count,
            icon: AlertCircle,
            bg: stats.aging_count > 0 ? 'bg-red-50' : 'bg-gray-50',
            iconColor: stats.aging_count > 0 ? 'text-red-500' : 'text-gray-400',
            border: stats.aging_count > 0 ? 'border-red-200' : 'border-gray-100',
            valueColor: stats.aging_count > 0 ? 'text-red-600' : undefined,
        },
        {
            label: t('warehouse.kpi_open_manifests'),
            value: stats.open_manifests,
            icon: FileText,
            bg: 'bg-purple-50',
            iconColor: 'text-purple-500',
            border: 'border-purple-100',
        },
        {
            label: t('warehouse.kpi_dispatched_today'),
            value: stats.dispatched_today,
            icon: Truck,
            bg: 'bg-blue-50',
            iconColor: 'text-blue-500',
            border: 'border-blue-100',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('warehouse.title')} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('warehouse.title')}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{t('warehouse.subtitle')}</p>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className={`bg-white rounded-xl border ${kpi.border} shadow-sm p-4 flex items-center gap-3`}>
                            <div className={`h-10 w-10 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${kpi.valueColor ?? 'text-gray-900'}`}>{kpi.value}</p>
                                <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Module cards + recent activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: module cards */}
                    <div className="lg:col-span-2 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('warehouse.quick_access')}</p>

                        {/* Receive */}
                        <Link href={route('warehouse.receive')} className="group block">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all">
                                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                    <Scan className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900">{t('warehouse.receive_title')}</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{t('warehouse.receive_subtitle')}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
                            </div>
                        </Link>

                        {/* Manifests */}
                        <Link href={route('warehouse.manifests.index')} className="group block">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-purple-200 transition-all">
                                <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                                    <FileText className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900">{t('warehouse.manifest_title')}</h3>
                                        {stats.open_manifests > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                                {stats.open_manifests}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{t('warehouse.manifest_subtitle')}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-purple-400 transition-colors shrink-0" />
                            </div>
                        </Link>

                        {/* Inventory */}
                        <Link href={route('warehouse.inventory.index')} className="group block">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-orange-200 transition-all">
                                <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                                    <Package className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900">{t('warehouse.inventory_title')}</h3>
                                        {stats.inventory_count > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                                {stats.inventory_count}
                                            </span>
                                        )}
                                        {stats.aging_count > 0 && (
                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                <AlertCircle className="h-3 w-3" />
                                                {stats.aging_count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{t('warehouse.inventory_subtitle')}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-orange-400 transition-colors shrink-0" />
                            </div>
                        </Link>
                    </div>

                    {/* Right: recent activity */}
                    <div className="lg:col-span-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('warehouse.recent_activity')}</p>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {recent_scans.length === 0 ? (
                                <div className="px-4 py-10 text-center">
                                    <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('warehouse.no_recent_activity')}</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {recent_scans.map((scan: any) => {
                                        const dest = [scan.receiver_details?.city, scan.receiver_details?.country].filter(Boolean).join(', ') || '—';
                                        return (
                                            <li key={scan.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                                                <div className="h-7 w-7 rounded-md bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Package className="h-3.5 w-3.5 text-orange-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-mono text-xs font-semibold text-gray-900 truncate">{scan.tracking_number}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{dest}</p>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {timeAgo(scan.updated_at, t)}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
