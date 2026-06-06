import SettingsLayout from '@/Layouts/SettingsLayout';
import { Link } from '@inertiajs/react';
import { SettingsShell } from '../_components/SettingsShell';
import { KeyRound, Key, Webhook, FileText, ChevronRight, Activity, AlertCircle, CheckCircle2, Zap, ArrowLeft } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';

interface ApiStats {
    token_count: number;
    client_count: number;
    webhook_count: number;
    requests_today: number;
    errors_today: number;
    base_url: string;
}

export default function ApiManagementIndex({ stats }: { stats: ApiStats }) {
    const { t } = useTranslation();
    const { props } = usePage();
    const permissions = (props.auth as { permissions?: string[] })?.permissions || [];

    const hasPermission = (perm: string) =>
        permissions.includes(perm) || permissions.includes('settings.maintenance.manage');

    const cards = [
        {
            title: t('settings.api.personal_access_tokens'),
            description: t('settings.api.personal_access_tokens_desc'),
            href: route('api-tokens.index'),
            icon: Key,
            permission: 'settings.api.tokens.manage',
            count: stats?.token_count ?? 0,
            countLabel: t('settings.api.active_tokens'),
            color: 'blue',
        },
        {
            title: t('settings.api.api_clients'),
            description: t('settings.api.api_clients_desc'),
            href: route('settings.api.clients.index'),
            icon: KeyRound,
            permission: 'settings.api.clients.manage',
            count: stats?.client_count ?? 0,
            countLabel: t('settings.api.active_clients'),
            color: 'violet',
        },
        {
            title: t('settings.api.webhooks'),
            description: t('settings.api.webhooks_desc'),
            href: route('settings.api.webhooks.index'),
            icon: Webhook,
            permission: 'settings.api.webhooks.manage',
            count: stats?.webhook_count ?? 0,
            countLabel: t('settings.api.active_subscriptions'),
            color: 'emerald',
        },
        {
            title: t('settings.api.request_logs'),
            description: t('settings.api.request_logs_desc'),
            href: route('settings.api.logs.index'),
            icon: FileText,
            permission: 'settings.api.logs.view',
            count: stats?.requests_today ?? 0,
            countLabel: t('settings.api.requests_today_label'),
            color: 'amber',
        },
    ].filter((c) => hasPermission(c.permission));

    const colorMap: Record<string, string> = {
        blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
        violet:  'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
        amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    };

    const errorRate = stats && stats.requests_today > 0
        ? Math.round((stats.errors_today / stats.requests_today) * 100)
        : 0;

    return (
        <SettingsLayout title={t('settings.api.title')}>
            <SettingsShell description={t('settings.api.desc')}>

                {/* Stats bar */}
                {stats && (
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            {
                                label: t('settings.api.requests_today'),
                                value: stats.requests_today,
                                icon: <Activity className="h-4 w-4 text-blue-500 mb-0.5" />,
                                color: '',
                            },
                            {
                                label: t('settings.api.errors_today'),
                                value: stats.errors_today,
                                icon: stats.errors_today > 0
                                    ? <AlertCircle className="h-4 w-4 text-red-500 mb-0.5" />
                                    : <CheckCircle2 className="h-4 w-4 text-emerald-500 mb-0.5" />,
                                color: stats.errors_today > 0 ? 'text-red-600 dark:text-red-400' : '',
                            },
                            {
                                label: t('settings.api.error_rate'),
                                value: `${errorRate}%`,
                                icon: null,
                                color: errorRate > 5 ? 'text-red-600 dark:text-red-400' : '',
                            },
                        ].map((s, i) => (
                            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                <div className="mt-1 flex items-end gap-1.5">
                                    <span className={`text-2xl font-bold text-foreground ${s.color}`}>{s.value}</span>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('settings.api.base_url_label')}</p>
                            <p className="mt-1 text-xs font-mono text-muted-foreground truncate">{stats.base_url}</p>
                        </div>
                    </div>
                )}

                {/* Navigation cards */}
                <div className="col-span-1 md:col-span-2 grid gap-4 sm:grid-cols-2">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link
                                key={card.href}
                                href={card.href}
                                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                            >
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorMap[card.color]}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-foreground group-hover:text-primary">{card.title}</h3>
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {card.count} <span className="font-normal">{card.countLabel}</span>
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
                            </Link>
                        );
                    })}
                </div>

                {/* Quick start guide */}
                <div className="col-span-1 md:col-span-2 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold text-sm">
                        <Zap className="h-4 w-4" />
                        {t('settings.api.quick_start_title')}
                    </div>
                    <ol className="list-decimal list-inside text-xs text-blue-900 dark:text-blue-200 space-y-1.5 leading-relaxed">
                        <li>{t('settings.api.quick_start_step1')}</li>
                        <li>
                            {t('settings.api.quick_start_step2')}
                            {stats?.base_url && (
                                <code className="ml-1 bg-blue-100 dark:bg-blue-900/40 px-1 rounded font-mono">{stats.base_url}</code>
                            )}
                        </li>
                        <li>{t('settings.api.quick_start_step3')}</li>
                        <li>{t('settings.api.quick_start_step4')}</li>
                    </ol>
                    <a
                        href="https://swagger.io/specification/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 font-medium"
                    >
                        {t('settings.api.view_api_reference')} →
                    </a>
                </div>

            </SettingsShell>
        </SettingsLayout>
    );
}
