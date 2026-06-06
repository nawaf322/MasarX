import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatDate } from '@/utils/localeFormat';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useState } from 'react';
import { FileText, FileSpreadsheet, RotateCcw } from 'lucide-react';

interface ReturnRow {
    id: number;
    return_number: string;
    reason: string;
    status: string;
    refund_amount: number;
    refund_method: string | null;
    created_at: string;
    original_shipment?: { tracking_number: string; total: number; currency: string } | null;
}

interface PaginatedReturns {
    data: ReturnRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links?: { url: string | null; label: string; active: boolean }[];
}

interface Totals {
    count: number;
    total_refunds: number;
}

interface Filters {
    status?: string;
    reason?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    returns: PaginatedReturns;
    totals: Totals;
    filters: Filters;
}

const statusBadge: Record<string, string> = {
    requested:  'bg-yellow-100 text-yellow-700',
    approved:   'bg-blue-100 text-blue-700',
    in_transit: 'bg-purple-100 text-purple-700',
    received:   'bg-indigo-100 text-indigo-700',
    completed:  'bg-green-100 text-green-700',
    rejected:   'bg-red-100 text-red-700',
};

const REASONS = [
    'wrong_item',
    'damaged',
    'not_delivered',
    'customer_request',
    'other',
];

export default function ReturnsReport({ returns, totals, filters }: Props) {
    const { t } = useTranslation();
    const [status, setStatus]   = useState(filters.status ?? '');
    const [reason, setReason]   = useState(filters.reason ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo]   = useState(filters.date_to ?? '');

    const applyFilters = () => {
        router.get(route('reports.returns'), {
            status: status || undefined,
            reason: reason || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveScroll: true });
    };

    const clearFilters = () => {
        setStatus('');
        setReason('');
        setDateFrom('');
        setDateTo('');
        router.get(route('reports.returns'), {}, { preserveScroll: true });
    };

    const buildExportUrl = (routeName: string) => {
        const params = new URLSearchParams();
        if (status)   params.set('status', status);
        if (reason)   params.set('reason', reason);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to', dateTo);
        const qs = params.toString();
        return route(routeName) + (qs ? '?' + qs : '');
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('reports.returns_report')} />

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-red-600" />
                            {t('reports.returns_report')}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{t('reports.returns_desc')}</p>
                    </div>
                    {/* Export Buttons */}
                    <div className="flex items-center gap-2">
                        <a
                            href={buildExportUrl('reports.returns.export-pdf')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            {t('reports.export_pdf')}
                        </a>
                        <a
                            href={buildExportUrl('reports.returns.export-excel')}
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
                                <option value="requested">Requested</option>
                                <option value="approved">Approved</option>
                                <option value="in_transit">In Transit</option>
                                <option value="received">Received</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">{t('reports.filter_reason')}</label>
                            <select
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('common.all')}</option>
                                {REASONS.map(r => (
                                    <option key={r} value={r}>{t(`returns.reason_${r}`)}</option>
                                ))}
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

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.summary_total')}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{totals.count.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.summary_refunds')}</p>
                        <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totals.total_refunds)}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_return_number')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_original')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_reason')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('common.status')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('reports.col_refund')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {t('common.date')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {returns.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                            {t('common.no_data')}
                                        </td>
                                    </tr>
                                ) : (
                                    returns.data.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                                                {r.return_number}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                {r.original_shipment?.tracking_number ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {t(`returns.reason_${r.reason}`)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                {formatCurrency(r.refund_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {formatDate(r.created_at)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {returns.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100">
                            <AppPagination pagination={returns} />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
