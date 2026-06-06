/**
 * Mapa Dispatch: conductores, paradas (pickup/delivery) y ruta.
 * DoD Parte 3: los stops se muestran como markers en el mapa (no solo texto en popup).
 * Ruta = Directions (Mapbox) si hay token; si no, polyline entre paradas.
 * Ver docs/PROMPT_PARTE3_GEOCODING_PARADAS_RUTAS.md
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { AlertCircle } from 'lucide-react';

interface Driver {
    id: number;
    name: string;
    status: 'online' | 'idle' | 'offline';
    current_location?: { lat: number; lng: number };
    heading?: number;
    updated_at?: string;
    active_manifest?: any;
}

interface MapboxMapProps {
    drivers: Driver[];
    driverTrails?: Record<number, Array<{ lat: number; lng: number }>>;
    token: string;
    mapConfig?: {
        default_center_lat?: number | null;
        default_center_lng?: number | null;
        default_zoom?: number;
    };
}

function formatRelativeTime(iso: string | undefined, t: (k: string, o?: object) => string): string {
    if (!iso) return '—';
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    const diffH = Math.floor(diffMin / 60);
    if (diffMin < 1) return t('dispatch.updated_just_now');
    if (diffMin < 60) return t('dispatch.updated_minutes_ago', { count: diffMin });
    return t('dispatch.updated_hours_ago', { count: diffH });
}

export function MapboxMap({ drivers, driverTrails = {}, token, mapConfig }: MapboxMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Map<number, any>>(new Map());
    const stopMarkersRef = useRef<any[]>([]);
    const trailSourceId = 'driver-trails';
    const routeSourceId = 'manifest-route';
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (!mapContainer.current || !token) {
            setError(t('dispatch.mapbox_token_missing'));
            return;
        }

        // Cargar Mapbox GL JS dinámicamente
        const loadMapbox = async () => {
            try {
                // Cargar CSS
                if (!document.getElementById('mapbox-gl-css')) {
                    const link = document.createElement('link');
                    link.id = 'mapbox-gl-css';
                    link.rel = 'stylesheet';
                    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
                    document.head.appendChild(link);
                }

                // Cargar JS
                if (!(window as any).mapboxgl) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Failed to load Mapbox GL JS'));
                        document.head.appendChild(script);
                    });
                }

                const mapboxgl = (window as any).mapboxgl;
                mapboxgl.accessToken = token;

                // Inicializar mapa
                const defaultLng = mapConfig?.default_center_lng ?? 0;
                const defaultLat = mapConfig?.default_center_lat ?? 20;
                const defaultZoom = mapConfig?.default_zoom ?? 3;
                const map = new mapboxgl.Map({
                    container: mapContainer.current,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [defaultLng, defaultLat],
                    zoom: defaultZoom,
                });

                mapRef.current = map;

                map.on('load', () => {
                    setError(null);
                });

                map.on('error', (e: any) => {
                    console.error('Mapbox error:', e);
                    setError(t('dispatch.mapbox_error'));
                });

                return () => {
                    map.remove();
                };
            } catch (err) {
                console.error('Mapbox load error:', err);
                setError(t('dispatch.mapbox_load_error'));
            }
        };

        loadMapbox();
    }, [token, t]);

    // Actualizar markers cuando cambian los drivers
    useEffect(() => {
        if (!mapRef.current || !(window as any).mapboxgl) return;

        const map = mapRef.current;
        const mapboxgl = (window as any).mapboxgl;

        // Limpiar markers anteriores
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();

        // Limpiar stops y ruta anteriores
        stopMarkersRef.current.forEach((m) => m.remove());
        stopMarkersRef.current = [];
        try {
            if (map.getSource?.(routeSourceId)) {
                if (map.getLayer?.('manifest-route-layer')) map.removeLayer('manifest-route-layer');
                map.removeSource(routeSourceId);
            }
        } catch (_) { /* route source no existe */ }

        // DoD Parte 3: paradas como markers (pickup verde, delivery ámbar) + popup con address_text
        drivers.forEach((driver) => {
            const routeGeom = driver.active_manifest?.route_geometry;
            if (routeGeom && routeGeom.length >= 2) {
                const coords = routeGeom.map((p: number[]) => [p[1], p[0]] as [number, number]);
                try {
                    if (!map.getSource?.(routeSourceId)) {
                        map.addSource(routeSourceId, {
                            type: 'geojson',
                            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
                        });
                        map.addLayer({
                            id: 'manifest-route-layer',
                            type: 'line',
                            source: routeSourceId,
                            paint: { 'line-color': '#8B5CF6', 'line-width': 5, 'line-opacity': 0.9, 'line-dasharray': [2, 1] }
                        });
                    } else {
                        (map.getSource(routeSourceId) as any).setData({
                            type: 'Feature',
                            properties: {},
                            geometry: { type: 'LineString', coordinates: coords }
                        });
                    }
                } catch (_) { /* style no cargada */ }
            }
            const stops = driver.active_manifest?.stops ?? [];
            stops.forEach((stop: { type: string; lat: number; lng: number; address_text?: string; tracking_number?: string }) => {
                const color = stop.type === 'pickup' ? '#10B981' : '#F59E0B';
                const el = document.createElement('div');
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.borderRadius = '50%';
                el.style.background = color;
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                const m = new mapboxgl.Marker(el)
                    .setLngLat([stop.lng, stop.lat])
                    .addTo(map);
                const label = stop.type === 'pickup' ? t('dispatch.stop_pickup') : t('dispatch.stop_delivery');
                m.setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(
                    `<div style="padding:8px;min-width:180px"><p style="font-size:11px;font-weight:600;color:#4b5563">${label}</p><p style="font-size:11px;color:#374151">${stop.address_text || '—'}</p>${stop.tracking_number ? `<p style="font-size:11px;color:#6366f1;margin-top:4px">${stop.tracking_number}</p>` : ''}</div>`
                ));
                stopMarkersRef.current.push(m);
            });
        });

        // Actualizar/crear trail source y layer (Mapbox) - solo si style cargó
        try {
            if (map.getSource?.(trailSourceId)) {
                if (map.getLayer?.('driver-trails-layer')) map.removeLayer('driver-trails-layer');
                map.removeSource(trailSourceId);
            }
        } catch (_) { /* source/layer no existen */ }
        const allCoords: [number, number][] = [];
        Object.values(driverTrails).forEach(trail => {
            if (trail && trail.length >= 2) {
                trail.forEach(p => allCoords.push([p.lng, p.lat]));
                allCoords.push([NaN, NaN]);
            }
        });
        if (allCoords.length >= 2) {
            try {
                map.addSource(trailSourceId, {
                    type: 'geojson',
                    data: { type: 'MultiLineString', coordinates: [] }
                });
                const lines: [number, number][][] = [];
                let current: [number, number][] = [];
                allCoords.forEach(([lng, lat]) => {
                    if (isNaN(lng)) { if (current.length >= 2) lines.push(current); current = []; }
                    else current.push([lng, lat]);
                });
                if (current.length >= 2) lines.push(current);
                if (lines.length > 0) {
                    (map.getSource(trailSourceId) as any).setData({
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'MultiLineString', coordinates: lines }
                    });
                    if (!map.getLayer?.('driver-trails-layer')) {
                        map.addLayer({
                            id: 'driver-trails-layer',
                            type: 'line',
                            source: trailSourceId,
                            paint: { 'line-color': '#3B82F6', 'line-width': 4, 'line-opacity': 0.7 }
                        });
                    }
                }
            } catch (_) { /* style no cargada aún */ }
        }

        // Crear markers para cada conductor
        drivers.forEach((driver) => {
            if (!driver.current_location?.lat || !driver.current_location?.lng) return;

            const el = document.createElement('div');
            el.className = 'driver-marker';
            el.style.width = '32px';
            el.style.height = '32px';
            el.innerHTML = `
                <div style="position: relative; width: 32px; height: 32px;">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="14" fill="${driver.status === 'online' ? '#10B981' : driver.status === 'idle' ? '#F59E0B' : '#6B7280'}" stroke="white" stroke-width="2"/>
                        <path d="M16 8 L20 16 L16 20 L12 16 Z" fill="white"/>
                    </svg>
                </div>
            `;

            const marker = new mapboxgl.Marker(el)
                .setLngLat([driver.current_location.lng, driver.current_location.lat])
                .addTo(map);

            const statusLabel = driver.status === 'online' ? t('dispatch.status_online') : driver.status === 'idle' ? t('dispatch.status_idle') : t('dispatch.status_offline');
            const lastUpdate = formatRelativeTime(driver.updated_at, t);
            const latLngStr = `${driver.current_location.lat.toFixed(5)}, ${driver.current_location.lng.toFixed(5)}`;
            const stopsHtml = driver.active_manifest?.shipments?.length
                ? `<div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;"><p style="font-size: 11px; font-weight: 600; color: #4b5563; margin: 0 0 4px 0;">Paradas:</p><ul style="font-size: 11px; color: #6b7280; margin: 0; padding-left: 16px; max-height: 80px; overflow-y: auto;">${
                    driver.active_manifest.shipments.map((s: any, i: number) => {
                        const addr = s.receiver_details?.address || s.receiver_details?.city || '—';
                        return `<li>${i + 1}. ${String(addr).substring(0, 35)}${String(addr).length > 35 ? '…' : ''}</li>`;
                    }).join('')
                }</ul></div>`
                : '';
            const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                    <div style="padding: 8px; min-width: 200px;">
                        <p style="font-weight: bold; font-size: 14px; margin: 0;">${driver.name}</p>
                        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0 0;">${statusLabel}</p>
                        <p style="font-size: 11px; color: #6B7280; margin: 4px 0 0 0;"><strong>${t('dispatch.last_update')}:</strong> ${lastUpdate}</p>
                        <p style="font-size: 11px; color: #6B7280; margin: 2px 0 0 0;"><strong>${t('dispatch.coordinates')}:</strong> ${latLngStr}</p>
                        ${driver.active_manifest ? `<p style="font-size: 11px; color: #9CA3AF; margin: 4px 0 0 0;">${t('dispatch.active')}: ${driver.active_manifest.manifest_number || 'N/A'}</p>${stopsHtml}` : ''}
                    </div>
                `);
            marker.setPopup(popup);

            markersRef.current.set(driver.id, marker);
        });

        // Ajustar vista si hay drivers
        if (drivers.length > 0 && drivers.some(d => d.current_location)) {
            const bounds = new mapboxgl.LngLatBounds();
            drivers.forEach((driver) => {
                if (driver.current_location) {
                    bounds.extend([driver.current_location.lng, driver.current_location.lat]);
                }
            });
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 100, maxZoom: 15 });
            }
        }
    }, [drivers, driverTrails, t]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold">{error}</p>
                </div>
            </div>
        );
    }

    return <div ref={mapContainer} className="w-full h-full" />;
}
