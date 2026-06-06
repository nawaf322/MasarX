import SettingsLayout from '@/Layouts/SettingsLayout';
import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Badge } from "@/Components/UI/badge";
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useTranslation } from '@/hooks/useTranslation';
import { Search, FileText, Activity, X, ChevronDown, ChevronRight } from 'lucide-react';

type AuditMeta = { current_page: number; last_page: number; total: number; per_page: number; from: number | null; to: number | null };
type AuditStats = { total: number; last_24h: number };
type AuditFilters = { q: string };

export default function AuditLogs({
    logs,
    meta,
    stats,
    filters,
}: {
    logs: any[];
    meta: AuditMeta;
    stats: AuditStats;
    filters: AuditFilters;
}) {
    const { t } = useTranslation();
    const safeMeta = meta ?? { current_page: 1, last_page: 1, total: 0, per_page: 10, from: 0, to: 0 };
    const safeStats = stats ?? { total: 0, last_24h: 0 };
    const safeFilters = filters ?? { q: '' };
    const [searchInput, setSearchInput] = useState(safeFilters.q);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    useEffect(() => { setSearchInput(safeFilters.q); }, [safeFilters.q]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('settings.audit'), { q: searchInput.trim() || undefined, page: 1 }, { preserveState: true });
    };

    const clearSearch = () => {
        setSearchInput('');
        router.get(route('settings.audit'), { page: 1 }, { preserveState: false });
    };

    const displayLogs = Array.isArray(logs) ? logs : [];

    const actionVariant = (action: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
        const a = (action || '').toUpperCase();
        if (a === 'CREATED' || a === 'CREATE') return 'default';
        if (a === 'UPDATED' || a === 'UPDATE' || a === 'VIEWED' || a === 'VIEW') return 'secondary';
        if (a === 'DELETED' || a === 'DELETE') return 'destructive';
        if (a === 'LOGIN' || a === 'LOGOUT') return 'outline';
        return 'outline';
    };

    const actionColorClass = (action: string): string => {
        const a = (action || '').toUpperCase();
        if (a === 'LOGIN' || a === 'LOGOUT') return 'bg-blue-50 text-blue-700 border-blue-200';
        return '';
    };

    return (
        <SettingsLayout title={t('settings.menu.audit')}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('settings.audit.title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('settings.audit.desc')}</p>
                </div>

                {/* Stats cards (counters) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('settings.audit.total_entries')}</p>
                            <p className="text-2xl font-bold text-gray-900">{safeStats.total}</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('settings.audit.last_24h')}</p>
                            <p className="text-2xl font-bold text-gray-900">{safeStats.last_24h}</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar: search + filter (Invoice-style) */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder={t('settings.audit.search_placeholder') || 'Search user, action, subject...'}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-9 h-10 bg-white border-gray-200"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="default" className="shrink-0">
                            {t('settings.audit.filter') || 'Filter'}
                        </Button>
                        {(searchInput || safeFilters.q) && (
                            <Button type="button" variant="outline" size="default" className="shrink-0 gap-1.5" onClick={clearSearch}>
                                <X className="h-3.5 w-3.5" />
                                {t('settings.audit.clear_filters')}
                            </Button>
                        )}
                    </form>
                </div>

                {/* Table: Invoice-style (clean, uppercase headers, bordered) */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">{t('settings.audit.table.date')}</th>
                                    <th className="px-6 py-4">{t('settings.audit.table.user')}</th>
                                    <th className="px-6 py-4">{t('settings.audit.table.action')}</th>
                                    <th className="px-6 py-4">{t('settings.audit.table.subject')}</th>
                                    <th className="px-6 py-4">{t('settings.audit.table.ip')}</th>
                                    <th className="px-6 py-4">{t('settings.audit.table.details') || 'Details'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            {t('settings.audit.no_logs')}
                                        </td>
                                    </tr>
                                ) : (
                                    displayLogs.map((log) => (
                                        <>
                                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{log.created_at}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{log.user}</td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        variant={actionVariant(log.action)}
                                                        className={`uppercase text-[10px] font-semibold ${actionColorClass(log.action)}`}
                                                    >
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">{log.subject}</td>
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.ip}</td>
                                                <td className="px-6 py-4">
                                                    {log.details && Object.keys(log.details).length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                                        >
                                                            {expandedRow === log.id
                                                                ? <><ChevronDown className="h-3.5 w-3.5" /> {t('settings.audit.hide_details') || 'Hide'}</>
                                                                : <><ChevronRight className="h-3.5 w-3.5" /> {t('settings.audit.show_details') || 'View'}</>
                                                            }
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedRow === log.id && log.details && (
                                                <tr key={`${log.id}-details`} className="bg-gray-50/70">
                                                    <td colSpan={6} className="px-6 py-3">
                                                        <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                                                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.details, null, 2)}</pre>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Unified pagination (same style as Users / rest of system) */}
                    <AppPagination variant="server" meta={safeMeta} />
                </div>
            </div>
        </SettingsLayout>
    );
}
