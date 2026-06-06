import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Textarea } from "@/Components/UI/textarea";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import ProInvoiceTemplate from '@/Components/Invoices/ProInvoiceTemplate';
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/Components/UI/dialog";
import { Label } from "@/Components/UI/label";
import { Switch } from "@/Components/UI/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { TooltipProvider } from "@/Components/UI/tooltip";
import { AlertCircle, BadgeCheck, CreditCard, FileText, Maximize2, Palette, Settings2 } from "lucide-react";

// ─── Fallback currencies (used if currencies prop is not provided) ────────────
const FALLBACK_CURRENCIES = [
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'COP', label: 'COP — Colombian Peso' },
    { value: 'MXN', label: 'MXN — Mexican Peso' },
    { value: 'BRL', label: 'BRL — Brazilian Real' },
    { value: 'ARS', label: 'ARS — Argentine Peso' },
    { value: 'CAD', label: 'CAD — Canadian Dollar' },
    { value: 'AED', label: 'AED — UAE Dirham' },
];

// ─── Sample data for the invoice preview ─────────────────────────────────────
const MOCK_SHIPMENT = {
    id: 10024,
    tracking_number: 'DPX-DEMO-882',
    created_at: new Date().toISOString(),
    payment_status: 'paid',
    service_type: 'Express International',
    origin_country_code: 'USA',
    destination_country_code: 'GBR',
    subtotal: 250.00,
    tax: 0.00,
    total: 250.00,
    currency: 'USD',
    packages_count: 3,
    chargeable_weight: 12.5,
    sender_details: { name: 'Acme Corp Generic', address: '123 Business Park', city: 'New York', country: 'US', phone: '+1 555-0199' },
    package_details: [{ weight: 12.5, length: 40, width: 30, height: 20, declared_value: 1500, content: 'Electronics Components' }],
    external_order_id: 'PO-99283',
};


// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-foreground leading-tight">{title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
            </div>
            <div className="px-5 sm:px-6 py-5">{children}</div>
        </section>
    );
}

