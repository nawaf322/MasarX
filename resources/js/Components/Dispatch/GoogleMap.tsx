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

interface GoogleMapProps {
    drivers: Driver[];
    driverTrails?: Record<number, Array<{ lat: number; lng: number }>>;
    apiKey: string;
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

export function GoogleMap({ drivers, driverTrails = {}, apiKey, mapConfig }: GoogleMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const stopMarkersRef = useRef<google.maps.Marker[]>([]);
    const routePolylineRef = useRef<google.maps.Polyline | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (!mapContainer.current || !apiKey) {
            setError(t('dispatch.google_maps_key_missing'));
            return;
        }

        const loadGoogleMaps = async () => {
            try {
                // Cargar Google Maps JS
                if (!(window as any).google?.maps) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
                        script.async = true;
                        script.defer = true;
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Failed to load Google Maps'));
                        document.head.appendChild(script);
                    });
                }

                const google = (window as any).google;
                if (!google?.maps) {
                    throw new Error('Google Maps API not available');
                }

                // Inicializar mapa
                const map = new google.maps.Map(mapContainer.current!, {
                    center: {
                        lat: mapConfig?.default_center_lat ?? 20,
                        lng: mapConfig?.default_center_lng ?? 0,
                    },
                    zoom: mapConfig?.default_zoom ?? 3,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                });

                mapRef.current = map;
                setError(null);
            } catch (err) {
                console.error('Google Maps load error:', err);
                setError(t('dispatch.google_maps_load_error'));
            }
        };

        loadGoogleMaps();
    }, [apiKey, t]);

    // Actualizar markers
    useEffect(() => {
        if (!mapRef.current || !(window as any).google?.maps) return;

        const google = (window as any).google;
        const map = mapRef.current;

        // Limpiar markers anteriores
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current.clear();
        polylinesRef.current.forEach(p => p.setMap(null));
        polylinesRef.current = [];
        stopMarkersRef.current.forEach(m => m.setMap(null));
        stopMarkersRef.current = [];
        if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
        }

        // Dibujar ruta de manifest (stops + route_geometry)
        drivers.forEach((driver) => {
            const routeGeom = driver.active_manifest?.route_geometry;
            if (routeGeom && routeGeom.length >= 2) {
                const path = routeGeom.map((p: number[]) => ({ lat: p[0], lng: p[1] }));
                const routePoly = new google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: '#8B5CF6',
                    strokeOpacity: 0.9,
                    strokeWeight: 5,
                    map,
                });
                routePolylineRef.current = routePoly;
            }
            const stops = driver.active_manifest?.stops ?? [];
            stops.forEach((stop: { type: string; lat: number; lng: number; address_text?: string; tracking_number?: string }) => {
                const color = stop.type === 'pickup' ? '#10B981' : '#F59E0B';
                const marker = new google.maps.Marker({
                    position: { lat: stop.lat, lng: stop.lng },
                    map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: color,
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                    },
                });
                const label = stop.type === 'pickup' ? t('dispatch.stop_pickup') : t('dispatch.stop_delivery');
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding:8px;min-width:180px"><p style="font-size:11px;font-weight:600;color:#4b5563">${label}</p><p style="font-size:11px;color:#374151">${stop.address_text || '—'}</p>${stop.tracking_number ? `<p style="font-size:11px;color:#6366f1;margin-top:4px">${stop.tracking_number}</p>` : ''}</div>`,
                });
                marker.addListener('click', () => infoWindow.open(map, marker));
                stopMarkersRef.current.push(marker);
            });
        });

        // Dibujar trails (polylines)
        drivers.forEach((driver) => {
            const trail = driverTrails[driver.id];
            if (trail && trail.length >= 2) {
                const path = trail.map(p => ({ lat: p.lat, lng: p.lng }));
                const poly = new google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.7,
                    strokeWeight: 4,
                    map,
                });
                polylinesRef.current.push(poly);
            }
        });

        // Crear markers para cada conductor
        drivers.forEach((driver) => {
            if (!driver.current_location?.lat || !driver.current_location?.lng) return;

            const icon = {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 5,
                fillColor: driver.status === 'online' ? '#10B981' : driver.status === 'idle' ? '#F59E0B' : '#6B7280',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                rotation: driver.heading || 0,
            };

            const marker = new google.maps.Marker({
                position: { lat: driver.current_location.lat, lng: driver.current_location.lng },
                map: map,
                icon: icon,
                title: driver.name,
            });

            const statusLabel = driver.status === 'online' ? t('dispatch.status_online') : driver.status === 'idle' ? t('dispatch.status_idle') : t('dispatch.status_offline');
            const lastUpdate = formatRelativeTime(driver.updated_at, t);
            const latLngStr = `${driver.current_location.lat.toFixed(5)}, ${driver.current_location.lng.toFixed(5)}`;
            const stopsHtml = driver.active_manifest?.shipments?.length
                ? `<div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;"><p style="font-size: 11px; font-weight: 600; color: #4b5563;">Paradas:</p><ul style="font-size: 11px; color: #6b7280; margin: 0; padding-left: 16px; max-height: 80px; overflow-y: auto;">${
                    driver.active_manifest.shipments.map((s: any, i: number) => {
                        const addr = s.receiver_details?.address || s.receiver_details?.city || '—';
                        return `<li>${i + 1}. ${String(addr).substring(0, 35)}${String(addr).length > 35 ? '…' : ''}</li>`;
                    }).join('')
                }</ul></div>`
                : '';
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; min-width: 200px;">
                        <p style="font-weight: bold; font-size: 14px; margin: 0;">${driver.name}</p>
                        <p style="font-size: 12px; color: #6B7280;">${statusLabel}</p>
                        <p style="font-size: 11px; color: #6B7280; margin: 4px 0 0 0;"><strong>${t('dispatch.last_update')}:</strong> ${lastUpdate}</p>
                        <p style="font-size: 11px; color: #6B7280; margin: 2px 0 0 0;"><strong>${t('dispatch.coordinates')}:</strong> ${latLngStr}</p>
                        ${driver.active_manifest ? `<p style="font-size: 11px; color: #9CA3AF; margin-top: 4px;">${t('dispatch.active')}: ${driver.active_manifest.manifest_number}</p>${stopsHtml}` : ''}
                    </div>
                `,
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            markersRef.current.set(driver.id, marker);
        });

        // Ajustar vista
        if (drivers.length > 0 && drivers.some(d => d.current_location)) {
            const bounds = new google.maps.LatLngBounds();
            drivers.forEach((driver) => {
                if (driver.current_location) {
                    bounds.extend({ lat: driver.current_location.lat, lng: driver.current_location.lng });
                }
            });
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
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
