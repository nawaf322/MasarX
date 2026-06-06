import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Badge } from '@/Components/UI/badge';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useTranslation } from '@/hooks/useTranslation';
import {
    Upload, Download, FileText, CheckCircle2, XCircle, Clock,
    RefreshCw, Database, AlertTriangle, ExternalLink, ChevronRight, Trash2,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface ImportJobData {
    id: number;
    filename: string;
    type: string;
    status: string;
    total_rows: number;
    success_rows: number;
    error_rows: number;
    created_at: string;
    creator?: { name: string };
}

interface PaginatedJobs {
    data: ImportJobData[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    importJobs: PaginatedJobs;
}

interface ImportResult {
    success: boolean;
    imported?: number;
    skipped?: number;
    skipped_rows?: string[];
    message?: string;
}

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        done: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
    };
    return map[status] ?? 'bg-gray-100 text-gray-800';
};

// ── Shared result block ────────────────────────────────────────────────────────
function ImportResultBlock({ result }: { result: ImportResult }) {
    const { t } = useTranslation();
    if (!result.success) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{result.message ?? t('common.error')}</span>
            </div>
        );
    }
    return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium text-green-800">
                <CheckCircle2 className="w-4 h-4" />
                {t('import.deprixa_pro_imported', { count: String(result.imported ?? 0) })}
                {(result.skipped ?? 0) > 0 && (
                    <span className="text-yellow-700 font-normal ml-1">
                        {t('import.deprixa_pro_skipped', { count: String(result.skipped ?? 0) })}
                    </span>
                )}
            </div>
            {result.skipped_rows && result.skipped_rows.length > 0 && (
                <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-yellow-700">
                        {t('import.deprixa_pro_skipped_rows')} ({result.skipped_rows.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-2 border-l-2 border-yellow-300">
                        {result.skipped_rows.slice(0, 50).map((r, i) => <li key={i}>{r}</li>)}
                        {result.skipped_rows.length > 50 && <li>…y {result.skipped_rows.length - 50} más</li>}
                    </ul>
                </details>
            )}
        </div>
    );
}

