import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { Printer, ScrollText, CheckCircle, Clock, XCircle, AlertCircle, PenLine, Plus } from 'lucide-react';

interface Customer { id: number; name: string; email: string }
interface RateCard  { id: number; name: string }
interface Contract {
    id: number;
    contract_number: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string | null;
    customer: Customer;
    rate_card: RateCard | null;
    created_at: string;
}
interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}
interface Kpi {
    total: number; active: number; draft: number;
    expired: number; cancelled: number; signed: number;
}
interface Props {
    contracts: Paginated<Contract>;
    filters: { status?: string; search?: string };
    kpi: Kpi;
}

const STATUS_COLORS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    active:    'bg-green-100 text-green-700',
    expired:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function ContractsIndex({ contracts, filters, kpi }: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = React.useState(filters.search ?? '');
    const [status, setStatus] = React.useState(filters.status ?? '');

    function applyFilters(params: { search?: string; status?: string }) {
        router.get(route('contracts.index'), { ...params }, { preserveState: true, replace: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilters({ search, status });
    }

    function handleStatus(val: string) {
        setStatus(val);
        applyFilters({ search, status: val });
    }

    return (
        <AuthenticatedLayout>
            <Head title={t('contracts.title')} />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* ── Page Header ── */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <ScrollText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('contracts.title')}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{kpi.total} {t('contracts.th_number')}</p>
                        </div>
                    </div>
                    <Link href={route('contracts.create')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        {t('contracts.new_contract')}
                    </Link>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    {[
                        { label: t('contracts.kpi_total'),     value: kpi.total,     icon: ScrollText,    color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-l-indigo-500' },
                        { label: t('contracts.kpi_active'),    value: kpi.active,    icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-l-green-500' },
                        { label: t('contracts.kpi_draft'),     value: kpi.draft,     icon: Clock,         color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-l-gray-400' },
                        { label: t('contracts.kpi_expired'),   value: kpi.expired,   icon: AlertCircle,   color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-l-yellow-500' },
                        { label: t('contracts.kpi_cancelled'), value: kpi.cancelled, icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-l-red-500' },
                        { label: t('contracts.kpi_signed'),    value: kpi.signed,    icon: PenLine,       color: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-l-teal-500' },
                    ].map(({ label, value, icon: Icon, color, bg, border }) => (
                        <div key={label} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${border} shadow-sm p-4`}>
                            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('contracts.search_placeholder')}
                            className="flex-1 border rounded px-3 py-2 text-sm"
                        />
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            {t('common.search')}
                        </button>
                    </form>
                    <select
                        value={status}
                        onChange={e => handleStatus(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                    >
                        <option value="">{t('contracts.all_statuses')}</option>
                        {['draft','active','expired','cancelled'].map(s => (
                            <option key={s} value={s}>{t(`contracts.status_${s}`)}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {['th_number','th_customer','th_title','th_dates','th_status','th_actions'].map(k => (
                                    <th key={k} className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                                        {t(`contracts.${k}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contracts.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                        {t('contracts.no_contracts')}
                                    </td>
                                </tr>
                            ) : contracts.data.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.contract_number}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{c.customer.name}</div>
                                        <div className="text-gray-400 text-xs">{c.customer.email}</div>
                                    </td>
                                    <td className="px-4 py-3">{c.title}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div>{c.start_date}</div>
                                        <div className="text-gray-400 text-xs">{c.end_date ?? t('contracts.no_end_date')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                                            {t(`contracts.status_${c.status}`)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Link href={route('contracts.show', c.id)}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                                                {t('common.view')}
                                            </Link>
                                            <a href={route('contracts.print', c.id)}
                                               target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
                                                <Printer className="w-3 h-3" />
                                                {t('contracts.print')}
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <AppPagination variant="server" meta={contracts} />
            </div>
        </AuthenticatedLayout>
    );
}
