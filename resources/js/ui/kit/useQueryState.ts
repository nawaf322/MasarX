import { router } from '@inertiajs/react';
import { useCallback, useState, useEffect } from 'react';

type QueryParams = Record<string, any>;

interface UseQueryStateOptions {
    defaults?: QueryParams;
    baseUrl?: string;
}

export function useQueryState(initialParams: QueryParams = {}, options: UseQueryStateOptions = {}) {
    const [params, setParams] = useState<QueryParams>({
        page: 1,
        per_page: 15,
        search: '',
        ...options.defaults,
        ...initialParams,
    });

    const update = useCallback((newParams: Partial<QueryParams>) => {
        setParams(prev => {
            const next = { ...prev, ...newParams };

            // Allow resetting specific keys by passing null/undefined
            Object.keys(newParams).forEach(key => {
                if (newParams[key] === null || newParams[key] === undefined || newParams[key] === '') {
                    delete next[key];
                }
            });

            // If filter changes, reset page to 1
            if ('search' in newParams || Object.keys(newParams).some(k => k !== 'page' && k !== 'per_page')) {
                next.page = 1;
            }

            return next;
        });
    }, []);

    const submit = useCallback((override?: Partial<QueryParams>) => {
        const routeName = options.baseUrl || window.location.pathname;
        const merged = { ...params, ...override };

        // Clean empty params before sending
        const cleanParams = Object.fromEntries(
            Object.entries(merged).filter(([_, v]) => v !== null && v !== '' && v !== undefined)
        );

        router.get(routeName, cleanParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [params, options.baseUrl]);

    // Auto-submit on change (debounce could be added here if needed, but usually handled in UI)
    // For now, we manually submit in effects or events to control traffic

    return {
        params,
        update, // Update local state
        submit, // Push to URL
        set: (key: string, value: any) => {
            update({ [key]: value });
            // Optional: Auto-submit on certain changes?
            // For now, let consumer decide when to submit (usually useEffect on params)
        }
    };
}
