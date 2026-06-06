import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import {
    DollarSign, TrendingUp, CheckCircle2, AlertTriangle, Lock, MinusCircle,
    ArrowRight, Clock, CreditCard, Wallet, FileText, LayoutGrid,
    ArrowUpCircle, ArrowDownCircle, CalendarX,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Transaction {
    id: number;
    organization: { id: number; name: string; primary_color?: string };
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    created_at: string;
}

interface ExpiringSoon {
    id: number;
    organization: { id: number; name: string; primary_color?: string };
    plan: { name: string };
    expires_at: string;
    status: string;
    billing_cycle: string;
}

interface Props {
    stats: {
        revenue_this_month: number;
        revenue_this_year: number;
        active: number;
        grace_period: number;
        read_only: number;
        no_subscription: number;
    };
    revenue_chart: { month: string; total: number }[];
    expiring_soon: ExpiringSoon[];
    latest_transactions: Transaction[];
}

function OrgAvatar({ name, color }: { name: string; color?: string }) {
    return (
        <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: color || '#6366f1' }}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function Dashboard({ stats, revenue_chart, expiring_soon, latest_transactions }: Props) {
    const { t } = useTranslation();

    const fmt = (n: number | string) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));

    const statCards = [
        {
            label: t('saas_billing.revenue_this_month'),
            value: fmt(stats.revenue_this_month),
            icon: DollarSign,
            iconBg: 'bg-green-100 dark:bg-green-900/30',
            iconColor: 'text-green-600 dark:text-green-400',
            border: 'border-l-4 border-l-green-500',
        },
        {
            label: t('saas_billing.revenue_this_year'),
            value: fmt(stats.revenue_this_year),
            icon: TrendingUp,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            border: 'border-l-4 border-l-blue-500',
        },
        {
            label: t('saas_billing.active_subscriptions'),
            value: stats.active,
            icon: CheckCircle2,
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-l-4 border-l-emerald-500',
        },
        {
            label: t('saas_billing.in_grace_period'),
            value: stats.grace_period,
            icon: AlertTriangle,
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconColor: 'text-amber-600 dark:text-amber-400',
            border: 'border-l-4 border-l-amber-500',
        },
        {
            label: t('saas_billing.read_only'),
            value: stats.read_only,
            icon: Lock,
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            iconColor: 'text-red-600 dark:text-red-400',
            border: 'border-l-4 border-l-red-500',
        },
        {
            label: t('saas_billing.no_subscription'),
            value: stats.no_subscription,
            icon: MinusCircle,
            iconBg: 'bg-gray-100 dark:bg-gray-800',
            iconColor: 'text-gray-500 dark:text-gray-400',
            border: 'border-l-4 border-l-gray-400',
        },
    ];

    const quickLinks = [
        { label: t('saas_billing.plans'),        icon: LayoutGrid,  href: route('admin.billing.plans'),         color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
        { label: t('saas_billing.subscriptions'), icon: CreditCard,  href: route('admin.billing.subscriptions'), color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: t('saas_billing.wallets'),       icon: Wallet,      href: route('admin.billing.wallets'),       color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: t('saas_billing.invoices'),      icon: FileText,    href: route('admin.billing.invoices'),      color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.dashboard')} />

            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.dashboard')}</h1>
                        <p className="text-sm text-muted-foreground mt-1">{t('saas_billing.dashboard_desc')}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {quickLinks.map(({ label, icon: Icon, href, color, bg }) => (
                            <Link key={label} href={href}>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${bg} ${color}`}>
                                        <Icon className="h-3 w-3" />
                                    </span>
                                    {label}
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, border }) => (
                        <Card key={label} className={`${border} overflow-hidden`}>
                            <CardContent className="p-4">
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBg}`}>
                                    <Icon className={`h-4 w-4 ${iconColor}`} />
                                </div>
                                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Revenue Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-base">{t('saas_billing.last_12_months')}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{t('saas_billing.revenue_this_year')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">{fmt(stats.revenue_this_year)}</p>
                            <p className="text-xs text-muted-foreground">{t('saas_billing.revenue_this_month')}: {fmt(stats.revenue_this_month)}</p>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2 pb-4">
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={revenue_chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `$${v}`}
                                    width={50}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--popover)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        fontSize: 12,
                                    }}
                                    formatter={((v: number) => [fmt(v), t('saas_billing.revenue_this_month')]) as any}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="var(--primary)"
                                    fill="url(#revGrad)"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Bottom 2-col */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Expiring Soon */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                </span>
                                {t('saas_billing.expiring_soon')}
                            </CardTitle>
                            <Link href={route('admin.billing.subscriptions')} className="text-xs text-primary hover:underline flex items-center gap-1">
                                {t('common.view_all')} <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {expiring_soon.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                    <CalendarX className="h-7 w-7 mb-2 opacity-30" />
                                    <p className="text-sm">{t('common.no_results')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {expiring_soon.map((s) => {
                                        const days = daysUntil(s.expires_at);
                                        const urgency = days <= 1
                                            ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                                            : days <= 3
                                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                                                : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
                                        return (
                                            <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                                                <OrgAvatar name={s.organization.name} color={s.organization.primary_color} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{s.organization.name}</p>
                                                    <p className="text-xs text-muted-foreground">{s.plan.name} · {t(`saas_billing.${s.billing_cycle}`)}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${urgency}`}>
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {days}d
                                                    </span>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {new Date(s.expires_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Latest Transactions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base">{t('saas_billing.transaction_history')}</CardTitle>
                            <Link href={route('admin.billing.wallets')} className="text-xs text-primary hover:underline flex items-center gap-1">
                                {t('common.view_all')} <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {latest_transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                    <Wallet className="h-7 w-7 mb-2 opacity-30" />
                                    <p className="text-sm">{t('common.no_results')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {latest_transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                                            <OrgAvatar name={tx.organization.name} color={tx.organization.primary_color} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{tx.organization.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`flex items-center gap-1 text-sm font-semibold justify-end ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {tx.type === 'credit'
                                                        ? <ArrowUpCircle className="h-3.5 w-3.5" />
                                                        : <ArrowDownCircle className="h-3.5 w-3.5" />
                                                    }
                                                    {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                                                </span>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
