import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { Inbox, CheckCircle, XCircle, PauseCircle, Package, Eye, AlertCircle } from 'lucide-react';

interface Customer {
    id: number;
    name: string;
    email: string;
}

interface Locker {
    id: number;
    code: string;
    address: string | null;
    status: 'active' | 'inactive' | 'suspended';
    customer: Customer | null;
    pre_alerts_count: number;
    assigned_at: string | null;
    expires_at: string | null;
}

interface PaginatedLockers {
    data: Locker[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface Summary {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    unassigned: number;
}

interface Props {
    lockers: PaginatedLockers;
    filters: { status?: string; search?: string };
    summary: Summary;
}

const statusColors: Record<string, string> = {
    active:    'bg-green-100 text-green-800',
    inactive:  'bg-gray-100 text-gray-600',
    suspended: 'bg-red-100 text-red-700',
};

export default function LockersIndex({ lockers, filters, summary }: Props) {
    const { t } = useTranslation();
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = props.flash;

    function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
        router.get(route('lockers.index'), { ...filters, search: e.target.value }, { preserveState: true, replace: true });
    }

    function handleStatusFilter(e: React.ChangeEvent<HTMLSelectElement>) {
        router.get(route('lockers.index'), { ...filters, status: e.target.value || undefined }, { preserveState: true, replace: true });
    }

    const kpiCards = [
        { label: t('lockers.kpi_total'),     value: summary.total,      color: 'bg-gray-50 border-gray-200',    icon: Inbox,        iconColor: 'text-gray-500' },
        { label: t('lockers.kpi_active'),    value: summary.active,     color: 'bg-green-50 border-green-200',  icon: CheckCircle,  iconColor: 'text-green-600' },
        { label: t('lockers.kpi_inactive'),  value: summary.inactive,   color: 'bg-gray-50 border-gray-300',    icon: Package,      iconColor: 'text-gray-400' },
        { label: t('lockers.kpi_suspended'), value: summary.suspended,  color: 'bg-red-50 border-red-200',      icon: XCircle,      iconColor: 'text-red-500' },
        { label: t('lockers.kpi_unassigned'),value: summary.unassigned, color: 'bg-orange-50 border-orange-200',icon: AlertCircle,  iconColor: 'text-orange-500' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('lockers.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {flash.error}
                    </div>
                )}

                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">{t('lockers.title')}</h1>
                    <Link
                        href={route('lockers.create')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                        + {t('lockers.new')}
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    {kpiCards.map(card => (
                        <div key={card.label} className={`border rounded-lg p-4 flex items-center gap-3 ${card.color}`}>
                            <card.icon className={`w-5 h-5 shrink-0 ${card.iconColor}`} />
                            <div>
                                <p className="text-xs text-gray-500">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-4 flex-wrap items-center">
                    <input
                        type="text"
                        placeholder={t('lockers.search_placeholder')}
                        defaultValue={filters.search ?? ''}
                        onChange={handleSearch}
                        className="border rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <select
                        defaultValue={filters.status ?? ''}
                        onChange={handleStatusFilter}
                        className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">{t('lockers.all_statuses')}</option>
                        <option value="active">{t('lockers.status_active')}</option>
                        <option value="inactive">{t('lockers.status_inactive')}</option>
                        <option value="suspended">{t('lockers.status_suspended')}</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.code')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.customer')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.address')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.pre_alerts_count')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.expires_at')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.status')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('lockers.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lockers.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                                        {t('lockers.no_lockers')}
                                    </td>
                                </tr>
                            ) : (
                                lockers.data.map((locker) => (
                                    <tr key={locker.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-mono font-semibold text-indigo-700">
                                            {locker.code}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {locker.customer ? (
                                                <>
                                                    <p className="font-medium">{locker.customer.name}</p>
                                                    <p className="text-xs text-gray-400">{locker.customer.email}</p>
                                                </>
                                            ) : (
                                                <span className="text-xs text-orange-500 font-medium">{t('lockers.unassigned')}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                            {locker.address ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs">
                                                {locker.pre_alerts_count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {locker.expires_at ? new Date(locker.expires_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[locker.status]}`}>
                                                {t(`lockers.status_${locker.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('lockers.show', locker.id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                            >
                                                <Eye className="w-3 h-3" />
                                                {t('lockers.view')}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <AppPagination variant="server" meta={lockers} />
            </div>
        </AuthenticatedLayout>
    );
}
