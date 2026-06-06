/**
 * useEdition — Feature-flag hook for SaaS edition gates.
 *
 * Reads the `edition` shared prop injected by HandleInertiaRequests.
 *
 * Usage:
 *   const { has, isPremium, isEnvato, current } = useEdition();
 *   if (!has('commissions')) return null;
 */
import { usePage } from '@inertiajs/react';

interface EditionState {
    current: string;
    isPremium: boolean;
    isEnvato: boolean;
    features: string[];
}

const FALLBACK: EditionState = {
    current: 'premium',
    isPremium: true,
    isEnvato: false,
    features: [],
};

export function useEdition() {
    const { edition } = usePage<{ edition?: EditionState }>().props;
    const state = edition ?? FALLBACK;

    return {
        current: state.current,
        isPremium: state.isPremium,
        isEnvato: state.isEnvato,
        /** Returns true when the feature is available in the current edition. */
        has: (feature: string) => state.features.includes(feature),
        /** Returns true when ALL listed features are available. */
        hasAll: (...features: string[]) => features.every(f => state.features.includes(f)),
        /** Returns true when AT LEAST ONE feature is available. */
        hasAny: (...features: string[]) => features.some(f => state.features.includes(f)),
    };
}
