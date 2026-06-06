import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { FormEventHandler, useEffect } from 'react';
import { ArrowLeft, Inbox, User, MapPin, Calendar, FileText, Loader2, RefreshCw, Lock } from 'lucide-react';
import axios from 'axios';

interface Customer  { id: number; name: string; email: string }
interface Warehouse { id: number; name: string; address: string | null; code: string | null }

interface Props {
    customers:      Customer[];
    warehouses:     Warehouse[];
    suggestedCode:  string;
    lockerSettings: { code_prefix: string; code_format: string; code_length: number };
}

export default function LockersCreate({ customers, warehouses, suggestedCode, lockerSettings }: Props) {
    const { t } = useTranslation();

    const { data, setData, post, processing, errors } = useForm({
        customer_id:  '',
        warehouse_id: '',
        code:         suggestedCode,
        address:      '',
        status:       'active',
        expires_at:   '',
        notes:        '',
    });

    // Auto-fill address when warehouse changes
    useEffect(() => {
        if (!data.warehouse_id) return;
        const wh = warehouses.find(w => String(w.id) === data.warehouse_id);
        if (wh?.address) {
            setData('address', wh.address);
        }
    }, [data.warehouse_id]);

    async function regenerateCode() {
        try {
            const res = await axios.get(route('settings.lockers.preview'));
            setData('code', res.data.code);
        } catch {
            // fallback: use current suggestedCode pattern
        }
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('lockers.store'));
    };

    const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-700";

    return (
        <AuthenticatedLayout>
            <Head title={t('lockers.new')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href={route('lockers.index')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Inbox className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('lockers.new')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('lockers.new_subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        <div className="lg:col-span-2 space-y-5">

                            {/* Locker Code — auto-generated, shown first */}
                            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Lock className="w-3.5 h-3.5" />
                                    {t('lockers.code_section')}
                                </h3>

                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('lockers.code')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.code}
                                            onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                            className={inputClass + ' font-mono text-lg font-bold tracking-wider'}
                                            placeholder="LCK-XXXXXX"
                                            required
                                        />
                                        {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            {t('lockers.code_auto_hint')} · {t('lockers.code_format_label')}: <span className="font-medium">{lockerSettings.code_format}</span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regenerateCode}
                                        title={t('lockers.regenerate')}
                                        className="mb-7 p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center gap-3">
                                    <Inbox className="w-5 h-5 text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-indigo-500 font-medium">{t('lockers.code_preview_label')}</p>
                                        <p className="text-xl font-bold font-mono text-indigo-700 tracking-widest">{data.code || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Assignment */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />
                                    {t('lockers.assignment')}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('lockers.customer')}
                                            <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                        </label>
                                        <select value={data.customer_id} onChange={(e) => setData('customer_id', e.target.value)} className={inputClass}>
                                            <option value="">{t('lockers.no_customer')}</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={String(c.id)}>{c.name} — {c.email}</option>
                                            ))}
                                        </select>
                                        {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('lockers.warehouse')}
                                            <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                        </label>
                                        <select value={data.warehouse_id} onChange={(e) => setData('warehouse_id', e.target.value)} className={inputClass}>
                                            <option value="">{t('lockers.no_warehouse')}</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={String(w.id)}>{w.name}{w.address ? ` — ${w.address.slice(0, 40)}` : ''}</option>
                                            ))}
                                        </select>
                                        {errors.warehouse_id && <p className="text-red-500 text-xs mt-1">{errors.warehouse_id}</p>}
                                        {data.warehouse_id && warehouses.find(w => String(w.id) === data.warehouse_id)?.address && (
                                            <p className="text-xs text-green-600 mt-1.5">✓ {t('lockers.address_auto_filled')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {t('lockers.shipping_address_title')}
                                </h3>
                                <p className="text-xs text-gray-400 mb-3">{t('lockers.shipping_address_hint')}</p>
                                <textarea
                                    rows={3}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder={t('lockers.address_placeholder')}
                                    className={inputClass + ' resize-none'}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('lockers.status')} <span className="text-red-500">*</span>
                                        </label>
                                        <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={inputClass}>
                                            <option value="active">{t('lockers.status_active')}</option>
                                            <option value="inactive">{t('lockers.status_inactive')}</option>
                                            <option value="suspended">{t('lockers.status_suspended')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {t('lockers.expires_at')}
                                            <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                        </label>
                                        <input type="date" value={data.expires_at} onChange={(e) => setData('expires_at', e.target.value)} className={inputClass} />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                        <FileText className="w-3 h-3 inline mr-1" />
                                        {t('lockers.notes')}
                                        <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                    </label>
                                    <textarea rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} className={inputClass + ' resize-none'} />
                                </div>
                            </div>
                        </div>

                        {/* Right: summary + submit */}
                        <div className="space-y-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('lockers.summary')}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                            <Inbox className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('lockers.code')}</p>
                                            <p className="text-sm font-mono font-bold text-indigo-700 tracking-wider">{data.code || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('lockers.customer')}</p>
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {customers.find(c => String(c.id) === data.customer_id)?.name || '—'}
                                            </p>
                                        </div>
                                    </div>
                                    {data.address && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                <MapPin className="w-4 h-4 text-green-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-400">{t('lockers.address')}</p>
                                                <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{data.address}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={processing || !data.code}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors shadow-sm"
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
                                    {processing ? t('common.saving') : t('lockers.create')}
                                </button>
                                <Link href={route('lockers.index')} className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">
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
