import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { Input } from '@/Components/UI/input';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { SettingsField } from './_components/SettingsField';
import { SettingsSaveBar } from './_components/SettingsSaveBar';
import { Button } from '@/Components/UI/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Hash, Zap } from 'lucide-react';

interface ShippingConfigProps {
    settings: {
        tax_name: string | null;
        tax_rate: number | null;
        weight_unit: string | null;
        dimension_unit: string | null;
        volumetric_divisor: number | null;
        base_surcharge: number | null;
        fuel_surcharge_percent: number | null;
        insurance_percent: number | null;
        default_base_price: number | null;
        default_price_per_kg: number | null;
    };
    invoice_sequence: { prefix: string; suffix: string; padding: number; next_number: number; reset_rule: string };
    tracking_sequence: { prefix: string; suffix: string; padding: number; next_number: number; reset_rule: string };
}

function buildPreview(prefix: string, suffix: string, padding: number, nextNumber: number): string {
    const num = String(nextNumber).padStart(padding, '0');
    return `${prefix}${num}${suffix}`;
}

function SequencePreview({ prefix, suffix, padding, nextNumber, label }: {
    prefix: string; suffix: string; padding: number; nextNumber: number; label: string;
}) {
    const preview = buildPreview(prefix, suffix, Math.max(1, padding), Math.max(1, nextNumber));
    return (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{label}</p>
                <code className="text-sm font-mono font-semibold text-foreground">{preview}</code>
            </div>
        </div>
    );
}

