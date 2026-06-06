import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Hook que muestra skeleton/carga mientras Inertia realiza una visita (búsqueda, filtros, paginación, etc.).
 * Usa los eventos reales 'start' y 'finish' del router para que el skeleton se oculte en cuanto
 * llega la respuesta, sin depender de tiempos fijos.
 */
export function usePageLoading() {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const offStart = router.on('start', () => setIsLoading(true));
        const offFinish = router.on('finish', () => setIsLoading(false));

        return () => {
            offStart();
            offFinish();
        };
    }, []);

    return isLoading;
}
