import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatDate } from '@/utils/localeFormat';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useState } from 'react';
import { FileText, FileSpreadsheet, Package } from 'lucide-react';

interface ShipmentRow {
    id: number;
    tracking_number: string;
    status: string;
    payment_status: string;
    total: number;
    currency: string;
    created_at: string;
    sender_details: Record<string, string> | null;
    receiver_details: Record<string, string> | null;
}

interface PaginatedShipments {
    data: ShipmentRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links?: { url: string | null; label: string; active: boolean }[];
}

interface StatusOption {
    code: string;
    name: string;
}

interface Totals {
    count: number;
    revenue: number;
    unpaid: number;
}

interface Filters {
    status?: string;
    payment_status?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    shipments: PaginatedShipments;
    totals: Totals;
    statuses: StatusOption[];
    filters: Filters;
}

const paymentBadge: Record<string, string> = {
    paid:     'bg-green-100 text-green-700',
    partial:  'bg-yellow-100 text-yellow-700',
    unpaid:   'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-600',
};

// Fallback Tailwind classes for statuses not in the org's custom list
const statusBadgeFallback: Record<string, string> = {
    delivered:  'bg-green-100 text-green-700',
    pending:    'bg-yellow-100 text-yellow-700',
    in_transit: 'bg-blue-100 text-blue-700',
    cancelled:  'bg-red-100 text-red-700',
    returned:   'bg-orange-100 text-orange-700',
};

export default function ShipmentsReport({ shipments, totals, statuses, filters }: Props) {
    const { t } = useTranslation();
    const { status_colors } = usePage<{ status_colors?: Record<string, string> }>().props;

    // Build inline style from DB color when available, fallback to Tailwind class
    const getStatusStyle = (statusCode: string): { className: string; style?: React.CSSProperties } => {
        const hex = status_colors?.[statusCode];
        if (hex) {
            return { className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', style: { backgroundColor: hex + '22', color: hex } };
        }
        const cls = statusBadgeFallback[statusCode] ?? 'bg-gray-100 text-gray-600';
        return { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}` };
    };
    const [status, setStatus]             = useState(filters.status ?? '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? '');
    const [dateFrom, setDateFrom]         = useState(filters.date_from ?? '');
    const [dateTo, setDateTo]             = useState(filters.date_to ?? '');

    const buildParams = () => ({
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    });

    const applyFilters = () => {
        router.get(route('reports.shipments'), buildParams(), { preserveScroll: true });
    };

    const clearFilters = () => {
        setStatus('');
        setPaymentStatus('');
        setDateFrom('');
        setDateTo('');
        router.get(route('reports.shipments'), {}, { preserveScroll: true });
    };

    const buildExportUrl = (routeName: string) => {
        const params = new URLSearchParams();
        if (status)        params.set('status', status);
        if (paymentStatus) params.set('payment_status', paymentStatus);
        if (dateFrom)      params.set('date_from', dateFrom);
        if (dateTo)        params.set('date_to', dateTo);
        const qs = params.toString();
        return route(routeName) + (qs ? '?' + qs : '');
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('reports.shipments_report')} />

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            {t('reports.shipments_report')}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{t('reports.shipments_desc')}</p>
                    </div>
                    {/* Export Buttons */}
                    <div className="flex items-center gap-2">
                        <a
                            href={buildExportUrl('reports.shipments.export-pdf')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            {t('reports.export_pdf')}
                        </a>
                        <a
                            href={buildExportUrl('reports.shipments.export-excel')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('reports.export_excel')}
                        </a>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">{t('reports.filter_status')}</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('common.all')}</option>
                                {statuses.map(s => (
                                    <option key={s.code} value={s.code}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">{t('reports.filter_payment')}</label>
                            <select
                                value={paymentStatus}
                                onChange={e => setPaymentStatus(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('common.all')}</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partial</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={applyFilters}
                                className="flex-1 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Apply
                            </button>
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                            >
                                {t('common.clear')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Totals */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.summary_total')}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{totals.count.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.summary_revenue')}</p>
                        <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totals.revenue)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Unpaid</p>
                        <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totals.unpaid)}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_tracking')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_sender')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_receiver')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('common.status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Payment
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('common.date')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {shipments.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                            {t('common.no_data')}
                                        </td>
                                    </tr>
                                ) : (
                                    shipments.data.map(s => {
                                        const sender   = s.sender_details?.name   ?? '—';
                                        const receiver = s.receiver_details?.name ?? '—';
                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                                                    {s.tracking_number}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">{sender}</td>
                                                <td className="px-4 py-3 text-gray-700">{receiver}</td>
                                                <td className="px-4 py-3">
                                                    {(() => { const ss = getStatusStyle(s.status); return <span className={ss.className} style={ss.style}>{s.status}</span>; })()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentBadge[s.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                        {s.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                    {formatCurrency(s.total)} <span className="text-xs font-normal text-gray-400">{s.currency}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {formatDate(s.created_at)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {shipments.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100">
                            <AppPagination pagination={shipments} />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
