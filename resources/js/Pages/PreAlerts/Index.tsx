import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { Package, Clock, CheckCircle, XCircle, Eye, Inbox, Truck, Upload, X, Database, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import axios from 'axios';

interface Customer { id: number; name: string }
interface Locker   { id: number; code: string }

interface PreAlert {
    id: number;
    store_name: string;
    store_tracking_number: string;
    declared_value: number;
    declared_currency: string;
    status: 'pending' | 'received' | 'processing' | 'converted' | 'cancelled';
    customer: Customer | null;
    locker: Locker | null;
    received_at: string | null;
    created_at: string;
}

interface PaginatedPreAlerts {
    data: PreAlert[];
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
    received: number;
    processing: number;
    converted: number;
    cancelled: number;
}

interface Props {
    preAlerts: PaginatedPreAlerts;
    filters: { status?: string; search?: string };
    summary: Summary;
}

interface ImportResult {
    success: boolean;
    imported?: number;
    skipped?: number;
    skipped_rows?: string[];
    message?: string;
}

const statusColors: Record<string, string> = {
    pending:    'bg-yellow-100 text-yellow-800',
    received:   'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    converted:  'bg-green-100 text-green-800',
    cancelled:  'bg-red-100 text-red-700',
};

// ─── Shared result block ──────────────────────────────────────────────────────
function ImportResultBlock({ result, t }: { result: ImportResult; t: (k: string, p?: any) => string }) {
    return (
        <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-2">
                {result.success
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    : <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                    {result.success ? (
                        <>
                            <p className="font-semibold text-sm text-green-800">
                                {t('pre_alerts.import_success', { count: result.imported ?? 0, skipped: result.skipped ?? 0 })}
                            </p>
                            {result.skipped_rows && result.skipped_rows.length > 0 && (
                                <ul className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                                    {result.skipped_rows.map((r, i) => (
                                        <li key={i} className="text-xs text-amber-600">- {r}</li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <p className="font-semibold text-sm text-red-800">{result.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Import modal ─────────────────────────────────────────────────────────────
function ImportModal({ open, onClose, onSuccess }: {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    type Tab = 'template' | 'deprixa_pro';
    const [tab, setTab] = useState<Tab>('deprixa_pro');

    // ── Tab 2: Deprixa Pro SQL ──
    const sqlRef   = useRef<HTMLInputElement>(null);
    const [sqlFiles, setSqlFiles]     = useState<File[]>([]);
    const [sqlResult, setSqlResult]   = useState<ImportResult | null>(null);
    const [sqlLoading, setSqlLoading] = useState(false);

    const reset = () => {
        setSqlFiles([]); setSqlResult(null); setSqlLoading(false);
    };
    const handleClose = () => { reset(); onClose(); };

    // ── Tab 2 handlers ──
    const handleSqlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSqlFiles(Array.from(e.target.files ?? []));
        setSqlResult(null);
    };
    const handleSqlImport = useCallback(async () => {
        if (sqlFiles.length === 0) return;
        setSqlLoading(true); setSqlResult(null);
        const form = new FormData();
        sqlFiles.forEach(f => form.append('files[]', f));
        try {
            const res = await axios.post(route('pre-alerts.import-deprixa-pro'), form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSqlResult(res.data);
            if (res.data.success && res.data.imported > 0) onSuccess();
        } catch (err: any) {
            setSqlResult({ success: false, message: err.response?.data?.message || t('pre_alerts.import_error') });
        } finally { setSqlLoading(false); }
    }, [sqlFiles, t, onSuccess]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Upload className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white">{t('pre_alerts.import_title')}</h2>
                            <p className="text-xs text-gray-500">{t('pre_alerts.import_subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => { setTab('template'); setSqlResult(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            tab === 'template'
                                ? 'border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        {t('pre_alerts.import_tab_template')}
                    </button>
                    <button
                        onClick={() => { setTab('deprixa_pro'); setSqlResult(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            tab === 'deprixa_pro'
                                ? 'border-b-2 border-orange-500 text-orange-700 dark:text-orange-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Database className="h-4 w-4" />
                        {t('pre_alerts.import_tab_deprixa_pro')}
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* ── TAB 1: CSV template (placeholder) ── */}
                    {tab === 'template' && (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <FileSpreadsheet className="h-12 w-12 text-gray-300" />
                            <p className="text-sm text-gray-500">CSV / Excel import coming soon.</p>
                        </div>
                    )}

                    {/* ── TAB 2: Deprixa Pro SQL ── */}
                    {tab === 'deprixa_pro' && (
                        <>
                            {/* Info box */}
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 text-sm text-orange-800 dark:text-orange-300 space-y-1">
                                <p className="font-semibold flex items-center gap-1.5"><Database className="h-4 w-4" />{t('pre_alerts.import_info')}</p>
                                <p className="text-xs">{t('pre_alerts.import_prerequisite')}</p>
                                <ul className="text-xs space-y-0.5 mt-1 list-disc list-inside text-orange-700 dark:text-orange-400">
                                    <li><code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">cdb_pre_alert.sql</code> — {t('pre_alerts.file_pre_alert_required')}</li>
                                    <li><code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">cdb_users.sql</code> — {t('pre_alerts.file_users_optional')}</li>
                                </ul>
                            </div>

                            {/* Multi-file drop zone */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                    sqlFiles.length > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20'
                                                        : 'border-gray-300 hover:border-orange-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-orange-500'
                                }`}
                                onClick={() => sqlRef.current?.click()}
                            >
                                <input ref={sqlRef} type="file" accept=".sql,.txt" multiple className="hidden" onChange={handleSqlFileChange} />
                                {sqlFiles.length > 0 ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Database className="h-8 w-8 text-orange-500" />
                                        {sqlFiles.map((f, i) => (
                                            <p key={i} className="font-semibold text-sm text-gray-900 dark:text-white">{f.name} <span className="text-gray-500 font-normal">({(f.size / 1024).toFixed(1)} KB)</span></p>
                                        ))}
                                        <p className="text-xs text-gray-500">Click to change files</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Database className="h-8 w-8 text-gray-400" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to select .sql files</p>
                                        <p className="text-xs text-gray-500">.sql / .txt - Select multiple files</p>
                                    </div>
                                )}
                            </div>
                            {sqlResult && <ImportResultBlock result={sqlResult} t={t} />}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    {tab === 'deprixa_pro' && (
                        <button
                            onClick={handleSqlImport}
                            disabled={sqlFiles.length === 0 || sqlLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {sqlLoading
                                ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('pre_alerts.import_btn')}</>
                                : <><Database className="h-4 w-4" />{t('pre_alerts.import_btn')}</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PreAlertsIndex({ preAlerts, filters, summary }: Props) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const { props } = usePage<{ flash?: { success?: string; error?: string }; auth?: { permissions?: string[] } }>();
    const flash = props.flash;
    const permissions = (props as any).auth?.permissions ?? [];
    const canImport = Array.isArray(permissions)
        ? permissions.includes('shipments.import') || permissions.includes('pre-alerts.manage')
        : false;

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [importOpen, setImportOpen] = useState(false);

    const refreshList = useCallback(() => {
        router.reload({ only: ['preAlerts', 'summary'] });
    }, []);

    function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
        router.get(route('pre-alerts.index'), { ...filters, search: e.target.value }, { preserveState: true, replace: true });
    }

    function handleStatusFilter(e: React.ChangeEvent<HTMLSelectElement>) {
        router.get(route('pre-alerts.index'), { ...filters, status: e.target.value || undefined }, { preserveState: true, replace: true });
    }

    /* ── Bulk selection helpers ── */
    const allOnPageIds = preAlerts.data.map(pa => pa.id);
    const allSelected  = allOnPageIds.length > 0 && allOnPageIds.every(id => selectedIds.has(id));

    function toggleAll() {
        if (allSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                allOnPageIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                allOnPageIds.forEach(id => next.add(id));
                return next;
            });
        }
    }

    function toggleOne(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    async function handleBulkCancel() {
        const confirmed = await alert.confirm(
            t('pre_alerts.cancel_selected'),
            t('pre_alerts.bulk_cancel_confirm'),
            t('pre_alerts.cancel_selected')
        );
        if (!confirmed) return;
        router.post(route('pre-alerts.bulk-cancel'), { ids: [...selectedIds] }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds(new Set()),
        });
    }

    async function handleBulkDelete() {
        const confirmed = await alert.confirm(
            t('pre_alerts.delete_selected'),
            t('pre_alerts.bulk_delete_confirm'),
            t('pre_alerts.delete_selected')
        );
        if (!confirmed) return;
        router.post(route('pre-alerts.bulk-destroy'), { ids: [...selectedIds] }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds(new Set()),
        });
    }

    const kpiCards = [
        { label: t('pre_alerts.kpi_total'),      value: summary.total,      color: 'bg-gray-50 border-gray-200',    icon: Package,      iconColor: 'text-gray-500' },
        { label: t('pre_alerts.kpi_pending'),     value: summary.pending,    color: 'bg-yellow-50 border-yellow-200',icon: Clock,        iconColor: 'text-yellow-600' },
        { label: t('pre_alerts.kpi_received'),    value: summary.received,   color: 'bg-blue-50 border-blue-200',    icon: Inbox,        iconColor: 'text-blue-600' },
        { label: t('pre_alerts.kpi_processing'),  value: summary.processing, color: 'bg-indigo-50 border-indigo-200',icon: Package,      iconColor: 'text-indigo-600' },
        { label: t('pre_alerts.kpi_converted'),   value: summary.converted,  color: 'bg-green-50 border-green-200',  icon: CheckCircle,  iconColor: 'text-green-600' },
        { label: t('pre_alerts.kpi_cancelled'),   value: summary.cancelled,  color: 'bg-red-50 border-red-200',      icon: XCircle,      iconColor: 'text-red-500' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('pre_alerts.title')} />

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
                    <h1 className="text-2xl font-semibold text-gray-900">{t('pre_alerts.title')}</h1>
                    <div className="flex items-center gap-2">
                        {canImport && (
                            <button
                                onClick={() => setImportOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                {t('pre_alerts.import_btn')}
                            </button>
                        )}
                        <Link
                            href={route('pre-alerts.create')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                            + {t('pre_alerts.new')}
                        </Link>
                    </div>
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
                        placeholder={t('pre_alerts.search_placeholder')}
                        defaultValue={filters.search ?? ''}
                        onChange={handleSearch}
                        className="border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <select
                        defaultValue={filters.status ?? ''}
                        onChange={handleStatusFilter}
                        className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">{t('pre_alerts.all_statuses')}</option>
                        <option value="pending">{t('pre_alerts.status_pending')}</option>
                        <option value="received">{t('pre_alerts.status_received')}</option>
                        <option value="processing">{t('pre_alerts.status_processing')}</option>
                        <option value="converted">{t('pre_alerts.status_converted')}</option>
                        <option value="cancelled">{t('pre_alerts.status_cancelled')}</option>
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
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.store')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.tracking_number')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.customer')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.locker')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.declared_value')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.status')}</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.created_at')}</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {preAlerts.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                                        {t('pre_alerts.no_pre_alerts')}
                                    </td>
                                </tr>
                            ) : (
                                preAlerts.data.map((pa) => (
                                    <tr
                                        key={pa.id}
                                        className={`hover:bg-gray-50 transition-colors ${selectedIds.has(pa.id) ? 'bg-primary/5 bg-green-50' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(pa.id)}
                                                onChange={() => toggleOne(pa.id)}
                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{pa.store_name}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{pa.store_tracking_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {pa.customer?.name ?? <span className="text-gray-400">&mdash;</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-indigo-700 font-semibold">
                                            {pa.locker?.code ?? <span className="text-gray-400">&mdash;</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {pa.declared_currency} {Number(pa.declared_value).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[pa.status]}`}>
                                                {t(`pre_alerts.status_${pa.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {new Date(pa.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('pre-alerts.show', pa.id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                            >
                                                <Eye className="w-3 h-3" />
                                                {t('common.view')}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <AppPagination variant="server" meta={preAlerts} />
            </div>

            {/* Floating bulk action bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-gray-200 shadow-xl rounded-xl px-5 py-3">
                    <span className="text-sm font-medium text-gray-700">
                        {selectedIds.size} {t('pre_alerts.selected')}
                    </span>

                    <button
                        type="button"
                        onClick={handleBulkCancel}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        {t('pre_alerts.cancel_selected')}
                    </button>

                    <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        {t('pre_alerts.delete_selected')}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm text-gray-500 hover:text-gray-700 underline ml-1"
                    >
                        {t('pre_alerts.deselect_all')}
                    </button>
                </div>
            )}

            {/* ── Import modal ──────────────────────────────────────────────── */}
            <ImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onSuccess={refreshList}
            />
        </AuthenticatedLayout>
    );
}
