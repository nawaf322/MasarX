import { useEffect, useState } from 'react';
import { MapboxMap } from './MapboxMap';
import { GoogleMap } from './GoogleMap';
import { LeafletMap } from './LeafletMap';
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

interface MapConfig {
    provider: 'mapbox' | 'google' | 'osm';
    default_provider?: string;
    mapbox_token?: string;
    google_maps_key?: string;
    mapbox_enabled?: boolean;
    google_maps_enabled?: boolean;
    google_enabled?: boolean;
    default_center_lat?: number;
    default_center_lng?: number;
    default_zoom?: number;
}

interface MapRendererProps {
    drivers: Driver[];
    driverTrails?: Record<number, Array<{ lat: number; lng: number }>>;
    selectedDriverId?: number | null;
    mapConfig?: MapConfig;
}

export function MapRenderer({ drivers, driverTrails = {}, selectedDriverId, mapConfig }: MapRendererProps) {
    const { t } = useTranslation();
    const [error, setError] = useState<string | null>(null);

    // Determinar qué proveedor usar
    const determineProvider = (): 'mapbox' | 'google' | 'osm' => {
        if (!mapConfig) return 'osm'; // Fallback por defecto

        const provider = mapConfig.default_provider || mapConfig.provider || 'mapbox';
        const mapboxEnabled = mapConfig.mapbox_enabled !== false; // Default true if not set
        const googleEnabled = mapConfig.google_enabled || mapConfig.google_maps_enabled || false;

        // Intentar usar el proveedor seleccionado
        if (provider === 'mapbox' && mapboxEnabled && mapConfig.mapbox_token) {
            return 'mapbox';
        }

        if (provider === 'google' && googleEnabled && mapConfig.google_maps_key) {
            return 'google';
        }

        // Si el proveedor seleccionado no está disponible, intentar alternativas
        if (mapboxEnabled && mapConfig.mapbox_token) {
            return 'mapbox';
        }

        if (googleEnabled && mapConfig.google_maps_key) {
            return 'google';
        }

        // Fallback a OSM
        return 'osm';
    };

    const activeProvider = determineProvider();

    useEffect(() => {
        setError(null);
    }, [activeProvider]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold">{error}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('dispatch.map_error_fallback')}</p>
                </div>
            </div>
        );
    }

    switch (activeProvider) {
        case 'mapbox':
            return <MapboxMap drivers={drivers} driverTrails={driverTrails} token={mapConfig?.mapbox_token || ''} mapConfig={mapConfig} />;
        case 'google':
            return <GoogleMap drivers={drivers} driverTrails={driverTrails} apiKey={mapConfig?.google_maps_key || ''} mapConfig={mapConfig} />;
        case 'osm':
        default:
            return <LeafletMap drivers={drivers} driverTrails={driverTrails} selectedDriverId={selectedDriverId} mapConfig={mapConfig as any} />;
    }
}
