import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Database, Server, RefreshCw, Download, Upload, Trash2, Cpu, Layers,
    Clock, CheckCircle, XCircle, HardDrive, AlertTriangle, Users, Package,
    Activity, AlertCircle,
} from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';

type ServerData = {
    db_status: string;
    db_driver: string;
    db_name: string | null;
    php_version: string;
    server_time: string;
    app_env: string;
    app_debug: boolean;
    laravel_version: string;
    memory_limit: string;
    max_execution_time: string;
    upload_max_filesize: string;
    cache_driver: string;
    queue_connection: string;
    storage_writable: boolean;
    storage_log_writable: boolean;
    disk_total_gb: number | null;
    disk_free_gb: number | null;
    disk_used_gb: number | null;
    disk_used_pct: number | null;
    pending_jobs: number;
    failed_jobs: number;
    shipment_count: number;
    user_count: number;
    recent_errors: string[];
};

type Flash = { success?: string; error?: string; warning?: string };

type Props = {
    server?: ServerData;
    flash?: Flash;
};

function StatusIcon({ ok }: { ok: boolean }) {
    return ok
        ? <CheckCircle className="h-4 w-4 text-green-500" />
        : <XCircle className="h-4 w-4 text-red-500" />;
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
            {children}
        </div>
    );
}

