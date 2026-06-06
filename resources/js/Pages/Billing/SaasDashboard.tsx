import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import { Button } from '@/Components/UI/button';
import {
    Wallet, CreditCard, ArrowUpCircle, ArrowDownCircle,
    FileText, ArrowRight, AlertTriangle, XOctagon,
    Calendar, RefreshCw, CheckCircle2, Clock, TrendingUp,
} from 'lucide-react';

interface WalletData { balance: number; currency: string; last_recharged_at?: string; }
interface Subscription {
    status: string;
    plan: { name: string };
    billing_cycle: string;
    price: number;
    currency: string;
    expires_at: string;
    trial_ends_at?: string;
    auto_renew: boolean;
}
interface Transaction { id: number; type: 'credit' | 'debit'; amount: number; description: string; payment_method?: string; created_at: string; }
interface Invoice { id: number; invoice_number: string; type: string; status: string; total: number; currency: string; issued_at?: string; }

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
    active:       { label: 'active',       color: 'text-green-700 dark:text-green-300',  icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: 'bg-green-100 dark:bg-green-900/40' },
    trial:        { label: 'trial',        color: 'text-blue-700 dark:text-blue-300',    icon: <Clock className="h-3.5 w-3.5" />,        bg: 'bg-blue-100 dark:bg-blue-900/40' },
    grace_period: { label: 'grace_period', color: 'text-amber-700 dark:text-amber-300',  icon: <AlertTriangle className="h-3.5 w-3.5" />, bg: 'bg-amber-100 dark:bg-amber-900/40' },
    read_only:    { label: 'read_only',    color: 'text-red-700 dark:text-red-300',      icon: <XOctagon className="h-3.5 w-3.5" />,     bg: 'bg-red-100 dark:bg-red-900/40' },
    suspended:    { label: 'suspended',    color: 'text-gray-600 dark:text-gray-400',    icon: <XOctagon className="h-3.5 w-3.5" />,     bg: 'bg-gray-100 dark:bg-gray-800' },
};

const invoiceStatusColor: Record<string, string> = {
    paid:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    issued:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    overdue:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    draft:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-gray-100 text-gray-500',
};

