import { useState, useEffect, useRef } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { usePage } from '@inertiajs/react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Badge } from "@/Components/UI/badge";
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
    RefreshCw, Download, CheckCircle2, AlertTriangle,
    Shield, ArrowUpCircle, Terminal, Key, Clock,
    Loader2, ShieldCheck, ShieldOff, User,
} from 'lucide-react';

type UpdateInfo = {
    current_version: string;
    latest_version:  string;
    has_update:      boolean;
    update_id:       string | null;
    has_sql:         boolean;
    changelog:       string;
    message:         string;
    license_expired?: boolean;
    can_download?:   boolean;
};

type ProgressState = {
    running: boolean;
    steps:   string[];
    done:    boolean;
    error:   string | null;
};

function timeAgo(iso: string, t: (k: string, o?: any) => string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return `${diff}s ${t('settings.updates.ago')}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${t('settings.updates.ago')}`;
    return `${Math.floor(diff / 3600)}h ${t('settings.updates.ago')}`;
}

export default function Updates({
    current_version,
    has_license,
    cached_update,
    last_check,
    license_expired,
}: {
    current_version:  string;
    has_license:      boolean;
    cached_update?:   UpdateInfo | null;
    last_check?:      string | null;
    license_expired?: boolean;
}) {
    const { t } = useTranslation();
    const { props } = usePage();
    const flash       = (props as any).flash ?? {};
    const authRoles: string[] = (props as any).auth?.roles ?? [];
    const isSuperAdmin  = authRoles.includes('super-admin');
    const isAdmin       = authRoles.includes('admin') || isSuperAdmin;
    const canManage     = isAdmin;
    const isRegularUser = !canManage;

    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(
        (flash.update_info as UpdateInfo) ?? cached_update ?? null
    );

    const swal = useSweetAlert();

    const [activateData, setActivateData] = useState({ license_code: '', client_name: '' });
    const [activateErrors, setActivateErrors] = useState<Record<string, string>>({});
    const [activateProcessing, setActivateProcessing] = useState(false);

    const activateForm = {
        data: activateData,
        setData: (key: string, value: any) => setActivateData(prev => ({ ...prev, [key]: value })),
        errors: activateErrors,
        processing: activateProcessing,
    };

    const [checkProcessing, setCheckProcessing] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    const checkForm = {
        processing: checkProcessing,
        errors: { check: checkError ?? '' } as Record<string, string>,
    };

    const [applying, setApplying]     = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);
    const [applyDone, setApplyDone]   = useState(false);
    const [newVersion, setNewVersion] = useState('');
    const [progress, setProgress]     = useState<ProgressState | null>(null);
    const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

    const startPolling = () => {
        if (pollRef.current) return;
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await axios.get<ProgressState>(route('settings.updates.progress'));
                setProgress(data);
                if (data.done || data.error) stopPolling();
            } catch { /* ignore */ }
        }, 1500);
    };

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    useEffect(() => () => stopPolling(), []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setActivateErrors({});
        setActivateProcessing(true);
        try {
            const { data: res } = await axios.post(route('settings.updates.activate'), activateData);
            swal.toast(res?.message || 'License activated.', 'success');
            if (res?.redirect) window.location.href = res.redirect;
            else window.location.reload();
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setActivateErrors(mapped);
            } else {
                swal.toast(err?.response?.data?.error || err?.response?.data?.message || 'Activation failed.', 'error');
            }
        } finally {
            setActivateProcessing(false);
        }
    };

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckError(null);
        setCheckProcessing(true);
        try {
            const { data: res } = await axios.post(route('settings.updates.check'));
            if (res?.update_info) setUpdateInfo(res.update_info);
            swal.toast(res?.message || 'Check complete.', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Check failed.';
            setCheckError(msg);
            swal.toast(msg, 'error');
        } finally {
            setCheckProcessing(false);
        }
    };

    const handleApply = async () => {
        if (!updateInfo?.update_id) return;
        if (!confirm(t('settings.updates.apply_confirm', { version: updateInfo.latest_version }))) return;

        setApplying(true);
        setApplyError(null);
        setProgress({ running: true, steps: [t('settings.updates.starting')], done: false, error: null });
        startPolling();

        try {
            const { data } = await axios.post(route('settings.updates.apply'), {
                update_id:   updateInfo.update_id,
                new_version: updateInfo.latest_version,
                has_sql:     updateInfo.has_sql,
            });
            stopPolling();
            const { data: fp } = await axios.get<ProgressState>(route('settings.updates.progress'));
            setProgress(fp);
            setNewVersion(data.new_version);
            setApplyDone(true);
            setUpdateInfo(null);
        } catch (err: any) {
            stopPolling();
            setApplyError(err.response?.data?.error ?? t('settings.updates.apply_failed'));
            const { data: fp } = await axios.get<ProgressState>(route('settings.updates.progress')).catch(() => ({ data: null }));
            if (fp) setProgress(fp);
        } finally {
            setApplying(false);
        }
    };

    const isExpired = license_expired || flash.license_expired || updateInfo?.license_expired;

    return (
        <SettingsLayout title={t('settings.updates.title')}>
            <SettingsShell
                title={t('settings.updates.title')}
                description={t('settings.updates.desc')}
            >

                {/* ── Version card ─────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-4 p-5 rounded-2xl border bg-muted/30">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('settings.updates.installed_version')}</p>
                        <p className="text-3xl font-bold font-mono">{applyDone ? newVersion : current_version}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        {has_license
                            ? <Badge variant="success" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" />{t('settings.updates.license_active')}</Badge>
                            : <Badge variant="secondary" className="gap-1"><ShieldOff className="h-3.5 w-3.5" />{t('settings.updates.no_license')}</Badge>}
                        {last_check && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />{t('settings.updates.last_checked')} {timeAgo(last_check, t)}
                            </span>
                        )}
                        {updateInfo?.has_update && !applyDone && (
                            <Badge variant="warning" className="gap-1">
                                <ArrowUpCircle className="h-3.5 w-3.5 animate-pulse" />
                                v{updateInfo.latest_version} {t('settings.updates.available')}
                            </Badge>
                        )}
                        {applyDone && (
                            <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />{t('settings.updates.updated_badge')}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* ── Flash messages ────────────────────────────────────── */}
                {flash.success && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50 text-green-800">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">{flash.success}</p>
                    </div>
                )}
                {(flash.error || checkForm.errors.check) && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{flash.error || checkForm.errors.check}</p>
                    </div>
                )}

                {/* ── Regular user view ─────────────────────────────────── */}
                {isRegularUser && updateInfo?.has_update && (
                    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <ArrowUpCircle className="h-6 w-6 text-blue-600 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-blue-900 text-base">
                                    {t('settings.updates.user_update_title', { version: updateInfo.latest_version })}
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                    {t('settings.updates.user_update_desc')}
                                </p>
                                {updateInfo.changelog && (
                                    <details className="mt-3">
                                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">{t('settings.updates.view_changelog')}</summary>
                                        <pre className="mt-2 text-xs text-blue-800 whitespace-pre-wrap font-sans leading-relaxed bg-blue-50 rounded-lg p-3 border border-blue-100">
                                            {updateInfo.changelog}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {isRegularUser && !updateInfo?.has_update && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        {t('settings.updates.user_on_latest', { version: current_version })}
                    </div>
                )}

                {/* ── PASO 1: Activar licencia (solo admins) ────────────── */}
                {!has_license && canManage && (
                    <SettingsSection
                        title={t('settings.updates.activate_title')}
                        description={t('settings.updates.activate_desc')}
                    >
                        <form onSubmit={handleActivate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    {t('settings.updates.purchase_code_label')}
                                </label>
                                <Input
                                    value={activateForm.data.license_code}
                                    onChange={e => activateForm.setData('license_code', e.target.value)}
                                    placeholder={t('settings.updates.purchase_code_placeholder')}
                                    className="font-mono"
                                    disabled={activateForm.processing}
                                />
                                {activateForm.errors.license_code && (
                                    <p className="text-sm text-red-600">{activateForm.errors.license_code}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {t('settings.updates.client_name_label')}
                                </label>
                                <Input
                                    value={activateForm.data.client_name}
                                    onChange={e => activateForm.setData('client_name', e.target.value)}
                                    placeholder={t('settings.updates.client_name_placeholder')}
                                    disabled={activateForm.processing}
                                />
                                {activateForm.errors.client_name && (
                                    <p className="text-sm text-red-600">{activateForm.errors.client_name}</p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                disabled={activateForm.processing || !activateForm.data.license_code || !activateForm.data.client_name}
                                className="gap-2"
                            >
                                {activateForm.processing
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <ShieldCheck className="h-4 w-4" />}
                                {activateForm.processing ? t('settings.updates.activating') : t('settings.updates.activate_btn')}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.updates.purchase_code_hint')}
                            </p>
                        </form>
                    </SettingsSection>
                )}

                {/* ── PASO 2: Buscar actualizaciones (solo admins) ──────── */}
                {has_license && !applyDone && canManage && (
                    <SettingsSection
                        title={t('settings.updates.check_title')}
                        description={t('settings.updates.check_desc')}
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <form onSubmit={handleCheck}>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={checkForm.processing}
                                    className="gap-2"
                                >
                                    <RefreshCw className={`h-4 w-4 ${checkForm.processing ? 'animate-spin' : ''}`} />
                                    {checkForm.processing ? t('settings.updates.checking') : t('settings.updates.check_btn')}
                                </Button>
                            </form>

                            {isSuperAdmin && (
                                <form
                                    onSubmit={e => {
                                        e.preventDefault();
                                        if (confirm(t('settings.updates.deactivate_confirm')))
                                            (e.currentTarget as HTMLFormElement).submit();
                                    }}
                                    action={route('settings.updates.deactivate')}
                                    method="POST"
                                >
                                    <input type="hidden" name="_token" value={(props as any).csrf_token ?? ''} />
                                    <input type="hidden" name="_method" value="POST" />
                                    <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                                        <ShieldOff className="h-3.5 w-3.5" />
                                        {t('settings.updates.deactivate_btn')}
                                    </Button>
                                </form>
                            )}
                        </div>

                        {updateInfo && !updateInfo.has_update && (
                            <div className="flex items-center gap-2 mt-3 text-sm text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('settings.updates.on_latest', { version: updateInfo.current_version })}
                            </div>
                        )}
                    </SettingsSection>
                )}

                {/* ── PASO 3: Actualización disponible (solo admins) ────── */}
                {updateInfo?.has_update && !applyDone && canManage && (
                    <SettingsSection
                        title={t('settings.updates.update_ready_title', { version: updateInfo.latest_version })}
                        description={t('settings.updates.update_ready_desc')}
                    >
                        <div className="space-y-4">
                            {updateInfo.changelog && (
                                <div className="rounded-xl border p-4 bg-muted/20 space-y-2">
                                    <p className="text-sm font-semibold">{t('settings.updates.whats_new', { version: updateInfo.latest_version })}</p>
                                    <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                                        {updateInfo.changelog}
                                    </pre>
                                </div>
                            )}

                            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                                    <li>{t('settings.updates.warning_db')}</li>
                                    <li>{t('settings.updates.warning_backup')}</li>
                                    <li>{t('settings.updates.warning_rollback')}</li>
                                    <li>{t('settings.updates.warning_downtime')}</li>
                                </ul>
                            </div>

                            {applyError && (
                                <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    {applyError}
                                </div>
                            )}

                            {/* ── Soporte expirado: ve la actualización pero no puede aplicar ── */}
                            {isExpired ? (
                                <div className="rounded-2xl border border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                                    <div className="p-5 flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                            <ShieldOff className="h-6 w-6 text-orange-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-orange-900 text-base">
                                                {t('settings.updates.expired_title')}
                                            </p>
                                            <p className="text-sm text-orange-700 mt-1 leading-relaxed">
                                                {t('settings.updates.expired_desc')}
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <a
                                                    href="https://codecanyon.net/user/coddingpro/portfolio"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                                                >
                                                    <ArrowUpCircle className="h-4 w-4" />
                                                    {t('settings.updates.renew_btn')}
                                                </a>
                                                <span className="text-xs text-orange-600 self-center">
                                                    {t('settings.updates.renew_price')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-4 border-t border-orange-200 pt-3 bg-orange-50/60">
                                        <p className="text-xs text-orange-600">
                                            <strong>{t('settings.updates.alternative')}:</strong>{' '}
                                            {t('settings.updates.manual_alt', { version: updateInfo?.latest_version })}{' '}
                                            <a href="https://codecanyon.net/downloads" target="_blank" rel="noreferrer" className="underline">
                                                {t('settings.updates.envato_downloads')}
                                            </a>{' '}
                                            {t('settings.updates.manual_upload')}
                                        </p>
                                    </div>
                                </div>
                            ) : isAdmin && (
                                <Button
                                    onClick={handleApply}
                                    disabled={applying}
                                    className="gap-2 bg-green-600 hover:bg-green-700 text-white h-11 px-6"
                                >
                                    {applying
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Download className="h-4 w-4" />}
                                    {applying
                                        ? t('settings.updates.applying')
                                        : t('settings.updates.apply_btn', { version: updateInfo.latest_version })}
                                </Button>
                            )}
                        </div>
                    </SettingsSection>
                )}

                {/* ── Registro de progreso ──────────────────────────────── */}
                {progress && (
                    <div className="rounded-2xl border overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-3 bg-muted border-b">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.updates.log_title')}
                                </span>
                            </div>
                            {progress.running && (
                                <span className="flex items-center gap-1.5 text-xs text-primary">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />{t('settings.updates.log_running')}
                                </span>
                            )}
                            {progress.done && (
                                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" />{t('settings.updates.log_complete')}
                                </span>
                            )}
                            {progress.error && (
                                <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                                    <AlertTriangle className="h-3.5 w-3.5" />{t('settings.updates.log_failed')}
                                </span>
                            )}
                        </div>
                        <div className="p-4 bg-gray-950 max-h-72 overflow-y-auto">
                            <div className="space-y-1.5 font-mono text-xs">
                                {progress.steps.map((step, i) => (
                                    <div key={i} className={`flex gap-2 ${
                                        step.startsWith('❌') || step.startsWith('⚠️') ? 'text-red-400'
                                        : step.startsWith('🎉') || step.startsWith('✅') ? 'text-green-400'
                                        : 'text-gray-300'}`}>
                                        <span className="text-gray-600 select-none shrink-0">{String(i+1).padStart(2,'0')}</span>
                                        <span>{step}</span>
                                    </div>
                                ))}
                                {progress.running && (
                                    <div className="flex gap-2 text-primary">
                                        <span className="text-gray-600 select-none">  </span>
                                        <Loader2 className="h-3 w-3 animate-spin mt-0.5 shrink-0" />
                                        <span>{t('settings.updates.processing')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="h-1.5 bg-muted overflow-hidden">
                            <div
                                className={`h-full transition-all duration-700 ${
                                    progress.done ? 'bg-green-500 w-full'
                                    : progress.error ? 'bg-red-500 w-full'
                                    : 'bg-primary animate-pulse'}`}
                                style={{ width: progress.done || progress.error ? '100%' : `${Math.min(92, (progress.steps.length / 9) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Éxito final ───────────────────────────────────────── */}
                {applyDone && (
                    <div className="flex items-start gap-4 p-5 rounded-2xl border border-green-200 bg-green-50">
                        <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-green-800 text-lg">
                                {t('settings.updates.success_title', { version: newVersion })}
                            </p>
                            <p className="text-sm text-green-600 mt-1">
                                {t('settings.updates.success_desc')}
                            </p>
                            <Button size="sm" variant="outline" className="mt-3 border-green-300 text-green-700" onClick={() => window.location.reload()}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{t('settings.updates.reload_btn')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Info verificación automática ──────────────────────── */}
                {has_license && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {t('settings.updates.auto_check')}
                    </p>
                )}

            </SettingsShell>
        </SettingsLayout>
    );
}
