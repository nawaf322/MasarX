import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Badge } from '@/Components/UI/badge';
import { Input } from '@/Components/UI/input';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus, Search, RotateCcw, Clock, Truck, CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';
import { AppPagination } from '@/Components/Shared/AppPagination';

interface ReturnData {
    id: number;
    return_number: string;
    reason: string;
    status: string;
    refund_amount: number;
    created_at: string;
    original_shipment?: { tracking_number: string };
}

interface Stats {
    total: number;
    pending: number;
    in_transit: number;
    completed: number;
}

interface PaginatedReturns {
    data: ReturnData[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links?: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    returns: PaginatedReturns;
    stats: Stats;
    filters: { status?: string; search?: string };
}

const statusColor: Record<string, string> = {
    requested: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    received: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}

export default function ReturnsIndex({ returns, stats, filters }: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search ?? '');
    const [activeStatus, setActiveStatus] = useState(filters.status ?? '');

    const applyFilter = (status: string) => {
        setActiveStatus(status);
        router.get(route('returns.index'), { status, search }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('returns.index'), { status: activeStatus, search }, { preserveState: true, replace: true });
    };

    const statuses = ['', 'requested', 'approved', 'in_transit', 'received', 'completed', 'rejected'];

    return (
        <AuthenticatedLayout>
            <Head title={t('returns.title')} />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{t('returns.title')}</h1>
                    <Button onClick={() => router.get(route('returns.create'))}>
                        <Plus className="w-4 h-4 mr-1" />{t('returns.create')}
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label={t('returns.total')} value={stats.total} icon={<RotateCcw className="w-5 h-5 text-gray-600" />} color="bg-gray-100 dark:bg-gray-800" />
                    <KpiCard label={t('returns.pending_approval')} value={stats.pending} icon={<Clock className="w-5 h-5 text-yellow-600" />} color="bg-yellow-100 dark:bg-yellow-900/30" />
                    <KpiCard label={t('returns.in_transit')} value={stats.in_transit} icon={<Truck className="w-5 h-5 text-purple-600" />} color="bg-purple-100 dark:bg-purple-900/30" />
                    <KpiCard label={t('returns.completed')} value={stats.completed} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-100 dark:bg-green-900/30" />
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-1 flex-wrap">
                        {statuses.map(s => (
                            <button
                                key={s}
                                onClick={() => applyFilter(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeStatus === s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                            >
                                {s ? t(`returns.status_${s}`) : t('common.all')}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
                        <Input
                            placeholder={t('returns.search_placeholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-56"
                        />
                        <Button type="submit" variant="outline" size="sm">
                            <Search className="w-4 h-4" />
                        </Button>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="text-left p-3 font-medium">{t('returns.return_number')}</th>
                                    <th className="text-left p-3 font-medium">{t('returns.original_tracking')}</th>
                                    <th className="text-left p-3 font-medium">{t('returns.reason')}</th>
                                    <th className="text-left p-3 font-medium">{t('returns.status')}</th>
                                    <th className="text-left p-3 font-medium">{t('returns.refund_amount')}</th>
                                    <th className="text-left p-3 font-medium">{t('returns.date')}</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.data.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t('returns.no_returns')}</td></tr>
                                )}
                                {returns.data.map(ret => (
                                    <tr key={ret.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="p-3 font-mono text-xs">{ret.return_number}</td>
                                        <td className="p-3">{ret.original_shipment?.tracking_number ?? '—'}</td>
                                        <td className="p-3">{t(`returns.reason_${ret.reason}`)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[ret.status] ?? 'bg-gray-100 text-gray-800'}`}>
                                                {t(`returns.status_${ret.status}`)}
                                            </span>
                                        </td>
                                        <td className="p-3">{Number(ret.refund_amount).toFixed(2)}</td>
                                        <td className="p-3 text-muted-foreground">{new Date(ret.created_at).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <Button variant="ghost" size="sm" onClick={() => router.get(route('returns.show', ret.id))}>
                                                {t('common.view')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800">
                        <AppPagination variant="server" meta={returns} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
