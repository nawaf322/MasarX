import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Badge } from "@/Components/UI/badge";
import { Search, Package, MapPin, Truck, AlertCircle, CheckCircle2, RotateCcw, Camera, RefreshCw, Clock } from "lucide-react";
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { formatDate, formatWeight } from '@/utils/localeFormat';
import { useTranslation } from '@/hooks/useTranslation';

const TRACKING_REGEX = /^[A-Za-z0-9\-]+$/;
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'returned'];
const REFRESH_INTERVAL_MS = 30_000;

export default function TrackingIndex({ shipment, trackingNumber, isAuthenticated = false, queryStatus = null }: { shipment?: any, trackingNumber?: string, isAuthenticated?: boolean, queryStatus?: 'success' | 'not_found' | 'invalid' | null }) {
    const { t } = useTranslation();
    const [podPreview, setPodPreview] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (!trackingNumber || !shipment) return;
        if (TERMINAL_STATUSES.includes(shipment?.status ?? '')) return;
        timerRef.current = setInterval(() => {
            router.reload({ only: ['shipment', 'queryStatus'] });
        }, REFRESH_INTERVAL_MS);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [trackingNumber, shipment?.status]);

    const { data, setData, get, processing, setError, errors, clearErrors } = useForm({
        tracking_number: trackingNumber || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();
        const value = (data.tracking_number || '').trim();
        if (!value) return;
        if (!TRACKING_REGEX.test(value)) {
            setError('tracking_number', t('tracking.query_invalid_input'));
            return;
        }
        get(route('tracking.index', { tracking_number: value }));
    };

    const statusConfig: Record<string, { gradient: string; icon: typeof Truck }> = {
        pending:          { gradient: 'from-amber-500 to-orange-500',    icon: Clock },
        picked_up:        { gradient: 'from-sky-500 to-blue-500',       icon: Package },
        in_transit:       { gradient: 'from-blue-500 to-indigo-600',    icon: Truck },
        out_for_delivery: { gradient: 'from-violet-500 to-purple-600',  icon: Truck },
        delivered:        { gradient: 'from-emerald-500 to-green-600',  icon: CheckCircle2 },
        cancelled:        { gradient: 'from-red-500 to-rose-600',       icon: AlertCircle },
        returned:         { gradient: 'from-gray-500 to-slate-600',     icon: RotateCcw },
    };
    const cfg = statusConfig[shipment?.status ?? ''] ?? statusConfig.pending;
    const StatusIcon = cfg.icon;

    const statusLabel = (status: string) => {
        const key = `tracking.status.${status}`;
        const val = t(key);
        return val !== key ? val : status.replace(/_/g, ' ');
    };

    const content = (
        <>
            <Head title={t('tracking.title')} />

            <div className={`${!isAuthenticated ? 'min-h-screen w-full' : ''} flex flex-col`}>
                {/* Top bar for public */}
                {!isAuthenticated && (
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white/80 backdrop-blur border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                                <Package className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">MasarX</span>
                        </div>
                        <div className="flex gap-2">
                            <Link href={route('login')} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition">
                                {t('auth.sign_in')}
                            </Link>
                            <Link href={route('register')} className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                                {t('auth.sign_up')}
                            </Link>
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className={`flex-1 flex flex-col items-center ${!isAuthenticated ? 'justify-center px-4 py-10' : 'py-8 px-4 sm:px-6 lg:px-8'}`}>

                    {/* Search */}
                    <div className="w-full max-w-lg text-center mb-8">
                        <h1 className={`font-bold text-gray-900 tracking-tight ${!isAuthenticated ? 'text-2xl mb-2' : 'text-3xl mb-3'}`}>
                            {t('tracking.track_your_package')}
                        </h1>
                        <p className="text-gray-500 text-sm mb-6">{t('tracking.instructions')}</p>

                        <form onSubmit={submit}>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={data.tracking_number}
                                        onChange={e => setData('tracking_number', e.target.value)}
                                        placeholder={t('tracking.placeholder')}
                                        className={`pl-10 h-11 text-sm rounded-xl ${errors.tracking_number ? 'ring-2 ring-red-300' : ''}`}
                                    />
                                </div>
                                <Button type="submit" disabled={processing} className="h-11 px-5 rounded-xl font-semibold text-sm">
                                    {t('tracking.track_btn')}
                                </Button>
                            </div>
                            {errors.tracking_number && (
                                <p className="mt-2 text-xs text-red-600">{errors.tracking_number}</p>
                            )}
                        </form>
                    </div>

                    {/* Results */}
                    {shipment ? (
                        <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">

                            {/* Status header */}
                            <div className={`bg-gradient-to-br ${cfg.gradient} text-white rounded-2xl p-5 relative overflow-hidden`}>
                                <div className="absolute right-0 top-0 opacity-10">
                                    <Truck className="h-32 w-32 -mr-6 -mt-6" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <StatusIcon className="h-5 w-5" />
                                        <span className="text-white/80 text-xs font-medium">{shipment.tracking_number}</span>
                                    </div>
                                    <h2 className="text-xl font-bold capitalize mb-1">
                                        {statusLabel(shipment.status || 'pending')}
                                    </h2>
                                    {shipment.expected_delivery_date && (
                                        <p className="text-white/80 text-sm">
                                            {t('tracking.expected_delivery')}: {formatDate(shipment.expected_delivery_date)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Return banner */}
                            {shipment.return_status && shipment.return_status !== 'rejected' && (
                                <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-orange-50 text-orange-700 border border-orange-100">
                                    <RotateCcw className="h-4 w-4 shrink-0" />
                                    <span>{t(`returns.status_${shipment.return_status}`)}</span>
                                </div>
                            )}

                            {/* Timeline */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('tracking.title')}</h3>
                                </div>
                                <div className="p-5">
                                    {shipment.history && shipment.history.length > 0 ? (
                                        <div className="space-y-4">
                                            {shipment.history.map((event: any, index: number) => (
                                                <div key={event.id} className="flex gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-300'}`} />
                                                        {index < shipment.history.length - 1 && (
                                                            <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <p className={`text-sm font-medium ${index === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                                                            {event.description}
                                                        </p>
                                                        {event.location && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{event.location}</p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(event.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">{t('tracking.awaiting_updates')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-semibold text-gray-500 uppercase">{t('tracking.destination')}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {shipment.receiver_details?.city || '—'}
                                    </p>
                                    <p className="text-xs text-gray-400">{shipment.receiver_details?.country || '—'}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-semibold text-gray-500 uppercase">{t('tracking.package_info')}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatWeight(shipment.package_details?.weight ?? shipment.package_details?.[0]?.weight)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {shipment.package_details?.pieces ?? shipment.package_details?.[0]?.pieces ?? 1} {t('tracking.pieces')}
                                    </p>
                                </div>
                            </div>

                            {/* Proof of Delivery */}
                            {shipment.proof_of_delivery && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-emerald-600" />
                                        <span className="text-sm font-semibold text-emerald-800">Proof of Delivery</span>
                                    </div>
                                    <div className="p-4 space-y-2 text-sm">
                                        {shipment.proof_of_delivery.recipient_name && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">{t('tracking.signed_by')}:</span>
                                                <span className="font-medium">{shipment.proof_of_delivery.recipient_name}</span>
                                            </div>
                                        )}
                                        {shipment.proof_of_delivery.delivered_at && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Delivered:</span>
                                                <span className="font-medium">{new Date(shipment.proof_of_delivery.delivered_at).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {shipment.proof_of_delivery.signature && (
                                            <div className="pt-2">
                                                <p className="text-xs text-gray-400 mb-1">Signature:</p>
                                                <img src={shipment.proof_of_delivery.signature} alt="signature" className="border rounded max-h-16 bg-white" />
                                            </div>
                                        )}
                                        {shipment.proof_of_delivery.photos?.length > 0 && (
                                            <div className="pt-2">
                                                <p className="text-xs text-gray-400 mb-2">Photos:</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {shipment.proof_of_delivery.photos.map((p: string, i: number) => (
                                                        <img
                                                            key={i}
                                                            src={`/storage/${p}`}
                                                            alt={`photo ${i + 1}`}
                                                            onClick={() => setPodPreview(`/storage/${p}`)}
                                                            className="h-16 w-16 object-cover rounded-lg cursor-pointer hover:opacity-80 border"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Auto-refresh indicator */}
                            {!TERMINAL_STATUSES.includes(shipment.status ?? '') && (
                                <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                                    <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                                    Auto-refreshing every 30s
                                </p>
                            )}
                        </div>

                    ) : trackingNumber ? (
                        /* Not found */
                        <div className="w-full max-w-lg">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="h-6 w-6 text-amber-500" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">{t('tracking.not_found_title')}</h3>
                                <p className="text-sm text-gray-500 mb-4">{t('tracking.error_detail')}</p>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 font-mono text-sm text-gray-600 mb-4">
                                    {trackingNumber}
                                </div>
                                <div>
                                    <Button variant="outline" size="sm" onClick={() => setData('tracking_number', '')}>
                                        {t('tracking.try_another')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* POD lightbox */}
            {podPreview && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setPodPreview(null)}>
                    <img src={podPreview} alt="POD" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
                </div>
            )}
        </>
    );

    if (isAuthenticated) {
        return <AuthenticatedLayout>{content}</AuthenticatedLayout>;
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-white">
            {content}
        </div>
    );
}
