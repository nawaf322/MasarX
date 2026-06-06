import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Badge } from "@/Components/UI/badge";
import { AppPagination } from '@/Components/Shared/AppPagination';
import { ArrowLeft, Package, DollarSign, Phone, MapPin, Plus, Send, Inbox, FileText, Truck, ShieldCheck, ShieldOff, Copy, Check, Calendar, Hash } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatDate } from '@/utils/localeFormat';
import { useState } from 'react';

const safeRoute = (name: string, ...args: any[]): string => {
    try {
        const ziggy = (window as any).Ziggy;
        if (!ziggy?.routes?.[name]) return '#';
        return route(name, ...args);
    } catch { return '#'; }
};
const hasRoute = (name: string): boolean => !!(window as any).Ziggy?.routes?.[name];

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

interface Shipment {
    id: number;
    tracking_number: string;
    status: string;
    date: string;
    total: number;
    currency: string;
    role: 'sender' | 'receiver';
}

interface Contract {
    id: number;
    contract_number: string;
    title: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    signed_at: string | null;
}

interface Pickup {
    id: number;
    tracking_number: string;
    status: string;
    scheduled_for: string | null;
    contact_name: string;
    pickup_address: string;
}

interface Locker {
    id: number;
    code: string;
    status: string;
    address: string | null;
    assigned_at: string | null;
}

interface Props {
    customer: any;
    stats: any;
    locker: Locker | null;
    recent_shipments: Paginated<Shipment>;
    contracts: Paginated<Contract>;
    pickups: Paginated<Pickup>;
    active_tab: string;
}

const CONTRACT_COLORS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    active:    'bg-green-100 text-green-700',
    expired:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
};

const PICKUP_COLORS: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

type TabKey = 'shipments' | 'contracts' | 'pickups';

