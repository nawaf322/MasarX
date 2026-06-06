import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Banknote, Clock, CheckCircle2, ArrowUpRight } from 'lucide-react';
import React, { useState } from 'react';

interface ShipmentData {
    id: number;
    tracking_number: string;
    receiver_details: { name?: string };
    cod_amount: number;
    cod_currency: string;
    cod_status: string;
    cod_collected_at?: string;
    cod_collected_by?: number;
    cod_collector?: { name: string };
}

interface Stats {
    total_amount: number;
    pending: number;
    collected: number;
    remitted: number;
}

interface PaginatedShipments {
    data: ShipmentData[];
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    shipments: PaginatedShipments;
    stats: Stats;
    filters: { cod_status?: string };
}

const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    collected: 'bg-blue-100 text-blue-800',
    remitted: 'bg-green-100 text-green-800',
};

function KpiCard({ label, value, icon, color, isCurrency }: {
    label: string; value: number; icon: React.ReactNode; color: string; isCurrency?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold tabular-nums">
                    {isCurrency ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 }) : value}
                </p>
            </div>
        </div>
    );
}

export default function CodIndex({ shipments, stats, filters }: Props) {
    const { t } = useTranslation();
    const [activeStatus, setActiveStatus] = useState(filters.cod_status ?? '');

    const applyFilter = (status: string) => {
        setActiveStatus(status);
        router.get(route('cod.index'), { cod_status: status }, { preserveState: true, replace: true });
    };

    const tabs = [
        { key: '', label: t('common.all') },
        { key: 'pending', label: t('cod.status_pending') },
        { key: 'collected', label: t('cod.status_collected') },
        { key: 'remitted', label: t('cod.status_remitted') },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('cod.title')} />
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold">{t('cod.title')}</h1>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label={t('cod.total_amount')} value={stats.total_amount} icon={<Banknote className="w-5 h-5 text-gray-600" />} color="bg-gray-100 dark:bg-gray-800" isCurrency />
                    <KpiCard label={t('cod.pending_collection')} value={stats.pending} icon={<Clock className="w-5 h-5 text-yellow-600" />} color="bg-yellow-100 dark:bg-yellow-900/30" isCurrency />
                    <KpiCard label={t('cod.collected')} value={stats.collected} icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/30" isCurrency />
                    <KpiCard label={t('cod.remitted')} value={stats.remitted} icon={<ArrowUpRight className="w-5 h-5 text-green-600" />} color="bg-green-100 dark:bg-green-900/30" isCurrency />
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1 flex-wrap">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => applyFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeStatus === tab.key ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="text-left p-3 font-medium">{t('shipments.tracking_number')}</th>
                                    <th className="text-left p-3 font-medium">{t('shipments.receiver')}</th>
                                    <th className="text-left p-3 font-medium">{t('cod.amount')}</th>
                                    <th className="text-left p-3 font-medium">{t('cod.status')}</th>
                                    <th className="text-left p-3 font-medium">{t('cod.collected_by')}</th>
                                    <th className="text-left p-3 font-medium">{t('cod.collected_at')}</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.data.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t('cod.no_data')}</td></tr>
                                )}
                                {shipments.data.map(s => (
                                    <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="p-3 font-mono text-xs">{s.tracking_number}</td>
                                        <td className="p-3">{s.receiver_details?.name ?? '—'}</td>
                                        <td className="p-3 font-medium">{s.cod_currency} {Number(s.cod_amount).toFixed(2)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s.cod_status] ?? 'bg-gray-100 text-gray-800'}`}>
                                                {t(`cod.status_${s.cod_status}`)}
                                            </span>
                                        </td>
                                        <td className="p-3">{s.cod_collector?.name ?? '—'}</td>
                                        <td className="p-3 text-muted-foreground">
                                            {s.cod_collected_at ? new Date(s.cod_collected_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                {s.cod_status === 'pending' && (
                                                    <Button size="sm" variant="outline" onClick={() => router.post(route('cod.collect', s.id))}>
                                                        {t('cod.mark_collected')}
                                                    </Button>
                                                )}
                                                {s.cod_status === 'collected' && (
                                                    <Button size="sm" variant="outline" onClick={() => router.post(route('cod.remit', s.id))}>
                                                        {t('cod.mark_remitted')}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {shipments.last_page > 1 && (
                        <div className="p-4 flex gap-1 justify-end border-t border-gray-100 dark:border-gray-800">
                            {shipments.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
