import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ProTable } from '@/Components/ProTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from "@/Components/UI/button";
import {
    ArrowUpDown, MoreHorizontal, UserPlus, Mail, Phone, Calendar,
    Send, Inbox, Users, TrendingUp, Download, Upload, FileText,
    CheckCircle2, AlertCircle, X, ChevronDown, FileSpreadsheet, Database, Trash2,
} from "lucide-react";
import { Checkbox } from "@/Components/UI/checkbox";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from "@/Components/UI/badge";
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
    total: number;
    new_month: number;
    sent_total: number;
    received_total: number;
}

interface ImportResult {
    success: boolean;
    imported?: number;
    skipped?: number;
    skipped_rows?: string[];
    message?: string;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-xl ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value.toLocaleString()}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Shared result block ──────────────────────────────────────────────────────
function ImportResultBlock({ result, t }: { result: ImportResult; t: (k: string, p?: any) => string }) {
    return (
        <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
            <div className="flex items-start gap-2">
                {result.success
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    : <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                    {result.success ? (
                        <>
                            <p className="font-semibold text-sm text-green-800 dark:text-green-300">
                                {t('customers.import_success', { count: result.imported ?? 0 })}
                            </p>
                            {(result.skipped ?? 0) > 0 && (
                                <p className="text-xs text-amber-700 mt-1">
                                    {t('customers.import_skipped', { count: result.skipped ?? 0 })}
                                </p>
                            )}
                            {result.skipped_rows && result.skipped_rows.length > 0 && (
                                <ul className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                                    {result.skipped_rows.map((r, i) => (
                                        <li key={i} className="text-xs text-amber-600">· {r}</li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <p className="font-semibold text-sm text-red-800 dark:text-red-300">{result.message}</p>
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
    const [tab, setTab] = useState<Tab>('template');

    // ── Tab 1: CSV/XLSX template ──
    const fileRef  = useRef<HTMLInputElement>(null);
    const [file, setFile]       = useState<File | null>(null);
    const [result, setResult]   = useState<ImportResult | null>(null);
    const [loading, setLoading] = useState(false);

    // ── Tab 2: Deprixa Pro SQL ──
    const sqlRef   = useRef<HTMLInputElement>(null);
    const [sqlFiles, setSqlFiles]     = useState<File[]>([]);
    const [sqlResult, setSqlResult]   = useState<ImportResult | null>(null);
    const [sqlLoading, setSqlLoading] = useState(false);

    const reset = () => {
        setFile(null); setResult(null); setLoading(false);
        setSqlFiles([]); setSqlResult(null); setSqlLoading(false);
    };
    const handleClose = () => { reset(); onClose(); };

    // ── Tab 1 handlers ──
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] ?? null);
        setResult(null);
    };
    const handleImport = useCallback(async () => {
        if (!file) return;
        setLoading(true); setResult(null);
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await axios.post(route('customers.import'), form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
            if (res.data.success && res.data.imported > 0) onSuccess();
        } catch (err: any) {
            setResult({ success: false, message: err.response?.data?.message || t('customers.import_error') });
        } finally { setLoading(false); }
    }, [file, t, onSuccess]);

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
            const res = await axios.post(route('customers.import.deprixa-pro'), form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSqlResult(res.data);
            if (res.data.success && res.data.imported > 0) onSuccess();
        } catch (err: any) {
            setSqlResult({ success: false, message: err.response?.data?.message || t('customers.import_error') });
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
                            <h2 className="font-bold text-gray-900 dark:text-white">{t('customers.import_title')}</h2>
                            <p className="text-xs text-muted-foreground">{t('customers.import_subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => { setTab('template'); setResult(null); setSqlResult(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            tab === 'template'
                                ? 'border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-400'
                                : 'text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        {t('customers.import_tab_template')}
                    </button>
                    <button
                        onClick={() => { setTab('deprixa_pro'); setResult(null); setSqlResult(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            tab === 'deprixa_pro'
                                ? 'border-b-2 border-orange-500 text-orange-700 dark:text-orange-400'
                                : 'text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Database className="h-4 w-4" />
                        {t('customers.import_tab_deprixa_pro')}
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* ── TAB 1: CSV template ── */}
                    {tab === 'template' && (
                        <>
                            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span>{t('customers.import_template_hint')}</span>
                                </div>
                                <a href={route('customers.import.template')}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline whitespace-nowrap ml-2">
                                    {t('customers.download_template')}
                                </a>
                            </div>
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                    file ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20'
                                         : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-indigo-500'
                                }`}
                                onClick={() => fileRef.current?.click()}
                            >
                                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileSpreadsheet className="h-8 w-8 text-indigo-500" />
                                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {t('customers.click_to_change')}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="h-8 w-8 text-gray-400" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('customers.drop_file_here')}</p>
                                        <p className="text-xs text-muted-foreground">CSV, XLSX, XLS · {t('customers.max_file_size')}</p>
                                    </div>
                                )}
                            </div>
                            {result && <ImportResultBlock result={result} t={t} />}
                        </>
                    )}

                    {/* ── TAB 2: Deprixa Pro SQL ── */}
                    {tab === 'deprixa_pro' && (
                        <>
                            {/* Info box */}
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 text-sm text-orange-800 dark:text-orange-300 space-y-1">
                                <p className="font-semibold flex items-center gap-1.5"><Database className="h-4 w-4" />{t('customers.import_deprixa_pro_title')}</p>
                                <p className="text-xs">{t('customers.import_deprixa_pro_hint')}</p>
                                <ul className="text-xs space-y-0.5 mt-1 list-disc list-inside text-orange-700 dark:text-orange-400">
                                    <li><code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">cdb_users.sql</code> — {t('customers.import_deprixa_pro_file1')}</li>
                                    <li><code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">cdb_senders_addresses.sql</code> — {t('customers.import_deprixa_pro_file2')}</li>
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
                                            <p key={i} className="font-semibold text-sm text-gray-900 dark:text-white">{f.name} <span className="text-muted-foreground font-normal">({(f.size / 1024).toFixed(1)} KB)</span></p>
                                        ))}
                                        <p className="text-xs text-muted-foreground">{t('customers.click_to_change')}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Database className="h-8 w-8 text-gray-400" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('customers.import_deprixa_pro_drop')}</p>
                                        <p className="text-xs text-muted-foreground">.sql · {t('customers.import_deprixa_pro_multi')}</p>
                                    </div>
                                )}
                            </div>
                            {sqlResult && <ImportResultBlock result={sqlResult} t={t} />}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
                    {tab === 'template' ? (
                        <Button onClick={handleImport} disabled={!file || loading} className="gap-2">
                            {loading
                                ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('customers.importing')}</>
                                : <><Upload className="h-4 w-4" />{t('customers.import_btn')}</>
                            }
                        </Button>
                    ) : (
                        <Button onClick={handleSqlImport} disabled={sqlFiles.length === 0 || sqlLoading}
                            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                            {sqlLoading
                                ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('customers.importing')}</>
                                : <><Database className="h-4 w-4" />{t('customers.import_btn')}</>
                            }
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomerIndex({
    customers,
    stats,
    isSuperAdmin = false,
}: {
    customers: any;
    stats: Stats;
    isSuperAdmin?: boolean;
}) {
    const alert = useSweetAlert();
    const { t } = useTranslation();
    const [importOpen, setImportOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const refreshList = useCallback(() => {
        router.reload({ only: ['customers', 'stats'] });
    }, []);

    const selectedCustomers = Object.keys(rowSelection)
        .filter(k => rowSelection[k])
        .map(k => customers.data[parseInt(k)])
        .filter(Boolean);
    const selectedIds = selectedCustomers.map((c: any) => c.id);
    const selectedWithShipments = selectedCustomers.filter((c: any) => (c.shipments_count ?? 0) > 0);

    const blockedByShipments = selectedWithShipments.length > 0;

    const handleBulkDelete = () => {
        if (selectedIds.length === 0 || blockedByShipments) return;
        alert.confirm(
            t('customers.bulk_delete_confirm_title'),
            t('customers.bulk_delete_confirm_msg', { count: String(selectedIds.length) }),
            t('common.yes_confirm')
        ).then((ok: boolean) => {
            if (ok) {
                router.post(
                    route('customers.bulk-destroy'),
                    { ids: selectedIds },
                    { preserveScroll: false, onSuccess: () => setRowSelection({}) }
                );
            }
        });
    };

    // ── Table columns ──────────────────────────────────────────────────────────
    const columns: ColumnDef<any>[] = [
        {
            id: 'select',
            enableSorting: false,
            enableHiding: false,
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                    aria-label="Select all"
                    className="rounded"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    aria-label="Select row"
                    className="rounded"
                />
            ),
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('forms.name')}
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-900 dark:text-white">{row.original.name}</div>
            ),
        },
        {
            accessorKey: "email",
            header: t('forms.email'),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {row.original.email}
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: t('forms.phone'),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {row.original.phone}
                </div>
            ),
        },
        {
            accessorKey: "created_at",
            header: t('common.date'),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {row.original.created_at}
                </div>
            ),
        },
        {
            accessorKey: "sent_count",
            header: t('customers.sent_count'),
            cell: ({ row }) => (
                <Badge variant="outline" className="flex w-fit items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30">
                    <Send className="h-3 w-3" />
                    {row.original.sent_count}
                </Badge>
            ),
        },
        {
            accessorKey: "received_count",
            header: t('customers.received_count'),
            cell: ({ row }) => (
                <Badge variant="outline" className="flex w-fit items-center gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30">
                    <Inbox className="h-3 w-3" />
                    {row.original.received_count}
                </Badge>
            ),
        },
        {
            id: "actions",
            header: t('common.actions'),
            cell: ({ row }) => {
                const customer = row.original;

                const handleDelete = () => {
                    alert.confirm(
                        t('common.delete') + '?',
                        t('customers.delete_warning'),
                        t('common.yes_confirm')
                    ).then((confirmed) => {
                        if (confirmed) {
                            router.delete(route('customers.destroy', customer.id), {
                                onError: () => alert.error('Error!', t('customers.delete_error')),
                            });
                        }
                    });
                };

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">{t('common.actions')}</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.visit(route('customers.show', customer.id))}>
                                {t('common.view')} {t('customers.show_title')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.visit(route('customers.edit', customer.id))}>
                                {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(customer.email)}>
                                {t('customers.copy_email')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                {t('common.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('sidebar.customers')} />

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {t('sidebar.customers')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('customers.index_subtitle')}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Import */}
                    <Button variant="outline" className="gap-2 h-9" onClick={() => setImportOpen(true)}>
                        <Upload className="h-4 w-4" />
                        {t('customers.import_btn')}
                    </Button>

                    {/* Export dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 h-9">
                                <Download className="h-4 w-4" />
                                {t('customers.export_btn')}
                                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('customers.export_as')}</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <a href={route('customers.export', { format: 'xlsx' })}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                                    Excel (.xlsx)
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href={route('customers.export', { format: 'csv' })}>
                                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                    CSV (.csv)
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Create */}
                    <Button asChild className="h-9 gap-2">
                        <Link href={route('customers.create')}>
                            <UserPlus className="h-4 w-4" />
                            {t('customers.create_btn')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── KPI Cards ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <KpiCard
                    icon={<Users className="h-5 w-5 text-blue-600" />}
                    label={t('customers.kpi_total')}
                    value={stats.total}
                    color="bg-blue-100 dark:bg-blue-950"
                />
                <KpiCard
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    label={t('customers.kpi_new_month')}
                    value={stats.new_month}
                    sub={t('customers.kpi_this_month')}
                    color="bg-green-100 dark:bg-green-950"
                />
                <KpiCard
                    icon={<Send className="h-5 w-5 text-purple-600" />}
                    label={t('customers.kpi_sent')}
                    value={stats.sent_total}
                    sub={t('customers.kpi_all_time')}
                    color="bg-purple-100 dark:bg-purple-950"
                />
                <KpiCard
                    icon={<Inbox className="h-5 w-5 text-amber-600" />}
                    label={t('customers.kpi_received')}
                    value={stats.received_total}
                    sub={t('customers.kpi_all_time')}
                    color="bg-amber-100 dark:bg-amber-950"
                />
            </div>

            {/* ── Table ────────────────────────────────────────────────────── */}
            <ProTable
                columns={columns}
                data={customers.data}
                searchKey="name"
                searchPlaceholder={t('customers.search_placeholder')}
                meta={customers}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
            />

            {/* ── Floating bulk-action bar ──────────────────────────────────── */}
            {selectedIds.length > 0 && (
                <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-2xl border ${blockedByShipments ? 'bg-red-900 border-red-700' : 'bg-gray-900 dark:bg-gray-800 border-gray-700'}`}>
                    <span className="text-sm font-semibold tabular-nums">
                        {selectedIds.length} {t('customers.selected_count')}
                    </span>
                    {blockedByShipments ? (
                        <>
                            <span className="text-red-400">·</span>
                            <span className="text-xs text-red-300 font-medium">
                                {t('customers.bulk_delete_blocked', { count: String(selectedWithShipments.length) })}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-gray-600">|</span>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('customers.bulk_delete_btn')}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setRowSelection({})}
                        className="ml-1 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t('customers.deselect_all')}
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
