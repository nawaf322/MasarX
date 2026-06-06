import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import {
    Clock, CheckCircle, DollarSign, Settings2, ChevronRight,
    Download, RotateCcw, CheckCheck, CreditCard, AlertTriangle,
} from 'lucide-react';
import { useState, useCallback } from 'react';

interface User     { id: number; name: string }
interface Shipment { id: number; tracking_number: string }
interface CommissionRule { id: number; name: string }

type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed';

interface Commission {
    id: number;
    shipment:          Shipment;
    user:              User;
    rule:              CommissionRule | null;
    commission_amount: string;
    shipment_total:    string;
    currency:          string;
    status:            CommissionStatus;
    trigger_event:     string | null;
    paid_at:           string | null;
    reversed_at:       string | null;
    created_at:        string;
}

interface Summary {
    total_pending:  string;
    total_approved: string;
    total_paid:     string;
    total_reversed: string;
}

interface PaginatedCommissions {
    data: Commission[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number; last_page: number;
    per_page: number; total: number; from: number; to: number;
}

interface Props {
    commissions: PaginatedCommissions;
    summary:     Summary;
    filters:     { status?: string; user_id?: string; from?: string; to?: string };
    users:       User[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColors: Record<CommissionStatus, string> = {
    pending:  'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid:     'bg-green-100 text-green-800',
    reversed: 'bg-red-100 text-red-700',
};

const triggerColors: Record<string, string> = {
    shipment_created:  'bg-gray-100 text-gray-600',
    shipment_delivered:'bg-green-100 text-green-700',
    cod_remitted:      'bg-amber-100 text-amber-700',
    pickup_completed:  'bg-blue-100 text-blue-700',
    manual:            'bg-purple-100 text-purple-700',
};

const triggerLabel = (event: string | null, t: (k: string) => string): string => {
    if (!event) return '—';
    const map: Record<string, string> = {
        shipment_created:  t('commissions.trigger_shipment_created'),
        shipment_delivered:t('commissions.trigger_shipment_delivered'),
        cod_remitted:      t('commissions.trigger_cod_remitted'),
        pickup_completed:  t('commissions.trigger_pickup_completed'),
        manual:            t('commissions.trigger_manual'),
    };
    return map[event] ?? event;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommissionsIndex({ commissions, summary, filters, users }: Props) {
    const { t } = useTranslation();

    const [selected, setSelected] = useState<Set<number>>(new Set());

    // ── Selection helpers ─────────────────────────────────────────────────────
    const toggleOne = useCallback((id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        const selectable = commissions.data.filter(c => c.commission_amount > '0' || Number(c.commission_amount) > 0);
        setSelected(prev =>
            prev.size === selectable.length
                ? new Set()
                : new Set(selectable.map(c => c.id))
        );
    }, [commissions.data]);

    const selectedPending  = commissions.data.filter(c => selected.has(c.id) && c.status === 'pending');
    const selectedApproved = commissions.data.filter(c => selected.has(c.id) && c.status === 'approved');

    // ── Filters ───────────────────────────────────────────────────────────────
    function handleFilter(key: string, value: string) {
        setSelected(new Set());
        router.get(route('commissions.index'), { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    }

    // ── Single actions ────────────────────────────────────────────────────────
    function approve(id: number) {
        router.post(route('commissions.approve', id), {}, { preserveScroll: true });
    }
    function markPaid(id: number) {
        router.post(route('commissions.mark-paid', id), {}, { preserveScroll: true });
    }

    // ── Bulk actions ──────────────────────────────────────────────────────────
    function bulkApprove() {
        if (!selectedPending.length) return;
        router.post(route('commissions.bulk-approve'), { ids: selectedPending.map(c => c.id) }, {
            preserveScroll: true,
            onSuccess: () => setSelected(new Set()),
        });
    }
    function bulkPay() {
        if (!selectedApproved.length) return;
        router.post(route('commissions.bulk-pay'), { ids: selectedApproved.map(c => c.id) }, {
            preserveScroll: true,
            onSuccess: () => setSelected(new Set()),
        });
    }

    // ── Export ────────────────────────────────────────────────────────────────
    function exportXlsx() {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
        window.location.href = route('commissions.export') + (params.toString() ? '?' + params.toString() : '');
    }

    // ── KPI cards ─────────────────────────────────────────────────────────────
    const kpiCards = [
        { label: t('commissions.total_pending'),  value: Number(summary?.total_pending  ?? 0).toFixed(2), icon: Clock,        border: 'border-l-yellow-400', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-500' },
        { label: t('commissions.total_approved'), value: Number(summary?.total_approved ?? 0).toFixed(2), icon: CheckCircle,  border: 'border-l-blue-400',   iconBg: 'bg-blue-50',   iconColor: 'text-blue-500' },
        { label: t('commissions.total_paid'),     value: Number(summary?.total_paid     ?? 0).toFixed(2), icon: DollarSign,   border: 'border-l-green-400',  iconBg: 'bg-green-50',  iconColor: 'text-green-500' },
        { label: t('commissions.total_reversed'), value: Number(summary?.total_reversed ?? 0).toFixed(2), icon: RotateCcw,    border: 'border-l-red-400',    iconBg: 'bg-red-50',    iconColor: 'text-red-400' },
    ];

    const allSelectableIds = commissions.data.filter(c => Number(c.commission_amount) > 0).map(c => c.id);
    const allSelected      = allSelectableIds.length > 0 && allSelectableIds.every(id => selected.has(id));

    return (
        <AuthenticatedLayout>
            <Head title={t('commissions.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('commissions.title')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('commissions.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportXlsx}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            {t('commissions.export')}
                        </button>
                        <Link
                            href={route('commissions.rules')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Settings2 className="w-4 h-4" />
                            {t('commissions.rules')}
                            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </Link>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {kpiCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 ${card.border} p-5 flex items-center gap-4`}>
                                <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{card.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-4 flex-wrap items-center">
                    <select
                        defaultValue={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">{t('commissions.all_statuses')}</option>
                        <option value="pending">{t('commissions.status_pending')}</option>
                        <option value="approved">{t('commissions.status_approved')}</option>
                        <option value="paid">{t('commissions.status_paid')}</option>
                        <option value="reversed">{t('commissions.status_reversed')}</option>
                    </select>

                    <select
                        defaultValue={filters.user_id ?? ''}
                        onChange={(e) => handleFilter('user_id', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">{t('commissions.all_agents')}</option>
                        {users.map(u => (
                            <option key={u.id} value={String(u.id)}>{u.name}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        defaultValue={filters.from ?? ''}
                        onChange={(e) => handleFilter('from', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white shadow-sm"
                    />
                    <input
                        type="date"
                        defaultValue={filters.to ?? ''}
                        onChange={(e) => handleFilter('to', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white shadow-sm"
                    />
                </div>

                {/* Bulk action bar */}
                {selected.size > 0 && (
                    <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700 rounded-xl">
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                            {selected.size} {t('commissions.selected')}
                        </span>
                        <div className="flex gap-2 ml-auto flex-wrap">
                            {selectedPending.length > 0 && (
                                <button
                                    onClick={bulkApprove}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    {t('commissions.bulk_approve')} ({selectedPending.length})
                                </button>
                            )}
                            {selectedApproved.length > 0 && (
                                <button
                                    onClick={bulkPay}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                                >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    {t('commissions.bulk_pay')} ({selectedApproved.length})
                                </button>
                            )}
                            <button
                                onClick={() => setSelected(new Set())}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-[900px] w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.shipment')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.earned_by')}</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-left font-semibold">{t('commissions.rule')}</th>
                                    <th className="hidden lg:table-cell px-4 py-3 text-left font-semibold">{t('commissions.trigger')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.amount')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.status')}</th>
                                    <th className="px-4 py-3 text-right font-semibold">{t('commissions.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {commissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400 italic">
                                            {t('commissions.no_commissions')}
                                        </td>
                                    </tr>
                                ) : commissions.data.map((c) => {
                                    const isReversal = Number(c.commission_amount) < 0;
                                    return (
                                        <tr key={c.id} className={`transition-colors ${isReversal ? 'bg-red-50/40 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                            <td className="px-4 py-3">
                                                {!isReversal && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(c.id)}
                                                        onChange={() => toggleOne(c.id)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                )}
                                                {isReversal && (
                                                    <span title={t('commissions.reversal_record')}>
                                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap text-xs">
                                                {c.shipment?.tracking_number ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                {c.user?.name ?? '—'}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                                                {c.rule?.name ?? '—'}
                                            </td>
                                            <td className="hidden lg:table-cell px-4 py-3">
                                                {c.trigger_event ? (
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${triggerColors[c.trigger_event] ?? 'bg-gray-100 text-gray-500'}`}>
                                                        {triggerLabel(c.trigger_event, t)}
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                                <span className={isReversal ? 'text-red-600' : 'text-gray-900 dark:text-white'}>
                                                    {isReversal ? '−' : ''}{Math.abs(Number(c.commission_amount)).toFixed(2)}
                                                </span>
                                                <span className="text-xs font-normal text-gray-400 ml-1">{c.currency}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                                    {t(`commissions.status_${c.status}`)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {c.status === 'pending' && !isReversal && (
                                                        <button
                                                            onClick={() => approve(c.id)}
                                                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                                        >
                                                            {t('commissions.approve')}
                                                        </button>
                                                    )}
                                                    {c.status === 'approved' && !isReversal && (
                                                        <button
                                                            onClick={() => markPaid(c.id)}
                                                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                                                        >
                                                            {t('commissions.mark_paid')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <AppPagination variant="server" meta={commissions} />
            </div>
        </AuthenticatedLayout>
    );
}
