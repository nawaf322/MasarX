import PublicLayout from '@/Layouts/PublicLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { usePage, router } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Badge } from '@/Components/UI/badge';
import { SearchableSelect } from '@/ui/kit/SearchableSelect';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/Components/UI/dialog';
import {
    ArrowRight,
    Calculator,
    MapPin,
    Clock,
    Wind,
    Anchor,
    Truck,
    Package,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    LogIn,
    UserPlus,
} from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Country { id: number; name: string; iso2?: string; }

interface Rate {
    service_type: string;
    service_code?: string;
    card_name: string;
    zone_name?: string;
    currency: string;
    total: string | number;
    total_price: string | number;
    breakdown?: Record<string, unknown>;
    rate_rule_id?: number | null;
    rate_card_id?: number | null;
    service_mode?: string | null;
    estimated_days?: number | null;
    carrier_code?: string;
    carrier_name?: string;
}

const fmt = (v: unknown): string =>
    typeof v === 'number' ? v.toFixed(2) : parseFloat(String(v ?? 0)).toFixed(2);

function getModeIcon(mode?: string | null, cardName?: string) {
    const n = ((mode ?? '') + ' ' + (cardName ?? '')).toLowerCase();
    if (n.includes('air') || n.includes('aer'))                         return { Icon: Wind,    bg: 'bg-sky-500' };
    if (n.includes('sea') || n.includes('ocean') || n.includes('mar')) return { Icon: Anchor,  bg: 'bg-blue-600' };
    if (n.includes('ground') || n.includes('road') || n.includes('truck') || n.includes('tierra')) return { Icon: Truck, bg: 'bg-amber-500' };
    return { Icon: Package, bg: 'bg-slate-500' };
}