export default function Maintenance({ server: serverProp, flash = {} }: Props) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const server: ServerData = serverProp ?? {
        db_status: 'Unknown',
        db_driver: '—',
        db_name: null,
        php_version: '—',
        server_time: '—',
        app_env: 'production',
        app_debug: false,
        laravel_version: '—',
        memory_limit: '—',
        max_execution_time: '—',
        upload_max_filesize: '—',
        cache_driver: '—',
        queue_connection: '—',
        storage_writable: false,
        storage_log_writable: false,
        disk_total_gb: null,
        disk_free_gb: null,
        disk_used_gb: null,
        disk_used_pct: null,
        pending_jobs: 0,
        failed_jobs: 0,
        shipment_count: 0,
        user_count: 0,
        recent_errors: [],
    };

    const [processingHealth, setProcessingHealth] = useState(false);
    const [processingCache, setProcessingCache] = useState(false);
    const [processingClearLog, setProcessingClearLog] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (flash.success) alert.success('', flash.success);
        if (flash.error) alert.error('Error', flash.error);
        if (flash.warning) alert.warning('Warning', flash.warning);
    }, [flash.success, flash.error, flash.warning]);

    const handleHealthCheck = async () => {
        setProcessingHealth(true);
        try {
            const { data } = await axios.post(route('settings.maintenance.health'));
            if (data.warning) {
                alert.warning('Warning', data.warning || data.message || 'System degraded.');
            } else {
                alert.success(data.message || 'System healthy.');
            }
            router.reload({ only: ['server'] });
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Health check failed.';
            alert.error('Error', msg);
        } finally {
            setProcessingHealth(false);
        }
    };

    const handleClearLog = () => {
        alert.confirm(
            t('maintenance.clear_log_confirm') || 'Clear error log?',
            t('maintenance.clear_log_confirm_desc') || 'This will permanently delete all entries in laravel.log. This action cannot be undone.',
            t('maintenance.clear_log') || 'Clear Log'
        ).then(async (confirmed) => {
            if (!confirmed) return;
            setProcessingClearLog(true);
            try {
                const { data } = await axios.post(route('settings.maintenance.clear-log'));
                alert.success(data?.message || 'Log cleared.');
                router.reload({ only: ['server'] });
            } catch (err: any) {
                alert.error('Error', err?.response?.data?.error || 'Could not clear log.');
            } finally {
                setProcessingClearLog(false);
            }
        });
    };

    const handleClearCache = () => {
        alert.confirm(
            t('maintenance.clear_cache_confirm') || 'Clear all cache?',
            t('maintenance.clear_cache_confirm_desc') || 'This will clear application and tenant settings cache.',
            t('maintenance.clear_cache') || 'Clear Cache'
        ).then(async (confirmed) => {
            if (!confirmed) return;
            setProcessingCache(true);
            try {
                const { data } = await axios.post(route('settings.maintenance.cache'));
                alert.success(data?.message || 'Cache cleared.');
            } catch (err: any) {
                alert.error('Error', err?.response?.data?.error || 'Could not clear cache.');
            } finally {
                setProcessingCache(false);
            }
        });
    };

    const handleExport = () => {
        window.location.href = route('settings.maintenance.export');
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        setImporting(true);
        try {
            const { data } = await axios.post(route('settings.maintenance.import'), fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert.success(data?.message || 'Settings imported.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            router.reload();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Import failed.';
            alert.error('Error', msg);
        } finally {
            setImporting(false);
        }
    };

    const diskPct = server.disk_used_pct ?? 0;
    const diskBarColor = diskPct >= 90 ? 'bg-red-500' : diskPct >= 70 ? 'bg-amber-500' : 'bg-green-500';

    return (
        <SettingsLayout title={t('settings.menu.maintenance', 'System Maintenance')}>
            <SettingsShell description={t('maintenance.description') || 'Monitor system health, manage cache, and handle data backups.'}>

                {/* ── 1. Tenant Overview ──────────────────────────────────── */}
                <SettingsSection
                    title={t('maintenance.overview') || 'Organization Overview'}
                    description={t('maintenance.overview_desc') || 'Quick summary of your tenant data and queue state.'}
                >
                    <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 flex items-center gap-3">
                            <Package className="h-6 w-6 text-indigo-500 shrink-0" />
                            <div>
                                <p className="text-xs text-indigo-500 uppercase tracking-wide">{t('maintenance.shipments') || 'Shipments'}</p>
                                <p className="text-2xl font-bold text-indigo-700">{server.shipment_count.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 flex items-center gap-3">
                            <Users className="h-6 w-6 text-violet-500 shrink-0" />
                            <div>
                                <p className="text-xs text-violet-500 uppercase tracking-wide">{t('maintenance.users') || 'Users'}</p>
                                <p className="text-2xl font-bold text-violet-700">{server.user_count}</p>
                            </div>
                        </div>
                        <div className={`rounded-xl border p-4 flex items-center gap-3 ${server.pending_jobs > 0 ? 'border-amber-100 bg-amber-50' : 'border-green-100 bg-green-50'}`}>
                            <Activity className={`h-6 w-6 shrink-0 ${server.pending_jobs > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                            <div>
                                <p className={`text-xs uppercase tracking-wide ${server.pending_jobs > 0 ? 'text-amber-500' : 'text-green-500'}`}>{t('maintenance.pending_jobs') || 'Queue Jobs'}</p>
                                <p className={`text-2xl font-bold ${server.pending_jobs > 0 ? 'text-amber-700' : 'text-green-700'}`}>{server.pending_jobs}</p>
                            </div>
                        </div>
                        <div className={`rounded-xl border p-4 flex items-center gap-3 ${server.failed_jobs > 0 ? 'border-red-100 bg-red-50' : 'border-green-100 bg-green-50'}`}>
                            <AlertCircle className={`h-6 w-6 shrink-0 ${server.failed_jobs > 0 ? 'text-red-500' : 'text-green-500'}`} />
                            <div>
                                <p className={`text-xs uppercase tracking-wide ${server.failed_jobs > 0 ? 'text-red-500' : 'text-green-500'}`}>{t('maintenance.failed_jobs') || 'Failed Jobs'}</p>
                                <p className={`text-2xl font-bold ${server.failed_jobs > 0 ? 'text-red-700' : 'text-green-700'}`}>{server.failed_jobs}</p>
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* ── 2. System Status ────────────────────────────────────── */}
                <SettingsSection title={t('maintenance.health_check') || 'System Status'} description={t('maintenance.health_description') || 'Real-time server and infrastructure diagnostics.'}>
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex justify-end">
                            <Button onClick={handleHealthCheck} disabled={processingHealth} variant="outline" className="gap-2 border-gray-200">
                                <RefreshCw className={`h-4 w-4 ${processingHealth ? 'animate-spin' : ''}`} />
                                {t('maintenance.run_check') || 'Run Health Check'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InfoCard label={t('maintenance.database') || 'Database'}>
                                <div className="flex items-center gap-2">
                                    <Database className={`h-4 w-4 ${server.db_status === 'Connected' ? 'text-green-500' : 'text-red-500'}`} />
                                    <span className="font-semibold text-gray-900">{server.db_status}</span>
                                </div>
                                <span className="text-xs text-gray-400">{server.db_driver}{server.db_name ? ` · ${server.db_name}` : ''}</span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.php_version') || 'PHP Version'}>
                                <div className="flex items-center gap-2">
                                    <Server className="h-4 w-4 text-blue-500" />
                                    <span className="font-semibold text-gray-900">{server.php_version}</span>
                                </div>
                            </InfoCard>

                            <InfoCard label={t('maintenance.laravel_version') || 'Laravel'}>
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-violet-500" />
                                    <span className="font-semibold text-gray-900">{server.laravel_version}</span>
                                </div>
                            </InfoCard>

                            <InfoCard label={t('maintenance.server_time') || 'Server Time'}>
                                <span className="font-mono text-sm text-gray-900 mt-1 flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    {server.server_time}
                                </span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.mode') || 'Environment'}>
                                <span className={`font-semibold uppercase ${server.app_env === 'production' ? 'text-green-700' : 'text-amber-600'}`}>{server.app_env}</span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.debug_mode') || 'Debug Mode'}>
                                <div className="flex items-center gap-2 mt-1">
                                    <StatusIcon ok={!server.app_debug} />
                                    <span className={`font-semibold ${server.app_debug ? 'text-red-600' : 'text-gray-900'}`}>
                                        {server.app_debug
                                            ? (t('maintenance.debug_on') || 'ON — disable in production!')
                                            : (t('maintenance.debug_off') || 'Off')}
                                    </span>
                                </div>
                            </InfoCard>

                            <InfoCard label={t('maintenance.memory_limit') || 'Memory Limit'}>
                                <div className="flex items-center gap-2">
                                    <Cpu className="h-4 w-4 text-amber-500" />
                                    <span className="font-semibold text-gray-900">{server.memory_limit}</span>
                                </div>
                            </InfoCard>

                            <InfoCard label={t('maintenance.max_execution') || 'Max Exec. Time'}>
                                <span className="font-mono text-sm text-gray-900 mt-1">{server.max_execution_time}</span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.upload_max') || 'Upload Max'}>
                                <span className="font-mono text-sm text-gray-900 mt-1">{server.upload_max_filesize}</span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.cache_driver') || 'Cache Driver'}>
                                <span className="font-mono text-sm text-gray-900 mt-1">{server.cache_driver}</span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.queue_connection') || 'Queue Connection'}>
                                <span className="font-mono text-sm text-gray-900 mt-1">{server.queue_connection}</span>
                            </InfoCard>

                            <InfoCard label={t('maintenance.storage_writable') || 'Storage Writable'}>
                                <div className="flex items-center gap-2 mt-1">
                                    <StatusIcon ok={server.storage_writable} />
                                    <span className="font-semibold text-gray-900">{server.storage_writable ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</span>
                                </div>
                            </InfoCard>

                            <InfoCard label={t('maintenance.storage_log_writable') || 'Logs Writable'}>
                                <div className="flex items-center gap-2 mt-1">
                                    <StatusIcon ok={server.storage_log_writable} />
                                    <span className="font-semibold text-gray-900">{server.storage_log_writable ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</span>
                                </div>
                            </InfoCard>
                        </div>

                        {/* Disk Space */}
                        {server.disk_total_gb !== null && (
                            <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">{t('maintenance.disk_space') || 'Disk Space'}</span>
                                    </div>
                                    <span className="text-xs font-mono text-gray-600">
                                        {server.disk_used_gb} GB {t('maintenance.disk_used') || 'used'} / {server.disk_total_gb} GB {t('maintenance.disk_total') || 'total'}
                                        {' '}({server.disk_free_gb} GB {t('maintenance.disk_free') || 'free'})
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${diskBarColor}`}
                                        style={{ width: `${Math.min(diskPct, 100)}%` }}
                                    />
                                </div>
                                {diskPct >= 90 && (
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {t('maintenance.disk_critical') || 'Disk almost full! Free up space immediately.'}
                                    </p>
                                )}
                                {diskPct >= 70 && diskPct < 90 && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {t('maintenance.disk_warning') || 'Disk usage is high. Consider cleaning up.'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </SettingsSection>

                {/* ── 3. Cache Management ─────────────────────────────────── */}
                <SettingsSection title={t('maintenance.cache') || 'Cache'} description={t('maintenance.cache_description') || 'Clear cached settings and compiled Laravel files.'}>
                    <div className="md:col-span-2">
                        <div className="p-5 border border-yellow-200 bg-yellow-50/50 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                                    <RefreshCw className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-yellow-900">{t('maintenance.tenant_cache_title') || 'Clear Tenant & Application Cache'}</p>
                                    <p className="text-sm text-yellow-700 mt-1 max-w-sm">{t('maintenance.tenant_cache_desc') || 'Flushes all organization settings cache and compiled config/routes/views. Use after importing settings or making environment changes.'}</p>
                                </div>
                            </div>
                            <Button
                                onClick={handleClearCache}
                                disabled={processingCache}
                                variant="destructive"
                                className="gap-2 shrink-0 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-none"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('maintenance.clear_cache') || 'Clear Cache'}
                            </Button>
                        </div>
                    </div>
                </SettingsSection>

                {/* ── 4. Data Portability ─────────────────────────────────── */}
                <SettingsSection title={t('maintenance.data_portability') || 'Data Portability'} description={t('maintenance.data_portability_desc') || 'Export all settings to JSON and restore from a backup.'}>
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <Button onClick={handleExport} variant="outline" className="gap-2 border-gray-200">
                                <Download className="h-4 w-4" />
                                {t('maintenance.export') || 'Export Settings'}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                className="hidden"
                                onChange={handleImportFile}
                            />
                            <Button onClick={handleImportClick} disabled={importing} variant="outline" className="gap-2 border-gray-200">
                                <Upload className={`h-4 w-4 ${importing ? 'animate-pulse' : ''}`} />
                                {importing ? (t('common.loading') || 'Loading…') : (t('maintenance.import') || 'Import Settings')}
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                            {t('maintenance.import_placeholder') || 'Import accepts a .json file previously exported from this page. All matching settings will be overwritten and cache will be cleared automatically.'}
                        </p>
                    </div>
                </SettingsSection>

                {/* ── 5. Recent Errors ────────────────────────────────────── */}
                <SettingsSection title={t('maintenance.recent_errors') || 'Recent Errors'} description={t('maintenance.recent_errors_desc') || 'Last error entries from laravel.log.'}>
                    <div className="md:col-span-2 space-y-3">
                        {server.recent_errors.length > 0 ? (
                            <>
                                <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 space-y-2">
                                    {server.recent_errors.map((line, i) => (
                                        <p key={i} className="text-xs font-mono text-red-800 break-all leading-relaxed border-b border-red-100 last:border-0 pb-2 last:pb-0">
                                            {line.trim()}
                                        </p>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400">{t('maintenance.errors_note') || 'Showing up to 5 most recent ERROR lines.'}</p>
                            </>
                        ) : (
                            <div className="rounded-lg border border-green-100 bg-green-50/40 p-4 flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle className="h-4 w-4 shrink-0" />
                                {t('maintenance.no_errors') || 'No errors in the log. System is clean.'}
                            </div>
                        )}
                        <Button
                            onClick={handleClearLog}
                            disabled={processingClearLog}
                            variant="outline"
                            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('maintenance.clear_log') || 'Clear Error Log'}
                        </Button>
                    </div>
                </SettingsSection>

            </SettingsShell>
        </SettingsLayout>
    );
}
