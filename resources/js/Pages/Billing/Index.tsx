import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { FileText, Search, X, Download, Eye, RotateCcw, Coins, Clock, CheckCircle, AlertCircle, User, ExternalLink } from "lucide-react";
import { Badge } from "@/Components/UI/badge";
import { formatDate, formatCurrency } from '@/utils/localeFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useState } from 'react';

/** Safe route helper — returns '#' if the named route is not registered (e.g. Premium-only features). */
const safeRoute = (name: string, ...args: any[]): string => {
    try {
        const ziggy = (window as any).Ziggy;
        if (!ziggy?.routes?.[name]) return '#';
        return route(name, ...args);
    } catch { return '#'; }
};

function paymentBadge(status: string, t: (k: string) => string) {
    switch (status) {
        case 'paid':
            return <Badge variant="success" className="capitalize">{t('billing.filter_paid')}</Badge>;
        case 'partial':
            return <Badge variant="warning" className="capitalize">{t('billing.filter_partial')}</Badge>;
        case 'refunded':
            return <Badge variant="secondary" className="capitalize">{t('billing.filter_refunded')}</Badge>;
        default:
            return <Badge variant="secondary" className="capitalize">{t('billing.filter_unpaid')}</Badge>;
    }
}

export default function Index({ invoices, filters, commission_payables, commission_summary }: {
    invoices: any; filters?: any;
    commission_payables?: any[];
    commission_summary?: { pending_amount: number; approved_amount: number; total_payable: number; count: number };
}) {
    const { t } = useTranslation();

    const [search, setSearch]     = useState(filters?.search ?? '');
    const [status, setStatus]     = useState(filters?.status ?? '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo]     = useState(filters?.date_to ?? '');
    const [exporting, setExporting] = useState(false);

    const rows: any[] = invoices?.data ?? [];

    const applyFilters = () => {
        router.get(route('billing.index'), {
            ...(search   ? { search }              : {}),
            ...(status   ? { status }              : {}),
            ...(dateFrom ? { date_from: dateFrom } : {}),
            ...(dateTo   ? { date_to: dateTo }     : {}),
        }, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        setSearch(''); setStatus(''); setDateFrom(''); setDateTo('');
        router.get(route('billing.index'), {}, { preserveState: false, replace: true });
    };

    const handleExportPdf = () => {
        const qs = new URLSearchParams();
        if (search)   qs.set('search',    search);
        if (status)   qs.set('status',    status);
        if (dateFrom) qs.set('date_from', dateFrom);
        if (dateTo)   qs.set('date_to',   dateTo);
        const url = route('billing.export-pdf') + (qs.toString() ? '?' + qs.toString() : '');
        window.open(url, '_blank');
        setExporting(true);
        setTimeout(() => setExporting(false), 2500);
    };

    const hasFilters = search || status || dateFrom || dateTo;

    return (
        <AuthenticatedLayout>
            <Head title={t('billing.page_title')} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('billing.heading')}</h2>
                        <p className="text-muted-foreground mt-0.5 text-sm">{t('billing.subtitle')}</p>
                    </div>

                </div>

                {/* Commission Payables */}
                {commission_summary && commission_summary.count > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                        {/* Section header */}
                        <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Coins className="h-5 w-5 text-amber-600" />
                                <div>
                                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">{t('billing.commissions_payable_title')}</h3>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">{t('billing.commissions_payable_subtitle')}</p>
                                </div>
                            </div>
                            {safeRoute('commissions.index') !== '#' && (
                                <Link href={safeRoute('commissions.index')} className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline font-medium">
                                    {t('billing.view_commissions')} <ExternalLink className="h-3 w-3" />
                                </Link>
                            )}
                        </div>

                        {/* KPI cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-amber-100 dark:bg-amber-800/30 border-b border-amber-100 dark:border-amber-800">
                            {[
                                { label: t('billing.comm_total_payable'), value: formatCurrency(commission_summary.total_payable), icon: <Coins className="h-4 w-4 text-amber-500" />, bg: 'bg-white dark:bg-gray-900' },
                                { label: t('billing.comm_pending'),        value: formatCurrency(commission_summary.pending_amount),  icon: <Clock className="h-4 w-4 text-yellow-500" />, bg: 'bg-white dark:bg-gray-900' },
                                { label: t('billing.comm_approved'),       value: formatCurrency(commission_summary.approved_amount), icon: <CheckCircle className="h-4 w-4 text-blue-500" />, bg: 'bg-white dark:bg-gray-900' },
                                { label: t('billing.comm_count'),          value: String(commission_summary.count),                   icon: <User className="h-4 w-4 text-gray-400" />, bg: 'bg-white dark:bg-gray-900' },
                            ].map((kpi) => (
                                <div key={kpi.label} className={`${kpi.bg} px-4 py-3 flex items-center gap-3`}>
                                    <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        {kpi.icon}
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</div>
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{kpi.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Payables table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">{t('billing.comm_col_agent')}</th>
                                        <th className="px-4 py-3 font-semibold hidden sm:table-cell">{t('billing.comm_col_shipment')}</th>
                                        <th className="px-4 py-3 font-semibold">{t('billing.comm_col_amount')}</th>
                                        <th className="px-4 py-3 font-semibold">{t('billing.comm_col_status')}</th>
                                        <th className="px-4 py-3 font-semibold hidden sm:table-cell">{t('billing.comm_col_date')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {(commission_payables ?? []).map((c: any) => (
                                        <tr key={c.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                                                        <User className="h-3.5 w-3.5 text-amber-600" />
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{c.user?.name ?? '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell text-gray-500 whitespace-nowrap">
                                                {c.shipment?.tracking_number
                                                    ? <Link href={route('shipments.show', c.shipment_id)} className="hover:underline text-indigo-600 dark:text-indigo-400">{c.shipment.tracking_number}</Link>
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                {formatCurrency(c.commission_amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.status === 'approved'
                                                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><CheckCircle className="h-3 w-3" />{t('commissions.status_approved')}</span>
                                                    : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"><Clock className="h-3 w-3" />{t('commissions.status_pending')}</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell text-gray-500 whitespace-nowrap">
                                                {formatDate(c.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

                        {/* Search */}
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('billing.search_placeholder')}
                                className="pl-9 h-9 w-full"
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            />
                        </div>

                        {/* Status */}
                        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder={t('billing.filter_all')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('billing.filter_all')}</SelectItem>
                                <SelectItem value="unpaid">{t('billing.filter_unpaid')}</SelectItem>
                                <SelectItem value="paid">{t('billing.filter_paid')}</SelectItem>
                                <SelectItem value="partial">{t('billing.filter_partial')}</SelectItem>
                                <SelectItem value="refunded">{t('billing.filter_refunded')}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date from */}
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

                        {/* Date to */}
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
                            {t('billing.apply_filters')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportPdf}
                            disabled={exporting}
                            className="gap-1.5 h-8 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                        >
                            <Download className="h-3.5 w-3.5" />
                            {exporting ? t('billing.export_loading') : t('billing.export_pdf')}
                        </Button>
                        {hasFilters && (
                            <Button size="sm" variant="outline" onClick={clearFilters} className="gap-1.5 h-8">
                                <X className="h-3.5 w-3.5" />
                                {t('billing.clear_filters')}
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
                                <th className="px-3 sm:px-6 py-4 font-semibold">{t('billing.col_invoice')}</th>
                                <th className="px-3 sm:px-6 py-4 font-semibold">{t('billing.col_customer')}</th>
                                <th className="px-3 sm:px-6 py-4 font-semibold">{t('billing.col_amount')}</th>
                                <th className="hidden sm:table-cell px-3 sm:px-6 py-4 font-semibold">{t('billing.col_date')}</th>
                                <th className="px-3 sm:px-6 py-4 font-semibold">{t('billing.col_status')}</th>
                                <th className="px-3 sm:px-6 py-4 font-semibold text-right">{t('billing.col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                        <p>{t('billing.no_invoices')}</p>
                                        {hasFilters && (
                                            <button onClick={clearFilters} className="mt-2 text-sm text-indigo-600 hover:underline">
                                                {t('billing.clear_filters')}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                rows.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                        <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    invoice.returnRequest ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'
                                                }`}>
                                                    {invoice.returnRequest
                                                        ? <RotateCcw className="h-4 w-4" />
                                                        : <FileText className="h-4 w-4" />
                                                    }
                                                </div>
                                                <div>
                                                    <div className="whitespace-nowrap flex items-center gap-1.5">
                                                        {invoice.tracking_number}
                                                        {invoice.returnRequest && (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                                                invoice.returnRequest.status === 'completed' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                                                invoice.returnRequest.status === 'approved'  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                'bg-orange-100 text-orange-700 border-orange-200'
                                                            }`}>
                                                                ↩ {t(`returns.status_${invoice.returnRequest.status}`)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {invoice.service_type && (
                                                        <div className="text-xs text-gray-400">
                                                            {((invoice as any).rate_data?.service_name
                                                                ?? invoice.service_type.replace(/^svc_/, '').replace(/_/g, ' '))}
                                                        </div>
                                                    )}
                                                    {invoice.returnRequest && Number(invoice.returnRequest.refund_amount) > 0 && (
                                                        <div className="text-xs text-red-500 font-medium">
                                                            {t('returns.refund_amount')}: ${Number(invoice.returnRequest.refund_amount).toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4">
                                            <div className="whitespace-nowrap">{invoice.sender_details?.name ?? '—'}</div>
                                            {invoice.receiver_details?.name && (
                                                <div className="text-xs text-gray-400 whitespace-nowrap">→ {invoice.receiver_details.name}</div>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatCurrency(invoice.total, invoice.currency)}
                                            {invoice.tax != null && Number(invoice.tax) > 0 && (
                                                <div className="text-xs text-gray-400 font-normal">
                                                    {t('billing.col_tax')}: {formatCurrency(invoice.tax, invoice.currency)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {formatDate(invoice.created_at)}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4">
                                            {paymentBadge(invoice.payment_status ?? 'unpaid', t)}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* Ver factura en pantalla */}
                                                <Button variant="ghost" size="sm" asChild title={t('billing.action_view')}>
                                                    <Link href={route('invoices.show', invoice.id)}>
                                                        <Eye className="h-4 w-4 sm:mr-1" />
                                                        <span className="hidden sm:inline">{t('billing.action_view')}</span>
                                                    </Link>
                                                </Button>
                                                {/* Descargar / imprimir PDF */}
                                                <Button variant="ghost" size="sm" asChild title={t('billing.action_print_pdf')}>
                                                    <Link href={route('invoices.show', invoice.id) + '?print=1'} target="_blank">
                                                        <Download className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>

                    <AppPagination variant="server" meta={invoices} pageSizeOptions={[10, 15, 25, 50]} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
