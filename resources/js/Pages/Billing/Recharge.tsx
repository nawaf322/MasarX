import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import {
    ArrowLeft, Wallet, CreditCard, Loader2, AlertCircle,
    CheckCircle, ShieldCheck, Lock, Zap,
} from 'lucide-react';

interface WalletData { balance: number; currency: string; }

const presets = [10, 25, 50, 100, 250, 500];

export default function Recharge({ wallet }: { wallet?: WalletData }) {
    const { t } = useTranslation();
    const { flash, errors: pageErrors } = usePage().props as any;
    const [method, setMethod] = useState<'stripe' | 'paypal'>('stripe');

    // Single form — amount kept in form.data to avoid stale closure bugs
    const form = useForm<{ amount: string }>({ amount: '' });
    const amountNum = parseFloat(form.data.amount) || 0;
    const valid = amountNum >= 1 && amountNum <= 10000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        form.post(
            method === 'stripe'
                ? route('tenant.billing.recharge.stripe')
                : route('tenant.billing.recharge.paypal'),
        );
    };

    const paymentError = pageErrors?.payment || form.errors.amount;
    const newBalance = (Number(wallet?.balance ?? 0) + amountNum).toFixed(2);

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.recharge')} />
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('tenant.billing.dashboard')}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.recharge')}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('saas_billing.recharge_desc')}</p>
                    </div>
                </div>

                {/* Flash messages */}
                {flash?.success && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
                        <CheckCircle className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{flash.success}</span>
                    </div>
                )}
                {flash?.warning && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{flash.warning}</span>
                    </div>
                )}
                {paymentError && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{paymentError}</span>
                    </div>
                )}

                {/* Two-column layout: form left, summary right */}
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* LEFT — inputs (3 cols) */}
                        <div className="lg:col-span-3 space-y-5">

                            {/* Current balance */}
                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                        <Wallet className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('saas_billing.balance')}</p>
                                        <p className="text-3xl font-bold text-foreground">
                                            ${Number(wallet?.balance ?? 0).toFixed(2)}
                                            <span className="text-sm font-normal text-muted-foreground ml-1.5">{wallet?.currency ?? 'USD'}</span>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Amount selection */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-primary" />
                                        {t('saas_billing.recharge_amount')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Preset grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {presets.map(p => (
                                            <button key={p} type="button"
                                                onClick={() => form.setData('amount', String(p))}
                                                className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                                                    form.data.amount === String(p)
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]'
                                                        : 'border-border text-foreground hover:border-primary/50 hover:bg-muted/50'
                                                }`}>
                                                ${p}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom amount */}
                                    <div className="space-y-1.5">
                                        <Label className="text-sm text-muted-foreground">Custom amount</Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                            <Input
                                                type="number" step="0.01" min="1" max="10000"
                                                className="pl-8 h-11 text-base font-semibold"
                                                placeholder="0.00"
                                                value={form.data.amount}
                                                onChange={e => form.setData('amount', e.target.value)}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t('saas_billing.min_recharge')}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Method */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-primary" />
                                        {t('saas_billing.select_payment_method')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Stripe */}
                                    <button type="button" onClick={() => setMethod('stripe')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                            method === 'stripe'
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/20'
                                        }`}>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${method === 'stripe' ? 'border-primary' : 'border-muted-foreground/40'}`}>
                                            {method === 'stripe' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
                                            <CreditCard className="h-5 w-5 text-[#635BFF]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-foreground text-sm">{t('saas_billing.pay_with_stripe')}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Visa · Mastercard · AMEX · Apple Pay</p>
                                        </div>
                                        {method === 'stripe' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">Selected</span>
                                        )}
                                    </button>

                                    {/* PayPal */}
                                    <button type="button" onClick={() => setMethod('paypal')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                            method === 'paypal'
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/20'
                                        }`}>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${method === 'paypal' ? 'border-primary' : 'border-muted-foreground/40'}`}>
                                            {method === 'paypal' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-[#003087]/10 flex items-center justify-center shrink-0">
                                            <span className="text-[#003087] font-bold text-base">PP</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-foreground text-sm">{t('saas_billing.pay_with_paypal')}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">PayPal · Venmo</p>
                                        </div>
                                        {method === 'paypal' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">Selected</span>
                                        )}
                                    </button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT — summary (2 cols) */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card className="sticky top-6">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Amount row */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('saas_billing.recharge_amount')}</span>
                                            <span className={`font-semibold ${valid ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {valid ? `$${amountNum.toFixed(2)}` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('saas_billing.payment_method')}</span>
                                            <span className="font-medium text-foreground capitalize">{method}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Fees</span>
                                            <span className="text-green-600 font-medium">$0.00</span>
                                        </div>
                                        <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                                            <span>{t('common.total')}</span>
                                            <span className={valid ? 'text-primary text-lg' : 'text-muted-foreground'}>
                                                {valid ? `$${amountNum.toFixed(2)} USD` : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* New balance preview */}
                                    {valid && (
                                        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">After recharge</p>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Current balance</span>
                                                <span className="font-medium">${Number(wallet?.balance ?? 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                                <span>+ Adding</span>
                                                <span className="font-medium">+${amountNum.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-1.5">
                                                <span>New balance</span>
                                                <span>${newBalance}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <Button type="submit" className="w-full h-11 gap-2 text-base font-semibold"
                                        disabled={!valid || form.processing}>
                                        {form.processing ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> {t('saas_billing.processing')}</>
                                        ) : (
                                            <><CreditCard className="h-4 w-4" /> {t('saas_billing.pay_now')} {valid ? `$${amountNum.toFixed(2)}` : ''}</>
                                        )}
                                    </Button>

                                    {/* Security note */}
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        <span>Secure · Encrypted · Instant</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
