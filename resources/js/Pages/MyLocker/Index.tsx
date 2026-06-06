import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { PaginationBar } from '@/ui/kit/PaginationBar';
import {
    Inbox, Package, CheckCircle, XCircle, Clock, Truck,
    MapPin, Building2, Copy, Plus, ArrowRight,
    Hash, Info, ExternalLink, CalendarClock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Warehouse { id: number; name: string }
interface Locker {
    id: number;
    code: string;
    address: string | null;
    status: string;
    assigned_at: string | null;
    expires_at: string | null;
    warehouse: Warehouse | null;
    pre_alerts_count: number;
    shipments_count: number;
}

interface LockerRef { id: number; code: string }
interface ShipmentRef { id: number; tracking_number: string }

interface PreAlert {
    id: number;
    store_name: string;
    store_tracking_number: string;
    declared_value: number;
    declared_currency: string;
    status: 'pending' | 'received' | 'processing' | 'converted' | 'cancelled';
    locker: LockerRef | null;
    shipment: ShipmentRef | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Summary {
    total: number;
    pending: number;
    received: number;
    converted: number;
    cancelled: number;
}

interface PendingPickup {
    id:              number;
    status:          'pending' | 'confirmed';
    tracking_number: string | null;
    shipment_id:     number;
    contact_name:    string;
    pickup_address:  string;
    scheduled_for:   string | null;
    driver_assigned: boolean;
}

interface Props {
    locker:          Locker | null;
    preAlerts:       Paginated<PreAlert>;
    summary:         Summary;
    customerName:    string;
    suitePrefix:     string;
    pendingPickups:  PendingPickup[];
}

// ── Status styles (no hardcoded labels — resolved via t() inside component) ───

const statusStyles: Record<string, { color: string; icon: React.ElementType }> = {
    pending:    { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: Clock       },
    received:   { color: 'bg-blue-50 text-blue-800 border-blue-200',       icon: Inbox       },
    processing: { color: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: Package     },
    converted:  { color: 'bg-green-50 text-green-800 border-green-200',    icon: CheckCircle },
    cancelled:  { color: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle     },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyLockerIndex({ locker, preAlerts, summary, customerName, suitePrefix, pendingPickups }: Props) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    // Status label resolved through i18n — no hardcoded English strings
    const statusLabel: Record<string, string> = {
        pending:    t('my_locker.status_pending'),
        received:   t('my_locker.status_received'),
        processing: t('my_locker.status_processing'),
        converted:  t('my_locker.status_converted'),
        cancelled:  t('my_locker.status_cancelled'),
    };

    const lockerStatusLabel: Record<string, string> = {
        active:   t('my_locker.status_active'),
        inactive: t('my_locker.status_inactive'),
    };

    // Address format: CustomerName / LockerCode \n WarehouseAddress \n {suitePrefix} LockerCode
    function buildSuiteAddress(): string {
        if (!locker) return '';
        const lines: string[] = [];
        lines.push(`${customerName} / ${locker.code}`);
        if (locker.address) lines.push(locker.address);
        lines.push(`${suitePrefix} ${locker.code}`);
        return lines.join('\n');
    }

    function copyAddress() {
        if (!locker) return;
        navigator.clipboard.writeText(buildSuiteAddress()).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const { current_page, last_page, per_page, total, from, to } = preAlerts;

    return (
        <AuthenticatedLayout>
            <Head title={t('my_locker.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <Inbox className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('my_locker.title')}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{t('my_locker.subtitle')}</p>
                        </div>
                    </div>

                    <Link
                        href={route('pre-alerts.create', locker ? { locker_id: locker.id } : {})}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('my_locker.register_package')}
                    </Link>
                </div>

                {/* ── No locker state ── */}
                {!locker && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Inbox className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('my_locker.no_locker_title')}</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">{t('my_locker.no_locker_body')}</p>
                    </div>
                )}

                {locker && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── LEFT: Locker card ── */}
                        <div className="space-y-4">

                            {/* Gradient locker card */}
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg ring-1 ring-indigo-700/30">
                                <div className="flex items-center justify-between mb-5">
                                    <span className="text-xs font-semibold text-indigo-200 uppercase tracking-widest">
                                        {t('my_locker.locker_details')}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        locker.status === 'active'
                                            ? 'bg-green-400/20 text-green-100 ring-1 ring-green-400/30'
                                            : 'bg-red-400/20 text-red-100 ring-1 ring-red-400/30'
                                    }`}>
                                        {lockerStatusLabel[locker.status] ?? locker.status}
                                    </span>
                                </div>

                                {/* Locker code */}
                                <div className="flex items-center gap-3 mb-5">
                                    <Hash className="w-5 h-5 text-indigo-300 shrink-0" />
                                    <p className="text-3xl font-bold font-mono tracking-widest">{locker.code}</p>
                                </div>

                                {/* Suite address block */}
                                <div className="bg-white/10 rounded-xl p-3.5 mb-4 ring-1 ring-white/10">
                                    <p className="text-xs text-indigo-200 mb-2 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        {t('my_locker.shipping_address_title')}
                                    </p>
                                    <pre className="text-sm text-white font-medium leading-relaxed whitespace-pre-wrap font-sans">
                                        {buildSuiteAddress()}
                                    </pre>
                                </div>

                                {/* Copy address */}
                                <button
                                    type="button"
                                    onClick={copyAddress}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl transition-colors ring-1 ring-white/20"
                                >
                                    <Copy className="w-4 h-4" />
                                    {copied ? t('my_locker.copied') : t('my_locker.copy_address')}
                                </button>
                            </div>

                            {/* Address usage hint */}
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                <p className="text-xs font-semibold text-blue-800 mb-1.5 flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                    {t('my_locker.shipping_address_title')}
                                </p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    {t('my_locker.shipping_address_hint')}
                                </p>
                            </div>

                            {/* Warehouse */}
                            {locker.warehouse && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                                        {t('my_locker.warehouse')}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                            <Building2 className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">{locker.warehouse.name}</p>
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            {(locker.assigned_at || locker.expires_at) && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                                    {locker.assigned_at && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">{t('my_locker.assigned_since')}</span>
                                            <span className="text-gray-800 font-semibold">
                                                {new Date(locker.assigned_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    {locker.expires_at && (
                                        <>
                                            {locker.assigned_at && <div className="border-t border-gray-100" />}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">{t('my_locker.expires')}</span>
                                                <span className="text-gray-800 font-semibold">
                                                    {new Date(locker.expires_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: Packages ── */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* ── Pending Pickups Banner ── */}
                            {pendingPickups.length > 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-orange-200 bg-orange-100/60">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                                            <Truck className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-orange-900">
                                                {pendingPickups.length === 1
                                                    ? t('my_locker.pickup_banner_title_one')
                                                    : t('my_locker.pickup_banner_title_many').replace('{{count}}', String(pendingPickups.length))}
                                            </p>
                                            <p className="text-xs text-orange-700">{t('my_locker.pickup_banner_subtitle')}</p>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-orange-100">
                                        {pendingPickups.map(pickup => (
                                            <div key={pickup.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${pickup.status === 'confirmed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                                            {pickup.tracking_number ?? `#${pickup.shipment_id}`}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 shrink-0" />
                                                            {pickup.pickup_address}
                                                        </p>
                                                        {pickup.scheduled_for && (
                                                            <p className="text-xs text-orange-700 mt-0.5 flex items-center gap-1">
                                                                <CalendarClock className="w-3 h-3 shrink-0" />
                                                                {t('my_locker.pickup_scheduled')} {new Date(pickup.scheduled_for).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                        pickup.status === 'confirmed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {pickup.status === 'confirmed'
                                                            ? t('my_locker.pickup_status_confirmed')
                                                            : t('my_locker.pickup_status_pending')}
                                                    </span>
                                                    {pickup.driver_assigned && (
                                                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                                            <Truck className="w-3 h-3" /> {t('my_locker.pickup_driver_assigned')}
                                                        </span>
                                                    )}
                                                    <Link
                                                        href={`/shipments/${pickup.shipment_id}`}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mt-0.5"
                                                    >
                                                        {t('my_locker.pickup_view_shipment')} <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* KPI row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {([
                                    { label: t('my_locker.total'),      value: summary.total,     color: 'text-gray-900',   bg: 'bg-white',       border: 'border-gray-200' },
                                    { label: t('my_locker.pending'),     value: summary.pending,   color: 'text-yellow-700', bg: 'bg-yellow-50',   border: 'border-yellow-200' },
                                    { label: t('my_locker.in_transit'),  value: summary.received,  color: 'text-blue-700',   bg: 'bg-blue-50',     border: 'border-blue-200' },
                                    { label: t('my_locker.delivered'),   value: summary.converted, color: 'text-green-700',  bg: 'bg-green-50',    border: 'border-green-200' },
                                ] as const).map(k => (
                                    <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4 shadow-sm`}>
                                        <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{k.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Packages table */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                                {/* Table header bar */}
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-indigo-500" />
                                        {t('my_locker.my_packages')}
                                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                                            {summary.total}
                                        </span>
                                    </h3>
                                    <Link
                                        href={route('pre-alerts.create', { locker_id: locker.id })}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {t('my_locker.register_package')}
                                    </Link>
                                </div>

                                {preAlerts.data.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <Package className="w-7 h-7 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">{t('my_locker.no_packages')}</p>
                                        <Link
                                            href={route('pre-alerts.create', { locker_id: locker.id })}
                                            className="inline-flex items-center gap-1.5 mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {t('my_locker.register_package')}
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        {/* Column headers */}
                                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            <div className="col-span-4">{t('my_locker.store_col')}</div>
                                            <div className="col-span-3">{t('my_locker.tracking_col')}</div>
                                            <div className="col-span-2 text-right">{t('my_locker.value_col')}</div>
                                            <div className="col-span-2 text-center">{t('my_locker.status')}</div>
                                            <div className="col-span-1 text-right">{t('my_locker.actions_col')}</div>
                                        </div>

                                        {/* Rows */}
                                        <div className="divide-y divide-gray-100">
                                            {preAlerts.data.map(pa => {
                                                const style = statusStyles[pa.status] ?? statusStyles.pending;
                                                const label = statusLabel[pa.status] ?? pa.status;
                                                const StatusIcon = style.icon;
                                                return (
                                                    <div
                                                        key={pa.id}
                                                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/70 transition-colors"
                                                    >
                                                        {/* Store */}
                                                        <div className="col-span-10 sm:col-span-4 flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                                                <Package className="w-4 h-4 text-indigo-500" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-gray-800 truncate">{pa.store_name}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">
                                                                    {new Date(pa.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Tracking */}
                                                        <div className="hidden sm:block col-span-3 min-w-0">
                                                            <p className="text-xs font-mono text-gray-500 truncate">
                                                                {pa.store_tracking_number}
                                                            </p>
                                                        </div>

                                                        {/* Value */}
                                                        <div className="hidden sm:block col-span-2 text-right">
                                                            <p className="text-sm font-semibold text-gray-800">
                                                                {pa.declared_currency} {Number(pa.declared_value).toFixed(2)}
                                                            </p>
                                                        </div>

                                                        {/* Status badge */}
                                                        <div className="hidden sm:flex col-span-2 justify-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${style.color}`}>
                                                                <StatusIcon className="w-3 h-3" />
                                                                {label}
                                                            </span>
                                                        </div>

                                                        {/* Action */}
                                                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                                                            {pa.shipment ? (
                                                                <Link
                                                                    href={route('shipments.show', pa.shipment.id)}
                                                                    title={pa.shipment.tracking_number}
                                                                    className="inline-flex items-center gap-1 p-1.5 rounded-lg text-green-600 hover:bg-green-50 border border-green-100 transition-colors"
                                                                >
                                                                    <Truck className="w-4 h-4" />
                                                                </Link>
                                                            ) : (
                                                                <Link
                                                                    href={route('pre-alerts.show', pa.id)}
                                                                    className="inline-flex items-center p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 border border-gray-100 transition-colors"
                                                                    title={t('my_locker.view_details')}
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Link>
                                                            )}
                                                        </div>

                                                        {/* Mobile: status + value inline */}
                                                        <div className="col-span-12 sm:hidden flex items-center justify-between mt-1">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${style.color}`}>
                                                                <StatusIcon className="w-3 h-3" />
                                                                {label}
                                                            </span>
                                                            <p className="text-xs font-semibold text-gray-700">
                                                                {pa.declared_currency} {Number(pa.declared_value).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* System PaginationBar */}
                                        <div className="px-6 py-4 border-t border-gray-100">
                                            <PaginationBar
                                                meta={{ current_page, last_page, per_page, total, from: from ?? 0, to: to ?? 0 }}
                                                onPageChange={(page) =>
                                                    router.get(route('my-locker.index'), { page, per_page }, { preserveScroll: true })
                                                }
                                                onPerPageChange={(newPerPage) =>
                                                    router.get(route('my-locker.index'), { page: 1, per_page: newPerPage }, { preserveScroll: true })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </AuthenticatedLayout>
    );
}