function RateCard({ rate, index, onShip }: { rate: Rate; index: number; onShip: (rate: Rate) => void }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const isBest = index === 0;
    const total = rate.total ?? rate.total_price ?? 0;
    const { Icon, bg } = getModeIcon(rate.service_mode, rate.card_name);
    const b = rate.breakdown || {};

    const rows = ([
        { key: 'base',          label: t('rates.calc_base'),           val: (b as any).base },
        { key: 'weight_charge', label: t('rates.calc_weight_charge'),  val: (b as any).weight_charge },
        { key: 'handling_fee',  label: t('rates.calc_handling'),       val: (b as any).handling_fee },
        { key: 'subtotal',      label: t('rates.calc_subtotal'),       val: (b as any).subtotal },
        { key: 'fuel',          label: t('rates.calc_fuel'),           val: (b as any).fuel },
        { key: 'insurance',     label: t('rates.calc_insurance'),      val: (b as any).insurance },
        { key: 'tax',           label: t('rates.calc_tax'),            val: (b as any).tax },
    ] as { key: string; label: string; val: unknown }[]).filter(r => r.val != null && parseFloat(String(r.val)) !== 0);

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isBest ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="p-5 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`${bg} p-2 rounded-xl shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{rate.card_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {rate.service_type}{rate.zone_name ? ` · ${rate.zone_name}` : ''}
                            </div>
                        </div>
                    </div>
                    {isBest && (
                        <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                            {t('public_calc.best_value')}
                        </Badge>
                    )}
                </div>

                {/* Price */}
                <div className="text-center my-4">
                    <div className="text-4xl font-extrabold text-primary leading-none">{fmt(total)}</div>
                    <div className="text-sm text-slate-500 mt-1 font-medium">{rate.currency}</div>
                </div>

                {/* Transit time */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <Clock className="w-3.5 h-3.5" />
                    {rate.estimated_days != null
                        ? `${t('public_calc.estimated')} ${rate.estimated_days} ${t('public_calc.days')}`
                        : '—'}
                </div>

                {/* Breakdown toggle */}
                {rows.length > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setOpen(!open)}
                            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2 border-t border-slate-100 dark:border-slate-800 transition-colors"
                        >
                            <span>{open ? t('public_calc.hide_breakdown') : t('public_calc.show_breakdown')}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                            <div className="mt-2 space-y-1 text-xs">
                                {rows.map(r => (
                                    <div key={r.key} className="flex justify-between">
                                        <span className="text-slate-500">{r.label}</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{fmt(r.val)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                                    <span>Total</span>
                                    <span>{fmt(total)} {rate.currency}</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CTA */}
            <div className="p-4 pt-0">
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    onClick={() => onShip(rate)}
                >
                    {t('public_calc.ship_now')} →
                </Button>
            </div>
        </div>
    );
}

export default function PublicCalculatorIndex({
    countries = [],
    weight_unit = 'kg',
    dimension_unit = 'cm',
    org_name,
    org_logo,
}: {
    countries?: Country[];
    weight_unit?: string;
    dimension_unit?: string;
    org_name?: string;
    org_logo?: string | null;
}) {
    const { t } = useTranslation();
    const { props } = usePage();
    const auth = (props as any).auth;
    const isAuth = !!auth?.user;
    const branding = (props as any).branding || {};
    const googleEnabled = !!(branding as any).google_login_enabled;

    const [form, setForm] = useState({
        origin_country_id: '',
        dest_country_id: '',
        weight: '1',
        length: '10',
        width: '10',
        height: '10',
        declared_value: '0',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [authModal, setAuthModal] = useState(false);
    const [pendingRate, setPendingRate] = useState<Rate | null>(null);
    const [savingIntent, setSavingIntent] = useState(false);

    const countryOptions = countries.map(c => ({ label: c.name, value: c.id }));

    const sortedRates: Rate[] = useMemo(() => {
        const r: Rate[] = results?.rates ?? [];
        return [...r].sort((a, b) =>
            parseFloat(String(a.total ?? a.total_price ?? 0)) - parseFloat(String(b.total ?? b.total_price ?? 0))
        );
    }, [results?.rates]);

    const getCountry = (id: string) => countries.find(c => String(c.id) === String(id));

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.origin_country_id) errs.origin_country_id = t('public_calc.origin_required');
        if (!form.dest_country_id)   errs.dest_country_id   = t('public_calc.dest_required');
        const w = parseFloat(form.weight);
        if (isNaN(w) || w < 0.1)     errs.weight            = t('public_calc.weight_min');
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleCalculate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCalcError(null);
        setResults(null);
        if (!validate()) return;

        setLoading(true);
        try {
            const res = await axios.post(route('public.calculator.calculate'), {
                origin_country_id: Number(form.origin_country_id),
                dest_country_id:   Number(form.dest_country_id),
                weight:   parseFloat(form.weight),
                length:   Math.max(1, parseFloat(form.length)  || 10),
                width:    Math.max(1, parseFloat(form.width)   || 10),
                height:   Math.max(1, parseFloat(form.height)  || 10),
                declared_value: parseFloat(form.declared_value) || 0,
            });
            setResults(res.data);
        } catch (err: any) {
            if (err.response?.data?.errors) {
                const serverErrs: Record<string, string> = {};
                Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
                    serverErrs[k] = Array.isArray(v) ? v[0] : String(v);
                });
                setFormErrors(serverErrs);
            } else if (err.response?.data?.error) {
                setCalcError(err.response.data.error);
            } else {
                setCalcError(t('public_calc.error'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShip = async (rate: Rate) => {
        const origin = getCountry(form.origin_country_id);
        const dest   = getCountry(form.dest_country_id);

        const prefill = {
            sender_details:   { country: origin?.name ?? '', country_code: origin?.iso2 ?? '' },
            receiver_details: { country: dest?.name   ?? '', country_code: dest?.iso2   ?? '' },
            package_details: {
                weight:      parseFloat(form.weight)  || 1,
                dimensions:  { length: parseFloat(form.length) || 10, width: parseFloat(form.width) || 10, height: parseFloat(form.height) || 10 },
                pieces:      1,
                content_description: '',
                declared_value: parseFloat(form.declared_value) || 0,
            },
            service_type: rate.service_type,
            rate_data:    rate,
        };

        try { localStorage.setItem('deprixa_calculator_prefill', JSON.stringify(prefill)); } catch {}

        if (isAuth) {
            router.visit(route('shipments.from-rate'));
            return;
        }

        // Not authenticated — store intent on server, then redirect to login
        setPendingRate(rate);
        setSavingIntent(true);
        try {
            await axios.post(route('public.calculator.save-intent'), {
                rate_data:   rate,
                calc_inputs: {
                    origin_country_id: form.origin_country_id,
                    dest_country_id:   form.dest_country_id,
                    weight:   form.weight,
                    length:   form.length,
                    width:    form.width,
                    height:   form.height,
                    declared_value: form.declared_value,
                },
            });
        } catch {}
        setSavingIntent(false);
        setAuthModal(true);
    };

    return (
        <PublicLayout orgName={org_name} orgLogo={org_logo}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
                {/* Hero */}
                <div className="text-center space-y-3">
                    {org_logo ? (
                        <img
                            src={org_logo}
                            alt={org_name}
                            className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm"
                        />
                    ) : (
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                            <Calculator className="w-8 h-8 text-primary" />
                        </div>
                    )}
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{t('public_calc.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">{t('public_calc.subtitle')}</p>
                </div>

                {/* Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
                    <form onSubmit={handleCalculate} className="space-y-6">
                        {/* Origin → Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-green-500" />
                                    {t('public_calc.from')} <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                    items={countryOptions}
                                    value={String(form.origin_country_id || '')}
                                    onChange={val => { setForm(p => ({ ...p, origin_country_id: val })); setFormErrors(p => ({ ...p, origin_country_id: '' })); }}
                                    placeholder={t('public_calc.select_origin')}
                                    className={formErrors.origin_country_id ? 'ring-2 ring-red-300 rounded-md' : ''}
                                />
                                {formErrors.origin_country_id && <p className="text-red-500 text-xs">{formErrors.origin_country_id}</p>}
                            </div>

                            <div className="hidden sm:flex items-center justify-center pb-1">
                                <ArrowRight className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-red-500" />
                                    {t('public_calc.to')} <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                    items={countryOptions}
                                    value={String(form.dest_country_id || '')}
                                    onChange={val => { setForm(p => ({ ...p, dest_country_id: val })); setFormErrors(p => ({ ...p, dest_country_id: '' })); }}
                                    placeholder={t('public_calc.select_dest')}
                                    className={formErrors.dest_country_id ? 'ring-2 ring-red-300 rounded-md' : ''}
                                />
                                {formErrors.dest_country_id && <p className="text-red-500 text-xs">{formErrors.dest_country_id}</p>}
                            </div>
                        </div>

                        {/* Package fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div className="space-y-1.5 col-span-2 sm:col-span-1 lg:col-span-1">
                                <Label className="text-sm font-medium">{t('public_calc.weight')} <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Input type="number" step="0.1" min={0.1} value={form.weight}
                                        onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                                        className={`pr-8 ${formErrors.weight ? 'ring-2 ring-red-300' : ''}`} />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{weight_unit}</span>
                                </div>
                                {formErrors.weight && <p className="text-red-500 text-xs">{formErrors.weight}</p>}
                            </div>
                            {(['length', 'width', 'height'] as const).map(field => (
                                <div key={field} className="space-y-1.5">
                                    <Label className="text-sm font-medium">{t(`public_calc.${field}`)}</Label>
                                    <div className="relative">
                                        <Input type="number" min={1} value={form[field]}
                                            onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                                            className="pr-8" />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{dimension_unit}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-1.5 col-span-2 lg:col-span-2">
                                <Label className="text-sm font-medium">{t('public_calc.declared_value')}</Label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                                    <Input type="number" step="0.01" min={0} value={form.declared_value}
                                        onChange={e => setForm(p => ({ ...p, declared_value: e.target.value }))}
                                        className="pl-6" />
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex flex-col items-center gap-3">
                            <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-[220px] bg-primary hover:bg-primary/90" disabled={loading}>
                                {loading ? (
                                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />{t('public_calc.calculating')}</>
                                ) : (
                                    <><Calculator className="w-4 h-4 mr-2" />{t('public_calc.calculate_btn')}</>
                                )}
                            </Button>
                            {calcError && (
                                <div className="w-full p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center flex items-center justify-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />{calcError}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Results */}
                {results && (
                    <div className="space-y-5 animate-in fade-in-50 slide-in-from-bottom-4">
                        {/* Summary bar */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {getCountry(form.origin_country_id)?.name} → {getCountry(form.dest_country_id)?.name}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span>{form.weight} {weight_unit}</span>
                                <span className="text-slate-300">·</span>
                                <span>{form.length}×{form.width}×{form.height} {dimension_unit}</span>
                                {results.inputs?.volumetric_weight != null && (
                                    <><span className="text-slate-300">·</span><span>{t('public_calc.summary_volumetric')}: {Number(results.inputs.volumetric_weight).toFixed(2)} {weight_unit}</span></>
                                )}
                                {parseFloat(form.declared_value) > 0 && (
                                    <><span className="text-slate-300">·</span><span>${form.declared_value}</span></>
                                )}
                            </div>
                        </div>

                        {sortedRates.length > 0 ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                        {t('public_calc.results_title')} ({sortedRates.length} {t('public_calc.results_found')})
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sortedRates.map((rate, i) => (
                                        <RateCard key={`${rate.card_name}-${i}`} rate={rate} index={i} onShip={handleShip} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="font-semibold text-slate-600 dark:text-slate-400">{t('public_calc.no_rates')}</p>
                                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{t('public_calc.no_rates_desc')}</p>
                            </div>
                        )}
                    </div>
                )}

                {!results && !loading && (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                        <p className="text-sm">{t('public_calc.ready_desc')}</p>
                    </div>
                )}
            </div>

            {/* Auth required modal */}
            <Dialog open={authModal} onOpenChange={setAuthModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="w-5 h-5 text-primary" />
                            {t('public_calc.login_required_title')}
                        </DialogTitle>
                        <DialogDescription>{t('public_calc.login_required_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 pt-2">
                        <Link href={route('login')} className="w-full">
                            <Button className="w-full bg-primary hover:bg-primary/90">
                                <LogIn className="w-4 h-4 mr-2" />
                                {t('public_calc.login_btn')}
                            </Button>
                        </Link>
                        <Link href={route('register')} className="w-full">
                            <Button variant="outline" className="w-full">
                                <UserPlus className="w-4 h-4 mr-2" />
                                {t('public_calc.register_btn')}
                            </Button>
                        </Link>
                        {googleEnabled && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-400">{t('public_calc.or_continue_with')}</span>
                                    </div>
                                </div>
                                <a
                                    href={route('auth.google')}
                                    className="flex items-center justify-center h-10 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all gap-3 text-sm font-medium text-slate-700"
                                >
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-4 w-4" alt="Google" />
                                    {t('auth.continue_with_google')}
                                </a>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </PublicLayout>
    );
}