export default function CustomerShow({ customer, stats, locker, recent_shipments, contracts, pickups, active_tab }: Props) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<TabKey>((active_tab as TabKey) || 'shipments');
    const [copiedUrl, setCopiedUrl] = useState(false);

    const pageProps = usePage().props as any;
    const invitationUrl = (pageProps?.flash as any)?.invitation_url as string | undefined;
    const flashWarning  = (pageProps?.flash as any)?.warning as string | undefined;

    const portalAccepted = !!customer.invitation_accepted_at;
    const portalPending  = !portalAccepted && !!customer.invitation_token;

    function resendInvitation() {
        router.post(route('customers.resend-invitation', customer.id), {}, { preserveScroll: true });
    }

    function copyUrl() {
        if (invitationUrl) {
            navigator.clipboard.writeText(invitationUrl).then(() => {
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
            });
        }
    }

    function switchTab(key: TabKey) {
        setTab(key);
        router.get(
            route('customers.show', customer.id),
            { tab: key },
            { preserveState: true, replace: true }
        );
    }

    const tabs: { key: TabKey; label: string; total: number; icon: React.ElementType }[] = [
        { key: 'shipments', label: t('customers.recent_shipments'), total: recent_shipments.total, icon: Send },
        { key: 'contracts', label: t('customers.tab_contracts'),    total: contracts.total,        icon: FileText },
        { key: 'pickups',   label: t('customers.tab_pickups'),      total: pickups.total,          icon: Truck },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`${t('customers.show_title')}: ${customer.name}`} />

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Invitation URL banner — shown when SMTP is not configured */}
                {invitationUrl && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                            {flashWarning ?? t('customers.invitation_url_copy_hint')}
                        </p>
                        <div className="flex items-center gap-2">
                            <input readOnly value={invitationUrl}
                                className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-gray-700 font-mono truncate" />
                            <Button type="button" size="sm" variant="outline" onClick={copyUrl}
                                className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
                                {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={route('customers.index')}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('customers.back_to_list')}
                    </Link>
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
                            <p className="text-gray-500 mt-1">{customer.email}</p>
                            <div className="mt-2">
                                {portalAccepted ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {t('customers.portal_active')}
                                    </span>
                                ) : portalPending ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                                        <ShieldOff className="h-3.5 w-3.5" />
                                        {t('customers.portal_pending')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                                        <ShieldOff className="h-3.5 w-3.5" />
                                        {t('customers.portal_no_access')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button asChild variant="outline">
                                <Link href={route('customers.edit', customer.id)}>
                                    {t('customers.edit_profile')}
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={route('shipments.create', { customer_id: customer.id })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('customers.new_shipment')}
                                </Link>
                            </Button>
                            {hasRoute('contracts.create') && (
                                <Button asChild variant="outline">
                                    <Link href={safeRoute('contracts.create', { customer_id: customer.id })}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        {t('customers.new_contract')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: t('customers.sent_count'),      value: stats.sent_count ?? 0,      icon: Send,       bg: 'bg-blue-100',   text: 'text-blue-600' },
                        { label: t('customers.received_count'),  value: stats.received_count ?? 0,  icon: Inbox,      bg: 'bg-purple-100', text: 'text-purple-600' },
                        { label: t('customers.active_shipments'),value: stats.active_shipments ?? 0, icon: Package,    bg: 'bg-amber-100',  text: 'text-amber-600' },
                        { label: t('customers.total_spend'),     value: formatCurrency(stats.total_spend ?? 0), icon: DollarSign, bg: 'bg-green-100',  text: 'text-green-600', isCurrency: true },
                    ].map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                <div className={`p-3 ${card.bg} dark:opacity-80 ${card.text} rounded-lg shrink-0`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">{card.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {card.isCurrency ? card.value : card.value}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                                {t('customers.contact_info')}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Phone className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t('customers.phone')}</p>
                                        <p className="text-sm text-gray-500">{customer.phone || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t('customers.address')}</p>
                                        <p className="text-sm text-gray-500">
                                            {customer.address || t('customers.no_address')}
                                            {(customer.city || customer.country) && (
                                                <><br />{[customer.city, customer.country].filter(Boolean).join(', ')}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t('customers.member_since')}</p>
                                        <p className="text-sm text-gray-500">
                                            {customer.created_at ? formatDate(customer.created_at) : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Locker card */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                                {t('customers.locker')}
                            </h3>
                            {locker ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                            <Hash className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t('customers.locker_code')}</p>
                                            <p className="text-lg font-bold font-mono text-indigo-700 tracking-wider">{locker.code}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('common.status')}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${locker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {locker.status}
                                        </span>
                                    </div>
                                    {locker.address && (
                                        <p className="text-xs text-gray-500 flex items-start gap-1">
                                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                            {locker.address}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">{t('customers.no_locker')}</p>
                            )}
                        </div>

                        {/* Portal access card */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                                {t('customers.portal_access')}
                            </h3>
                            {portalAccepted ? (
                                <div className="flex items-center gap-2 text-sm text-green-700">
                                    <ShieldCheck className="h-4 w-4 shrink-0" />
                                    <span>{t('customers.portal_active_desc')}</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-500">
                                        {portalPending
                                            ? t('customers.portal_pending_desc')
                                            : t('customers.portal_no_access_desc')}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={resendInvitation}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {portalPending
                                            ? t('customers.resend_portal_invitation')
                                            : t('customers.send_portal_invitation')}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Quick links */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                                {t('customers.quick_links')}
                            </h3>
                            <div className="space-y-2">
                                {hasRoute('contracts.index') && (
                                    <Link
                                        href={safeRoute('contracts.index', { search: customer.name })}
                                        className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                                        <span>{t('customers.all_contracts')}</span>
                                        {contracts.total > 0 && (
                                            <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                                {contracts.total}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                <Link
                                    href={route('pickups.index')}
                                    className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Truck className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span>{t('customers.all_pickups')}</span>
                                    {pickups.total > 0 && (
                                        <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                            {pickups.total}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Tabbed content */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                                {tabs.map(({ key, label, total, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => switchTab(key)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                                            tab === key
                                                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                            tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {total}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* ── Shipments Tab ── */}
                            {tab === 'shipments' && (
                                <>
                                    {recent_shipments.data.length === 0 ? (
                                        <p className="px-6 py-10 text-sm text-gray-500 italic text-center">{t('customers.no_shipments')}</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">{t('customers.col_tracking')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('customers.col_role')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('customers.col_status')}</th>
                                                        <th className="hidden sm:table-cell px-4 py-3 font-semibold">{t('customers.col_date')}</th>
                                                        <th className="px-4 py-3 font-semibold text-right">{t('customers.col_total')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {recent_shipments.data.map((shipment) => (
                                                        <tr key={shipment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                                            <td className="px-4 py-3 font-medium text-blue-600 hover:underline">
                                                                <Link href={route('shipments.show', shipment.id)}>
                                                                    {shipment.tracking_number}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {shipment.role === 'sender' ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                        <Send className="h-3 w-3" />
                                                                        {t('customers.role_sender')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                                        <Inbox className="h-3 w-3" />
                                                                        {t('customers.role_receiver')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Badge variant="outline" className="capitalize">
                                                                    {(shipment.status ?? '').replace(/_/g, ' ')}
                                                                </Badge>
                                                            </td>
                                                            <td className="hidden sm:table-cell px-4 py-3 text-gray-500">{shipment.date}</td>
                                                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                                {formatCurrency(shipment.total ?? 0, shipment.currency)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="px-2 py-2">
                                        <AppPagination variant="server" meta={recent_shipments} />
                                    </div>
                                </>
                            )}

                            {/* ── Contracts Tab ── */}
                            {tab === 'contracts' && (
                                <>
                                    {contracts.data.length === 0 ? (
                                        <div className="px-6 py-10 text-center">
                                            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 italic">{t('customers.no_contracts')}</p>
                                            {hasRoute('contracts.create') && (
                                                <Link
                                                    href={safeRoute('contracts.create', { customer_id: customer.id })}
                                                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    {t('customers.new_contract')}
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">{t('contracts.contract_number')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('contracts.title')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('contracts.status')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('contracts.start_date')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('common.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {contracts.data.map((c) => (
                                                        <tr key={c.id} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.contract_number}</td>
                                                            <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{c.title}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${CONTRACT_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                    {t(`contracts.status_${c.status}`)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-500 text-xs">{c.start_date ?? '—'}</td>
                                                            <td className="px-4 py-3">
                                                                <Link href={safeRoute('contracts.show', c.id)} className="text-xs text-indigo-600 hover:underline font-medium">
                                                                    {t('common.view')}
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="px-2 py-2">
                                        <AppPagination variant="server" meta={contracts} />
                                    </div>
                                </>
                            )}

                            {/* ── Pickups Tab ── */}
                            {tab === 'pickups' && (
                                <>
                                    {pickups.data.length === 0 ? (
                                        <div className="px-6 py-10 text-center">
                                            <Truck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 italic">{t('customers.no_pickups')}</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">{t('pickups.tracking')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('pickups.status')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('pickups.scheduled_for')}</th>
                                                        <th className="px-4 py-3 font-semibold hidden sm:table-cell">{t('pickups.address')}</th>
                                                        <th className="px-4 py-3 font-semibold">{t('common.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {pickups.data.map((p) => (
                                                        <tr key={p.id} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3 font-mono text-xs text-blue-700">{p.tracking_number}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${PICKUP_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                    {t(`pickups.status_${p.status}`)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-500 text-xs">{p.scheduled_for ?? '—'}</td>
                                                            <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px] hidden sm:table-cell">{p.pickup_address}</td>
                                                            <td className="px-4 py-3">
                                                                <Link href={route('pickups.show', p.id)} className="text-xs text-indigo-600 hover:underline font-medium">
                                                                    {t('common.view')}
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="px-2 py-2">
                                        <AppPagination variant="server" meta={pickups} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
