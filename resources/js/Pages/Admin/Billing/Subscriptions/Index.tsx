import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Card, CardContent } from '@/Components/UI/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/UI/dialog';
import { Switch } from '@/Components/UI/switch';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { ArrowLeft, Search, UserPlus, XCircle, X } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface Subscription {
    id: number;
    organization: { id: number; name: string; primary_color?: string };
    plan: { id: number; name: string };
    billing_cycle: string;
    price: number;
    currency: string;
    status: string;
    expires_at: string;
    auto_renew: boolean;
}
interface Plan { id: number; name: string; price_monthly: number; currency: string; }
interface Organization { id: number; name: string; }
interface Paginator {
    data: Subscription[];
    current_page: number; last_page: number; per_page: number;
    total: number; from: number | null; to: number | null;
}

const statusBadge: Record<string, string> = {
    active:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    trial:        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    grace_period: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    read_only:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    suspended:    'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    cancelled:    'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-500',
};

const statuses = ['all', 'active', 'trial', 'grace_period', 'read_only', 'suspended', 'cancelled'];

export default function SubscriptionsIndex({ subscriptions, plans, organizations, filters }: {
    subscriptions: Paginator; plans: Plan[]; organizations: Organization[]; filters: Record<string, string>;
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [search, setSearch] = useState(filters.search || '');
    const [assignOpen, setAssignOpen] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<number | null>(null);

    const assignForm = useForm({ plan_id: '', billing_cycle: 'monthly', custom_price: '', auto_renew: true });

    const apply = (overrides: Record<string, string>) =>
        router.get(route('admin.billing.subscriptions'), { ...filters, ...overrides, page: '1' }, { preserveState: true, replace: true });

    const clearFilters = () => {
        setSearch('');
        router.get(route('admin.billing.subscriptions'), {}, { preserveState: false, replace: true });
    };

    const hasFilters = !!(filters.search || (filters.status && filters.status !== 'all'));

    const cancelSub = async (sub: Subscription) => {
        const confirmed = await alert.confirm(t('saas_billing.confirm_cancel'), '');
        if (confirmed) {
            router.post(route('admin.billing.subscriptions.cancel', sub.organization.id), {}, { preserveScroll: true });
        }
    };

    const submitAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrg) return;
        assignForm.post(route('admin.billing.subscriptions.assign', selectedOrg), {
            onSuccess: () => { setAssignOpen(false); assignForm.reset(); setSelectedOrg(null); },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.subscriptions')} />
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
                            <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.subscriptions')}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('saas_billing.subscriptions_desc')}</p>
                        </div>
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => setAssignOpen(true)}>
                        <UserPlus className="h-4 w-4" /> {t('saas_billing.assign_plan')}
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                        <form onSubmit={e => { e.preventDefault(); apply({ search }); }} className="flex gap-2 flex-1 min-w-[200px]">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input className="pl-9" placeholder={`${t('common.search')}…`} value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <Button type="submit" variant="secondary" size="sm">{t('common.search')}</Button>
                        </form>

                        <Select value={filters.status || 'all'} onValueChange={v => apply({ status: v })}>
                            <SelectTrigger className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map(s => (
                                    <SelectItem key={s} value={s}>
                                        {s === 'all' ? t('common.all') : t(`saas_billing.${s}`)}
                                    </SelectItem>
                                ))}
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
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.plan')}</th>
                                        <th className="hidden md:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.billing_cycle')}</th>
                                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.amount')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.status')}</th>
                                        <th className="hidden lg:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.expires_at')}</th>
                                        <th className="px-4 py-3 text-right text-muted-foreground font-medium">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                                <p>{t('common.no_results')}</p>
                                                {hasFilters && (
                                                    <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-1">
                                                        {t('common.clear_filters')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : subscriptions.data.map((sub) => (
                                        <tr key={sub.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                        style={{ backgroundColor: sub.organization.primary_color || '#6366f1' }}
                                                    >
                                                        {sub.organization.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-foreground">{sub.organization.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{sub.plan.name}</td>
                                            <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                                                {t(`saas_billing.${sub.billing_cycle}`)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                ${Number(sub.price).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[sub.status] ?? ''}`}>
                                                    {t(`saas_billing.${sub.status}`)}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground text-xs">
                                                {new Date(sub.expires_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {!['cancelled', 'suspended'].includes(sub.status) && (
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                                        onClick={() => cancelSub(sub)}
                                                    >
                                                        <XCircle className="h-4 w-4" /> {t('common.cancel')}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <AppPagination variant="server" meta={subscriptions} />
                    </CardContent>
                </Card>

            </div>

            {/* Assign Plan Modal */}
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('saas_billing.assign_plan')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitAssign} className="space-y-4">
                        <div className="space-y-1">
                            <Label>{t('common.organization')} *</Label>
                            <Select onValueChange={v => setSelectedOrg(Number(v))}>
                                <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                                <SelectContent>
                                    {organizations.map(org => (
                                        <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('common.plan')} *</Label>
                            <Select onValueChange={v => assignForm.setData('plan_id', v)}>
                                <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                                <SelectContent>
                                    {plans.map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} — ${Number(p.price_monthly).toFixed(2)}/mo
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {assignForm.errors.plan_id && <p className="text-xs text-destructive">{assignForm.errors.plan_id}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('saas_billing.billing_cycle')} *</Label>
                            <Select value={assignForm.data.billing_cycle} onValueChange={v => assignForm.setData('billing_cycle', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['monthly', 'quarterly', 'semiannual', 'annual'].map(c => (
                                        <SelectItem key={c} value={c}>{t(`saas_billing.${c}`)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('saas_billing.custom_price')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span></Label>
                            <Input
                                type="number" step="0.01" min="0"
                                placeholder={t('saas_billing.custom_price_placeholder')}
                                value={assignForm.data.custom_price}
                                onChange={e => assignForm.setData('custom_price', e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                            <div>
                                <p className="text-sm font-medium">{t('saas_billing.auto_renew')}</p>
                                <p className="text-xs text-muted-foreground">{t('saas_billing.auto_renew_desc')}</p>
                            </div>
                            <Switch checked={assignForm.data.auto_renew} onCheckedChange={v => assignForm.setData('auto_renew', v)} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={assignForm.processing || !selectedOrg || !assignForm.data.plan_id}>
                                {assignForm.processing ? t('common.saving') : t('saas_billing.assign_plan')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
