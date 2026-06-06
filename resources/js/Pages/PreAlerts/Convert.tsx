import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, FormEventHandler } from 'react';
import {
    ArrowLeft, Package, Inbox, Scale, DollarSign, Truck,
    Loader2, CheckCircle, RefreshCw, AlertCircle, ChevronRight,
    FileText, Percent,
} from 'lucide-react';

interface RateCard { id: number; name: string; currency: string }

interface Customer { id: number; name: string; email: string }
interface Locker   { id: number; code: string; address: string | null }

interface PreAlert {
    id: number;
    store_name: string;
    store_tracking_number: string;
    declared_value: number;
    declared_currency: string;
    declared_weight_kg: number | null;
    description: string | null;
    notes: string | null;
    customer: Customer | null;
    locker: Locker | null;
    status: string;
}

interface QuotedRate {
    carrier_code: string;
    carrier_name: string;
    service_name: string;
    service_code: string;
    total: number;
    currency: string;
    estimated_days?: number;
    rate_card_id?: number;
    rate_rule_id?: number;
    service_type?: string;
    is_stub?: boolean;
}

interface Props {
    preAlert:  PreAlert;
    rateCards: RateCard[];
    currency:  string;
    weightUnit: string;
}

export default function PreAlertsConvert({ preAlert, rateCards, currency, weightUnit }: Props) {
    const { t } = useTranslation();

    // ── Measurement state ────────────────────────────────────────────────────
    const [weight, setWeight]   = useState<string>(String(preAlert.declared_weight_kg ?? ''));
    const [length, setLength]   = useState('');
    const [width, setWidth]     = useState('');
    const [height, setHeight]   = useState('');
    const [selectedCard, setSelectedCard] = useState<string>('');

    // ── Rate quoting state ───────────────────────────────────────────────────
    const [quoting, setQuoting]     = useState(false);
    const [quotes, setQuotes]       = useState<QuotedRate[]>([]);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [selectedRate, setSelectedRate] = useState<QuotedRate | null>(null);

    // ── Duty state ───────────────────────────────────────────────────────────
    const [dutyPercent, setDutyPercent] = useState<string>('0');

    const dutyAmount  = (preAlert.declared_value * parseFloat(dutyPercent || '0')) / 100;
    const shippingRate = selectedRate?.total ?? 0;
    const grandTotal   = shippingRate + dutyAmount;

    // ── Form (submission) ────────────────────────────────────────────────────
    const { data, setData, post, processing, errors } = useForm({
        actual_weight_kg:     '',
        length_cm:            '',
        width_cm:             '',
        height_cm:            '',
        service_type:         '',
        rate_card_id:         '',
        rate_rule_id:         '',
        shipping_rate:        '',
        customs_duty_percent: '',
        customs_duty_amount:  '',
        subtotal:             '',
        total:                '',
        currency:             currency,
        notes:                preAlert.notes ?? '',
    });

    // ── Get quotes from API ──────────────────────────────────────────────────
    async function handleGetQuotes() {
        if (!weight || parseFloat(weight) <= 0) {
            setQuoteError(t('convert.weight_required'));
            return;
        }
        setQuoting(true);
        setQuoteError(null);
        setQuotes([]);
        setSelectedRate(null);

        try {
            const body: Record<string, string> = { weight };
            if (length) body.length = length;
            if (width)  body.width  = width;
            if (height) body.height = height;
            if (selectedCard) body.rate_card_id = selectedCard;

            const res = await fetch(route('pre-alerts.rate-quote', preAlert.id), {
                method:  'POST',
                headers: {
                    'Content-Type':     'application/json',
                    'Accept':           'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN':     decodeURIComponent(
                        document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                    ),
                },
                body: JSON.stringify(body),
            });

            const json = await res.json();

            if (json.error) {
                setQuoteError(json.error);
            } else if (!json.rates || json.rates.length === 0) {
                setQuoteError(t('convert.no_rates_found'));
            } else {
                setQuotes(json.rates);
            }
        } catch {
            setQuoteError(t('convert.quote_failed'));
        } finally {
            setQuoting(false);
        }
    }

    function selectRate(rate: QuotedRate) {
        setSelectedRate(rate);
        setData(prev => ({
            ...prev,
            shipping_rate:  String(rate.total),
            rate_card_id:   rate.rate_card_id ? String(rate.rate_card_id) : '',
            rate_rule_id:   rate.rate_rule_id  ? String(rate.rate_rule_id) : '',
            service_type:   rate.service_type ?? rate.service_code ?? '',
            subtotal:       String(rate.total),
        }));
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Sync current computed values before submit
        const finalData = {
            ...data,
            actual_weight_kg:     weight,
            length_cm:            length,
            width_cm:             width,
            height_cm:            height,
            customs_duty_percent: dutyPercent,
            customs_duty_amount:  String(dutyAmount.toFixed(2)),
            subtotal:             String(shippingRate.toFixed(2)),
            total:                String(grandTotal.toFixed(2)),
        };
        // Merge into form data then post
        Object.entries(finalData).forEach(([k, v]) => setData(k as any, v));
        post(route('pre-alerts.convert', preAlert.id));
    };

    const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700";
    const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

    return (
        <AuthenticatedLayout>
            <Head title={t('convert.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href={route('pre-alerts.show', preAlert.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('convert.title')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {preAlert.store_name} · {preAlert.store_tracking_number}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── LEFT: measurements + rate quotes + duty ── */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Pre-alert summary */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-wrap gap-6">
                                <div>
                                    <p className="text-xs text-indigo-500 font-medium">{t('pre_alerts.locker')}</p>
                                    <p className="text-sm font-mono font-bold text-indigo-800">{preAlert.locker?.code ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-indigo-500 font-medium">{t('pre_alerts.customer')}</p>
                                    <p className="text-sm font-semibold text-indigo-800">{preAlert.customer?.name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-indigo-500 font-medium">{t('pre_alerts.declared_value')}</p>
                                    <p className="text-sm font-bold text-indigo-800">
                                        {preAlert.declared_currency} {Number(preAlert.declared_value).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-indigo-500 font-medium">{t('pre_alerts.declared_weight_kg')}</p>
                                    <p className="text-sm font-semibold text-indigo-800">
                                        {preAlert.declared_weight_kg ? `${preAlert.declared_weight_kg} kg` : '—'}
                                    </p>
                                </div>
                            </div>

                            {/* ─── Step 1: Actual measurements ─── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                                    <Scale className="w-3.5 h-3.5" />
                                    {t('convert.actual_measurements')}
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('convert.actual_weight')} ({weightUnit}) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={weight}
                                            onChange={e => setWeight(e.target.value)}
                                            className={inputClass}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('convert.length_cm')}</label>
                                        <input type="number" min="0" step="0.1" value={length} onChange={e => setLength(e.target.value)} className={inputClass} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('convert.width_cm')}</label>
                                        <input type="number" min="0" step="0.1" value={width} onChange={e => setWidth(e.target.value)} className={inputClass} placeholder="0" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('convert.height_cm')}</label>
                                        <input type="number" min="0" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className={inputClass} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('convert.rate_card')}</label>
                                        <select value={selectedCard} onChange={e => setSelectedCard(e.target.value)} className={inputClass}>
                                            <option value="">{t('convert.any_card')}</option>
                                            {rateCards.map(rc => (
                                                <option key={rc.id} value={String(rc.id)}>{rc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGetQuotes}
                                    disabled={quoting || !weight}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
                                >
                                    {quoting
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <RefreshCw className="w-4 h-4" />
                                    }
                                    {quoting ? t('convert.getting_quotes') : t('convert.get_quotes')}
                                </button>

                                {quoteError && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {quoteError}
                                    </div>
                                )}
                            </div>

                            {/* ─── Step 2: Select Rate ─── */}
                            {quotes.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                                        <Truck className="w-3.5 h-3.5" />
                                        {t('convert.select_rate')}
                                    </h3>

                                    <div className="space-y-2">
                                        {quotes.map((rate, i) => {
                                            const isSelected = selectedRate === rate ||
                                                (selectedRate?.rate_rule_id && selectedRate.rate_rule_id === rate.rate_rule_id);
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => selectRate(rate)}
                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                                        isSelected
                                                            ? 'border-green-500 bg-green-50'
                                                            : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isSelected && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                                                        {!isSelected && <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />}
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800">
                                                                {rate.carrier_name} — {rate.service_name}
                                                            </p>
                                                            {rate.estimated_days ? (
                                                                <p className="text-xs text-gray-400">
                                                                    {t('convert.est_days')}: {rate.estimated_days} {t('convert.days_unit')}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-base font-bold text-gray-900">
                                                            {rate.currency ?? currency} {rate.total?.toFixed(2) ?? '—'}
                                                        </p>
                                                        {rate.is_stub && (
                                                            <p className="text-xs text-orange-400">{t('convert.stub_rate')}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ─── Step 3: Customs Duty ─── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                                    <Percent className="w-3.5 h-3.5" />
                                    {t('convert.customs_duty')}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('convert.duty_percent')}
                                            <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={dutyPercent}
                                                onChange={e => setDutyPercent(e.target.value)}
                                                className={inputClass + ' pr-8'}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t('convert.duty_on')} {preAlert.declared_currency} {Number(preAlert.declared_value).toFixed(2)}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('convert.duty_amount')}
                                        </label>
                                        <div className={`${inputClass} bg-gray-50 flex items-center text-gray-700 font-semibold`}>
                                            {currency} {dutyAmount.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="mt-5">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                        <FileText className="w-3 h-3 inline mr-1" />
                                        {t('pre_alerts.notes')}
                                        <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        className={inputClass + ' resize-none'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Charges summary + submit ── */}
                        <div className="space-y-5">

                            {/* Package recap */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('convert.package_recap')}</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t('pre_alerts.store')}</span>
                                    <span className="font-semibold text-gray-800">{preAlert.store_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t('convert.actual_weight')}</span>
                                    <span className="font-semibold text-gray-800">
                                        {weight ? `${weight} ${weightUnit}` : <span className="text-gray-300">—</span>}
                                    </span>
                                </div>
                                {(length || width || height) && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">{t('convert.dimensions')}</span>
                                        <span className="font-semibold text-gray-800">{length}×{width}×{height} cm</span>
                                    </div>
                                )}
                            </div>

                            {/* Charges breakdown */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('convert.charges_breakdown')}</h3>

                                <div className="space-y-3">
                                    {/* Shipping rate */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{t('convert.shipping_rate')}</span>
                                        </div>
                                        <span className={`text-sm font-semibold ${selectedRate ? 'text-gray-900' : 'text-gray-300'}`}>
                                            {selectedRate ? fmt(shippingRate) : '—'}
                                        </span>
                                    </div>
                                    {selectedRate && (
                                        <p className="text-xs text-gray-400 ml-6">
                                            {selectedRate.carrier_name} — {selectedRate.service_name}
                                        </p>
                                    )}

                                    {/* Customs duty */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Percent className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{t('convert.customs_duty')}</span>
                                        </div>
                                        <span className={`text-sm font-semibold ${dutyAmount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                            {dutyAmount > 0 ? fmt(dutyAmount) : '—'}
                                        </span>
                                    </div>
                                    {parseFloat(dutyPercent) > 0 && (
                                        <p className="text-xs text-gray-400 ml-6">
                                            {dutyPercent}% {t('convert.of_declared')} ({preAlert.declared_currency} {Number(preAlert.declared_value).toFixed(2)})
                                        </p>
                                    )}

                                    {/* Divider + Total */}
                                    <div className="border-t border-gray-100 pt-3 mt-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-base font-bold text-gray-800">{t('convert.grand_total')}</span>
                                            <span className={`text-xl font-bold ${grandTotal > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                                                {grandTotal > 0 ? fmt(grandTotal) : '—'}
                                            </span>
                                        </div>
                                        {!selectedRate && (
                                            <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 shrink-0" />
                                                {t('convert.no_rate_selected')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={processing || !weight}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors shadow-sm"
                                >
                                    {processing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <ChevronRight className="w-4 h-4" />
                                    }
                                    {processing ? t('common.saving') : t('convert.confirm_convert')}
                                </button>
                                <Link
                                    href={route('pre-alerts.show', preAlert.id)}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('common.cancel')}
                                </Link>
                            </div>

                            {/* Info box */}
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 space-y-1.5">
                                <p className="font-semibold">{t('convert.what_happens')}</p>
                                <ul className="space-y-1 text-blue-600 list-none">
                                    <li className="flex items-start gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                                        {t('convert.info_1')}
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                                        {t('convert.info_2')}
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                                        {t('convert.info_3')}
                                    </li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
