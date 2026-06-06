import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Truck, User, Box, ExternalLink, Radio, MapPin, Package } from "lucide-react";
import { Badge } from "@/Components/UI/badge";
import { useTranslation } from '@/hooks/useTranslation';
import { MapRenderer } from '@/Components/Dispatch/MapRenderer';
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const DRIVER_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];
const POLL_INTERVAL_MS = 12_000; // 12s — enough resolution for live dispatch without hammering the server

export default function Index({
    drivers: initialDrivers,
    unassigned_shipments,
    mapConfig,
    is_driver_view = false,
}: {
    drivers: any[];
    unassigned_shipments: any[];
    mapConfig?: any;
    is_driver_view?: boolean;
}) {
    const { t } = useTranslation();
    const [drivers,          setDrivers]          = useState(initialDrivers);
    const [driverTrails,     setDriverTrails]      = useState<Record<number, Array<{ lat: number; lng: number }>>>({});
    const [selectedDriverId, setSelectedDriverId]  = useState<number | null>(null);
    const [lastPollAt,       setLastPollAt]         = useState<number>(Date.now());
    const [pollAge,          setPollAge]            = useState<number>(0);
    const [isPolling,        setIsPolling]          = useState(false);
    const [mobileTab,        setMobileTab]           = useState<'fleet' | 'unassigned' | null>(null);

    // ── Ticker: update "X sec ago" every second ───────────────────────────────
    useEffect(() => {
        const tick = setInterval(() => {
            setPollAge(Math.floor((Date.now() - lastPollAt) / 1000));
        }, 1000);
        return () => clearInterval(tick);
    }, [lastPollAt]);

    // ── Poll driver locations every 4s ────────────────────────────────────────
    useEffect(() => {
        const fetchDriverLocations = () => {
            setIsPolling(true);
            axios.get(route('dispatch.driver-locations'))
                .then(response => {
                    const updated = response.data.map((d: any) => {
                        const existing = initialDrivers.find((init: any) => init.id === d.driver_id);
                        return {
                            id: d.driver_id,
                            name: d.name,
                            status: d.status,
                            current_location: (d.lat != null && d.lng != null) ? { lat: d.lat, lng: d.lng } : null,
                            heading: d.heading,
                            updated_at: d.updated_at,
                            active_manifest: d.active_manifest || existing?.active_manifest || null,
                        };
                    });
                    setDrivers(updated);
                    setLastPollAt(Date.now());

                    // Fetch trail history for drivers that have GPS
                    const withLocation = updated.filter((d: any) => d.current_location).map((d: any) => d.id);
                    if (withLocation.length > 0) {
                        Promise.all(
                            withLocation.map((id: number) =>
                                axios.get(route('dispatch.driver-location-history', { driver: id }), { params: { minutes: 30 } })
                                    .catch(() => ({ data: { points: [] } }))
                            )
                        ).then(responses => {
                            const trails: Record<number, Array<{ lat: number; lng: number }>> = {};
                            withLocation.forEach((id: number, i: number) => {
                                trails[id] = ((responses[i] as any)?.data?.points || [])
                                    .map((p: any) => ({ lat: p.lat, lng: p.lng }));
                            });
                            setDriverTrails(trails);
                        });
                    } else {
                        setDriverTrails({});
                    }
                })
                .catch(() => { /* keep current state */ })
                .finally(() => setIsPolling(false));
        };

        fetchDriverLocations();
        const interval = setInterval(fetchDriverLocations, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [initialDrivers]);

    const handleDriverClick = useCallback((driverId: number) => {
        setSelectedDriverId(prev => prev === driverId ? null : driverId);
    }, []);

    const handleAutoOptimize = useCallback(() => {
        axios.post(route('dispatch.auto-optimize'))
            .then(() => window.location.reload())
            .catch(err => console.error('Auto-optimize error:', err));
    }, []);

    return (
        <AuthenticatedLayout>
            <Head title={t('dispatch.title')} />

            {/* Full-screen map with floating panels */}
            <div className="relative w-full h-full min-h-[calc(100vh-6rem)] overflow-hidden">

                {/* ── Map background ──────────────────────────────────────── */}
                <div className="absolute inset-0 z-0 min-h-[400px]">
                    <MapRenderer
                        drivers={drivers}
                        driverTrails={driverTrails}
                        selectedDriverId={selectedDriverId}
                        mapConfig={mapConfig}
                    />
                </div>

                {/* ── Live indicator (top center) ──────────────────────────── */}
                <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="flex items-center gap-2 bg-gray-900/85 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                        <span className={`h-2 w-2 rounded-full ${isPolling ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse'}`} />
                        <Radio className="h-3 w-3 text-green-400" />
                        <span className="font-medium">{t('dispatch.live')}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-300 tabular-nums">
                            {pollAge === 0 ? t('dispatch.updated_just_now') : `${pollAge}s`}
                        </span>
                    </div>
                </div>

                {/* ── Floating panels — DESKTOP (md+) ──────────────────── */}
                <div className="hidden md:flex absolute inset-0 pointer-events-none p-4 gap-4 z-10">

                    {/* Left Panel — Driver Fleet */}
                    <div className="w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 pointer-events-auto flex flex-col max-h-full">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/70 rounded-t-xl shrink-0">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                    {is_driver_view ? 'My Route' : t('dispatch.active_fleet')}
                                    {!is_driver_view && <span className="text-gray-400 font-normal">({drivers.length})</span>}
                                </h3>
                                {!is_driver_view && (
                                    <span className="text-xs text-indigo-400 font-medium flex items-center gap-1 shrink-0">
                                        {t('dispatch.assign_manifest')}
                                        <ExternalLink className="h-3 w-3" />
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
                            {drivers.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground text-xs">
                                    <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="mb-3">{t('dispatch.no_drivers')}</p>
                                    <Button variant="outline" size="sm" disabled>{t('dispatch.manage_manifests')}</Button>
                                </div>
                            ) : (
                                drivers.map((driver, idx) => {
                                    const color     = DRIVER_COLORS[idx % DRIVER_COLORS.length];
                                    const isOnline  = driver.status === 'online';
                                    const isSelected = selectedDriverId === driver.id;
                                    const stopCount  = driver.active_manifest?.stops?.length ?? 0;
                                    const hasRoute   = !!(driver.active_manifest?.route_geometry?.length >= 2);

                                    return (
                                        <button
                                            key={driver.id}
                                            onClick={() => handleDriverClick(driver.id)}
                                            className={`w-full text-left p-3 border rounded-lg transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                                                    : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="relative shrink-0">
                                                    <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: `${color}22`, border: `2px solid ${color}` }}>
                                                        <User className="h-4 w-4" style={{ color }} />
                                                    </div>
                                                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${driver.current_location ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm text-gray-900 truncate">{driver.name}</p>
                                                    <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-green-600' : driver.status === 'idle' ? 'text-amber-600' : 'text-gray-400'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : driver.status === 'idle' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                                                        {isOnline ? t('dispatch.status_online') : driver.status === 'idle' ? t('dispatch.status_idle') : t('dispatch.status_offline')}
                                                    </p>
                                                </div>
                                                {driver.active_manifest && (
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-bold" style={{ color }}>{stopCount}</p>
                                                        <p className="text-[10px] text-gray-400">{t('dispatch.stops')}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {driver.active_manifest && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex-1 text-xs rounded px-2 py-1 truncate font-mono font-medium" style={{ background: `${color}15`, color }}>
                                                        {driver.active_manifest.manifest_number}
                                                    </div>
                                                    {hasRoute && (
                                                        <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
                                                            <MapPin className="h-2.5 w-2.5" />
                                                            {t('dispatch.route_active')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {!driver.current_location && (
                                                <p className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                    {t('dispatch.no_location')}
                                                </p>
                                            )}
                                            {isSelected && <p className="text-[10px] text-indigo-500 mt-1.5 font-semibold">↗ {t('dispatch.focus_on_map')}</p>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Panel — Unassigned Shipments (hidden for drivers) */}
                    {!is_driver_view && (
                    <div className="w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 pointer-events-auto flex flex-col max-h-full ml-auto">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/70 rounded-t-xl shrink-0">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <Box className="h-4 w-4 text-orange-600" />
                                {t('dispatch.unassigned')}
                                <span className="text-gray-400 font-normal">({unassigned_shipments.length})</span>
                            </h3>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
                            {unassigned_shipments.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-xs">
                                    <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    {t('dispatch.all_assigned')}
                                </div>
                            ) : (
                                unassigned_shipments.map(shipment => (
                                    <div key={shipment.id} className="block">
                                        <div className="p-3 border border-orange-100 rounded-lg hover:bg-orange-50 hover:border-orange-200 cursor-pointer transition-all bg-white">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-mono font-bold text-xs text-gray-900">{shipment.tracking_number}</span>
                                                <Badge variant="secondary" className="text-[10px] h-5 bg-orange-100 text-orange-700 border-0">{t('dispatch.pending')}</Badge>
                                            </div>
                                            <p className="text-xs text-gray-600 truncate">{shipment.receiver_details?.city || shipment.receiver_details?.name || '—'}</p>
                                            <p className="text-[10px] text-indigo-500 font-medium mt-1">{t('dispatch.assign_to_manifest')} →</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50/70 rounded-b-xl shrink-0">
                            <Button className="w-full bg-primary hover:bg-primary/90 text-xs h-9 gap-2" onClick={handleAutoOptimize} disabled={unassigned_shipments.length === 0}>
                                {t('dispatch.auto_optimize')}
                            </Button>
                        </div>
                    </div>
                    )}
                </div>

                {/* ── MOBILE panels — bottom sheet with tabs (< md) ─────────── */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                    {/* Tab toggle bar */}
                    <div className="pointer-events-auto flex gap-2 px-3 pb-2 justify-center">
                        <button
                            onClick={() => setMobileTab(t => t === 'fleet' ? null : 'fleet')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shadow-lg border transition-all ${
                                mobileTab === 'fleet'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white/95 text-gray-700 border-gray-200'
                            }`}
                        >
                            <Truck className="h-3.5 w-3.5" />
                            {t('dispatch.active_fleet')}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${mobileTab === 'fleet' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                {drivers.length}
                            </span>
                        </button>
                        {!is_driver_view && (
                        <button
                            onClick={() => setMobileTab(t => t === 'unassigned' ? null : 'unassigned')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shadow-lg border transition-all ${
                                mobileTab === 'unassigned'
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white/95 text-gray-700 border-gray-200'
                            }`}
                        >
                            <Box className="h-3.5 w-3.5" />
                            {t('dispatch.unassigned')}
                            {unassigned_shipments.length > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${mobileTab === 'unassigned' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                    {unassigned_shipments.length}
                                </span>
                            )}
                        </button>
                        )}
                    </div>

                    {/* Expandable panel content */}
                    {mobileTab && (
                        <div className="pointer-events-auto mx-2 mb-2 bg-white/97 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-64">
                            {mobileTab === 'fleet' ? (
                                <>
                                    <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
                                        {drivers.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground text-xs">
                                                <Truck className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                                                {t('dispatch.no_drivers')}
                                            </div>
                                        ) : (
                                            drivers.map((driver, idx) => {
                                                const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];
                                                const isOnline = driver.status === 'online';
                                                const isSelected = selectedDriverId === driver.id;
                                                return (
                                                    <button
                                                        key={driver.id}
                                                        onClick={() => { handleDriverClick(driver.id); setMobileTab(null); }}
                                                        className={`w-full text-left p-2.5 border rounded-lg transition-all ${isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative shrink-0">
                                                                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${color}22`, border: `2px solid ${color}` }}>
                                                                    <User className="h-3.5 w-3.5" style={{ color }} />
                                                                </div>
                                                                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${driver.current_location ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-xs text-gray-900 truncate">{driver.name}</p>
                                                                <p className={`text-[10px] ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                                                                    {isOnline ? t('dispatch.status_online') : driver.status === 'idle' ? t('dispatch.status_idle') : t('dispatch.status_offline')}
                                                                </p>
                                                            </div>
                                                            {driver.active_manifest && (
                                                                <span className="text-[10px] font-mono truncate max-w-20" style={{ color }}>
                                                                    {driver.active_manifest.manifest_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
                                        {unassigned_shipments.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground text-xs">
                                                <Package className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                                                {t('dispatch.all_assigned')}
                                            </div>
                                        ) : (
                                            unassigned_shipments.map(shipment => (
                                                <div key={shipment.id} className="p-2.5 border border-orange-100 rounded-lg bg-white">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-mono font-bold text-xs text-gray-900">{shipment.tracking_number}</span>
                                                        <Badge variant="secondary" className="text-[10px] h-4 bg-orange-100 text-orange-700 border-0">{t('dispatch.pending')}</Badge>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{shipment.receiver_details?.city || shipment.receiver_details?.name || '—'}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-gray-100 shrink-0">
                                        <Button className="w-full bg-primary hover:bg-primary/90 text-xs h-8" onClick={handleAutoOptimize} disabled={unassigned_shipments.length === 0}>
                                            {t('dispatch.auto_optimize')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Legend (bottom-left) ──────────────────────────────────── */}
                <div className="absolute bottom-24 md:bottom-4 left-4 z-20 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow border border-gray-200 px-3 py-2 flex items-center gap-4 text-[10px] text-gray-600">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-4 h-1 rounded bg-[#8B5CF6]" />
                            {t('dispatch.legend_route')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-full border-2 border-white bg-green-500" />
                            {t('dispatch.legend_pickup')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-full border-2 border-white bg-amber-500" />
                            {t('dispatch.legend_delivery')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white bg-green-400" />
                            GPS
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white bg-gray-300" />
                            {t('dispatch.legend_no_gps')}
                        </span>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