export default function Billing({
    settings,
    effective_tax,
    invoice_sequence,
    currencies = [],
}: {
    settings: any;
    effective_tax?: { tax_name: string; tax_rate: number };
    invoice_sequence: any;
    currencies?: { code: string; name: string; symbol: string }[];
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [activePaymentModal, setActivePaymentModal] = useState<'stripe' | 'paypal' | null>(null);
    const [previewExpanded, setPreviewExpanded] = useState(false);
    const [gatewayUnsaved, setGatewayUnsaved] = useState(false);

    const currencyOptions = currencies.length > 0
        ? currencies.map((c) => ({ value: c.code, label: `${c.code} — ${c.name || c.code}${c.symbol ? ` (${c.symbol})` : ''}` }))
        : FALLBACK_CURRENCIES;

    const [configData, setConfigData] = useState<Record<string, any>>({
        currency: settings?.currency || 'USD',
        invoice_terms: settings?.invoice_terms || 'Payment is due upon receipt.',
        footer_notes: settings?.footer_notes || 'Thank you for your business.',
        invoice_theme: settings?.invoice_theme || 'fedex',
        stripe_enabled: settings?.stripe_enabled ?? false,
        stripe_test_mode: settings?.stripe_test_mode ?? true,
        stripe_key: settings?.stripe_key || '',
        stripe_secret: settings?.stripe_secret || '',
        paypal_enabled: settings?.paypal_enabled ?? false,
        paypal_test_mode: settings?.paypal_test_mode ?? true,
        paypal_client_id: settings?.paypal_client_id || '',
        paypal_secret: settings?.paypal_secret || '',
        signature_file: null as File | null,
    });
    const [configProcessing, setConfigProcessing] = useState(false);
    const isDirtyRef = useRef(false);

    const configForm = {
        data: configData,
        setData: (key: string, value: any) => {
            isDirtyRef.current = true;
            setConfigData(prev => ({ ...prev, [key]: value }));
        },
        processing: configProcessing,
        isDirty: isDirtyRef.current,
    };

    const effectiveTaxRate = effective_tax?.tax_rate ?? settings?.tax_rate ?? 0;
    const mockWithTax = {
        ...MOCK_SHIPMENT,
        currency: configForm.data.currency || 'USD',
        tax: MOCK_SHIPMENT.subtotal * (parseFloat(String(effectiveTaxRate)) / 100),
        total: MOCK_SHIPMENT.subtotal + MOCK_SHIPMENT.subtotal * (parseFloat(String(effectiveTaxRate)) / 100),
    };

    const previewSettings = {
        ...settings,
        ...configForm.data,
        tax_name: effective_tax?.tax_name ?? settings?.tax_name ?? 'Tax',
        tax_rate: effectiveTaxRate,
        sequence_prefix: invoice_sequence?.prefix ?? 'INV',
        sequence_padding: invoice_sequence?.padding ?? 6,
        signature_url: configForm.data.signature_file
            ? URL.createObjectURL(configForm.data.signature_file)
            : (settings?.signature_url || null),
    };

    const submitConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfigProcessing(true);
        try {
            const fd = new FormData();
            Object.entries(configData).forEach(([key, value]) => {
                if (key === 'signature_file') {
                    if (value instanceof File) fd.append(key, value);
                } else if (typeof value === 'boolean') {
                    fd.append(key, value ? '1' : '0');
                } else if (value !== null && value !== undefined) {
                    fd.append(key, String(value));
                }
            });
            const { data: res } = await axios.post(route('settings.billing.update'), fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert.success(
                res?.message || t('settings.billing.settings_saved'),
                t('settings.billing.billing_updated')
            );
            configForm.setData('signature_file', null);
            isDirtyRef.current = false;
            setGatewayUnsaved(false);
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                alert.error(t('settings.billing.save_failed'), Object.values(errs).flat().join(' '));
            } else {
                alert.error(
                    t('settings.billing.save_failed'),
                    err?.response?.data?.error || t('settings.billing.check_inputs')
                );
            }
        } finally {
            setConfigProcessing(false);
        }
    };

    const closePaymentModal = () => {
        setActivePaymentModal(null);
        setGatewayUnsaved(true);
    };

    return (
        <SettingsLayout title={t('settings.menu.billing')}>
            <TooltipProvider>
            <form onSubmit={submitConfig}>
            <div className="max-w-5xl mx-auto space-y-5 pb-10">

                {/* ─── Unsaved gateway changes banner ──────────────────── */}
                {gatewayUnsaved && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                            {t('settings.billing.unsaved_gateway')}
                            {' '}
                            <button type="submit" className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100">
                                {t('settings.billing.save_now')}
                            </button>
                        </span>
                    </div>
                )}

                {/* ─── 1. Currency & Invoicing ──────────────────────────── */}
                <SectionCard icon={Settings2} title={t('settings.billing.currency_invoicing')} description={t('settings.billing.currency_invoicing_desc')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="currency" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.billing.default_currency')} <span className="text-destructive">*</span>
                            </Label>
                            <Select value={configForm.data.currency} onValueChange={(v) => configForm.setData('currency', v)}>
                                <SelectTrigger id="currency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencyOptions.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.billing.currency_help')}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.billing.tax_info')}
                            </Label>
                            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground flex items-center gap-2">
                                <span className="font-semibold">{effective_tax?.tax_name ?? 'Tax'}</span>
                                <span className="text-muted-foreground">·</span>
                                <span>{effective_tax?.tax_rate ?? 0}%</span>
                                <a href={route('settings.shipping-config')} className="ml-auto text-xs text-primary hover:underline">
                                    {t('settings.billing.edit_tax')}
                                </a>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.billing.tax_help')}
                            </p>
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label htmlFor="invoice_terms" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.billing.invoice_terms')}
                            </Label>
                            <Textarea
                                id="invoice_terms"
                                rows={3}
                                value={configForm.data.invoice_terms}
                                onChange={(e) => configForm.setData('invoice_terms', e.target.value)}
                                placeholder={t('settings.billing.invoice_terms_placeholder')}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('settings.billing.invoice_terms_help')}
                            </p>
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label htmlFor="footer_notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.billing.footer_notes')}
                            </Label>
                            <Textarea
                                id="footer_notes"
                                rows={2}
                                value={configForm.data.footer_notes}
                                onChange={(e) => configForm.setData('footer_notes', e.target.value)}
                                placeholder={t('settings.billing.footer_notes_placeholder')}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('settings.billing.footer_notes_help')}
                            </p>
                        </div>
                    </div>
                </SectionCard>

                {/* ─── 2. Invoice Design ────────────────────────────────── */}
                <SectionCard icon={Palette} title={t('settings.billing.invoice_design')} description={t('settings.billing.invoice_design_desc')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {([
                            { id: 'fedex', label: t('settings.billing.modern_purple'), sub: t('settings.billing.standard_professional'), bg: 'bg-[#4f46e5]' },
                            { id: 'dhl',   label: t('settings.billing.express_red'),   sub: t('settings.billing.high_urgency'),           bg: 'bg-[#dc2626]' },
                        ] as const).map((theme) => {
                            const selected = configForm.data.invoice_theme === theme.id;
                            return (
                                <div
                                    key={theme.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => configForm.setData('invoice_theme', theme.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && configForm.setData('invoice_theme', theme.id)}
                                    className={`relative w-full max-w-[300px] h-[300px] rounded-xl border-2 flex flex-col overflow-hidden transition-all duration-200 ${
                                        selected
                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                                            : 'border-border hover:border-border/80 bg-card hover:shadow-sm cursor-pointer'
                                    }`}
                                >
                                    <div className={`shrink-0 h-10 ${theme.bg} flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider`}>
                                        {theme.label}
                                    </div>
                                    {selected ? (
                                        <>
                                            <div className="flex-1 min-h-[200px] w-full flex items-start justify-center bg-muted/30 p-2 overflow-hidden">
                                                <div className="relative w-[260px] h-[200px] overflow-hidden rounded shadow bg-white">
                                                    <div className="absolute inset-0 flex justify-center scale-[0.33] origin-[center_top]">
                                                        <div className="w-[210mm] min-h-[297mm] shrink-0 pointer-events-none select-none bg-white">
                                                            <ProInvoiceTemplate
                                                                shipment={mockWithTax}
                                                                settings={previewSettings}
                                                                theme={theme.id as 'fedex' | 'dhl'}
                                                                editable={false}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 p-2 border-t border-border bg-card">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={(e) => { e.stopPropagation(); setPreviewExpanded(true); }}
                                                >
                                                    <Maximize2 className="h-4 w-4 mr-1.5 inline" />
                                                    {t('settings.billing.expand')}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center p-4 text-center">
                                            <span className="text-sm text-muted-foreground">{theme.sub}</span>
                                        </div>
                                    )}
                                    {selected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* ─── 3. Payment Gateways ─────────────────────────────── */}
                <SectionCard icon={CreditCard} title={t('settings.billing.payment_gateways')} description={t('settings.billing.payment_gateways_desc')}>
                    <div className="space-y-4">
                        {/* Stripe */}
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all duration-200 ${configForm.data.stripe_enabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="shrink-0 w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm p-2">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="max-h-7 w-auto object-contain" alt="Stripe" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                        {t('settings.billing.credit_cards_stripe')}
                                        {configForm.data.stripe_enabled && <span className="inline-flex h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-200" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {configForm.data.stripe_enabled
                                            ? (configForm.data.stripe_test_mode
                                                ? t('settings.billing.stripe_test_active')
                                                : t('settings.billing.stripe_live_active'))
                                            : t('settings.billing.stripe_desc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Switch
                                    checked={configForm.data.stripe_enabled}
                                    onCheckedChange={(c) => configForm.setData('stripe_enabled', c)}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => setActivePaymentModal('stripe')}>
                                    {t('settings.billing.configure')}
                                </Button>
                            </div>
                        </div>

                        {/* PayPal */}
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all duration-200 ${configForm.data.paypal_enabled ? 'border-blue-300/50 bg-blue-50/20 dark:border-blue-700/30 dark:bg-blue-950/20' : 'border-border bg-muted/30'}`}>
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="shrink-0 w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm p-2">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="max-h-7 w-auto object-contain" alt="PayPal" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                        {t('settings.billing.paypal_pro')}
                                        {configForm.data.paypal_enabled && <span className="inline-flex h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-200" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {configForm.data.paypal_enabled
                                            ? (configForm.data.paypal_test_mode
                                                ? t('settings.billing.paypal_sandbox_active')
                                                : t('settings.billing.paypal_live_active'))
                                            : t('settings.billing.paypal_desc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Switch
                                    checked={configForm.data.paypal_enabled}
                                    onCheckedChange={(c) => configForm.setData('paypal_enabled', c)}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => setActivePaymentModal('paypal')}>
                                    {t('settings.billing.configure')}
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {t('settings.billing.gateway_note')}
                        </p>
                    </div>
                </SectionCard>

                {/* ─── 4. Digital Signature ────────────────────────────── */}
                <SectionCard icon={FileText} title={t('settings.billing.tax_legal')} description={t('settings.billing.tax_legal_desc')}>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            {(settings?.signature_url || configForm.data.signature_file) && (
                                <div className="shrink-0 w-28 h-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                                    {configForm.data.signature_file ? (
                                        <img src={URL.createObjectURL(configForm.data.signature_file)} alt={t('settings.billing.new_signature')} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <img src={settings?.signature_url} alt={t('settings.billing.saved_signature')} className="max-w-full max-h-full object-contain" />
                                    )}
                                </div>
                            )}
                            <label className="flex flex-col items-center gap-2 cursor-pointer text-sm text-muted-foreground px-6 py-5 border-2 border-dashed border-border rounded-xl hover:bg-muted/30 transition-colors flex-1 min-w-0">
                                <svg className="h-8 w-8 text-muted-foreground shrink-0" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <span className="font-medium text-primary">{t('settings.billing.upload_signature')}</span>
                                <span className="text-xs text-muted-foreground">{t('settings.billing.signature_formats')}</span>
                                <input type="file" name="signature_file" className="sr-only" accept="image/png,image/jpeg" onChange={e => e.target.files && configForm.setData('signature_file', e.target.files[0])} />
                            </label>
                        </div>
                        {configForm.data.signature_file && (
                            <p className="text-xs text-primary">{t('settings.billing.new_signature_ready')}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{t('settings.billing.signature_save_hint')}</p>
                    </div>
                </SectionCard>

                {/* ─── Sticky save bar ─────────────────────────────────── */}
                <div className="sticky bottom-4 z-40">
                    <div className="bg-card border border-border rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {configForm.isDirty || gatewayUnsaved ? (
                                <>
                                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                                    {t('settings.billing.unsaved_changes')}
                                </>
                            ) : (
                                <>
                                    <BadgeCheck className="h-4 w-4 text-green-500" />
                                    {t('settings.billing.all_saved')}
                                </>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={configForm.processing}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {configForm.processing
                                ? t('settings.billing.saving')
                                : t('settings.billing.save_configuration')}
                        </Button>
                    </div>
                </div>

            </div>
            </form>

            {/* ─── Modal: Stripe credentials ───────────────────────────── */}
            <Dialog open={activePaymentModal === 'stripe'} onOpenChange={(o) => !o && closePaymentModal()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.billing.configure_stripe')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.billing.configure_stripe_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                            <Label>{t('settings.billing.enable_stripe')}</Label>
                            <Switch checked={configForm.data.stripe_enabled} onCheckedChange={(c) => configForm.setData('stripe_enabled', c)} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                            <div>
                                <Label>{t('settings.billing.test_mode')}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">{t('settings.billing.test_mode_help')}</p>
                            </div>
                            <Switch checked={configForm.data.stripe_test_mode} onCheckedChange={(c) => configForm.setData('stripe_test_mode', c)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('settings.billing.publishable_key')} <span className="text-muted-foreground text-xs">(pk_...)</span></Label>
                            <Input value={configForm.data.stripe_key} onChange={e => configForm.setData('stripe_key', e.target.value)} className="font-mono text-xs" placeholder="pk_test_..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('settings.billing.secret_key')} <span className="text-muted-foreground text-xs">(sk_...)</span></Label>
                            <Input type="password" value={configForm.data.stripe_secret} onChange={e => configForm.setData('stripe_secret', e.target.value)} className="font-mono text-xs" placeholder="sk_test_..." />
                        </div>
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <p className="font-semibold">{t('settings.billing.how_stripe_works')}</p>
                            <p>{t('settings.billing.stripe_info')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={closePaymentModal}>{t('settings.billing.done')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Modal: PayPal credentials ───────────────────────────── */}
            <Dialog open={activePaymentModal === 'paypal'} onOpenChange={(o) => !o && closePaymentModal()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.billing.configure_paypal')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.billing.configure_paypal_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                            <Label>{t('settings.billing.enable_paypal')}</Label>
                            <Switch checked={configForm.data.paypal_enabled} onCheckedChange={(c) => configForm.setData('paypal_enabled', c)} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                            <div>
                                <Label>{t('settings.billing.sandbox_mode')}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">{t('settings.billing.sandbox_mode_help')}</p>
                            </div>
                            <Switch checked={configForm.data.paypal_test_mode} onCheckedChange={(c) => configForm.setData('paypal_test_mode', c)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('settings.billing.client_id')}</Label>
                            <Input value={configForm.data.paypal_client_id} onChange={e => configForm.setData('paypal_client_id', e.target.value)} className="font-mono text-xs" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('settings.billing.secret')}</Label>
                            <Input type="password" value={configForm.data.paypal_secret} onChange={e => configForm.setData('paypal_secret', e.target.value)} className="font-mono text-xs" />
                        </div>
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <p className="font-semibold">{t('settings.billing.how_paypal_works')}</p>
                            <p>{t('settings.billing.paypal_info')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={closePaymentModal}>{t('settings.billing.done')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Modal: expanded invoice preview ─────────────────────── */}
            <Dialog open={previewExpanded} onOpenChange={setPreviewExpanded}>
                <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-auto p-2 sm:p-4">
                    <DialogHeader>
                        <DialogTitle>{t('settings.billing.preview_design')}</DialogTitle>
                        <DialogDescription>{t('settings.billing.preview_design_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center bg-muted/40 rounded-lg p-4 overflow-auto">
                        <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg shrink-0">
                            <ProInvoiceTemplate
                                shipment={mockWithTax}
                                settings={previewSettings}
                                theme={configForm.data.invoice_theme as 'fedex' | 'dhl'}
                                editable
                                editableTerms={configForm.data.invoice_terms}
                                editableFooterNotes={configForm.data.footer_notes}
                                onTermsChange={(v) => configForm.setData('invoice_terms', v)}
                                onFooterNotesChange={(v) => configForm.setData('footer_notes', v)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => setPreviewExpanded(false)}>{t('settings.billing.close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            </TooltipProvider>
        </SettingsLayout>
    );
}
