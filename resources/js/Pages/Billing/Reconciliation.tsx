import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { ArrowUpRight, ArrowDownRight, TrendingUp, ArrowLeft, Download, Search, X, Eye } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency } from '@/utils/localeFormat';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useState } from 'react';

export default function Reconciliation({ shipments, totals, filters }: { shipments: any; totals: any; filters?: any }) {
    const { t } = useTranslation();

    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo]     = useState(filters?.date_to ?? '');
    const [exporting, setExporting] = useState(false);

    const rows: any[] = shipments?.data ?? [];

    const applyFilters = () => {
        router.get(route('billing.reconciliation'), {
            ...(dateFrom ? { date_from: dateFrom } : {}),
            ...(dateTo   ? { date_to: dateTo }     : {}),
        }, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        setDateFrom(''); setDateTo('');
        router.get(route('billing.reconciliation'), {}, { preserveState: false, replace: true });
    };

    const handleExportPdf = () => {
        const qs = new URLSearchParams();
        if (dateFrom) qs.set('date_from', dateFrom);
        if (dateTo)   qs.set('date_to',   dateTo);
        const url = route('billing.reconciliation.export-pdf') + (qs.toString() ? '?' + qs.toString() : '');
        window.open(url, '_blank');
        setExporting(true);
        setTimeout(() => setExporting(false), 2500);
    };

    const hasFilters = dateFrom || dateTo;

    return (
        <AuthenticatedLayout>
            <Head title={t('billing.reconciliation_title')} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                            <Link href={route('billing.index')} className="gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                {t('billing.back_to_billing')}
                            </Link>
                        </Button>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('billing.reconciliation_title')}</h2>
                        <p className="text-muted-foreground mt-0.5 text-sm">{t('billing.reconciliation_subtitle')}</p>
                    </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('billing.total_revenue')}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals?.revenue ?? 0)}</span>
                            <ArrowUpRight className="h-5 w-5 text-green-500 shrink-0" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('billing.total_cost')}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals?.cost ?? 0)}</span>
                            <ArrowDownRight className="h-5 w-5 text-red-500 shrink-0" />
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border shadow-sm ${(totals?.profit ?? 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('billing.net_profit')}</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${(totals?.profit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(totals?.profit ?? 0)}
                            </span>
                            <TrendingUp className={`h-5 w-5 shrink-0 ${(totals?.profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                        {(totals?.revenue ?? 0) > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {(((totals?.profit ?? 0) / totals.revenue) * 100).toFixed(1)}% {t('billing.recon_margin')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs text-gray-400 pointer-events-none select-none z-10 bg-white dark:bg-gray-900 pr-1">
                                {t('billing.filter_date_from')}
                            </span>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="h-9 pl-16 w-full"
                            />
                        </div>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs text-gray-400 pointer-events-none select-none z-10 bg-white dark:bg-gray-900 pr-1">
                                {t('billing.filter_date_to')}
                            </span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="h-9 pl-14 w-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={applyFilters} className="bg-gray-900 hover:bg-black text-white gap-1.5 h-8">
                            <Search className="h-3.5 w-3.5" />
                            {t('billing.recon_apply_filters')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportPdf}
                            disabled={exporting}
                            className="gap-1.5 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                        >
                            <Download className="h-3.5 w-3.5" />
                            {exporting ? t('billing.recon_export_loading') : t('billing.recon_export_pdf')}
                        </Button>
                        {hasFilters && (
                            <Button size="sm" variant="outline" onClick={clearFilters} className="gap-1.5 h-8">
                                <X className="h-3.5 w-3.5" />
                                {t('billing.recon_clear')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">{t('billing.col_tracking')}</th>
                                    <th className="px-6 py-4 font-semibold">{t('billing.col_revenue')}</th>
                                    <th className="px-6 py-4 font-semibold">{t('billing.col_cost')}</th>
                                    <th className="px-6 py-4 font-semibold">{t('billing.col_profit')}</th>
                                    <th className="px-6 py-4 font-semibold text-right">{t('billing.col_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            {t('billing.no_shipments')}
                                            {hasFilters && (
                                                <button onClick={clearFilters} className="block mx-auto mt-2 text-sm text-indigo-600 hover:underline">
                                                    {t('billing.recon_clear')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((shipment) => {
                                        const revenue = shipment.total ?? 0;
                                        const cost    = shipment.cost_price ?? 0;
                                        const margin  = revenue - cost;
                                        const pct     = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : '0';
                                        const currency = shipment.currency ?? 'USD';

                                        return (
                                            <tr key={shipment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-mono font-semibold text-gray-900 dark:text-white">
                                                    {shipment.tracking_number}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {formatCurrency(revenue, currency)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                    {formatCurrency(cost, currency)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(margin, currency)}
                                                    </span>
                                                    <span className="ml-1 text-xs text-gray-400">({pct}%)</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={route('invoices.show', shipment.id)}>
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            {t('billing.action_audit')}
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <AppPagination variant="server" meta={shipments} pageSizeOptions={[15, 25, 50, 100]} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
