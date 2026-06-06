import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Badge } from '@/Components/UI/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import {
    ArrowLeft, Building2, Edit, ToggleLeft, ToggleRight, Eye,
    Users, Package, TrendingUp, Mail, Phone, MapPin, Globe,
    CalendarDays, Hash, CheckCircle2, XCircle, Palette,
    ShieldCheck, Settings2, BarChart3, Activity,
    ChevronLeft, ChevronRight, Search, X,
    CreditCard, Wallet, AlertTriangle, Clock, Lock, MinusCircle,
} from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface OrgUser {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    roles?: { id: number; name: string }[];
}

interface UsersPaginator {
    data: OrgUser[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    search: string;
}

interface Organization {
    id: number;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    domain?: string;
    logo_url?: string;
    tax_id?: string;
    legal_name?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    ui_theme?: string;
    is_active: boolean;
    created_at?: string;
}

const roleColors: Record<string, string> = {
    admin:         'bg-purple-100 text-purple-700 border-purple-200',
    'super-admin': 'bg-red-100 text-red-700 border-red-200',
    manager:       'bg-blue-100 text-blue-700 border-blue-200',
    operator:      'bg-orange-100 text-orange-700 border-orange-200',
    customer:      'bg-teal-100 text-teal-700 border-teal-200',
    viewer:        'bg-gray-100 text-gray-600 border-gray-200',
};

function OrgAvatar({ org }: { org: Organization }) {
    const bg = org.primary_color || '#6366f1';
    if (org.logo_url) {
        return (
            <img src={org.logo_url} alt={org.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                className="w-16 h-16 rounded-xl object-contain bg-white border shadow flex-shrink-0" />
        );
    }
    return (
        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: bg }}>
            {org.name.charAt(0).toUpperCase()}
        </div>
    );
}

function UserInitials({ name, color }: { name: string; color?: string }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const bg = color ? color + '22' : '#6366f122';
    const text = color || '#6366f1';
    return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: bg, color: text }}>
            {initials}
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2.5 border-b last:border-0 border-border/50">
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-medium text-foreground break-all">{value}</p>
            </div>
        </div>
    );
}

interface ActiveSubscription {
    status: string;
    plan: { name: string };
    billing_cycle: string;
    price: number;
    currency: string;
    expires_at: string;
}

interface WalletData {
    balance: number;
    currency: string;
}

const subStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    active:       { label: 'active',       color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-100 dark:bg-green-900/40',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    trial:        { label: 'trial',        color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-900/40',    icon: <Clock className="h-3.5 w-3.5" /> },
    grace_period: { label: 'grace_period', color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-900/40',  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    read_only:    { label: 'read_only',    color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-100 dark:bg-red-900/40',      icon: <Lock className="h-3.5 w-3.5" /> },
    suspended:    { label: 'suspended',    color: 'text-gray-600 dark:text-gray-400',    bg: 'bg-gray-100 dark:bg-gray-800',       icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function Show({ organization, users, stats, settings, active_subscription, wallet }: {
    organization: Organization;
    users: UsersPaginator;
    stats: {
        users_active: number; users_total: number;
        shipments_total: number; shipments_month: number; revenue_month: number;
    };
    settings: Record<string, Record<string, string>>;
    active_subscription?: ActiveSubscription;
    wallet?: WalletData;
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [searchInput, setSearchInput] = useState(users.search || '');

    const toggleStatus = () => {
        const confirmKey = organization.is_active ? 'organizations.confirm_deactivate' : 'organizations.confirm_activate';
        alert.confirm(t('organizations.toggle_status'), t(confirmKey)).then((confirmed) => {
            if (confirmed) {
                router.post(route('admin.organizations.toggle-status', organization.id), {}, { preserveScroll: true });
            }
        });
    };

    const impersonate = () => router.get(route('admin.organizations.impersonate', organization.id));

    const loadUsers = (page: number, search: string) => {
        router.get(
            route('admin.organizations.show', organization.id),
            { user_page: page, user_search: search },
            { preserveScroll: true, preserveState: true, only: ['users'] },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadUsers(1, searchInput);
    };

    const clearSearch = () => {
        setSearchInput('');
        loadUsers(1, '');
    };

    const settingGroups = Object.entries(settings ?? {}).filter(([, vals]) => Object.keys(vals).length > 0);
    const locationParts = [organization.address, organization.city, organization.state, organization.country].filter(Boolean);
    const locationStr = locationParts.join(', ') || null;

    const statCards = [
        { label: t('organizations.users_count'),   value: stats.users_active,
          icon: Users,     color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-100 dark:border-blue-900/50' },
        { label: t('organizations.shipments_count'), value: stats.shipments_total,
          icon: Package,   color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-100 dark:border-violet-900/50' },
        { label: t('organizations.shipments_month'), value: stats.shipments_month,
          icon: Activity,  color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-100 dark:border-amber-900/50' },
        { label: t('organizations.revenue_month'),   value: `$${Number(stats.revenue_month).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/50' },
    ];

    // Build page buttons (max ±2 from current)
    const buildPages = (): (number | '…')[] => {
        const { current_page: cur, last_page: last } = users;
        if (last <= 1) return [];
        const out: (number | '…')[] = [];
        let prev = 0;
        for (let i = 1; i <= last; i++) {
            if (i === 1 || i === last || (i >= cur - 2 && i <= cur + 2)) {
                if (prev && i - prev > 1) out.push('…');
                out.push(i);
                prev = i;
            }
        }
        return out;
    };
    const pageButtons = buildPages();

    return (
        <AuthenticatedLayout>
            <Head title={organization.name} />
            <div className="space-y-6">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={route('admin.organizations.index')} className="hover:text-foreground transition-colors">
                        {t('organizations.title')}
                    </Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">{organization.name}</span>
                </nav>

                {/* Hero */}
                <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <Link href={route('admin.organizations.index')}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 flex-shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <OrgAvatar org={organization} />
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
                                    <Badge className={`text-xs px-2 py-0.5 border ${organization.is_active
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {organization.is_active
                                            ? <><CheckCircle2 className="h-3 w-3 mr-1 inline" />{t('organizations.active')}</>
                                            : <><XCircle className="h-3 w-3 mr-1 inline" />{t('organizations.inactive')}</>
                                        }
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5 font-mono">{organization.slug}</p>
                                {organization.domain && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <Globe className="h-3 w-3" />{organization.domain}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {organization.is_active && (
                                <Button variant="outline" size="sm" onClick={impersonate}
                                    className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <Eye className="h-3.5 w-3.5" />{t('organizations.impersonate')}
                                </Button>
                            )}
                            <Link href={route('admin.organizations.edit', organization.id)}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Edit className="h-3.5 w-3.5" />{t('common.edit')}
                                </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={toggleStatus}
                                className={`gap-1.5 ${organization.is_active
                                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                                    : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                                {organization.is_active
                                    ? <><ToggleLeft className="h-3.5 w-3.5" />{t('organizations.deactivate')}</>
                                    : <><ToggleRight className="h-3.5 w-3.5" />{t('organizations.activate')}</>
                                }
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
                        <Card key={label} className={`border ${border}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                                        <p className="text-2xl font-bold text-foreground">{value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Detail grid: org info + branding + settings */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Org info */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {t('organizations.org_info')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-6">
                                <InfoRow icon={Hash}         label={t('organizations.slug')}         value={organization.slug} />
                                <InfoRow icon={Mail}         label={t('organizations.email')}        value={organization.email} />
                                <InfoRow icon={Phone}        label={t('organizations.phone')}        value={organization.phone} />
                                <InfoRow icon={MapPin}       label={t('organizations.location')}     value={locationStr} />
                                <InfoRow icon={Globe}        label={t('organizations.domain_label')} value={organization.domain} />
                                <InfoRow icon={ShieldCheck}  label={t('organizations.tax_id')}       value={organization.tax_id} />
                                <InfoRow icon={Building2}    label={t('organizations.legal_name')}   value={organization.legal_name} />
                                <InfoRow icon={CalendarDays} label={t('organizations.created_at')}   value={
                                    organization.created_at
                                        ? new Date(organization.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                                        : undefined
                                } />
                            </CardContent>
                        </Card>

                        {/* Branding */}
                        {(organization.primary_color || organization.secondary_color || organization.accent_color || organization.ui_theme) && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Palette className="h-4 w-4 text-primary" />
                                        {t('organizations.branding')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-6">
                                    <div className="flex flex-wrap gap-6 items-center">
                                        {[
                                            { label: 'Primary',   color: organization.primary_color },
                                            { label: 'Secondary', color: organization.secondary_color },
                                            { label: 'Accent',    color: organization.accent_color },
                                        ].map(({ label, color }) => color ? (
                                            <div key={label} className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl shadow-sm border border-border/50" style={{ backgroundColor: color }} />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">{label}</p>
                                                    <p className="text-xs font-mono font-semibold">{color}</p>
                                                </div>
                                            </div>
                                        ) : null)}
                                        {organization.ui_theme && (
                                            <Badge variant="outline" className="capitalize ml-auto">
                                                {organization.ui_theme} · {t('organizations.theme_label')}
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Settings overview */}
                        {settingGroups.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Settings2 className="h-4 w-4 text-primary" />
                                        {t('organizations.config_overview')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-6">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {settingGroups.map(([group, vals]) => (
                                            <div key={group} className="rounded-xl border bg-muted/30 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 pb-2 border-b border-border/50">
                                                    {group}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {Object.entries(vals).slice(0, 5).map(([key, val]) => (
                                                        <div key={key} className="flex justify-between gap-2 text-xs">
                                                            <span className="text-muted-foreground truncate capitalize">{key.replace(/_/g, ' ')}</span>
                                                            <span className="font-medium text-foreground truncate max-w-[120px]">
                                                                {String(val).length > 30 ? '••••••' : String(val) || '—'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {Object.keys(vals).length > 5 && (
                                                        <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                                                            +{Object.keys(vals).length - 5} {t('organizations.more_settings')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Activity summary */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    {t('organizations.activity_summary')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-6 space-y-5">
                                {[
                                    { label: t('organizations.active_users'),    value: stats.users_active,    total: Math.max(stats.users_total, 1),      color: 'bg-blue-500' },
                                    { label: t('organizations.shipments_month'), value: stats.shipments_month, total: Math.max(stats.shipments_total, 1),   color: 'bg-violet-500' },
                                ].map(({ label, value, total, color }) => {
                                    const pct = Math.min(Math.round((value / total) * 100), 100);
                                    return (
                                        <div key={label}>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-muted-foreground">{label}</span>
                                                <span className="font-semibold tabular-nums">{value.toLocaleString()} / {total.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 text-right">{pct}%</p>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Billing overview */}
                        <Card className="overflow-hidden">
                            {(() => {
                                const cfg = active_subscription
                                    ? (subStatusConfig[active_subscription.status] ?? subStatusConfig['active'])
                                    : null;
                                const daysLeft = active_subscription?.expires_at
                                    ? Math.max(0, Math.ceil((new Date(active_subscription.expires_at).getTime() - Date.now()) / 86400000))
                                    : null;
                                const isUrgent = active_subscription && ['grace_period', 'read_only'].includes(active_subscription.status);
                                const isExpiringSoon = active_subscription && daysLeft !== null && daysLeft <= 7 && ['active', 'trial'].includes(active_subscription.status);

                                return (
                                    <>
                                        <div className={`h-1 w-full ${isUrgent ? 'bg-gradient-to-r from-red-400 to-red-600' : isExpiringSoon ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-primary/60 to-primary'}`} />
                                        <CardHeader className="pb-3 pt-4">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4 text-primary" />
                                                    {t('saas_billing.billing_overview')}
                                                </CardTitle>
                                                <Link href={route('admin.billing.wallets.show', organization.id)}
                                                    className="text-xs text-primary hover:underline">
                                                    {t('common.view_all')}
                                                </Link>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {/* Subscription status */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <CreditCard className="h-3 w-3" /> {t('saas_billing.subscriptions')}
                                                </span>
                                                {cfg ? (
                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                                                        {cfg.icon}
                                                        {t(`saas_billing.${cfg.label}`)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                        <MinusCircle className="h-3.5 w-3.5" />
                                                        {t('saas_billing.no_subscription')}
                                                    </span>
                                                )}
                                            </div>

                                            {active_subscription && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{t('common.plan')}</span>
                                                        <span className="text-xs font-semibold text-foreground">{active_subscription.plan.name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{t('saas_billing.expires_at')}</span>
                                                        <span className={`text-xs font-medium ${daysLeft !== null && daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                                            {new Date(active_subscription.expires_at).toLocaleDateString()}
                                                            {daysLeft !== null && daysLeft <= 30 && (
                                                                <span className="ml-1 text-muted-foreground">({daysLeft}d)</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{t('saas_billing.amount')}</span>
                                                        <span className="text-xs font-semibold text-foreground">
                                                            ${Number(active_subscription.price).toFixed(2)} / {t(`saas_billing.${active_subscription.billing_cycle}`).toLowerCase()}
                                                        </span>
                                                    </div>
                                                </>
                                            )}

                                            {/* Alert for urgent states */}
                                            {(isUrgent || isExpiringSoon) && (
                                                <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                                                    active_subscription!.status === 'read_only'
                                                        ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                                                }`}>
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    <span>
                                                        {active_subscription!.status === 'read_only'
                                                            ? t('saas_billing.subscription_warning_readonly')
                                                            : active_subscription!.status === 'grace_period'
                                                                ? t('saas_billing.subscription_warning_grace', { days: String(daysLeft ?? 0) })
                                                                : t('saas_billing.subscription_warning_expiring', { days: String(daysLeft) })
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            {/* Wallet balance */}
                                            <div className="border-t border-border pt-3 flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Wallet className="h-3 w-3" /> {t('saas_billing.balance')}
                                                </span>
                                                <span className={`text-sm font-bold ${wallet && Number(wallet.balance) <= 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                                    ${Number(wallet?.balance ?? 0).toFixed(2)}
                                                    <span className="text-xs font-normal text-muted-foreground ml-1">{wallet?.currency ?? 'USD'}</span>
                                                </span>
                                            </div>
                                        </CardContent>
                                    </>
                                );
                            })()}
                        </Card>
                    </div>
                </div>

                {/* ── Users — full width, paginated + searchable ───────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    {t('organizations.users')}
                                </CardTitle>
                                <Badge variant="secondary" className="tabular-nums text-xs">
                                    {stats.users_total.toLocaleString()}
                                </Badge>
                            </div>
                            {/* Search */}
                            <form onSubmit={handleSearch} className="flex gap-2 sm:w-72">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        placeholder={`${t('common.search')} ${t('organizations.users').toLowerCase()}…`}
                                        className="pl-8 h-8 text-sm"
                                    />
                                </div>
                                <Button type="submit" size="sm" variant="outline" className="h-8 px-3">
                                    <Search className="h-3.5 w-3.5" />
                                </Button>
                                {users.search && (
                                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={clearSearch}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </form>
                        </div>
                    </CardHeader>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 border-y">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('common.users')}</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">{t('organizations.email')}</th>
                                    <th className="text-center px-4 py-3 font-medium text-muted-foreground w-28">{t('organizations.status')}</th>
                                    <th className="text-center px-4 py-3 font-medium text-muted-foreground w-32">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12">
                                            <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">{t('common.no_results')}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((u) => {
                                        const role = u.roles?.[0]?.name ?? 'user';
                                        const roleClass = roleColors[role] ?? 'bg-gray-100 text-gray-600 border-gray-200';
                                        return (
                                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <UserInitials name={u.name} color={organization.primary_color} />
                                                        <span className="font-medium text-foreground">{u.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={`text-xs border ${u.is_active
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {u.is_active
                                                            ? <><CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" />{t('common.active')}</>
                                                            : <><XCircle className="h-2.5 w-2.5 mr-1 inline" />{t('common.inactive')}</>
                                                        }
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={`text-xs border ${roleClass}`}>{role}</Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer — siempre visible */}
                    <div className="px-4 py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">

                        {/* Izquierda: showing + rows per page */}
                        <div className="flex items-center gap-4">
                            <span>
                                {t('pagination.showing', {
                                    from:  String(users.total === 0 ? 0 : (users.current_page - 1) * users.per_page + 1),
                                    to:    String(Math.min(users.current_page * users.per_page, users.total)),
                                    total: String(users.total),
                                })}
                            </span>
                            <span className="hidden sm:inline text-border">|</span>
                            <span className="hidden sm:flex items-center gap-2">
                                {t('pagination.rows_per_page')}:
                                <span className="font-medium text-foreground">{users.per_page}</span>
                            </span>
                        </div>

                        {/* Derecha: page X of Y + prev/next */}
                        <div className="flex items-center gap-2">
                            <span className="tabular-nums">
                                {t('pagination.page_of', {
                                    current: String(users.current_page),
                                    total:   String(users.last_page),
                                })}
                            </span>

                            <div className="flex items-center gap-1 ml-2">
                                <Button variant="outline" size="icon" className="h-8 w-8"
                                    disabled={users.current_page <= 1}
                                    onClick={() => loadUsers(users.current_page - 1, searchInput)}
                                    title={t('pagination.prev_page')}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                {pageButtons.map((item, idx) =>
                                    item === '…' ? (
                                        <span key={`dots-${idx}`} className="px-1 select-none">…</span>
                                    ) : (
                                        <Button key={item}
                                            variant={item === users.current_page ? 'default' : 'outline'}
                                            className="h-8 w-8 p-0 text-sm"
                                            onClick={() => loadUsers(item as number, searchInput)}>
                                            {item}
                                        </Button>
                                    )
                                )}

                                <Button variant="outline" size="icon" className="h-8 w-8"
                                    disabled={users.current_page >= users.last_page}
                                    onClick={() => loadUsers(users.current_page + 1, searchInput)}
                                    title={t('pagination.next_page')}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

            </div>
        </AuthenticatedLayout>
    );
}