export default function ShippingConfig({ settings, invoice_sequence, tracking_sequence }: ShippingConfigProps) {
    const { t } = useTranslation();
    const alert = useSweetAlert();

    const [configData, setConfigData] = useState({
        tax_name: settings?.tax_name ?? 'Tax',
        tax_rate: settings?.tax_rate ?? 0,
        weight_unit: settings?.weight_unit ?? 'kg',
        dimension_unit: settings?.dimension_unit ?? 'cm',
        volumetric_divisor: settings?.volumetric_divisor ?? 5000,
        base_surcharge: settings?.base_surcharge ?? 0,
        fuel_surcharge_percent: settings?.fuel_surcharge_percent ?? 0,
        insurance_percent: settings?.insurance_percent ?? 0,
        default_base_price: settings?.default_base_price ?? 5.00,
        default_price_per_kg: settings?.default_price_per_kg ?? 2.00,
    });
    const [configProcessing, setConfigProcessing] = useState(false);

    const [invoiceData, setInvoiceData] = useState({
        type: 'invoice',
        prefix: invoice_sequence?.prefix ?? 'INV',
        suffix: invoice_sequence?.suffix ?? '',
        padding: invoice_sequence?.padding ?? 6,
        next_number: invoice_sequence?.next_number ?? 1,
        reset_rule: invoice_sequence?.reset_rule ?? 'never',
    });
    const [invoiceProcessing, setInvoiceProcessing] = useState(false);

    const [trackingData, setTrackingData] = useState({
        type: 'tracking',
        prefix: tracking_sequence?.prefix ?? 'TRK',
        suffix: tracking_sequence?.suffix ?? '',
        padding: tracking_sequence?.padding ?? 8,
        next_number: tracking_sequence?.next_number ?? 1,
        reset_rule: tracking_sequence?.reset_rule ?? 'never',
    });
    const [trackingProcessing, setTrackingProcessing] = useState(false);

    // Proxy objects to keep template refs unchanged
    const configForm = {
        data: configData,
        setData: (key: string, val: any) => setConfigData(p => ({ ...p, [key]: val })),
        processing: configProcessing,
        isDirty: true,
    };
    const invoiceForm = {
        data: invoiceData,
        setData: (key: string, val: any) => setInvoiceData(p => ({ ...p, [key]: val })),
        processing: invoiceProcessing,
    };
    const trackingForm = {
        data: trackingData,
        setData: (key: string, val: any) => setTrackingData(p => ({ ...p, [key]: val })),
        processing: trackingProcessing,
    };

    const submitConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfigProcessing(true);
        try {
            await axios.post(route('settings.shipping-config.update'), configData);
            alert.success(t('settings.shipping_config.saved'));
        } catch (err: any) {
            alert.error(t('settings.shipping_config.validation_failed'));
        } finally {
            setConfigProcessing(false);
        }
    };

    const submitInvoiceSequence = async (e: React.FormEvent) => {
        e.preventDefault();
        setInvoiceProcessing(true);
        try {
            await axios.post(route('settings.shipping-config.sequence.update'), invoiceData);
            alert.success(t('settings.shipping_config.sequence_saved'));
        } catch (err: any) {
            alert.error(t('settings.shipping_config.sequence_failed'));
        } finally {
            setInvoiceProcessing(false);
        }
    };

    const submitTrackingSequence = async (e: React.FormEvent) => {
        e.preventDefault();
        setTrackingProcessing(true);
        try {
            await axios.post(route('settings.shipping-config.sequence.update'), trackingData);
            alert.success(t('settings.shipping_config.sequence_saved'));
        } catch (err: any) {
            alert.error(t('settings.shipping_config.sequence_failed'));
        } finally {
            setTrackingProcessing(false);
        }
    };

    const resetRules = [
        { value: 'never',   label: t('settings.shipping_config.reset_never') },
        { value: 'daily',   label: t('settings.shipping_config.reset_daily') },
        { value: 'monthly', label: t('settings.shipping_config.reset_monthly') },
        { value: 'yearly',  label: t('settings.shipping_config.reset_yearly') },
    ];

    return (
        <SettingsLayout title={t('settings.shipping_config.title')}>
            <SettingsShell
                title={t('settings.shipping_config.title')}
                description={t('settings.shipping_config.desc')}
            >
                {/* How it works banner */}
                <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-5 py-4 space-y-2">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold text-sm">
                        <Zap className="h-4 w-4" />
                        {t('settings.shipping_config.how_it_works_title')}
                    </div>
                    <ul className="list-disc list-inside text-xs text-blue-900 dark:text-blue-200 space-y-1 leading-relaxed">
                        <li>{t('settings.shipping_config.how_it_works_tax')}</li>
                        <li>{t('settings.shipping_config.how_it_works_units')}</li>
                        <li>{t('settings.shipping_config.how_it_works_divisor')}</li>
                        <li>{t('settings.shipping_config.how_it_works_surcharges')}</li>
                        <li>{t('settings.shipping_config.how_it_works_sequences')}</li>
                    </ul>
                </div>

                {/* Main config form */}
                <form onSubmit={submitConfig} className="space-y-8">

                    <SettingsSection
                        title={t('settings.shipping_config.tax_title_full')}
                        description={t('settings.shipping_config.tax_desc_full')}
                    >
                        <SettingsField
                            label={t('settings.shipping_config.tax_name')}
                            id="tax_name"
                            help={t('settings.shipping_config.tax_name_help')}
                        >
                            <Input
                                id="tax_name"
                                value={configForm.data.tax_name}
                                onChange={e => configForm.setData('tax_name', e.target.value)}
                                placeholder="Tax"
                            />
                        </SettingsField>
                        <SettingsField
                            label={t('settings.shipping_config.tax_rate')}
                            id="tax_rate"
                            help={t('settings.shipping_config.tax_rate_help')}
                        >
                            <Input
                                id="tax_rate"
                                type="number"
                                step="0.01"
                                min={0}
                                max={100}
                                value={configForm.data.tax_rate}
                                onChange={e => configForm.setData('tax_rate', parseFloat(e.target.value) || 0)}
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.shipping_config.units_title_full')}
                        description={t('settings.shipping_config.units_desc_full')}
                    >
                        <SettingsField label={t('settings.shipping_config.weight_unit')} id="weight_unit">
                            <Select
                                value={configForm.data.weight_unit}
                                onValueChange={v => configForm.setData('weight_unit', v)}
                            >
                                <SelectTrigger id="weight_unit">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kg">{t('settings.shipping_config.weight_kg')}</SelectItem>
                                    <SelectItem value="lb">{t('settings.shipping_config.weight_lb')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                        <SettingsField label={t('settings.shipping_config.dimension_unit')} id="dimension_unit">
                            <Select
                                value={configForm.data.dimension_unit}
                                onValueChange={v => configForm.setData('dimension_unit', v)}
                            >
                                <SelectTrigger id="dimension_unit">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cm">{t('settings.shipping_config.dim_cm')}</SelectItem>
                                    <SelectItem value="in">{t('settings.shipping_config.dim_in')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.shipping_config.volumetric_title_full')}
                        description={t('settings.shipping_config.volumetric_desc_full')}
                    >
                        <SettingsField
                            label={t('settings.shipping_config.volumetric_divisor')}
                            id="volumetric_divisor"
                            help={t('settings.shipping_config.volumetric_divisor_help')}
                        >
                            <Input
                                id="volumetric_divisor"
                                type="number"
                                min={1}
                                value={configForm.data.volumetric_divisor}
                                onChange={e => configForm.setData('volumetric_divisor', parseInt(e.target.value) || 5000)}
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.shipping_config.fallback_title')}
                        description={t('settings.shipping_config.fallback_desc')}
                    >
                        <SettingsField
                            label={t('settings.shipping_config.default_base_price')}
                            id="default_base_price"
                            help={t('settings.shipping_config.base_price_help')}
                        >
                            <Input
                                id="default_base_price"
                                type="number"
                                step="0.01"
                                min={0}
                                value={configForm.data.default_base_price}
                                onChange={e => configForm.setData('default_base_price', parseFloat(e.target.value) || 0)}
                            />
                        </SettingsField>
                        <SettingsField
                            label={t('settings.shipping_config.default_price_per_kg')}
                            id="default_price_per_kg"
                            help={t('settings.shipping_config.price_per_kg_help')}
                        >
                            <Input
                                id="default_price_per_kg"
                                type="number"
                                step="0.01"
                                min={0}
                                value={configForm.data.default_price_per_kg}
                                onChange={e => configForm.setData('default_price_per_kg', parseFloat(e.target.value) || 0)}
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.shipping_config.surcharges_title_full')}
                        description={t('settings.shipping_config.surcharges_desc_full')}
                    >
                        <SettingsField
                            label={t('settings.shipping_config.base_surcharge')}
                            id="base_surcharge"
                            help={t('settings.shipping_config.base_surcharge_help')}
                        >
                            <Input
                                id="base_surcharge"
                                type="number"
                                step="0.01"
                                min={0}
                                value={configForm.data.base_surcharge}
                                onChange={e => configForm.setData('base_surcharge', parseFloat(e.target.value) || 0)}
                            />
                        </SettingsField>
                        <SettingsField
                            label={t('settings.shipping_config.fuel_surcharge')}
                            id="fuel_surcharge_percent"
                            help={t('settings.shipping_config.fuel_surcharge_help')}
                        >
                            <Input
                                id="fuel_surcharge_percent"
                                type="number"
                                step="0.01"
                                min={0}
                                value={configForm.data.fuel_surcharge_percent}
                                onChange={e => configForm.setData('fuel_surcharge_percent', parseFloat(e.target.value) || 0)}
                            />
                        </SettingsField>
                        <SettingsField
                            label={t('settings.shipping_config.insurance_percent')}
                            id="insurance_percent"
                            help={t('settings.shipping_config.insurance_help')}
                        >
                            <Input
                                id="insurance_percent"
                                type="number"
                                step="0.01"
                                min={0}
                                value={configForm.data.insurance_percent}
                                onChange={e => configForm.setData('insurance_percent', parseFloat(e.target.value) || 0)}
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSaveBar processing={configForm.processing} isDirty={configForm.isDirty} />
                </form>

                {/* Invoice numbering sequence */}
                <div>
                    <form onSubmit={submitInvoiceSequence}>
                        <SettingsSection
                            title={t('settings.shipping_config.invoice_numbering')}
                            description={t('settings.shipping_config.invoice_numbering_desc')}
                        >
                            <SettingsField
                                label={t('settings.shipping_config.prefix')}
                                id="inv_prefix"
                                help={t('settings.shipping_config.invoice_prefix_help')}
                            >
                                <Input
                                    id="inv_prefix"
                                    value={invoiceForm.data.prefix}
                                    onChange={e => invoiceForm.setData('prefix', e.target.value.toUpperCase())}
                                    placeholder="INV"
                                    className="font-mono uppercase max-w-[120px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.suffix')}
                                id="inv_suffix"
                                help={t('settings.shipping_config.invoice_suffix_help')}
                            >
                                <Input
                                    id="inv_suffix"
                                    value={invoiceForm.data.suffix}
                                    onChange={e => invoiceForm.setData('suffix', e.target.value.toUpperCase())}
                                    placeholder=""
                                    className="font-mono uppercase max-w-[120px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.padding')}
                                id="inv_padding"
                                help={t('settings.shipping_config.invoice_padding_help')}
                            >
                                <Input
                                    id="inv_padding"
                                    type="number"
                                    min={3}
                                    max={12}
                                    value={invoiceForm.data.padding}
                                    onChange={e => invoiceForm.setData('padding', parseInt(e.target.value) || 6)}
                                    className="max-w-[100px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.next_number')}
                                id="inv_next"
                                help={t('settings.shipping_config.invoice_next_help')}
                            >
                                <Input
                                    id="inv_next"
                                    type="number"
                                    min={1}
                                    value={invoiceForm.data.next_number}
                                    onChange={e => invoiceForm.setData('next_number', parseInt(e.target.value) || 1)}
                                    className="max-w-[120px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.reset_rule')}
                                id="inv_reset"
                                help={t('settings.shipping_config.invoice_reset_help')}
                            >
                                <Select
                                    value={invoiceForm.data.reset_rule}
                                    onValueChange={v => invoiceForm.setData('reset_rule', v)}
                                >
                                    <SelectTrigger id="inv_reset">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {resetRules.map(r => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </SettingsField>

                            <div className="col-span-full space-y-3 pt-2">
                                <SequencePreview
                                    prefix={invoiceForm.data.prefix}
                                    suffix={invoiceForm.data.suffix}
                                    padding={invoiceForm.data.padding}
                                    nextNumber={invoiceForm.data.next_number}
                                    label={t('settings.shipping_config.next_number_preview')}
                                />
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    disabled={invoiceForm.processing}
                                    className="w-full sm:w-auto"
                                >
                                    {invoiceForm.processing
                                        ? t('settings.shipping_config.saving')
                                        : t('settings.shipping_config.update_invoice_sequence')}
                                </Button>
                            </div>
                        </SettingsSection>
                    </form>
                </div>

                {/* Tracking numbering sequence */}
                <div>
                    <form onSubmit={submitTrackingSequence}>
                        <SettingsSection
                            title={t('settings.shipping_config.tracking_numbering')}
                            description={t('settings.shipping_config.tracking_numbering_desc')}
                        >
                            <SettingsField
                                label={t('settings.shipping_config.prefix')}
                                id="trk_prefix"
                                help={t('settings.shipping_config.tracking_prefix_help')}
                            >
                                <Input
                                    id="trk_prefix"
                                    value={trackingForm.data.prefix}
                                    onChange={e => trackingForm.setData('prefix', e.target.value.toUpperCase())}
                                    placeholder="TRK"
                                    className="font-mono uppercase max-w-[120px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.suffix')}
                                id="trk_suffix"
                                help={t('settings.shipping_config.tracking_suffix_help')}
                            >
                                <Input
                                    id="trk_suffix"
                                    value={trackingForm.data.suffix}
                                    onChange={e => trackingForm.setData('suffix', e.target.value.toUpperCase())}
                                    placeholder=""
                                    className="font-mono uppercase max-w-[120px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.padding')}
                                id="trk_padding"
                                help={t('settings.shipping_config.tracking_padding_help')}
                            >
                                <Input
                                    id="trk_padding"
                                    type="number"
                                    min={3}
                                    max={12}
                                    value={trackingForm.data.padding}
                                    onChange={e => trackingForm.setData('padding', parseInt(e.target.value) || 8)}
                                    className="max-w-[100px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.next_number')}
                                id="trk_next"
                                help={t('settings.shipping_config.tracking_next_help')}
                            >
                                <Input
                                    id="trk_next"
                                    type="number"
                                    min={1}
                                    value={trackingForm.data.next_number}
                                    onChange={e => trackingForm.setData('next_number', parseInt(e.target.value) || 1)}
                                    className="max-w-[120px]"
                                />
                            </SettingsField>
                            <SettingsField
                                label={t('settings.shipping_config.reset_rule')}
                                id="trk_reset"
                                help={t('settings.shipping_config.tracking_reset_help')}
                            >
                                <Select
                                    value={trackingForm.data.reset_rule}
                                    onValueChange={v => trackingForm.setData('reset_rule', v)}
                                >
                                    <SelectTrigger id="trk_reset">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {resetRules.map(r => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </SettingsField>

                            <div className="col-span-full space-y-3 pt-2">
                                <SequencePreview
                                    prefix={trackingForm.data.prefix}
                                    suffix={trackingForm.data.suffix}
                                    padding={trackingForm.data.padding}
                                    nextNumber={trackingForm.data.next_number}
                                    label={t('settings.shipping_config.next_number_preview')}
                                />
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    disabled={trackingForm.processing}
                                    className="w-full sm:w-auto"
                                >
                                    {trackingForm.processing
                                        ? t('settings.shipping_config.saving')
                                        : t('settings.shipping_config.update_tracking_sequence')}
                                </Button>
                            </div>
                        </SettingsSection>
                    </form>
                </div>

            </SettingsShell>
        </SettingsLayout>
    );
}
