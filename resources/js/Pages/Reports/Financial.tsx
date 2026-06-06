import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { BarChart, DollarSign, Activity, TrendingUp, Package, RotateCcw, FileText, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    revenue: number;
    total_paid: number;
    total_partial: number;
    total_unpaid: number;
    shipment_count: number;
    delivered_count: number;
    monthly_data: Record<string, number>;
    returns_count?: number;
    returns_refund_total?: number;
    returns_by_reason?: Record<string, number>;
    returns_by_status?: Record<string, number>;
    filters: { date_from?: string; date_to?: string };
}

export default function Financial({
    revenue,
    total_paid,
    total_partial,
    total_unpaid,
    shipment_count,
    delivered_count,
    monthly_data,
    returns_count = 0,
    returns_refund_total = 0,
    returns_by_reason = {},
    returns_by_status = {},
    filters,
}: Props) {
    const { t } = useTranslation();
    const returnRate = revenue > 0 ? ((returns_refund_total / revenue) * 100).toFixed(1) : '0.0';
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');

    const applyFilters = () => {
        router.get(route('reports.financial'), {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveScroll: true });
    };

    const buildExportUrl = (routeName: string) => {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to', dateTo);
        const qs = params.toString();
        return route(routeName) + (qs ? '?' + qs : '');
    };

    const months = Object.keys(monthly_data);
    const values = Object.values(monthly_data);
    const maxValue = Math.max(...values, 1);

    const deliveryRate = shipment_count > 0
        ? ((delivered_count / shipment_count) * 100).toFixed(1)
        : '0.0';

    const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    return (
        <AuthenticatedLayout>
            <Head title="Financial Reports" />

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
                        <p className="text-muted-foreground mt-1">Performance analytics and revenue overview.</p>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500 font-medium">From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500 font-medium">To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={applyFilters}
                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Apply
                        </button>
                        <a
                            href={buildExportUrl('reports.financial.export-pdf')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            {t('reports.export_pdf')}
                        </a>
                        <a
                            href={buildExportUrl('reports.financial.export-excel')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('reports.export_excel')}
                        </a>
                        <a
                            href={buildExportUrl('reports.financial.export-gl')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('reports.export_gl') ?? 'Export GL'}
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Revenue Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <BarChart className="h-4 w-4 text-blue-600" />
                                Revenue — Last 7 Months
                            </h3>
                        </div>
                        <div className="h-64 flex items-end gap-2 justify-between px-4">
                            {values.map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full relative group h-[220px]">
                                        <div
                                            className="absolute bottom-0 w-full bg-blue-600 rounded-t-lg transition-all duration-500 hover:bg-blue-500"
                                            style={{ height: `${(val / maxValue) * 100}%` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                {fmt(val)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {months[i]?.slice(5) ?? ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Revenue (Paid + Partial)</p>
                                <p className="text-2xl font-bold text-gray-900">{fmt(revenue)}</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Paid / Partial / Unpaid</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {fmt(total_paid)} &nbsp;/&nbsp; {fmt(total_partial)} &nbsp;/&nbsp; {fmt(total_unpaid)}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Delivery Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{deliveryRate}%</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Shipments / Delivered</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {shipment_count.toLocaleString()} &nbsp;/&nbsp; {delivered_count.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Returns & Refunds Section */}
                <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
                        <RotateCcw className="h-4 w-4 text-red-500" />
                        {t('returns.title')} & {t('returns.refund_amount')}
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-red-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 font-medium">{t('returns.total')}</p>
                            <p className="text-3xl font-bold text-red-700">{returns_count}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 font-medium">{t('returns.refund_amount')}</p>
                            <p className="text-3xl font-bold text-orange-700">{fmt(returns_refund_total)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 font-medium">{t('finance.net_after_refunds')}</p>
                            <p className={`text-3xl font-bold ${(revenue - returns_refund_total) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {fmt(revenue - returns_refund_total)}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 font-medium">{t('finance.refund_rate')}</p>
                            <p className="text-3xl font-bold text-gray-700">{returnRate}%</p>
                        </div>
                    </div>
                    {Object.keys(returns_by_reason).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('returns.reason')}</p>
                                <div className="space-y-2">
                                    {Object.entries(returns_by_reason).map(([reason, cnt]) => (
                                        <div key={reason} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                                            <span className="text-sm text-gray-700">{t(`returns.reason_${reason}`)}</span>
                                            <span className="font-bold text-sm text-red-600">{cnt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('returns.status')}</p>
                                <div className="space-y-2">
                                    {Object.entries(returns_by_status).map(([status, cnt]) => (
                                        <div key={status} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                                            <span className="text-sm text-gray-700">{t(`returns.status_${status}`)}</span>
                                            <span className="font-bold text-sm text-gray-600">{cnt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