// ── Deprixa Pro SQL Tab ────────────────────────────────────────────────────────
function DeprixaProTab() {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const valid = Array.from(incoming).filter(f =>
            f.name.toLowerCase().endsWith('.sql') || f.name.toLowerCase().endsWith('.txt')
        );
        setFiles(prev => {
            const existing = new Set(prev.map(f => f.name));
            return [...prev, ...valid.filter(f => !existing.has(f.name))];
        });
    };

    const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

    const hasOrderFile = files.some(f => f.name.toLowerCase().includes('cdb_add_order') && !f.name.toLowerCase().includes('item'));
    const missingRequired = files.length > 0 && !hasOrderFile;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0 || missingRequired) return;
        setSubmitting(true);
        setResult(null);

        const data = new FormData();
        files.forEach(f => data.append('files[]', f));

        try {
            const res = await axios.post(route('import.deprixa-pro'), data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
            if (res.data.success) setFiles([]);
        } catch (err: any) {
            setResult({
                success: false,
                message: err?.response?.data?.message ?? t('common.error'),
            });
        } finally {
            setSubmitting(false);
        }
    };

    const fileDescriptions: Record<string, string> = {
        'cdb_add_order':           t('import.deprixa_pro_file_orders'),
        'cdb_add_order_item':      t('import.deprixa_pro_file_items'),
        'cdb_users':               t('import.deprixa_pro_file_users'),
        'cdb_senders_addresses':   t('import.deprixa_pro_file_addresses'),
        'cdb_country':             t('import.deprixa_pro_file_location'),
        'cdb_state':               t('import.deprixa_pro_file_location'),
        'cdb_city':                t('import.deprixa_pro_file_location'),
    };

    const guessDesc = (filename: string): string => {
        const base = filename.replace(/\.(sql|txt)$/i, '').toLowerCase();
        for (const key of Object.keys(fileDescriptions)) {
            if (base.includes(key.replace('cdb_', ''))) return fileDescriptions[key];
        }
        return '';
    };

    return (
        <div className="space-y-5">
            {/* Prerequisite notice */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                            {t('import.deprixa_pro_prerequisite_title')}
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 mb-2">
                            {t('import.deprixa_pro_prerequisite_body')}
                        </p>
                        <a
                            href={route('customers.index')}
                            className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200 underline font-medium text-xs"
                        >
                            {t('import.deprixa_pro_go_customers')}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* File description legend */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                {[
                    { key: 'cdb_add_order.sql',         badge: 'required'    as const, desc: t('import.deprixa_pro_file_orders') },
                    { key: 'cdb_users.sql',             badge: 'recommended' as const, desc: t('import.deprixa_pro_file_users_optional') },
                    { key: 'cdb_add_order_item.sql',    badge: 'optional'    as const, desc: t('import.deprixa_pro_file_items') },
                    { key: 'cdb_senders_addresses.sql', badge: 'optional'    as const, desc: t('import.deprixa_pro_file_addresses') },
                    { key: 'cdb_country/state/city.sql',badge: 'optional'    as const, desc: t('import.deprixa_pro_file_location') },
                ].map(row => (
                    <div key={row.key} className="flex items-center gap-3 px-3 py-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-mono text-gray-600 dark:text-gray-400 flex-1">{row.key}</span>
                        {row.badge === 'required'
                            ? <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold shrink-0">REQUIRED</span>
                            : row.badge === 'recommended'
                            ? <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold shrink-0">{t('import.deprixa_pro_recommended')}</span>
                            : <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] shrink-0">optional</span>
                        }
                        <span className="text-gray-500 hidden sm:block">{row.desc}</span>
                    </div>
                ))}
            </div>

            {/* Upload form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-orange-300'}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                    onClick={() => fileRef.current?.click()}
                >
                    <Database className="w-10 h-10 mx-auto mb-2 text-orange-400" />
                    <p className="text-sm text-muted-foreground">{t('import.deprixa_pro_drop')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('import.deprixa_pro_multi')}</p>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".sql,.txt"
                        multiple
                        onChange={e => handleFiles(e.target.files)}
                        className="hidden"
                    />
                </div>

                {/* Selected files */}
                {files.length > 0 && (
                    <ul className="space-y-1.5">
                        {files.map(f => (
                            <li key={f.name} className="flex items-center gap-2 text-sm bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-md px-3 py-2">
                                <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                <span className="flex-1 font-medium truncate">{f.name}</span>
                                <span className="text-xs text-muted-foreground hidden sm:block">{guessDesc(f.name)}</span>
                                <button
                                    type="button"
                                    onClick={() => removeFile(f.name)}
                                    className="text-gray-400 hover:text-red-500 ml-1 text-xs px-1"
                                >✕</button>
                            </li>
                        ))}
                    </ul>
                )}

                {missingRequired && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex gap-2">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{t('import.deprixa_pro_missing_required')}</span>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={files.length === 0 || submitting || missingRequired}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                    {submitting ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{t('common.processing')}</>
                    ) : (
                        <><Upload className="w-4 h-4 mr-2" />{t('import.deprixa_pro_btn')}</>
                    )}
                </Button>
            </form>

            {result && <ImportResultBlock result={result} />}
        </div>
    );
}

