import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/UI/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { ArrowLeft, PlusCircle, MinusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Organization { id: number; name: string; primary_color?: string; }
interface Wallet { id: number; balance: number; currency: string; last_recharged_at?: string; last_debited_at?: string; }
interface Transaction { id: number; type: 'credit' | 'debit'; amount: number; balance_before: number; balance_after: number; description: string; payment_method?: string; expires_at?: string; performed_by?: { name: string }; created_at: string; }
interface Paginator { data: Transaction[]; current_page: number; last_page: number; total: number; from: number | null; to: number | null; }
interface Subscription { id: number; status: string; plan: { name: string }; billing_cycle: string; expires_at: string; }

interface Props {
    organization: Organization;
    wallet: Wallet;
    transactions: Paginator;
    active_subscription?: Subscription;
}

export default function WalletShow({ organization, wallet, transactions, active_subscription }: Props) {
    const { t } = useTranslation();
    const [creditOpen, setCreditOpen] = useState(false);
    const [debitOpen, setDebitOpen] = useState(false);

    const creditForm = useForm({ amount: '', description: '', credit_type: 'manual', expires_at: '' });
    const debitForm = useForm({ amount: '', description: '' });

    const goPage = (p: number) =>
        router.get(route('admin.billing.wallets.show', organization.id), { page: String(p) }, { preserveState: true, replace: true });

    const submitCredit = (e: React.FormEvent) => {
        e.preventDefault();
        creditForm.post(route('admin.billing.wallets.credit', organization.id), {
            onSuccess: () => { setCreditOpen(false); creditForm.reset(); },
        });
    };

    const submitDebit = (e: React.FormEvent) => {
        e.preventDefault();
        debitForm.post(route('admin.billing.wallets.debit', organization.id), {
            onSuccess: () => { setDebitOpen(false); debitForm.reset(); },
        });
    };

    const statusBadge: Record<string, string> = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        grace_period: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        read_only: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };

    return (
        <AuthenticatedLayout>
            <Head title={`${t('saas_billing.wallets')} — ${organization.name}`} />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Link href={route('admin.billing.wallets')}>
                            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: organization.primary_color || '#6366f1' }}>
                                {organization.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{organization.name}</h1>
                                <p className="text-xs text-muted-foreground">{t('saas_billing.wallets')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setCreditOpen(true)}>
                            <PlusCircle className="h-4 w-4" /> {t('saas_billing.credit')}
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDebitOpen(true)}>
                            <MinusCircle className="h-4 w-4" /> {t('saas_billing.debit')}
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">{t('saas_billing.balance')}</p>
                            <p className="text-3xl font-bold text-foreground mt-1">${Number(wallet.balance).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{wallet.currency}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">{t('saas_billing.last_recharge')}</p>
                            <p className="text-lg font-semibold text-foreground mt-1">
                                {wallet.last_recharged_at ? new Date(wallet.last_recharged_at).toLocaleDateString() : '—'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">{t('saas_billing.subscriptions')}</p>
                            {active_subscription ? (
                                <div className="mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[active_subscription.status] ?? ''}`}>
                                        {t(`saas_billing.${active_subscription.status}`)}
                                    </span>
                                    <p className="text-sm font-semibold text-foreground mt-1">{active_subscription.plan.name}</p>
                                    <p className="text-xs text-muted-foreground">{t('saas_billing.expires_at')}: {new Date(active_subscription.expires_at).toLocaleDateString()}</p>
                                </div>
                            ) : <p className="text-sm text-muted-foreground mt-1">{t('saas_billing.no_subscription')}</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Transaction History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('saas_billing.transaction_history')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.date')}</th>
                                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.type')}</th>
                                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.amount')}</th>
                                        <th className="hidden md:table-cell text-right px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.balance_after')}</th>
                                        <th className="hidden lg:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('common.description')}</th>
                                        <th className="hidden xl:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.credit_expires_at')}</th>
                                        <th className="hidden xl:table-cell text-left px-4 py-3 text-muted-foreground font-medium">{t('saas_billing.performed_by')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.data.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">{t('common.no_results')}</td></tr>
                                    ) : transactions.data.map((tx) => (
                                        <tr key={tx.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`flex items-center gap-1 text-xs font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type === 'credit' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                                    {t(`saas_billing.${tx.type}`)}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-right text-foreground">${Number(tx.balance_after).toFixed(2)}</td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground max-w-xs truncate">{tx.description}</td>
                                            <td className="hidden xl:table-cell px-4 py-3 text-xs">
                                                {tx.expires_at ? (
                                                    <span className={new Date(tx.expires_at) < new Date() ? 'text-red-500 font-medium' : 'text-amber-600'}>
                                                        {new Date(tx.expires_at).toLocaleDateString()}
                                                    </span>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className="hidden xl:table-cell px-4 py-3 text-muted-foreground text-xs">{tx.performed_by?.name ?? 'System'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    <AppPagination variant="server" meta={transactions} />
                </Card>
            </div>

            {/* Credit Modal */}
            <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
                <DialogContent
                    onInteractOutside={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader><DialogTitle>{t('saas_billing.credit')} — {organization.name}</DialogTitle></DialogHeader>
                    <form onSubmit={submitCredit} className="space-y-4">
                        <div className="space-y-1">
                            <Label>{t('saas_billing.credit_type')} *</Label>
                            <Select value={creditForm.data.credit_type} onValueChange={v => creditForm.setData('credit_type', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">{t('saas_billing.credit_type_manual')}</SelectItem>
                                    <SelectItem value="promotional">{t('saas_billing.credit_type_promotional')}</SelectItem>
                                    <SelectItem value="demo">{t('saas_billing.credit_type_demo')}</SelectItem>
                                    <SelectItem value="goodwill">{t('saas_billing.credit_type_goodwill')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('saas_billing.amount')} *</Label>
                            <Input type="number" step="0.01" min="0.01" value={creditForm.data.amount} onChange={e => creditForm.setData('amount', e.target.value)} />
                            {creditForm.errors.amount && <p className="text-xs text-destructive">{creditForm.errors.amount}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('common.description')} *</Label>
                            <Input value={creditForm.data.description} onChange={e => creditForm.setData('description', e.target.value)} placeholder={t('saas_billing.credit_type_' + creditForm.data.credit_type)} />
                            {creditForm.errors.description && <p className="text-xs text-destructive">{creditForm.errors.description}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('saas_billing.credit_expires_at')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span></Label>
                            <Input
                                type="date"
                                value={creditForm.data.expires_at}
                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                onChange={e => creditForm.setData('expires_at', e.target.value)}
                            />
                            {creditForm.errors.expires_at && <p className="text-xs text-destructive">{creditForm.errors.expires_at}</p>}
                            <p className="text-xs text-muted-foreground">{t('saas_billing.credit_expires_hint')}</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreditOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={creditForm.processing}>{t('saas_billing.credit')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Debit Modal */}
            <Dialog open={debitOpen} onOpenChange={setDebitOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('saas_billing.debit')} — {organization.name}</DialogTitle></DialogHeader>
                    <form onSubmit={submitDebit} className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('saas_billing.confirm_debit')}</p>
                        <div className="space-y-1">
                            <Label>{t('saas_billing.amount')} *</Label>
                            <Input type="number" step="0.01" min="0.01" value={debitForm.data.amount} onChange={e => debitForm.setData('amount', e.target.value)} />
                            {debitForm.errors.amount && <p className="text-xs text-destructive">{debitForm.errors.amount}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('common.description')} *</Label>
                            <Input value={debitForm.data.description} onChange={e => debitForm.setData('description', e.target.value)} />
                            {debitForm.errors.description && <p className="text-xs text-destructive">{debitForm.errors.description}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDebitOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" variant="destructive" disabled={debitForm.processing}>{t('saas_billing.debit')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