export default function SaasDashboard({ wallet, active_subscription, latest_transactions, latest_invoices }: {
    wallet?: WalletData;
    active_subscription?: Subscription;
    latest_transactions: Transaction[];
    latest_invoices: Invoice[];
}) {
    const { t } = useTranslation();
    const subStatus = (usePage().props as any).subscription_status as {
        grace_days_remaining?: number | null;
        days_remaining?: number | null;
    } | null;

    const cfg = active_subscription ? (statusConfig[active_subscription.status] ?? statusConfig['active']) : null;
    const daysLeft = active_subscription?.expires_at
        ? Math.max(0, Math.ceil((new Date(active_subscription.expires_at).getTime() - Date.now()) / 86400000))
        : null;
    const graceDaysLeft = subStatus?.grace_days_remaining ?? 0;
    const isWarning = active_subscription && ['grace_period', 'read_only'].includes(active_subscription.status);
    const isExpiringSoon = active_subscription && ['active', 'trial'].includes(active_subscription.status) && daysLeft !== null && daysLeft <= 7;
    const balance = Number(wallet?.balance ?? 0);
    const nextCharge = active_subscription ? Number(active_subscription.price) : 0;
    const balanceLow = balance < nextCharge && nextCharge > 0;

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.my_billing')} />
            <div className="space-y-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.my_billing')}</h1>
                        <p className="text-sm text-muted-foreground mt-1">{t('saas_billing.my_billing_desc')}</p>
                    </div>
                    <Link href={route('tenant.billing.recharge')}>
                        <Button className="gap-2 shrink-0">
                            <ArrowUpCircle className="h-4 w-4" />
                            {t('saas_billing.recharge')}
                        </Button>
                    </Link>
                </div>

                {/* Alert banners */}
                {isWarning && active_subscription!.status === 'read_only' && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-800 dark:text-red-300">
                        <XOctagon className="h-5 w-5 shrink-0" />
                        <p className="flex-1 text-sm font-medium">{t('saas_billing.subscription_warning_readonly')}</p>
                        <Link href={route('tenant.billing.recharge')}>
                            <Button size="sm" variant="destructive">{t('saas_billing.recharge')}</Button>
                        </Link>
                    </div>
                )}
                {isWarning && active_subscription!.status === 'grace_period' && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p className="flex-1 text-sm font-medium">{t('saas_billing.subscription_warning_grace', { days: String(graceDaysLeft) })}</p>
                        <Link href={route('tenant.billing.recharge')}>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">{t('saas_billing.recharge')}</Button>
                        </Link>
                    </div>
                )}
                {isExpiringSoon && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                        <Clock className="h-5 w-5 shrink-0" />
                        <p className="flex-1 text-sm font-medium">{t('saas_billing.subscription_warning_expiring', { days: String(daysLeft) })}</p>
                        <Link href={route('tenant.billing.recharge')}>
                            <Button size="sm" variant="outline" className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100">{t('saas_billing.renew')}</Button>
                        </Link>
                    </div>
                )}
                {balanceLow && !isWarning && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 text-orange-800 dark:text-orange-300">
                        <Wallet className="h-5 w-5 shrink-0" />
                        <p className="flex-1 text-sm font-medium">
                            {t('saas_billing.insufficient_balance')} — ${balance.toFixed(2)} / ${nextCharge.toFixed(2)} {t('saas_billing.days_remaining').includes('day') ? 'needed' : ''}
                        </p>
                        <Link href={route('tenant.billing.recharge')}>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">{t('saas_billing.recharge')}</Button>
                        </Link>
                    </div>
                )}

                {/* Main cards: Subscription + Wallet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Subscription card */}
                    <Card className="overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary" />
                        <CardHeader className="pb-3 pt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-base">{t('saas_billing.my_subscription')}</CardTitle>
                                </div>
                                {cfg && (
                                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                                        {cfg.icon}
                                        {t(`saas_billing.${cfg.label}`)}
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {active_subscription ? (
                                <>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{active_subscription.plan.name}</p>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            <span className="font-semibold text-foreground">${Number(active_subscription.price).toFixed(2)}</span>
                                            {' / '}{t(`saas_billing.${active_subscription.billing_cycle}`).toLowerCase()}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {t('saas_billing.expires_at')}</p>
                                            <p className="font-medium text-foreground">{new Date(active_subscription.expires_at).toLocaleDateString()}</p>
                                        </div>
                                        {daysLeft !== null && (
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {t('saas_billing.days_remaining')}</p>
                                                <p className={`font-semibold ${daysLeft <= 7 ? 'text-amber-600' : daysLeft <= 30 ? 'text-orange-500' : 'text-foreground'}`}>
                                                    {daysLeft} {t('saas_billing.days_remaining')}
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3" /> {t('saas_billing.auto_renew')}</p>
                                            <p className={`font-medium ${active_subscription.auto_renew ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {active_subscription.auto_renew ? '✓ ' + t('saas_billing.auto_renew') : '✗'}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {t('saas_billing.next_charge') || 'Next charge'}</p>
                                            <p className="font-semibold text-foreground">${Number(active_subscription.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-4 text-center">
                                    <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('saas_billing.no_subscription')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Wallet card */}
                    <Card className="overflow-hidden">
                        <div className={`h-1 w-full bg-gradient-to-r ${balanceLow ? 'from-orange-400 to-red-500' : 'from-emerald-400 to-teal-500'}`} />
                        <CardHeader className="pb-3 pt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-base">{t('saas_billing.my_wallet')}</CardTitle>
                                </div>
                                {balanceLow && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium">
                                        Low balance
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className={`text-3xl font-bold ${balanceLow ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
                                    ${balance.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">{wallet?.currency ?? 'USD'}</p>
                            </div>
                            <div className="space-y-2 text-sm">
                                {wallet?.last_recharged_at && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('saas_billing.last_recharge')}</span>
                                        <span className="font-medium text-foreground">{new Date(wallet.last_recharged_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {active_subscription && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('saas_billing.next_charge') || 'Next charge'}</span>
                                        <span className={`font-semibold ${balanceLow ? 'text-orange-600' : 'text-foreground'}`}>
                                            ${nextCharge.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <Link href={route('tenant.billing.recharge')} className="block">
                                <Button size="sm" variant="outline" className="w-full gap-2">
                                    <ArrowUpCircle className="h-4 w-4" />
                                    {t('saas_billing.recharge')}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Transactions + Invoices */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Recent Transactions */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base">{t('saas_billing.transaction_history')}</CardTitle>
                            <Link href={route('tenant.billing.transactions')} className="text-xs text-primary hover:underline flex items-center gap-1">
                                {t('common.view_all')} <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {latest_transactions.length === 0 ? (
                                <div className="py-10 text-center">
                                    <ArrowDownCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('common.no_results')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {latest_transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center gap-3 px-6 py-3">
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                                                {tx.type === 'credit'
                                                    ? <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    : <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">{tx.description}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-sm font-semibold shrink-0 ${tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Invoices */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base">{t('saas_billing.invoices')}</CardTitle>
                            <Link href={route('tenant.billing.invoices')} className="text-xs text-primary hover:underline flex items-center gap-1">
                                {t('common.view_all')} <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {latest_invoices.length === 0 ? (
                                <div className="py-10 text-center">
                                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('common.no_results')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {latest_invoices.map((inv) => (
                                        <Link key={inv.id} href={route('tenant.billing.invoices.show', inv.id)}
                                            className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-mono text-foreground">{inv.invoice_number}</p>
                                                <p className="text-xs text-muted-foreground">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}</p>
                                            </div>
                                            <div className="text-right shrink-0 space-y-1">
                                                <p className="text-sm font-semibold text-foreground">${Number(inv.total).toFixed(2)}</p>
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${invoiceStatusColor[inv.status] ?? ''}`}>
                                                    {t(`saas_billing.invoice_status_${inv.status}`)}
                                                </span>
                                            </div>
                                        </Link>
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
