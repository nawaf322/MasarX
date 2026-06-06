import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Card, CardContent } from '@/Components/UI/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Eye } from 'lucide-react';

interface Invoice { id: number; invoice_number: string; type: string; status: string; total: number; currency: string; issued_at?: string; subscription?: { plan: { name: string } }; }
interface Paginator { data: Invoice[]; current_page: number; last_page: number; total: number; from: number | null; to: number | null; }

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-500',
    refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function SaasInvoicesIndex({ invoices, filters }: { invoices: Paginator; filters: Record<string, string> }) {
    const { t } = useTranslation();

    const apply = (overrides: Record<string, string>) =>
        router.get(route('tenant.billing.invoices'), { ...filters, ...overrides, page: '1' }, { preserveState: true, replace: true });

    const goPage = (p: number) =>
        router.get(route('tenant.billing.invoices'), { ...filters, page: String(p) }, { preserveState: true, replace: true });

    const statuses = ['all', 'draft', 'issued', 'paid', 'overdue', 'cancelled'];

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.invoices')} />
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.invoices')}</h1>
                        <p className="text-sm text-muted-foreground mt-1">{invoices.total} {t('common.total')}</p>
                    </div>
                    <Select value={filters.status || 'all'} onValueChange={v => apply({ status: v })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {statuses.map(s => <SelectItem key={s} value={s}>{s === 'all' ? t('common.all') : t(`saas_billing.invoice_status_${s}`)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.invoice_number')}</th>
                                        <th className="hidden md:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.invoice_type')}</th>
                                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.amount')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.invoice_status')}</th>
                                        <th className="hidden lg:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('common.date')}</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.data.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t('common.no_results')}</td></tr>
                                    ) : invoices.data.map((inv) => (
                                        <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-foreground">
                                                <div>{inv.invoice_number}</div>
                                                {inv.subscription && <div className="text-muted-foreground">{inv.subscription.plan.name}</div>}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-muted-foreground capitalize">
                                                {t(`saas_billing.invoice_type_${inv.type}`)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                ${Number(inv.total).toFixed(2)} <span className="text-xs text-muted-foreground">{inv.currency}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[inv.status] ?? ''}`}>
                                                    {t(`saas_billing.invoice_status_${inv.status}`)}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground text-xs">
                                                {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={route('tenant.billing.invoices.show', inv.id)}>
                                                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {invoices.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{invoices.from}–{invoices.to} / {invoices.total}</span>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" disabled={invoices.current_page === 1} onClick={() => goPage(invoices.current_page - 1)}>‹</Button>
                            <Button variant="outline" size="sm" disabled={invoices.current_page === invoices.last_page} onClick={() => goPage(invoices.current_page + 1)}>›</Button>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
