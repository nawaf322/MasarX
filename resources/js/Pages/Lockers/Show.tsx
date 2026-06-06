import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, FormEventHandler } from 'react';
import Swal from 'sweetalert2';
import {
    ArrowLeft, Inbox, User, MapPin, Calendar, FileText,
    Package, CheckCircle, Clock, ExternalLink, Pencil, Trash2, Loader2,
} from 'lucide-react';

interface Customer { id: number; name: string; email: string }
interface Warehouse { id: number; name: string }

interface PreAlert {
    id: number;
    store_name: string;
    store_tracking_number: string;
    declared_value: number;
    declared_currency: string;
    status: string;
    received_at: string | null;
    created_at: string;
}

interface Locker {
    id: number;
    code: string;
    address: string | null;
    status: 'active' | 'inactive' | 'suspended';
    customer: Customer | null;
    warehouse: Warehouse | null;
    notes: string | null;
    assigned_at: string | null;
    expires_at: string | null;
    pre_alerts: PreAlert[];
    pre_alerts_count: number;
}

interface Props {
    locker: Locker;
    customers: Customer[];
    warehouses: Warehouse[];
}

const statusColors: Record<string, string> = {
    active:    'bg-green-100 text-green-800',
    inactive:  'bg-gray-100 text-gray-600',
    suspended: 'bg-red-100 text-red-700',
};

const preAlertStatusColors: Record<string, string> = {
    pending:    'bg-yellow-100 text-yellow-800',
    received:   'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    converted:  'bg-green-100 text-green-800',
    cancelled:  'bg-red-100 text-red-700',
};

export default function LockersShow({ locker, customers, warehouses }: Props) {
    const { t } = useTranslation();
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = props.flash;
    const [editing, setEditing] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        customer_id:  locker.customer?.id ? String(locker.customer.id) : '',
        warehouse_id: locker.warehouse?.id ? String(locker.warehouse.id) : '',
        code:         locker.code,
        address:      locker.address ?? '',
        status:       locker.status,
        expires_at:   locker.expires_at ? locker.expires_at.substring(0, 10) : '',
        notes:        locker.notes ?? '',
    });

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('lockers.update', locker.id), {
            onSuccess: () => setEditing(false),
        });
    };

    function handleDelete() {
        Swal.fire({
            title: t('lockers.confirm_delete'),
            text:  t('lockers.confirm_delete_text'),
            icon:  'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonText:   t('common.cancel'),
            confirmButtonText:  t('common.delete'),
        }).then(result => {
            if (result.isConfirmed) {
                router.delete(route('lockers.destroy', locker.id));
            }
        });
    }

    const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700";

    return (
        <AuthenticatedLayout>
            <Head title={`${t('lockers.title')} · ${locker.code}`} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {flash.error}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href={route('lockers.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Inbox className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 font-mono">{locker.code}</h1>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[locker.status]}`}>
                                {t(`lockers.status_${locker.status}`)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {locker.customer ? locker.customer.name : t('lockers.unassigned')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditing(!editing)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            {t('common.edit')}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('common.delete')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: info / edit form */}
                    <div className="lg:col-span-1 space-y-5">
                        {editing ? (
                            <form onSubmit={submitEdit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('common.edit')}</h3>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.customer')}</label>
                                    <select value={data.customer_id} onChange={e => setData('customer_id', e.target.value)} className={inputClass}>
                                        <option value="">{t('lockers.no_customer')}</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={String(c.id)}>{c.name}</option>
                                        ))}
                                    </select>
                                    {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.warehouse')}</label>
                                    <select value={data.warehouse_id} onChange={e => setData('warehouse_id', e.target.value)} className={inputClass}>
                                        <option value="">{t('lockers.no_warehouse')}</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={String(w.id)}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.code')} *</label>
                                    <input type="text" value={data.code} onChange={e => setData('code', e.target.value.toUpperCase())} className={inputClass + ' font-mono'} />
                                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.status')}</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className={inputClass}>
                                        <option value="active">{t('lockers.status_active')}</option>
                                        <option value="inactive">{t('lockers.status_inactive')}</option>
                                        <option value="suspended">{t('lockers.status_suspended')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.address')}</label>
                                    <textarea rows={2} value={data.address} onChange={e => setData('address', e.target.value)} className={inputClass + ' resize-none'} />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.expires_at')}</label>
                                    <input type="date" value={data.expires_at} onChange={e => setData('expires_at', e.target.value)} className={inputClass} />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('lockers.notes')}</label>
                                    <textarea rows={2} value={data.notes} onChange={e => setData('notes', e.target.value)} className={inputClass + ' resize-none'} />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors"
                                    >
                                        {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {t('common.save')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('lockers.details')}</h3>

                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">{t('lockers.customer')}</p>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {locker.customer ? locker.customer.name : <span className="text-orange-500">{t('lockers.unassigned')}</span>}
                                        </p>
                                        {locker.customer && <p className="text-xs text-gray-400">{locker.customer.email}</p>}
                                    </div>
                                </div>

                                {locker.warehouse && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('lockers.warehouse')}</p>
                                            <p className="text-sm font-semibold text-gray-800">{locker.warehouse.name}</p>
                                        </div>
                                    </div>
                                )}

                                {locker.address && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('lockers.address')}</p>
                                            <p className="text-sm text-gray-700">{locker.address}</p>
                                        </div>
                                    </div>
                                )}

                                {locker.expires_at && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                            <Calendar className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('lockers.expires_at')}</p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {new Date(locker.expires_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {locker.notes && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('lockers.notes')}</p>
                                            <p className="text-sm text-gray-600">{locker.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New pre-alert CTA */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">{t('lockers.pre_alerts_count')}</p>
                            <p className="text-3xl font-bold text-indigo-800 mb-3">{locker.pre_alerts_count}</p>
                            <Link
                                href={route('pre-alerts.create') + `?locker_id=${locker.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                + {t('pre_alerts.new')}
                            </Link>
                        </div>
                    </div>

                    {/* Right: pre-alerts list */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700">{t('lockers.pre_alerts_tab')}</h3>
                            </div>
                            {locker.pre_alerts.length === 0 ? (
                                <div className="px-6 py-12 text-center text-sm text-gray-400">
                                    {t('lockers.no_pre_alerts')}
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.store')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.tracking_number')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.declared_value')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.status')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pre_alerts.created_at')}</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {locker.pre_alerts.map(pa => (
                                            <tr key={pa.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{pa.store_name}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">{pa.store_tracking_number}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {pa.declared_currency} {Number(pa.declared_value).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${preAlertStatusColors[pa.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                        {t(`pre_alerts.status_${pa.status}`)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {new Date(pa.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={route('pre-alerts.show', pa.id)}
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        {t('common.view')}
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
