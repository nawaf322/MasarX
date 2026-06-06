import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Card, CardContent } from '@/Components/UI/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Transaction { id: number; type: 'credit' | 'debit'; amount: number; balance_before: number; balance_after: number; description: string; payment_method?: string; created_at: string; }
interface Paginator { data: Transaction[]; current_page: number; last_page: number; total: number; from: number | null; to: number | null; }

export default function SaasTransactions({ transactions, filters }: { transactions: Paginator; filters: Record<string, string> }) {
    const { t } = useTranslation();
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    const apply = (overrides: Record<string, string>) =>
        router.get(route('tenant.billing.transactions'), { ...filters, ...overrides, page: '1' }, { preserveState: true, replace: true });

    const goPage = (p: number) =>
        router.get(route('tenant.billing.transactions'), { ...filters, page: String(p) }, { preserveState: true, replace: true });

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.transaction_history')} />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.transaction_history')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{transactions.total} {t('common.total')}</p>
                </div>

                <Card>
                    <CardContent className="p-4 flex flex-wrap gap-3">
                        <form onSubmit={e => { e.preventDefault(); apply({ from, to }); }} className="flex gap-2 flex-wrap flex-1">
                            <Input type="date" className="w-36" value={from} onChange={e => setFrom(e.target.value)} />
                            <Input type="date" className="w-36" value={to} onChange={e => setTo(e.target.value)} />
                            <Button type="submit" variant="secondary" size="sm">{t('billing.apply_filters')}</Button>
                            {(from || to || filters.type) && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); apply({ from: '', to: '', type: '' }); }}>
                                    {t('billing.clear_filters')}
                                </Button>
                            )}
                        </form>
                        <Select value={filters.type || 'all'} onValueChange={v => apply({ type: v })}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                <SelectItem value="credit">{t('saas_billing.credit')}</SelectItem>
                                <SelectItem value="debit">{t('saas_billing.debit')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.date')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.type')}</th>
                                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.amount')}</th>
                                        <th className="hidden md:table-cell text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.balance_after')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.description')}</th>
                                        <th className="hidden lg:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.payment_method')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.data.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t('common.no_results')}</td></tr>
                                    ) : transactions.data.map((tx) => (
                                        <tr key={tx.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`flex items-center gap-1 text-xs font-medium w-fit ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type === 'credit' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                                    {t(`saas_billing.${tx.type}`)}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-right text-foreground">${Number(tx.balance_after).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{tx.description}</td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-xs text-muted-foreground capitalize">{tx.payment_method ?? 'system'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {transactions.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{transactions.from}–{transactions.to} / {transactions.total}</span>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" disabled={transactions.current_page === 1} onClick={() => goPage(transactions.current_page - 1)}>‹</Button>
                            <Button variant="outline" size="sm" disabled={transactions.current_page === transactions.last_page} onClick={() => goPage(transactions.current_page + 1)}>›</Button>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
