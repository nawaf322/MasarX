import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import Swal from 'sweetalert2';
import { useState } from 'react';
import {
    Printer, CheckCircle, Clock, Truck, XCircle, ArrowLeft,
    MapPin, Phone, User as UserIcon, Calendar, Package,
    AlertTriangle, Image as ImageIcon, ClipboardCheck,
    Radio, WifiOff, ChevronDown, Camera,
} from 'lucide-react';

interface User      { id: number; name: string }
interface Shipment  { id: number; tracking_number: string; status: string }

interface Driver {
    id: number;
    name: string;
    phone: string | null;
    gps_active: boolean;
    last_seen_at: string | null;
}

interface OriginPickup {
    id: number;
    shipment: Shipment;
    requested_by: User;
    confirmed_by: User | null;
    driver: Driver | null;
    assigned_at: string | null;
    driver_notified_at: string | null;
    contact_name: string;
    contact_phone: string;
    pickup_address: string;
    special_instructions: string | null;
    notes: string | null;
    scheduled_for: string;
    confirmed_at: string | null;
    completed_at: string | null;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    photos: string[] | null;
}

interface Props {
    pickup: OriginPickup;
    availableDrivers: Driver[];
    is_driver_view?: boolean;
}

const STATUS_STYLES: Record<string, { badge: string; bar: string; icon: React.ElementType; label_key: string }> = {
    pending:   { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', bar: 'bg-yellow-400',  icon: Clock,       label_key: 'status_pending' },
    confirmed: { badge: 'bg-blue-100 text-blue-800 border-blue-200',       bar: 'bg-blue-500',    icon: Truck,       label_key: 'status_confirmed' },
    completed: { badge: 'bg-green-100 text-green-800 border-green-200',    bar: 'bg-green-500',   icon: CheckCircle, label_key: 'status_completed' },
    cancelled: { badge: 'bg-red-100 text-red-800 border-red-200',          bar: 'bg-red-400',     icon: XCircle,     label_key: 'status_cancelled' },
};

type StepStatus = 'done' | 'active' | 'upcoming';

export default function PickupsShow({ pickup, availableDrivers, is_driver_view = false }: Props) {
    const { t } = useTranslation();
    const [showAssignForm, setShowAssignForm] = useState(false);

    const assignForm = useForm({ driver_id: pickup.driver?.id ? String(pickup.driver.id) : '' });
    const uploadForm = useForm<{ photos: File[] }>({ photos: [] });

    function submitAssign(e: React.FormEvent) {
        e.preventDefault();
        assignForm.post(route('pickups.assign', pickup.id), {
            onSuccess: () => setShowAssignForm(false),
        });
    }

    const pickupRef = `PKP-${String(pickup.id).padStart(6, '0')}`;
    const statusStyle = STATUS_STYLES[pickup.status] ?? STATUS_STYLES.pending;
    const StatusIcon = statusStyle.icon;

    function handleCancel() {
        Swal.fire({
            title: t('pickups.cancel_confirm'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: t('pickups.cancel'),
            cancelButtonText: t('common.cancel'),
            reverseButtons: true,
            customClass: { popup: 'rounded-2xl shadow-2xl' },
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('pickups.cancel', pickup.id));
            }
        });
    }

    // ── Timeline ──────────────────────────────────────────────────────────────
    const isCancelled = pickup.status === 'cancelled';

    const timelineSteps = isCancelled
        ? [
            { key: 'pending',   label: t('pickups.step_pending'),   ts: pickup.scheduled_for, icon: Clock,       ring: 'ring-yellow-400', iconColor: 'text-yellow-500', bg: 'bg-yellow-50' },
            { key: 'cancelled', label: t('pickups.step_cancelled'), ts: null,                  icon: XCircle,     ring: 'ring-red-400',    iconColor: 'text-red-500',    bg: 'bg-red-50' },
          ]
        : [
            { key: 'pending',   label: t('pickups.step_pending'),   ts: pickup.scheduled_for, icon: Clock,       ring: 'ring-yellow-400', iconColor: 'text-yellow-500', bg: 'bg-yellow-50' },
            { key: 'confirmed', label: t('pickups.step_confirmed'), ts: pickup.confirmed_at,  icon: Truck,       ring: 'ring-blue-400',   iconColor: 'text-blue-500',   bg: 'bg-blue-50' },
            { key: 'completed', label: t('pickups.step_completed'), ts: pickup.completed_at,  icon: CheckCircle, ring: 'ring-green-400',  iconColor: 'text-green-500',  bg: 'bg-green-50' },
          ];

    const statusOrder: Record<string, number> = { pending: 0, confirmed: 1, completed: 2, cancelled: 99 };
    const currentOrder = statusOrder[pickup.status] ?? 0;

    function getStepStatus(key: string): StepStatus {
        if (isCancelled) return key === 'cancelled' ? 'active' : 'done';
        const o = statusOrder[key] ?? 0;
        if (o < currentOrder)  return 'done';
        if (o === currentOrder) return 'active';
        return 'upcoming';
    }

    // ── Info row helper ───────────────────────────────────────────────────────
    const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) => (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
            </div>
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title={`${t('pickups.detail')} ${pickupRef}`} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* ── Top bar ── */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('pickups.index')}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('pickups.pickup_ref')}</p>
                            <h1 className="text-2xl font-bold text-gray-900 font-mono">{pickupRef}</h1>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusStyle.badge}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {t(`pickups.${statusStyle.label_key}`)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {(pickup.status === 'pending' || pickup.status === 'confirmed') && (
                            <Link
                                href={is_driver_view
                                    ? route('pickups.complete.form', pickup.id)
                                    : route('pickups.confirm.form', pickup.id)
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <ClipboardCheck className="w-4 h-4" />
                                {is_driver_view ? (t('pickups.complete') || 'Complete') : (pickup.status === 'pending' ? t('pickups.confirm') : t('pickups.complete'))}
                            </Link>
                        )}
                        {!is_driver_view && pickup.status !== 'completed' && pickup.status !== 'cancelled' && (
                            <button
                                onClick={handleCancel}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                {t('pickups.cancel')}
                            </button>
                        )}
                        <a
                            href={route('pickups.print', pickup.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            {t('pickups.print')}
                        </a>
                    </div>
                </div>

                {/* ── Timeline ── */}
                <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6 mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">{t('pickups.timeline')}</p>
                    <div className="flex items-start">
                        {timelineSteps.map((step, idx) => {
                            const status = getStepStatus(step.key);
                            const Icon = step.icon;
                            return (
                                <div key={step.key} className="flex items-start flex-1">
                                    <div className="flex flex-col items-center">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all
                                            ${status === 'active'   ? `${step.bg} ring-2 ${step.ring} shadow-sm` : ''}
                                            ${status === 'done'     ? 'bg-gray-100' : ''}
                                            ${status === 'upcoming' ? 'bg-gray-50 border-2 border-dashed border-gray-200' : ''}
                                        `}>
                                            <Icon className={`w-5 h-5
                                                ${status === 'active'   ? step.iconColor : ''}
                                                ${status === 'done'     ? 'text-gray-400' : ''}
                                                ${status === 'upcoming' ? 'text-gray-200' : ''}
                                            `} />
                                        </div>
                                        <p className={`text-xs font-semibold mt-2 text-center
                                            ${status === 'active'   ? 'text-gray-900' : ''}
                                            ${status === 'done'     ? 'text-gray-400' : ''}
                                            ${status === 'upcoming' ? 'text-gray-300' : ''}
                                        `}>{step.label}</p>
                                        {step.ts && status !== 'upcoming' && (
                                            <p className="text-xs text-gray-400 mt-0.5 text-center">
                                                {new Date(step.ts).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    {idx < timelineSteps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mt-5 mx-3 rounded-full transition-colors
                                            ${getStepStatus(timelineSteps[idx + 1].key) !== 'upcoming' ? statusStyle.bar : 'bg-gray-200'}
                                        `} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── 3-column grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left: Shipment + Contact ── */}
                    <div className="space-y-6">
                        {/* Shipment card */}
                        {pickup.shipment && (
                            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Package className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pickups.shipment_label')}</h2>
                                </div>
                                <InfoRow icon={Package} label={t('pickups.tracking_col')} value={
                                    is_driver_view ? (
                                        <Link href={route('tracking.index', { tracking_number: pickup.shipment.tracking_number })} className="font-mono text-blue-600 hover:underline">
                                            {pickup.shipment.tracking_number}
                                        </Link>
                                    ) : (
                                        <Link href={route('shipments.show', pickup.shipment.id)} className="font-mono text-blue-600 hover:underline">
                                            {pickup.shipment.tracking_number}
                                        </Link>
                                    )
                                } />
                                <InfoRow icon={ClipboardCheck} label={t('pickups.status')} value={
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${statusStyle.badge}`}>
                                        {t(`pickups.${statusStyle.label_key}`)}
                                    </span>
                                } />
                            </div>
                        )}

                        {/* Contact card */}
                        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-purple-500" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pickups.contact_name')}</h2>
                            </div>
                            <InfoRow icon={UserIcon} label={t('pickups.contact_name')} value={pickup.contact_name} />
                            <InfoRow icon={Phone}    label={t('pickups.contact_phone')} value={
                                <a href={`tel:${pickup.contact_phone}`} className="text-blue-600 hover:underline">{pickup.contact_phone}</a>
                            } />
                            <InfoRow icon={MapPin}   label={t('pickups.pickup_address')} value={pickup.pickup_address} />
                        </div>

                        {/* Driver card */}
                        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-5">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <Truck className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pickups.assign_driver')}</h2>
                                </div>
                                {!is_driver_view && pickup.status !== 'completed' && pickup.status !== 'cancelled' && (
                                    <button
                                        onClick={() => setShowAssignForm(v => !v)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                    >
                                        {pickup.driver ? t('pickups.reassign_driver') : t('pickups.assign_driver')}
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAssignForm ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {pickup.driver ? (
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pickup.driver.gps_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                                        {pickup.driver.gps_active
                                            ? <Radio className="w-4 h-4 text-green-600" />
                                            : <WifiOff className="w-4 h-4 text-gray-400" />
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">{pickup.driver.name}</p>
                                        {pickup.driver.phone && (
                                            <a href={`tel:${pickup.driver.phone}`} className="text-xs text-blue-600 hover:underline">{pickup.driver.phone}</a>
                                        )}
                                        <p className={`text-xs mt-0.5 font-medium ${pickup.driver.gps_active ? 'text-green-600' : 'text-gray-400'}`}>
                                            {pickup.driver.gps_active ? t('pickups.gps_active') : t('pickups.gps_inactive')}
                                        </p>
                                        {pickup.assigned_at && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {t('pickups.assigned_driver')}: {new Date(pickup.assigned_at).toLocaleString()}
                                            </p>
                                        )}
                                        {pickup.driver_notified_at && (
                                            <p className="text-xs text-green-600 mt-0.5">✓ {t('pickups.driver_notified')}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic py-1">{t('pickups.no_driver')}</p>
                            )}

                            {showAssignForm && (
                                <form onSubmit={submitAssign} className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                                    <select
                                        value={assignForm.data.driver_id}
                                        onChange={e => assignForm.setData('driver_id', e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-700"
                                    >
                                        <option value="">{t('pickups.no_driver')}</option>
                                        {availableDrivers.map(d => (
                                            <option key={d.id} value={String(d.id)}>
                                                {d.gps_active ? '🟢' : '⚪'} {d.name}{d.phone ? ` · ${d.phone}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={assignForm.processing}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                                        >
                                            <Truck className="w-3.5 h-3.5" />
                                            {t('pickups.driver_assigned')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAssignForm(false)}
                                            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* ── Middle: Schedule + Instructions ── */}
                    <div className="space-y-6">
                        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-amber-500" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pickups.scheduled_for')}</h2>
                            </div>
                            <InfoRow icon={Calendar}  label={t('pickups.scheduled_for')}  value={new Date(pickup.scheduled_for).toLocaleString()} />
                            <InfoRow icon={UserIcon}  label={t('pickups.requested_by')}   value={pickup.requested_by?.name ?? '—'} />
                            {pickup.confirmed_by && (
                                <InfoRow icon={CheckCircle} label={t('pickups.confirmed_by')} value={pickup.confirmed_by.name} />
                            )}
                            {pickup.confirmed_at && (
                                <InfoRow icon={Clock} label={t('pickups.confirmed_at')} value={new Date(pickup.confirmed_at).toLocaleString()} />
                            )}
                            {pickup.completed_at && (
                                <InfoRow icon={CheckCircle} label={t('pickups.completed_at')} value={new Date(pickup.completed_at).toLocaleString()} />
                            )}
                            {pickup.notes && (
                                <InfoRow icon={ClipboardCheck} label={t('pickups.notes')} value={pickup.notes} />
                            )}
                        </div>

                        {/* Special instructions */}
                        {pickup.special_instructions && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">{t('pickups.special_instructions')}</h2>
                                </div>
                                <p className="text-sm text-amber-900 leading-relaxed">{pickup.special_instructions}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Evidence Photos ── */}
                    <div>
                        <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-green-500" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pickups.evidence')}</h2>
                                {pickup.photos && pickup.photos.length > 0 && (
                                    <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {pickup.photos.length}
                                    </span>
                                )}
                            </div>
                            {/* Upload photos button */}
                            {['pending', 'confirmed'].includes(pickup.status) && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (uploadForm.data.photos.length === 0) return;
                                        uploadForm.post(route('pickups.upload-photos', pickup.id), {
                                            preserveScroll: true,
                                            onSuccess: () => uploadForm.reset('photos'),
                                        });
                                    }}
                                    className="mb-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg cursor-pointer hover:bg-green-700 transition-colors">
                                            <Camera className="w-4 h-4" />
                                            {t('pickups.take_photo') || 'Take Photo'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => uploadForm.setData('photos', Array.from(e.target.files ?? []))}
                                            />
                                        </label>
                                        {uploadForm.data.photos.length > 0 && (
                                            <>
                                                <span className="text-xs text-gray-500">
                                                    {uploadForm.data.photos.length} file(s)
                                                </span>
                                                <button
                                                    type="submit"
                                                    disabled={uploadForm.processing}
                                                    className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {uploadForm.processing ? 'Uploading...' : (t('pickups.upload') || 'Upload')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {uploadForm.errors.photos && (
                                        <p className="text-xs text-red-500 mt-1">{uploadForm.errors.photos}</p>
                                    )}
                                </form>
                            )}
                            {pickup.photos && pickup.photos.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                                    {pickup.photos.map((photo, i) => (
                                        <a
                                            key={i}
                                            href={`/storage/${photo}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group block relative overflow-hidden rounded-xl border border-gray-100"
                                        >
                                            <img
                                                src={`/storage/${photo}`}
                                                alt={`Photo ${i + 1}`}
                                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <ImageIcon className="w-10 h-10 text-gray-200 mb-2" />
                                    <p className="text-sm text-gray-400 italic">{t('pickups.no_evidence')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
