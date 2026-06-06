import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import { ArrowLeft } from 'lucide-react';

interface Invoice {
    id: number; invoice_number: string; type: string; status: string;
    subtotal: number; tax_rate: number; tax_amount: number; total: number; currency: string;
    description: string; notes?: string; issued_at?: string; paid_at?: string; due_at?: string;
    billing_period_start?: string; billing_period_end?: string;
    subscription?: { plan: { name: string }; billing_cycle: string };
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', issued: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800', overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500', refunded: 'bg-purple-100 text-purple-800',
};

export default function SaasInvoiceShow({ invoice }: { invoice: Invoice }) {
    const { t } = useTranslation();

    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="flex justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground text-right">{value}</span>
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title={invoice.invoice_number} />
            <div className="space-y-6 max-w-xl">
                <div className="flex items-center gap-3">
                    <Link href={route('tenant.billing.invoices')}>
                        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-foreground font-mono">{invoice.invoice_number}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[invoice.status] ?? ''}`}>
                            {t(`saas_billing.invoice_status_${invoice.status}`)}
                        </span>
                    </div>
                </div>

                {invoice.subscription && (
                    <Card>
                        <CardHeader><CardTitle className="text-sm">{t('saas_billing.subscriptions')}</CardTitle></CardHeader>
                        <CardContent className="pt-0">
                            <p className="font-semibold text-foreground">{invoice.subscription.plan.name}</p>
                            <p className="text-sm text-muted-foreground">{t(`saas_billing.${invoice.subscription.billing_cycle}`)}</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader><CardTitle className="text-sm">{t('common.details')}</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                        <Row label={t('saas_billing.invoice_type')} value={t(`saas_billing.invoice_type_${invoice.type}`)} />
                        <Row label={t('common.description')} value={invoice.description} />
                        {invoice.billing_period_start && (
                            <Row label={t('saas_billing.billing_period')} value={`${invoice.billing_period_start} → ${invoice.billing_period_end}`} />
                        )}
                        <Row label={t('common.date')} value={invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—'} />
                        {invoice.due_at && <Row label={t('saas_billing.due_at')} value={new Date(invoice.due_at).toLocaleDateString()} />}
                        {invoice.paid_at && <Row label={t('saas_billing.paid_at')} value={new Date(invoice.paid_at).toLocaleDateString()} />}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm">{t('common.totals')}</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                        <Row label={t('common.subtotal')} value={`$${Number(invoice.subtotal).toFixed(2)} ${invoice.currency}`} />
                        <Row label={`Tax (${Number(invoice.tax_rate).toFixed(1)}%)`} value={`$${Number(invoice.tax_amount).toFixed(2)}`} />
                        <div className="flex justify-between py-3 font-bold text-base text-foreground">
                            <span>{t('common.total')}</span>
                            <span>${Number(invoice.total).toFixed(2)} {invoice.currency}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
