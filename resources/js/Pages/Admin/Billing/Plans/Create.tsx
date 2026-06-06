import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Textarea } from '@/Components/UI/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import { Switch } from '@/Components/UI/switch';
import { SearchableSelect } from '@/Components/UI/searchable-select';
import { currencies } from '@/Configs/currencies';
import {
    ArrowLeft, FileText, DollarSign, Settings, Tag, Sliders,
    Plus, X, CheckCircle2, TrendingDown, Loader2,
} from 'lucide-react';

function rowsToLimits(rows: { key: string; value: string }[]): Record<string, string> {
    return Object.fromEntries(rows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value]));
}

const currencyOptions = currencies.map(c => ({
    value: c.code,
    label: `${c.code} — ${c.name}`,
    triggerLabel: c.code,
    keywords: [c.code, c.name, c.symbol],
}));

function getCurrencySymbol(code: string) {
    return currencies.find(c => c.code === code)?.symbol ?? code;
}

function PriceInput({
    label, required, value, onChange, currencySymbol, savingsPct, error,
}: {
    label: string; required?: boolean; value: string; onChange: (v: string) => void;
    currencySymbol: string; savingsPct?: number | null; error?: string;
}) {
    const { t } = useTranslation();
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Label className="text-sm">{label}{required ? ' *' : ''}</Label>
                {savingsPct && (
                    <span className="text-xs text-green-600 flex items-center gap-0.5 font-medium">
                        <TrendingDown className="h-3 w-3" />{savingsPct}% {t('saas_billing.savings_off')}
                    </span>
                )}
            </div>
            <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground font-medium shrink-0 select-none">
                    {currencySymbol}
                </span>
                <Input
                    type="number" step="0.01" min="0"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={required ? '0.00' : t('common.optional')}
                    className={`rounded-l-none border-l-0 focus-visible:ring-offset-0 ${error ? 'border-destructive' : ''}`}
                />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function CreatePlan() {
    const { t } = useTranslation();

    const { data, setData, post, processing, errors } = useForm({
        name:              '',
        slug:              '',
        description:       '',
        price_monthly:     '',
        price_quarterly:   '',
        price_semiannual:  '',
        price_annual:      '',
        currency:          'USD',
        trial_days:        '14',
        grace_period_days: '7',
        sort_order:        '0',
        is_active:         true,
        features:          [] as string[],
        limits:            {} as Record<string, string>,
    });

    const symbol = getCurrencySymbol(data.currency);

    const autoSlug = (name: string) =>
        setData(prev => ({
            ...prev,
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        }));

    // Features
    const [newFeature, setNewFeature] = useState('');
    const addFeature = () => {
        const val = newFeature.trim();
        if (!val || data.features.includes(val)) return;
        setData('features', [...data.features, val]);
        setNewFeature('');
    };
    const removeFeature = (i: number) =>
        setData('features', data.features.filter((_, idx) => idx !== i));

    // Limits
    const [limitRows, setLimitRows] = useState<{ key: string; value: string }[]>([]);
    const [newLimitKey, setNewLimitKey]     = useState('');
    const [newLimitValue, setNewLimitValue] = useState('');
    const syncLimits = (rows: { key: string; value: string }[]) => {
        setLimitRows(rows);
        setData('limits', rowsToLimits(rows));
    };
    const addLimit = () => {
        const k = newLimitKey.trim();
        if (!k) return;
        const updated = [...limitRows.filter(r => r.key !== k), { key: k, value: newLimitValue }];
        syncLimits(updated);
        setNewLimitKey('');
        setNewLimitValue('');
    };
    const removeLimit = (i: number) => syncLimits(limitRows.filter((_, idx) => idx !== i));
    const updateLimit = (i: number, field: 'key' | 'value', val: string) =>
        syncLimits(limitRows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

    const monthly = parseFloat(data.price_monthly) || 0;
    const savings = (price: string, months: number): number | null => {
        const p = parseFloat(price) || 0;
        if (!monthly || !p) return null;
        const pct = Math.round((1 - p / (monthly * months)) * 100);
        return pct > 0 ? pct : null;
    };

    const submit = (e: React.FormEvent) => { e.preventDefault(); post(route('admin.billing.plans.store')); };

    const commonLimitKeys = ['max_users', 'max_shipments', 'max_branches', 'max_api_calls', 'storage_gb'];

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.create_plan')} />
            <div className="space-y-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.billing.plans')}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.create_plan')}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('saas_billing.plans_desc')}</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* ── LEFT ── */}
                        <div className="lg:col-span-3 space-y-5">

                            {/* General */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        {t('common.general')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">{t('saas_billing.plan_name')} *</Label>
                                            <Input value={data.name} onChange={e => autoSlug(e.target.value)}
                                                placeholder="Pro, Enterprise…"
                                                className={errors.name ? 'border-destructive' : ''} />
                                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">Slug *</Label>
                                            <Input value={data.slug} onChange={e => setData('slug', e.target.value)}
                                                placeholder="pro"
                                                className={`font-mono text-sm ${errors.slug ? 'border-destructive' : ''}`} />
                                            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">{t('common.description')}</Label>
                                        <Textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                            rows={3} className="resize-none"
                                            placeholder={t('saas_billing.plans_desc')} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-end">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">{t('common.currency')}</Label>
                                            <SearchableSelect
                                                options={currencyOptions}
                                                value={data.currency}
                                                onChange={v => setData('currency', v)}
                                                placeholder={t('common.select')}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">{t('common.sort_order')}</Label>
                                            <Input type="number" min="0" value={data.sort_order}
                                                onChange={e => setData('sort_order', e.target.value)} />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 h-10">
                                            <Label className="text-sm cursor-pointer">{t('common.active')}</Label>
                                            <Switch checked={data.is_active} onCheckedChange={v => setData('is_active', v)} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pricing */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-primary" />
                                        {t('common.pricing')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <PriceInput label={t('saas_billing.price_monthly')} required
                                            value={data.price_monthly} onChange={v => setData('price_monthly', v)}
                                            currencySymbol={symbol} error={errors.price_monthly} />
                                        <PriceInput label={t('saas_billing.price_quarterly')}
                                            value={data.price_quarterly} onChange={v => setData('price_quarterly', v)}
                                            currencySymbol={symbol} savingsPct={savings(data.price_quarterly, 3)} />
                                        <PriceInput label={t('saas_billing.price_semiannual')}
                                            value={data.price_semiannual} onChange={v => setData('price_semiannual', v)}
                                            currencySymbol={symbol} savingsPct={savings(data.price_semiannual, 6)} />
                                        <PriceInput label={t('saas_billing.price_annual')}
                                            value={data.price_annual} onChange={v => setData('price_annual', v)}
                                            currencySymbol={symbol} savingsPct={savings(data.price_annual, 12)} />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Features */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-primary" />
                                        {t('saas_billing.features')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {data.features.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {data.features.map((feat, i) => (
                                                <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                                                    {feat}
                                                    <button type="button" onClick={() => removeFeature(i)}
                                                        className="hover:text-destructive transition-colors">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Input className="flex-1" value={newFeature}
                                            onChange={e => setNewFeature(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                                            placeholder={t('saas_billing.features') + '…'} />
                                        <Button type="button" variant="outline" size="sm" onClick={addFeature}
                                            disabled={!newFeature.trim()}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t('saas_billing.hint_add_feature')}</p>
                                </CardContent>
                            </Card>

                            {/* Limits */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-primary" />
                                        {t('saas_billing.limits')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {limitRows.length > 0 && (
                                        <div className="space-y-2">
                                            {limitRows.map((row, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Input className="flex-1 font-mono text-sm" value={row.key}
                                                        onChange={e => updateLimit(i, 'key', e.target.value)} placeholder="key" />
                                                    <span className="text-muted-foreground shrink-0">:</span>
                                                    <Input className="flex-1" value={row.value}
                                                        onChange={e => updateLimit(i, 'value', e.target.value)} placeholder="value" />
                                                    <Button type="button" variant="ghost" size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                        onClick={() => removeLimit(i)}>
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                                        <div className="relative flex-1">
                                            <Input list="limit-keys-create" className="font-mono text-sm"
                                                placeholder="max_users" value={newLimitKey}
                                                onChange={e => setNewLimitKey(e.target.value)} />
                                            <datalist id="limit-keys-create">
                                                {commonLimitKeys.map(k => <option key={k} value={k} />)}
                                            </datalist>
                                        </div>
                                        <span className="text-muted-foreground shrink-0">:</span>
                                        <Input className="flex-1" placeholder="100" value={newLimitValue}
                                            onChange={e => setNewLimitValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLimit(); } }} />
                                        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                                            onClick={addLimit} disabled={!newLimitKey.trim()}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── RIGHT ── */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Settings */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-primary" />
                                        {t('common.settings')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">{t('saas_billing.trial_days')}</Label>
                                        <Input type="number" min="0" value={data.trial_days}
                                            onChange={e => setData('trial_days', e.target.value)} />
                                        <p className="text-xs text-muted-foreground">{t('saas_billing.hint_trial_zero')}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">{t('saas_billing.grace_period_days')}</Label>
                                        <Input type="number" min="0" value={data.grace_period_days}
                                            onChange={e => setData('grace_period_days', e.target.value)} />
                                        <p className="text-xs text-muted-foreground">{t('saas_billing.hint_grace_desc')}</p>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                                        <div>
                                            <Label className="text-sm">{t('common.active')}</Label>
                                            <p className="text-xs text-muted-foreground">{t('saas_billing.plan_active_desc')}</p>
                                        </div>
                                        <Switch checked={data.is_active} onCheckedChange={v => setData('is_active', v)} />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Preview */}
                            <Card className="sticky top-6 overflow-hidden">
                                <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary" />
                                <CardHeader className="pb-2 pt-4">
                                    <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                        {t('saas_billing.plan_preview')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-lg font-bold text-foreground">{data.name || '—'}</p>
                                        {data.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{data.description}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1 text-sm">
                                        {[
                                            { label: t('saas_billing.monthly'),    val: data.price_monthly,   months: 1  },
                                            { label: t('saas_billing.quarterly'),  val: data.price_quarterly,  months: 3  },
                                            { label: t('saas_billing.semiannual'), val: data.price_semiannual, months: 6  },
                                            { label: t('saas_billing.annual'),     val: data.price_annual,     months: 12 },
                                        ].filter(r => r.val && parseFloat(r.val) > 0).map(({ label, val, months }) => {
                                            const pct = savings(val!, months);
                                            return (
                                                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                                                    <span className="text-muted-foreground">{label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {pct && <span className="text-xs text-green-600 font-medium">-{pct}%</span>}
                                                        <span className="font-semibold text-foreground tabular-nums">
                                                            {symbol}{Number(val).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!(parseFloat(data.price_monthly) > 0) && (
                                            <p className="text-xs text-muted-foreground text-center py-2">
                                                {t('saas_billing.hint_set_price')}
                                            </p>
                                        )}
                                    </div>

                                    {data.features.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-border/50">
                                            {data.features.slice(0, 5).map((f, i) => (
                                                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />{f}
                                                </p>
                                            ))}
                                            {data.features.length > 5 && (
                                                <p className="text-xs text-muted-foreground pl-4">
                                                    {t('saas_billing.plan_more', { n: String(data.features.length - 5) })}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {limitRows.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-border/50">
                                            {limitRows.slice(0, 4).map((r, i) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground capitalize">{r.key.replace(/_/g, ' ')}</span>
                                                    <span className="font-medium text-foreground">{r.value || '—'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="pt-2 space-y-2">
                                        <Button type="submit" className="w-full gap-2" disabled={processing}>
                                            {processing
                                                ? <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving')}</>
                                                : <><Plus className="h-4 w-4" />{t('saas_billing.create_plan')}</>
                                            }
                                        </Button>
                                        <Link href={route('admin.billing.plans')} className="block">
                                            <Button type="button" variant="outline" className="w-full">{t('common.cancel')}</Button>
                                        </Link>
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
