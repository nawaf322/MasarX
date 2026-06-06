import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Package, Search, User, Phone, MapPin, Calendar, FileText, Loader2, CheckCircle, Truck, Radio, WifiOff } from 'lucide-react';

interface FoundShipment {
    id: number;
    tracking_number: string;
    status: string;
    sender_name: string;
    sender_phone: string;
    sender_address: string;
}

interface AvailableDriver {
    id: number;
    name: string;
    phone: string | null;
    gps_active: boolean;
    last_seen_at: string | null;
}

interface Props {
    preselectedShipment?: { id: number; tracking_number: string } | null;
    availableDrivers: AvailableDriver[];
}

export default function PickupsCreate({ preselectedShipment, availableDrivers }: Props) {
    const { t } = useTranslation();

    const [trackingQuery, setTrackingQuery] = useState(preselectedShipment?.tracking_number ?? '');
    const [searching, setSearching]         = useState(false);
    const [foundShipment, setFoundShipment] = useState<FoundShipment | null>(null);
    const [notFound, setNotFound]           = useState(false);
    const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        shipment_id:          preselectedShipment?.id?.toString() ?? '',
        driver_id:            '',
        scheduled_for:        '',
        contact_name:         '',
        contact_phone:        '',
        pickup_address:       '',
        special_instructions: '',
        notes:                '',
    });

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = trackingQuery.trim();
        if (q.length < 3) {
            if (!preselectedShipment) { setFoundShipment(null); setNotFound(false); }
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            setNotFound(false);
            try {
                const res = await fetch(route('pickups.search-shipment') + `?q=${encodeURIComponent(q)}`, {
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                const json = await res.json();
                if (json.shipment) {
                    setFoundShipment(json.shipment);
                    setData('shipment_id', String(json.shipment.id));
                    setNotFound(false);
                } else {
                    setFoundShipment(null);
                    setData('shipment_id', '');
                    setNotFound(true);
                }
            } catch {
                setFoundShipment(null);
                setNotFound(false);
            } finally {
                setSearching(false);
            }
        }, 400);
    }, [trackingQuery]);

    useEffect(() => {
        if (preselectedShipment) {
            setFoundShipment({
                id:              preselectedShipment.id,
                tracking_number: preselectedShipment.tracking_number,
                status:          '',
                sender_name:     '',
                sender_phone:    '',
                sender_address:  '',
            });
            setData('shipment_id', String(preselectedShipment.id));
        }
    }, []);

    function autoFill() {
        if (!foundShipment) return;
        setData(prev => ({
            ...prev,
            contact_name:   foundShipment.sender_name    || prev.contact_name,
            contact_phone:  foundShipment.sender_phone   || prev.contact_phone,
            pickup_address: foundShipment.sender_address || prev.pickup_address,
        }));
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('pickups.store'));
    };

    const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700";

    return (
        <AuthenticatedLayout>
            <Head title={t('pickups.schedule')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href={route('pickups.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('pickups.schedule')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('pickups.search_shipment')}</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Left: main form (2 cols) ── */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Shipment search */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    {t('pickups.shipment_label')}
                                </h3>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={trackingQuery}
                                        onChange={(e) => setTrackingQuery(e.target.value)}
                                        placeholder={t('pickups.search_tracking_placeholder')}
                                        className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700"
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                    )}
                                </div>

                                {foundShipment && (
                                    <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-green-800">
                                                        {t('pickups.shipment_found')}: <span className="font-mono">{foundShipment.tracking_number}</span>
                                                    </p>
                                                    {foundShipment.sender_name && (
                                                        <p className="text-xs text-green-700 mt-0.5">
                                                            {foundShipment.sender_name}
                                                            {foundShipment.sender_phone && ` · ${foundShipment.sender_phone}`}
                                                        </p>
                                                    )}
                                                    {foundShipment.sender_address && (
                                                        <p className="text-xs text-green-600">{foundShipment.sender_address}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {(foundShipment.sender_name || foundShipment.sender_address) && (
                                                <button
                                                    type="button"
                                                    onClick={autoFill}
                                                    className="shrink-0 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                                >
                                                    {t('pickups.autofill_sender')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {notFound && (
                                    <p className="mt-2 text-sm text-red-500 font-medium">{t('pickups.shipment_not_found')}</p>
                                )}
                                {errors.shipment_id && (
                                    <p className="text-red-500 text-xs mt-1">{errors.shipment_id}</p>
                                )}
                                <input type="hidden" value={data.shipment_id} readOnly />
                            </div>

                            {/* Contact & schedule fields */}
                            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 transition-opacity ${data.shipment_id ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {t('pickups.scheduled_for')} & {t('pickups.contact_name')}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Scheduled For */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('pickups.scheduled_for')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={data.scheduled_for}
                                            onChange={(e) => setData('scheduled_for', e.target.value)}
                                            className={inputClass}
                                        />
                                        {errors.scheduled_for && <p className="text-red-500 text-xs mt-1">{errors.scheduled_for}</p>}
                                    </div>

                                    {/* Contact Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('pickups.contact_name')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={data.contact_name}
                                                onChange={(e) => setData('contact_name', e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700"
                                            />
                                        </div>
                                        {errors.contact_name && <p className="text-red-500 text-xs mt-1">{errors.contact_name}</p>}
                                    </div>

                                    {/* Contact Phone */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('pickups.contact_phone')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={data.contact_phone}
                                                onChange={(e) => setData('contact_phone', e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700"
                                            />
                                        </div>
                                        {errors.contact_phone && <p className="text-red-500 text-xs mt-1">{errors.contact_phone}</p>}
                                    </div>

                                    {/* Pickup Address */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('pickups.pickup_address')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <textarea
                                                rows={2}
                                                value={data.pickup_address}
                                                onChange={(e) => setData('pickup_address', e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700 resize-none"
                                            />
                                        </div>
                                        {errors.pickup_address && <p className="text-red-500 text-xs mt-1">{errors.pickup_address}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Extra notes */}
                            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 transition-opacity ${data.shipment_id ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    {t('pickups.special_instructions')} & {t('pickups.notes')}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('pickups.special_instructions')}
                                            <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={data.special_instructions}
                                            onChange={(e) => setData('special_instructions', e.target.value)}
                                            className={inputClass + ' resize-none'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            {t('pickups.notes')}
                                            <span className="ml-1 text-gray-400 font-normal">({t('common.optional')})</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            className={inputClass + ' resize-none'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Right: driver + summary + submit ── */}
                        <div className="space-y-5">

                            {/* Driver Assignment */}
                            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-opacity ${data.shipment_id ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Truck className="w-3.5 h-3.5" />
                                    {t('pickups.assign_driver')}
                                    <span className="ml-1 text-gray-400 font-normal text-xs">({t('common.optional')})</span>
                                </h3>

                                <select
                                    value={data.driver_id}
                                    onChange={(e) => setData('driver_id', e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-700 mb-3"
                                >
                                    <option value="">{t('pickups.no_driver')}</option>
                                    {availableDrivers.map(driver => (
                                        <option key={driver.id} value={String(driver.id)}>
                                            {driver.gps_active ? '🟢' : '⚪'} {driver.name}
                                            {driver.phone ? ` · ${driver.phone}` : ''}
                                        </option>
                                    ))}
                                </select>

                                {/* GPS legend */}
                                <div className="flex flex-col gap-1.5">
                                    {availableDrivers.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">{t('pickups.no_drivers_available')}</p>
                                    ) : data.driver_id ? (() => {
                                        const sel = availableDrivers.find(d => String(d.id) === data.driver_id);
                                        if (!sel) return null;
                                        return (
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${sel.gps_active ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                                                {sel.gps_active
                                                    ? <Radio className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                    : <WifiOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                }
                                                <span>
                                                    {sel.gps_active ? t('pickups.gps_active') : t('pickups.gps_inactive')}
                                                    {sel.last_seen_at && !sel.gps_active && (
                                                        <span className="ml-1 text-gray-400">
                                                            · {t('pickups.last_seen')} {new Date(sel.last_seen_at).toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })() : (
                                        <p className="text-xs text-gray-400">
                                            <span className="mr-1">🟢</span>{t('pickups.gps_active')}
                                            <span className="mx-2">·</span>
                                            <span className="mr-1">⚪</span>{t('pickups.gps_inactive')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Preview card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('pickups.pickup_summary')}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Package className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.tracking_col')}</p>
                                            <p className="text-sm font-mono font-semibold text-gray-800">
                                                {foundShipment?.tracking_number ?? <span className="text-gray-300">—</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <User className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.contact_name')}</p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {data.contact_name || <span className="text-gray-300">—</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Phone className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.contact_phone')}</p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {data.contact_phone || <span className="text-gray-300">—</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <MapPin className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.pickup_address')}</p>
                                            <p className="text-sm font-medium text-gray-800">
                                                {data.pickup_address || <span className="text-gray-300">—</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.scheduled_for')}</p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {data.scheduled_for
                                                    ? new Date(data.scheduled_for).toLocaleString()
                                                    : <span className="text-gray-300">—</span>
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={processing || !data.shipment_id}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors shadow-sm"
                                >
                                    {processing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Truck className="w-4 h-4" />
                                    }
                                    {processing ? t('common.saving') : t('pickups.schedule')}
                                </button>
                                <Link
                                    href={route('pickups.index')}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
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
