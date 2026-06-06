import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { FormEventHandler, useRef } from 'react';
import {
    ArrowLeft, Package, Inbox, DollarSign, FileText,
    Upload, Loader2, Link as LinkIcon, Weight, User,
} from 'lucide-react';

interface Locker   { id: number; code: string; address: string | null; customer_id: number | null }
interface Customer { id: number; name: string; email: string }

interface Props {
    lockers:            Locker[];
    customers:          Customer[];
    prefillLockerId?:   number | null;
    currentCustomerId?: number | null;
}

const CURRENCIES = ['USD','EUR','GBP','CAD','MXN','BRL','COP','CRC','GTQ','PEN','ARS','CLP'];

export default function PreAlertsCreate({ lockers, customers, prefillLockerId, currentCustomerId }: Props) {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);
    const isCustomerPortal = currentCustomerId != null;

    const { data, setData, post, processing, errors } = useForm<{
        locker_id:             string;
        customer_id:           string;
        store_name:            string;
        store_tracking_number: string;
        store_url:             string;
        declared_value:        string;
        declared_currency:     string;
        declared_weight_kg:    string;
        description:           string;
        notes:                 string;
        invoice_file:          File | null;
    }>({
        locker_id:             prefillLockerId ? String(prefillLockerId) : '',
        customer_id:           currentCustomerId ? String(currentCustomerId) : '',
        store_name:            '',
        store_tracking_number: '',
        store_url:             '',
        declared_value:        '',
        declared_currency:     'USD',
        declared_weight_kg:    '',
        description:           '',
        notes:                 '',
        invoice_file:          null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('pre-alerts.store'), { forceFormData: true });
    };

    const base  = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700 bg-white";
    const error = "border-red-300 focus:ring-red-400 focus:border-red-400";

    const selectedLocker = lockers.find(l => String(l.id) === data.locker_id);
    const lockerAutoFilled = selectedLocker?.customer_id && String(selectedLocker.customer_id) === data.customer_id;

    const canSubmit = !processing && !!data.store_name && !!data.store_tracking_number && !!data.declared_value;

    return (
        <AuthenticatedLayout>
            <Head title={t('pre_alerts.new')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href={route('pre-alerts.index')}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('pre_alerts.new')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('pre_alerts.new_subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── LEFT COLUMN ──────────────────────────────── */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* ── Card 1: Locker & Customer ──────────────── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <SectionTitle icon={<Inbox className="w-3.5 h-3.5" />} label={t('pre_alerts.locker_customer')} />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Locker */}
                                    <div>
                                        <FieldLabel required>{t('pre_alerts.locker')}</FieldLabel>
                                        <select
                                            value={data.locker_id}
                                            onChange={(e) => {
                                                const lockerId = e.target.value;
                                                const locker   = lockers.find(l => String(l.id) === lockerId);
                                                setData(prev => ({
                                                    ...prev,
                                                    locker_id:   lockerId,
                                                    customer_id: locker?.customer_id ? String(locker.customer_id) : prev.customer_id,
                                                }));
                                            }}
                                            className={`${base} ${errors.locker_id ? error : ''}`}
                                        >
                                            <option value="">{t('pre_alerts.select_locker')}</option>
                                            {lockers.map(l => (
                                                <option key={l.id} value={String(l.id)}>
                                                    {l.code}{l.address ? ` — ${l.address}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError msg={errors.locker_id} />

                                        {/* Locker address hint */}
                                        {selectedLocker?.address && (
                                            <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1">
                                                <span className="shrink-0 mt-px">📍</span>
                                                <span>{selectedLocker.address}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Customer */}
                                    {!isCustomerPortal && (
                                        <div>
                                            <FieldLabel optional>{t('pre_alerts.customer')}</FieldLabel>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                                <select
                                                    value={data.customer_id}
                                                    onChange={(e) => setData('customer_id', e.target.value)}
                                                    className={`${base} pl-9 ${errors.customer_id ? error : ''}`}
                                                >
                                                    <option value="">{t('pre_alerts.no_customer')}</option>
                                                    {customers.map(c => (
                                                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <FieldError msg={errors.customer_id} />
                                            {lockerAutoFilled && (
                                                <p className="text-xs text-indigo-500 mt-1.5">✓ Auto-filled from locker assignment</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Card 2: Store & Tracking ───────────────── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <SectionTitle icon={<Package className="w-3.5 h-3.5" />} label={t('pre_alerts.store_info')} />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Store name */}
                                    <div>
                                        <FieldLabel required>{t('pre_alerts.store')}</FieldLabel>
                                        <input
                                            type="text"
                                            value={data.store_name}
                                            onChange={(e) => setData('store_name', e.target.value)}
                                            placeholder="Amazon, eBay, Shein…"
                                            className={`${base} ${errors.store_name ? error : ''}`}
                                        />
                                        <FieldError msg={errors.store_name} />
                                    </div>

                                    {/* Tracking number */}
                                    <div>
                                        <FieldLabel required>{t('pre_alerts.tracking_number')}</FieldLabel>
                                        <input
                                            type="text"
                                            value={data.store_tracking_number}
                                            onChange={(e) => setData('store_tracking_number', e.target.value)}
                                            placeholder="1Z999AA10123456784"
                                            className={`${base} font-mono ${errors.store_tracking_number ? error : ''}`}
                                        />
                                        <FieldError msg={errors.store_tracking_number} />
                                    </div>

                                    {/* Store URL – full width */}
                                    <div className="sm:col-span-2">
                                        <FieldLabel optional>
                                            <LinkIcon className="w-3 h-3 inline mr-1 opacity-60" />
                                            {t('pre_alerts.store_url')}
                                        </FieldLabel>
                                        <input
                                            type="url"
                                            value={data.store_url}
                                            onChange={(e) => setData('store_url', e.target.value)}
                                            placeholder="https://www.amazon.com/dp/…"
                                            className={`${base} ${errors.store_url ? error : ''}`}
                                        />
                                        <FieldError msg={errors.store_url} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Card 3: Declared Value & Weight ───────── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <SectionTitle icon={<DollarSign className="w-3.5 h-3.5" />} label={t('pre_alerts.declared_info')} />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                    {/* Declared Value + Currency — joined money input */}
                                    <div className="sm:col-span-2">
                                        <FieldLabel required>{t('pre_alerts.declared_value')}</FieldLabel>
                                        <div className={`flex rounded-xl overflow-hidden border ${errors.declared_value ? 'border-red-300' : 'border-gray-200'} focus-within:ring-2 focus-within:ring-green-400 focus-within:border-green-400`}>
                                            {/* Currency selector — left side */}
                                            <select
                                                value={data.declared_currency}
                                                onChange={(e) => setData('declared_currency', e.target.value)}
                                                className="border-0 border-r border-gray-200 bg-gray-50 text-gray-700 text-sm font-semibold px-3 py-2.5 focus:outline-none focus:ring-0 shrink-0"
                                            >
                                                {CURRENCIES.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                            {/* Value input — right side */}
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={data.declared_value}
                                                onChange={(e) => setData('declared_value', e.target.value)}
                                                placeholder="0.00"
                                                className="flex-1 border-0 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-0 bg-white min-w-0"
                                            />
                                        </div>
                                        <FieldError msg={errors.declared_value} />
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            {t('pre_alerts.declared_value_hint') || 'Declared purchase value of the package contents'}
                                        </p>
                                    </div>

                                    {/* Declared weight */}
                                    <div>
                                        <FieldLabel optional>
                                            <Weight className="w-3 h-3 inline mr-1 opacity-60" />
                                            {t('pre_alerts.declared_weight_kg')}
                                        </FieldLabel>
                                        <div className={`flex rounded-xl overflow-hidden border ${errors.declared_weight_kg ? 'border-red-300' : 'border-gray-200'} focus-within:ring-2 focus-within:ring-green-400 focus-within:border-green-400`}>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={data.declared_weight_kg}
                                                onChange={(e) => setData('declared_weight_kg', e.target.value)}
                                                placeholder="0.00"
                                                className="flex-1 border-0 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-0 bg-white min-w-0"
                                            />
                                            <span className="border-0 border-l border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium px-3 py-2.5 flex items-center shrink-0">
                                                kg
                                            </span>
                                        </div>
                                        <FieldError msg={errors.declared_weight_kg} />
                                    </div>

                                    {/* Description */}
                                    <div className="sm:col-span-2">
                                        <FieldLabel optional>{t('pre_alerts.description')}</FieldLabel>
                                        <textarea
                                            rows={2}
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder={t('pre_alerts.description_placeholder')}
                                            className={`${base} resize-none`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Card 4: Invoice & Notes ────────────────── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <SectionTitle
                                    icon={<FileText className="w-3.5 h-3.5" />}
                                    label={t('pre_alerts.invoice_upload')}
                                    badge={t('common.optional')}
                                />

                                {/* Drop zone */}
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                        data.invoice_file
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                                    }`}
                                >
                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${data.invoice_file ? 'text-green-500' : 'text-gray-300'}`} />
                                    {data.invoice_file ? (
                                        <p className="text-sm font-medium text-green-700">{data.invoice_file.name}</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-500">{t('pre_alerts.drop_invoice')}</p>
                                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG · {t('pre_alerts.max_10mb')}</p>
                                        </>
                                    )}
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".pdf,image/*"
                                        className="hidden"
                                        onChange={(e) => setData('invoice_file', e.target.files?.[0] ?? null)}
                                    />
                                </div>
                                <FieldError msg={errors.invoice_file} />

                                {/* Internal notes */}
                                <div className="mt-5">
                                    <FieldLabel optional>{t('pre_alerts.notes')}</FieldLabel>
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder={t('pre_alerts.notes_placeholder') || 'Internal notes for the operator…'}
                                        className={`${base} resize-none`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN: Summary + Actions ──────────── */}
                        <div className="space-y-5">

                            {/* Live summary card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                    {t('pre_alerts.summary')}
                                </h3>

                                <div className="space-y-4">
                                    <SummaryRow
                                        icon={<Inbox className="w-4 h-4 text-indigo-500" />}
                                        bg="bg-indigo-50"
                                        label={t('pre_alerts.locker')}
                                        value={selectedLocker?.code}
                                        mono
                                    />
                                    <SummaryRow
                                        icon={<Package className="w-4 h-4 text-green-500" />}
                                        bg="bg-green-50"
                                        label={t('pre_alerts.store')}
                                        value={data.store_name}
                                    />
                                    <SummaryRow
                                        icon={<DollarSign className="w-4 h-4 text-amber-500" />}
                                        bg="bg-amber-50"
                                        label={t('pre_alerts.declared_value')}
                                        value={data.declared_value
                                            ? `${data.declared_currency} ${parseFloat(data.declared_value).toFixed(2)}`
                                            : undefined}
                                    />
                                    {data.declared_weight_kg && (
                                        <SummaryRow
                                            icon={<Weight className="w-4 h-4 text-sky-500" />}
                                            bg="bg-sky-50"
                                            label={t('pre_alerts.declared_weight_kg')}
                                            value={`${data.declared_weight_kg} kg`}
                                        />
                                    )}
                                    {data.invoice_file && (
                                        <SummaryRow
                                            icon={<FileText className="w-4 h-4 text-violet-500" />}
                                            bg="bg-violet-50"
                                            label={t('pre_alerts.invoice_upload')}
                                            value={data.invoice_file.name}
                                        />
                                    )}
                                </div>

                                {/* Required fields progress */}
                                <div className="mt-5 pt-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 mb-2">{t('pre_alerts.required_fields')}</p>
                                    <div className="flex gap-1.5">
                                        {[
                                            { key: 'store', filled: !!data.store_name },
                                            { key: 'tracking', filled: !!data.store_tracking_number },
                                            { key: 'value', filled: !!data.declared_value },
                                        ].map(({ key, filled }) => (
                                            <div
                                                key={key}
                                                className={`h-1.5 flex-1 rounded-full transition-colors ${filled ? 'bg-green-500' : 'bg-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {processing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Package className="w-4 h-4" />}
                                    {processing ? t('common.saving') : t('pre_alerts.create')}
                                </button>
                                <Link
                                    href={route('pre-alerts.index')}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('common.cancel')}
                                </Link>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

/* ── Tiny shared sub-components ─────────────────────────────────────────── */

function SectionTitle({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) {
    return (
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            {icon}
            {label}
            {badge && <span className="ml-1 text-gray-300 font-normal normal-case tracking-normal">({badge})</span>}
        </h3>
    );
}

function FieldLabel({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
    return (
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
            {optional && <span className="ml-1 text-gray-400 font-normal">({useTranslation().t('common.optional')})</span>}
        </label>
    );
}

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

function SummaryRow({ icon, bg, label, value, mono }: {
    icon:   React.ReactNode;
    bg:     string;
    label:  string;
    value?: string;
    mono?:  boolean;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-sm font-semibold text-gray-800 truncate ${mono ? 'font-mono' : ''}`}>
                    {value ?? <span className="text-gray-300 font-normal">—</span>}
                </p>
            </div>
        </div>
    );
}
