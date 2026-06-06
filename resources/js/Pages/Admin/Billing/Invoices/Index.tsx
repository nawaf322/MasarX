import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Card, CardContent } from '@/Components/UI/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { ArrowLeft, Search, Eye, X, FileText } from 'lucide-react';

interface Invoice {
    id: number;
    invoice_number: string;
    organization: { id: number; name: string; primary_color?: string };
    type: string;
    status: string;
    total: number;
    currency: string;
    issued_at?: string;
    paid_at?: string;
    subscription?: { plan: { name: string } };
}
interface Paginator {
    data: Invoice[];
    current_page: number; last_page: number; per_page: number;
    total: number; from: number | null; to: number | null;
}

const statusBadge: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    issued:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    paid:      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    overdue:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-500',
    refunded:  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const statuses = ['all', 'draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded'];
const types    = ['all', 'subscription', 'recharge', 'adjustment', 'refund'];

export default function InvoicesIndex({ invoices, filters }: { invoices: Paginator; filters: Record<string, string> }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search || '');
    const [from, setFrom]     = useState(filters.from || '');
    const [to, setTo]         = useState(filters.to || '');

    const apply = (overrides: Record<string, string>) =>
        router.get(route('admin.billing.invoices'), { ...filters, ...overrides, page: '1' }, { preserveState: true, replace: true });

    const clearFilters = () => {
        setSearch(''); setFrom(''); setTo('');
        router.get(route('admin.billing.invoices'), {}, { preserveState: false, replace: true });
    };

    const hasFilters = !!(
        filters.search ||
        filters.from || filters.to ||
        (filters.status && filters.status !== 'all') ||
        (filters.type   && filters.type   !== 'all')
    );

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.invoices')} />
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
                            <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.invoices')}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('saas_billing.invoices_desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4 space-y-3">
                        {/* Row 1: search + dates + submit */}
                        <form
                            onSubmit={e => { e.preventDefault(); apply({ search, from, to }); }}
                            className="flex flex-wrap gap-3 items-center"
                        >
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    className="pl-9"
                                    placeholder={`${t('saas_billing.invoice_number')} / org…`}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">{t('common.from')}:</span>
                                <Input type="date" className="w-36" value={from} onChange={e => setFrom(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">{t('common.to')}:</span>
                                <Input type="date" className="w-36" value={to} onChange={e => setTo(e.target.value)} />
                            </div>
                            <Button type="submit" variant="secondary" size="sm" className="shrink-0">{t('common.search')}</Button>
                        </form>

                        {/* Row 2: status + type + clear */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <Select value={filters.status || 'all'} onValueChange={v => apply({ status: v })}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder={t('common.status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {s === 'all' ? t('common.all') : t(`saas_billing.invoice_status_${s}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filters.type || 'all'} onValueChange={v => apply({ type: v })}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder={t('saas_billing.invoice_type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {s === 'all' ? t('common.all') : t(`saas_billing.invoice_type_${s}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {hasFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                                    <X className="h-3.5 w-3.5" /> {t('common.clear_filters')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.invoice_number')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.organization')}</th>
                                        <th className="hidden md:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.invoice_type')}</th>
                                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.amount')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.invoice_status')}</th>
                                        <th className="hidden lg:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('common.date')}</th>
                                        <th className="px-4 py-3 text-right text-muted-foreground font-medium">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                <p>{t('common.no_results')}</p>
                                                {hasFilters && (
                                                    <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-1">
                                                        {t('common.clear_filters')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : invoices.data.map((inv) => (
                                        <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-foreground">{inv.invoice_number}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                        style={{ backgroundColor: inv.organization.primary_color || '#6366f1' }}
                                                    >
                                                        {inv.organization.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-foreground">{inv.organization.name}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                                                {t(`saas_billing.invoice_type_${inv.type}`)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                ${Number(inv.total).toFixed(2)}
                                                <span className="text-xs font-normal text-muted-foreground ml-1">{inv.currency}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[inv.status] ?? ''}`}>
                                                    {t(`saas_billing.invoice_status_${inv.status}`)}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground text-xs">
                                                {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link href={route('admin.billing.invoices.show', inv.id)}>
                                                    <Button variant="outline" size="sm" className="gap-1">
                                                        <Eye className="h-4 w-4" /> {t('common.view')}
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <AppPagination variant="server" meta={invoices} />
                    </CardContent>
                </Card>

            </div>
        </AuthenticatedLayout>
    );
}
