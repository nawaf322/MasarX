import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { Package, Clock, CheckCircle, XCircle, Truck, Eye, Printer, AlertCircle } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface Shipment {
    id: number;
    tracking_number: string;
}

interface Driver {
    id: number;
    name: string;
}

interface OriginPickup {
    id: number;
    shipment: Shipment;
    driver: Driver | null;
    contact_name: string;
    contact_phone: string;
    scheduled_for: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    photos: string[] | null;
}

interface PaginatedPickups {
    data: OriginPickup[];
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
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    unassigned: number;
}

interface Props {
    pickups: PaginatedPickups;
    filters: { status?: string; search?: string };
    summary: Summary;
    is_driver_view?: boolean;
}

const statusColors: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

export default function PickupsIndex({ pickups, filters, summary, is_driver_view = false }: Props) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const visibleIds = useMemo(() => pickups.data.map(p => p.id), [pickups.data]);

    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

    const toggleAll = useCallback(() => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                visibleIds.forEach(id => next.delete(id));
            } else {
                visibleIds.forEach(id => next.add(id));
            }
            return next;
        });
    }, [allSelected, visibleIds]);

    const toggleOne = useCallback((id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

    const handleBulkCancel = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const confirmed = await alert.confirm(
            t('pickups.cancel_selected'),
            t('pickups.bulk_cancel_confirm'),
            t('pickups.cancel_selected')
        );
        if (!confirmed) return;
        router.post(route('pickups.bulk-cancel'), { ids: Array.from(selectedIds) }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds(new Set()),
        });
    }, [selectedIds, t, alert]);

    const handleBulkDestroy = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const confirmed = await alert.confirm(
            t('pickups.delete_selected'),
            t('pickups.bulk_delete_confirm'),
            t('pickups.delete_selected')
        );
        if (!confirmed) return;
        router.post(route('pickups.bulk-destroy'), { ids: Array.from(selectedIds) }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds(new Set()),
        });
    }, [selectedIds, t, alert]);

    function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
        router.get(route('pickups.index'), { ...filters, search: e.target.value }, { preserveState: true, replace: true });
    }

    function handleStatusFilter(e: React.ChangeEvent<HTMLSelectElement>) {
        router.get(route('pickups.index'), { ...filters, status: e.target.value || undefined }, { preserveState: true, replace: true });
    }

    const kpiCards = [
        { label: t('pickups.kpi_total'),      value: summary.total,      color: 'bg-gray-50 border-gray-200',      icon: Package,      iconColor: 'text-gray-500' },
        { label: t('pickups.kpi_pending'),    value: summary.pending,    color: 'bg-yellow-50 border-yellow-200',  icon: Clock,        iconColor: 'text-yellow-600' },
        { label: t('pickups.kpi_confirmed'),  value: summary.confirmed,  color: 'bg-blue-50 border-blue-200',      icon: Truck,        iconColor: 'text-blue-600' },
        { label: t('pickups.kpi_completed'),  value: summary.completed,  color: 'bg-green-50 border-green-200',    icon: CheckCircle,  iconColor: 'text-green-600' },
        { label: t('pickups.kpi_cancelled'),  value: summary.cancelled,  color: 'bg-red-50 border-red-200',        icon: XCircle,      iconColor: 'text-red-500' },
        { label: t('pickups.kpi_unassigned'), value: summary.unassigned, color: 'bg-orange-50 border-orange-200',  icon: AlertCircle,  iconColor: 'text-orange-500' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('pickups.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">{t('pickups.title')}</h1>
                    {!is_driver_view && (
                    <Link
                        href={route('pickups.create')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                        + {t('pickups.new')}
                    </Link>
                    )}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
                        placeholder={t('pickups.search_placeholder')}
                        defaultValue={filters.search ?? ''}
                        onChange={handleSearch}
                        className="border rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <select
                        defaultValue={filters.status ?? ''}
                        onChange={handleStatusFilter}
                        className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">{t('pickups.all_statuses')}</option>
                        <option value="pending">{t('pickups.status_pending')}</option>
                        <option value="confirmed">{t('pickups.status_confirmed')}</option>
                        <option value="completed">{t('pickups.status_completed')}</option>
                        <option value="cancelled">{t('pickups.status_cancelled')}</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.tracking_col')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.contact_name')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.scheduled_for')}</th>
                                {!is_driver_view && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.assign_driver')}</th>}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.status')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.photos')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pickups.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pickups.data.length === 0 ? (
                                <tr>
                                    <td colSpan={is_driver_view ? 7 : 8} className="px-4 py-10 text-center text-sm text-gray-500">
                                        {t('pickups.no_pickups')}
                                    </td>
                                </tr>
                            ) : (
                                pickups.data.map((pickup) => (
                                    <tr key={pickup.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(pickup.id) ? 'bg-green-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(pickup.id)}
                                                onChange={() => toggleOne(pickup.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                                            {pickup.shipment?.tracking_number ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <p className="font-medium">{pickup.contact_name}</p>
                                            <p className="text-xs text-gray-400">{pickup.contact_phone}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {new Date(pickup.scheduled_for).toLocaleString()}
                                        </td>
                                        {!is_driver_view && (
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {pickup.driver
                                                ? <span className="font-medium text-indigo-700">{pickup.driver.name}</span>
                                                : <span className="text-xs text-orange-500 font-medium">{t('pickups.no_driver')}</span>
                                            }
                                        </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[pickup.status]}`}>
                                                {t(`pickups.status_${pickup.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {pickup.photos && pickup.photos.length > 0
                                                ? t('pickups.photos_count', { count: pickup.photos.length })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {is_driver_view && ['pending', 'confirmed'].includes(pickup.status) && (
                                                    <Link
                                                        href={route('pickups.complete.form', pickup.id)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                        Complete
                                                    </Link>
                                                )}
                                                <Link
                                                    href={route('pickups.show', pickup.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    {t('pickups.view')}
                                                </Link>
                                                <a
                                                    href={route('pickups.print', pickup.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    <Printer className="w-3 h-3" />
                                                    {t('pickups.print')}
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <AppPagination variant="server" meta={pickups} />
            </div>

            {/* Floating bulk-action bar (hidden for drivers) */}
            {!is_driver_view && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-2xl rounded-xl px-6 py-3 flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-700">
                        {selectedIds.size} {t('pickups.selected') || 'selected'}
                    </span>
                    <button
                        onClick={handleBulkCancel}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        {t('pickups.cancel_selected') || 'Cancel Selected'}
                    </button>
                    <button
                        onClick={handleBulkDestroy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        {t('pickups.delete_selected') || 'Delete Selected'}
                    </button>
                    <button
                        onClick={deselectAll}
                        className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
                    >
                        {t('pickups.deselect_all') || 'Deselect All'}
                    </button>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