// ── Template CSV/Excel Tab ─────────────────────────────────────────────────────
function TemplateImportTab({ onImported }: { onImported: () => void }) {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message?: string; success_rows?: number; error_rows?: number; total_rows?: number; redirect_url?: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] ?? null);
        setResult(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) { setFile(dropped); setResult(null); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setSubmitting(true);
        setResult(null);

        const data = new FormData();
        data.append('file', file);

        try {
            const res = await axios.post(route('import.store'), data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
            if (res.data.success) {
                setFile(null);
                onImported();
                // Navigate to the show page after 1.5s so user sees the result first
                setTimeout(() => {
                    if (res.data.redirect_url) router.visit(res.data.redirect_url);
                }, 1500);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.response?.data?.errors?.file?.[0] ?? t('common.error');
            setResult({ success: false, message: msg });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                {file ? (
                    <p className="text-sm font-medium text-green-600">{file.name}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('import.drag_drop')}</p>
                )}
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                    {t('import.browse_file')}
                </Button>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFileChange} className="hidden" />
            </div>

            {result && (
                result.success ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                            {t('import.job_done', { success: String(result.success_rows ?? 0), errors: String(result.error_rows ?? 0) })}
                            {' '}<span className="text-muted-foreground text-xs">{t('import.redirecting')}</span>
                        </span>
                    </div>
                ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{result.message}</span>
                    </div>
                )
            )}

            <Button type="submit" disabled={!file || submitting} className="w-full">
                {submitting
                    ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{t('common.processing')}</>
                    : <><Upload className="w-4 h-4 mr-2" />{t('import.start_import')}</>
                }
            </Button>
        </form>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImportIndex({ importJobs }: Props) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'template' | 'deprixa'>('template');
    const [refreshKey, setRefreshKey] = useState(0);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = async (jobId: number) => {
        const result = await Swal.fire({
            title: t('import.confirm_delete_title'),
            text: t('import.confirm_delete'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: t('common.delete'),
            cancelButtonText: t('common.cancel'),
        });
        if (!result.isConfirmed) return;
        setDeletingId(jobId);
        try {
            await axios.delete(route('import.destroy', jobId));
            router.reload({ only: ['importJobs'] });
            Swal.fire({
                icon: 'success',
                title: t('common.deleted'),
                timer: 1500,
                showConfirmButton: false,
            });
        } catch {
            Swal.fire({ icon: 'error', title: t('common.error'), timer: 2000, showConfirmButton: false });
        } finally {
            setDeletingId(null);
        }
    };

    const tabs = [
        { key: 'template' as const, label: t('import.tab_template'), icon: <Upload className="w-4 h-4" /> },
        { key: 'deprixa'  as const, label: t('import.tab_deprixa_pro'), icon: <Database className="w-4 h-4" /> },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('import.title')} />
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{t('import.title')}</h1>
                    {activeTab === 'template' && (
                        <Button variant="outline" asChild>
                            <a href={route('import.template')}>
                                <Download className="w-4 h-4 mr-1" />{t('import.download_template')}
                            </a>
                        </Button>
                    )}
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                activeTab === tab.key
                                    ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab 1: CSV/Excel */}
                {activeTab === 'template' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                        <h2 className="font-medium text-lg">{t('import.upload_file')}</h2>
                        <TemplateImportTab onImported={() => setRefreshKey(k => k + 1)} />
                    </div>
                )}

                {/* Tab 2: Deprixa Pro SQL */}
                {activeTab === 'deprixa' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="font-medium text-lg mb-4">{t('import.deprixa_pro_title')}</h2>
                        <DeprixaProTab />
                    </div>
                )}

                {/* Past Jobs (only on template tab) */}
                {activeTab === 'template' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="font-medium">{t('import.past_imports')}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-3 font-medium">{t('import.filename')}</th>
                                        <th className="text-left p-3 font-medium">{t('import.status')}</th>
                                        <th className="text-left p-3 font-medium">{t('import.rows')}</th>
                                        <th className="text-left p-3 font-medium">{t('import.date')}</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importJobs.data.length === 0 && (
                                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t('import.no_imports')}</td></tr>
                                    )}
                                    {importJobs.data.map(job => (
                                        <tr key={job.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-gray-400" />
                                                    {job.filename}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(job.status)}`}>
                                                    {t(`import.status_${job.status}`)}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-green-600">{job.success_rows}</span>
                                                {' / '}
                                                <span className="text-red-500">{job.error_rows}</span>
                                                {' / '}
                                                <span className="text-muted-foreground">{job.total_rows}</span>
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                                {new Date(job.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => router.get(route('import.show', job.id))}>
                                                        {t('common.view')}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={deletingId === job.id}
                                                        onClick={() => handleDelete(job.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        {deletingId === job.id
                                                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                            : <Trash2 className="w-4 h-4" />
                                                        }
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <AppPagination variant="server" meta={importJobs} />
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
