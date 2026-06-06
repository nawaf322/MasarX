import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Card, CardContent } from '@/Components/UI/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { ArrowLeft, Search, Eye, Wallet, X } from 'lucide-react';

interface Organization {
    id: number; name: string; email?: string; primary_color?: string;
    saas_wallet?: { balance: number; currency: string; last_recharged_at?: string };
    saas_subscriptions?: { status: string; plan: { name: string } }[];
}
interface Paginator {
    data: Organization[];
    current_page: number; last_page: number; per_page: number;
    total: number; from: number | null; to: number | null;
}

const statusBadge: Record<string, string> = {
    active:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    trial:        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    grace_period: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    read_only:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function WalletsIndex({ organizations, filters }: { organizations: Paginator; filters: Record<string, string> }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search || '');

    const apply = (overrides: Record<string, string>) =>
        router.get(route('admin.billing.wallets'), { ...filters, ...overrides, page: '1' }, { preserveState: true, replace: true });

    const clearFilters = () => {
        setSearch('');
        router.get(route('admin.billing.wallets'), {}, { preserveState: false, replace: true });
    };

    const hasFilters = !!(filters.search || (filters.balance && filters.balance !== 'all'));

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.wallets')} />
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Link href={route('admin.billing.dashboard')}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.wallets')}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('saas_billing.wallets_desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                        <form
                            onSubmit={e => { e.preventDefault(); apply({ search }); }}
                            className="flex gap-2 flex-1 min-w-[200px]"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    className="pl-9"
                                    placeholder={`${t('common.search')}…`}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="sm">{t('common.search')}</Button>
                        </form>

                        <Select value={filters.balance || 'all'} onValueChange={v => apply({ balance: v })}>
                            <SelectTrigger className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                <SelectItem value="with_balance">{t('saas_billing.with_balance')}</SelectItem>
                                <SelectItem value="no_balance">{t('saas_billing.no_balance')}</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                                <X className="h-3.5 w-3.5" /> {t('common.clear_filters')}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.organization')}</th>
                                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.balance')}</th>
                                        <th className="hidden md:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.subscriptions')}</th>
                                        <th className="hidden lg:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.last_recharge')}</th>
                                        <th className="px-4 py-3 text-right text-muted-foreground font-medium">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizations.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                <p>{t('common.no_results')}</p>
                                            </td>
                                        </tr>
                                    ) : organizations.data.map((org) => {
                                        const wallet = org.saas_wallet;
                                        const sub = org.saas_subscriptions?.[0];
                                        const balance = Number(wallet?.balance ?? 0);
                                        return (
                                            <tr key={org.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                            style={{ backgroundColor: org.primary_color || '#6366f1' }}
                                                        >
                                                            {org.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{org.name}</p>
                                                            {org.email && <p className="text-xs text-muted-foreground">{org.email}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {wallet ? (
                                                        <span className={`font-semibold ${balance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                            ${balance.toFixed(2)} <span className="text-xs font-normal">{wallet.currency}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-3">
                                                    {sub ? (
                                                        <div className="space-y-0.5">
                                                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                {t(`saas_billing.${sub.status}`)}
                                                            </span>
                                                            <p className="text-xs text-muted-foreground">{sub.plan.name}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">{t('saas_billing.no_subscription')}</span>
                                                    )}
                                                </td>
                                                <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground text-xs">
                                                    {wallet?.last_recharged_at
                                                        ? new Date(wallet.last_recharged_at).toLocaleDateString()
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link href={route('admin.billing.wallets.show', org.id)}>
                                                        <Button variant="outline" size="sm" className="gap-1">
                                                            <Eye className="h-4 w-4" /> {t('common.view')}
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <AppPagination variant="server" meta={organizations} />
                    </CardContent>
                </Card>

            </div>
        </AuthenticatedLayout>
    );
}
