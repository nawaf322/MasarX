import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Driver {
    id: number;
    name: string;
    status: 'online' | 'idle' | 'offline';
    current_location?: { lat: number; lng: number } | null;
    heading?: number;
    updated_at?: string;
    active_manifest?: {
        id: number;
        manifest_number: string;
        stops?: Array<{ type: string; lat: number; lng: number; address_text?: string; tracking_number?: string }>;
        route_geometry?: number[][];
        shipments?: any[];
    } | null;
}

interface LeafletMapProps {
    drivers: Driver[];
    driverTrails?: Record<number, Array<{ lat: number; lng: number }>>;
    selectedDriverId?: number | null;
    mapConfig?: {
        default_center_lat?: number | string | null;
        default_center_lng?: number | string | null;
        default_zoom?: number | null;
    };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DRIVER_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

// ─── CSS Animation injection (once per page load) ─────────────────────────────
function injectMapCSS() {
    if (typeof document === 'undefined' || document.getElementById('dsp-map-css')) return;
    const s = document.createElement('style');
    s.id = 'dsp-map-css';
    s.textContent = `
        /* Animated flowing route dashes */
        .dsp-route {
            stroke-dasharray: 14 7;
            animation: dspRouteFlow 1.1s linear infinite;
        }
        @keyframes dspRouteFlow {
            to { stroke-dashoffset: -21; }
        }

        /* Ghost background route — gives depth */
        .dsp-route-ghost {
            stroke-dasharray: none !important;
        }

        /* Pulsing ring for online drivers */
        .dsp-pulse-ring {
            position: absolute;
            inset: -10px;
            border-radius: 50%;
            pointer-events: none;
            animation: dspPulse 1.8s ease-out infinite;
        }
        @keyframes dspPulse {
            0%   { transform: scale(0.8); opacity: 0.7; }
            70%  { transform: scale(2.4); opacity: 0; }
            100% { transform: scale(2.4); opacity: 0; }
        }

        /* Stop marker bounce-in */
        .dsp-stop-marker {
            animation: dspBounce 0.4s cubic-bezier(.36,.07,.19,.97);
        }
        @keyframes dspBounce {
            0%   { transform: scale(0); }
            60%  { transform: scale(1.2); }
            100% { transform: scale(1); }
        }

        /* Leaflet popup cleanup */
        .dsp-popup .leaflet-popup-content-wrapper {
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,.15);
            padding: 0;
        }
        .dsp-popup .leaflet-popup-content { margin: 0; }
        .dsp-popup .leaflet-popup-tip { display: none; }
    `;
    document.head.appendChild(s);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function interpolateAlongRoute(route: [number, number][], t: number): [number, number] {
    if (route.length === 0) return [0, 0];
    if (route.length === 1) return route[0];

    let total = 0;
    const segs: number[] = [];
    for (let i = 0; i < route.length - 1; i++) {
        const d = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
        segs.push(d);
        total += d;
    }
    if (total === 0) return route[0];

    let target = t * total, acc = 0;
    for (let i = 0; i < segs.length; i++) {
        if (acc + segs[i] >= target) {
            const u = segs[i] > 0 ? (target - acc) / segs[i] : 0;
            return [
                route[i][0] + (route[i + 1][0] - route[i][0]) * u,
                route[i][1] + (route[i + 1][1] - route[i][1]) * u,
            ];
        }
        acc += segs[i];
    }
    return route[route.length - 1];
}

function formatRelativeTime(iso: string | undefined, t: (k: string, o?: object) => string): string {
    if (!iso) return '—';
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    const diffH = Math.floor(diffMin / 60);
    if (diffMin < 1) return t('dispatch.updated_just_now');
    if (diffMin < 60) return t('dispatch.updated_minutes_ago', { count: diffMin });
    return t('dispatch.updated_hours_ago', { count: diffH });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LeafletMap({ drivers, driverTrails = {}, selectedDriverId, mapConfig }: LeafletMapProps) {
    const { t } = useTranslation();

    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef        = useRef<L.Map | null>(null);

    // Layer refs — cleared and re-built on each drivers update
    const driverMarkersRef   = useRef<Map<number, L.Marker>>(new Map());
    const stopMarkersRef     = useRef<L.Marker[]>([]);
    const routeLayersRef     = useRef<(L.Polyline | L.Layer)[]>([]);
    const trailLayersRef     = useRef<L.Polyline[]>([]);
    const animDotsRef        = useRef<Map<number, L.Marker>>(new Map());

    // Animation state — persists across driver updates so dots don't teleport
    const animProgressRef = useRef<Map<number, number>>(new Map());
    const animRoutesRef   = useRef<Map<number, [number, number][]>>(new Map());
    const animFrameRef    = useRef<number | null>(null);
    const lastTimeRef     = useRef<number>(performance.now());

    // ── Init map (once) ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;
        injectMapCSS();

        const lat  = mapConfig?.default_center_lat ? Number(mapConfig.default_center_lat) : 20;
        const lng  = mapConfig?.default_center_lng ? Number(mapConfig.default_center_lng) : 0;
        const zoom = mapConfig?.default_zoom        ? Number(mapConfig.default_zoom)        : 3;

        const map = L.map(mapContainer.current, { zoomControl: true, attributionControl: true })
            .setView([lat, lng], zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        const timer = setTimeout(() => map.invalidateSize(), 200);
        return () => {
            clearTimeout(timer);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            map.remove();
            mapRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Rebuild all overlays when drivers / trails change ────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Cancel ongoing animation
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        // ── Remove old layers ───────────────────────────────────────────────
        driverMarkersRef.current.forEach(m => m.remove());
        driverMarkersRef.current.clear();

        stopMarkersRef.current.forEach(m => m.remove());
        stopMarkersRef.current = [];

        routeLayersRef.current.forEach(l => (l as L.Layer).remove());
        routeLayersRef.current = [];

        trailLayersRef.current.forEach(p => p.remove());
        trailLayersRef.current = [];

        animDotsRef.current.forEach(d => d.remove());
        animDotsRef.current.clear();

        // Keep animRoutesRef for continuity; only update with new geometry
        const allPoints: [number, number][] = [];
        const newAnimRoutes = new Map<number, [number, number][]>();

        // ── Draw each driver ────────────────────────────────────────────────
        drivers.forEach((driver, idx) => {
            const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];

            // 1. Planned route geometry ─────────────────────────────────────
            const geom = driver.active_manifest?.route_geometry;
            if (geom && geom.length >= 2) {
                const latlngs = geom.map((p: number[]) => [p[0], p[1]] as [number, number]);

                // Ghost (thick, semi-transparent background)
                const ghost = L.polyline(latlngs, {
                    color,
                    weight: 10,
                    opacity: 0.12,
                    className: 'dsp-route-ghost',
                    interactive: false,
                }).addTo(map);
                routeLayersRef.current.push(ghost);

                // Animated flowing line
                const animated = L.polyline(latlngs, {
                    color,
                    weight: 4,
                    opacity: 0.95,
                    className: 'dsp-route',
                    interactive: false,
                }).addTo(map);
                routeLayersRef.current.push(animated);

                latlngs.forEach(p => allPoints.push(p));
                newAnimRoutes.set(driver.id, latlngs);
            }

            // 2. Stop markers ───────────────────────────────────────────────
            const stops = driver.active_manifest?.stops ?? [];
            stops.forEach((stop, si) => {
                const isPickup   = stop.type === 'pickup';
                const stopColor  = isPickup ? '#10B981' : '#F59E0B';
                const borderCol  = isPickup ? '#065F46' : '#92400E';
                const numLabel   = String(si + 1);

                const icon = L.divIcon({
                    className: '',
                    html: `<div class="dsp-stop-marker" style="
                        width:28px;height:28px;border-radius:50%;
                        background:${stopColor};border:2.5px solid ${borderCol};
                        box-shadow:0 2px 8px rgba(0,0,0,.3);
                        display:flex;align-items:center;justify-content:center;
                        font-size:10px;font-weight:800;color:white;
                        cursor:pointer;
                    ">${numLabel}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });

                const m = L.marker([stop.lat, stop.lng], { icon, zIndexOffset: 200 }).addTo(map);
                const label = isPickup ? t('dispatch.stop_pickup') : t('dispatch.stop_delivery');
                m.bindPopup(`
                    <div style="min-width:190px;padding:10px 12px;font-family:system-ui,sans-serif">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                            <div style="width:10px;height:10px;border-radius:50%;background:${stopColor}"></div>
                            <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px">${label} ${numLabel}</span>
                        </div>
                        <p style="font-size:12px;color:#111827;margin:0 0 4px">${stop.address_text || '—'}</p>
                        ${stop.tracking_number ? `<p style="font-size:11px;color:#6366F1;margin:0;font-weight:600">${stop.tracking_number}</p>` : ''}
                    </div>`, { className: 'dsp-popup' });

                stopMarkersRef.current.push(m);
                allPoints.push([stop.lat, stop.lng]);
            });

            // 3. Driver trail (breadcrumb history) ──────────────────────────
            const trail = driverTrails[driver.id];
            if (trail && trail.length >= 2) {
                const trailLL = trail.map(p => [p.lat, p.lng] as [number, number]);
                const trailPoly = L.polyline(trailLL, {
                    color,
                    weight: 3,
                    opacity: 0.5,
                    dashArray: '4 5',
                    interactive: false,
                }).addTo(map);
                trailLayersRef.current.push(trailPoly);
                trailLL.forEach(p => allPoints.push(p));
            }

            // 4. Driver position marker ──────────────────────────────────────
            if (driver.current_location?.lat && driver.current_location?.lng) {
                const { lat, lng } = driver.current_location;
                const isOnline = driver.status === 'online';

                const icon = L.divIcon({
                    className: '',
                    html: `
                        <div style="position:relative;width:38px;height:38px;">
                            ${isOnline ? `<div class="dsp-pulse-ring" style="background:${color}"></div>` : ''}
                            <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:1">
                                <circle cx="19" cy="19" r="16" fill="${color}" stroke="white" stroke-width="3"/>
                                <path d="M19 10 L25 21 L19 25 L13 21 Z" fill="white"/>
                            </svg>
                        </div>`,
                    iconSize: [38, 38],
                    iconAnchor: [19, 19],
                });

                const statusLabel = driver.status === 'online' ? t('dispatch.status_online')
                    : driver.status === 'idle' ? t('dispatch.status_idle')
                    : t('dispatch.status_offline');
                const lastUpdate = formatRelativeTime(driver.updated_at, t);
                const stopCount  = driver.active_manifest?.stops?.length ?? 0;

                const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
                marker.bindPopup(`
                    <div style="min-width:210px;padding:12px;font-family:system-ui,sans-serif">
                        <p style="font-size:15px;font-weight:800;margin:0 0 4px;color:#111827">${driver.name}</p>
                        <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
                            <div style="width:8px;height:8px;border-radius:50%;background:${isOnline ? '#10B981' : '#9CA3AF'}"></div>
                            <span style="font-size:12px;color:#6B7280">${statusLabel} · ${lastUpdate}</span>
                        </div>
                        ${driver.active_manifest
                            ? `<div style="background:#F5F3FF;border-radius:6px;padding:8px;margin-top:4px">
                                <p style="font-size:11px;font-weight:700;color:#6D28D9;margin:0 0 2px">${driver.active_manifest.manifest_number}</p>
                                <p style="font-size:11px;color:#7C3AED;margin:0">${stopCount} ${t('dispatch.stops')}</p>
                               </div>`
                            : `<p style="font-size:11px;color:#9CA3AF;margin:0">${t('dispatch.no_active_manifest')}</p>`
                        }
                        <p style="font-size:10px;color:#D1D5DB;margin:6px 0 0;font-family:monospace">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
                    </div>`, { className: 'dsp-popup' });

                driverMarkersRef.current.set(driver.id, marker);
                allPoints.push([lat, lng]);
            }

            // 5. Animated delivery dot along route ──────────────────────────
            const animRoute = newAnimRoutes.get(driver.id);
            if (animRoute && animRoute.length >= 2) {
                // Preserve progress so dots don't teleport on re-render
                const progress = animProgressRef.current.get(driver.id) ?? Math.random();
                animProgressRef.current.set(driver.id, progress);

                const startPos = interpolateAlongRoute(animRoute, progress);
                const dotIcon = L.divIcon({
                    className: '',
                    html: `<div style="
                        width:14px;height:14px;border-radius:50%;
                        background:${color};border:3px solid white;
                        box-shadow:0 2px 8px rgba(0,0,0,.5);
                    "></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                });
                const dot = L.marker(startPos, { icon: dotIcon, interactive: false, zIndexOffset: 600 }).addTo(map);
                animDotsRef.current.set(driver.id, dot);
            }
        });

        // Update route map for animation
        animRoutesRef.current = newAnimRoutes;

        // ── Auto-fit to all visible geometry (only when no driver is focused) ─
        if (allPoints.length > 0 && selectedDriverId == null) {
            const bounds = L.latLngBounds(allPoints);
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14 });
            }
        }

        // ── Animation loop — move dots along routes ──────────────────────────
        const SPEED = 0.000055; // normalized units per ms (full route in ~18s)
        lastTimeRef.current = performance.now();

        const animate = (now: number) => {
            const dt = Math.min(now - lastTimeRef.current, 80);
            lastTimeRef.current = now;

            animDotsRef.current.forEach((dot, driverId) => {
                const route = animRoutesRef.current.get(driverId);
                if (!route || route.length < 2) return;

                const prev = animProgressRef.current.get(driverId) ?? 0;
                const next = (prev + SPEED * dt) % 1;
                animProgressRef.current.set(driverId, next);

                dot.setLatLng(interpolateAlongRoute(route, next));
            });

            animFrameRef.current = requestAnimationFrame(animate);
        };

        if (animDotsRef.current.size > 0) {
            animFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
        };
    }, [drivers, driverTrails, selectedDriverId, t]);

    // ── React to selectedDriverId — fly to their area ────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || selectedDriverId == null) return;

        const driver = drivers.find(d => d.id === selectedDriverId);
        if (!driver) return;

        const pts: [number, number][] = [];

        driver.active_manifest?.stops?.forEach(s => {
            if (s.lat && s.lng) pts.push([s.lat, s.lng]);
        });

        if (driver.current_location?.lat && driver.current_location?.lng) {
            pts.push([driver.current_location.lat, driver.current_location.lng]);
        }

        const route = animRoutesRef.current.get(driver.id);
        route?.forEach(p => pts.push(p));

        if (pts.length === 1) {
            // Single point — flyTo with a fixed zoom level
            map.flyTo(pts[0], 14, { duration: 1.2 });
        } else if (pts.length > 1) {
            const bounds = L.latLngBounds(pts);
            if (bounds.isValid()) {
                map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 14, duration: 1.2 });
            }
        }

        // Open driver's popup after fly animation completes
        const marker = driverMarkersRef.current.get(selectedDriverId);
        if (marker) {
            setTimeout(() => marker.openPopup(), 1500);
        }
    }, [selectedDriverId, drivers]);

    return <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
}
