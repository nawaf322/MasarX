/**
 * useTranslation - Wrapper unificado para i18n en frontend.
 *
 * ESTRATEGIA i18n:
 * - Backend (lang/*.json): validaciones, flash, mensajes API (passwords.*, settings.*, etc.)
 * - Frontend (resources/js/i18n/*.json): fuente principal via react-i18next.
 *
 * Este hook delega a react-i18next. Soporta {{name}} (i18next) y :name (legacy) para compatibilidad.
 */
import { useTranslation as useReactI18next } from 'react-i18next';

export function useTranslation() {
    const { t: tBase, i18n } = useReactI18next();

    const t = (key: string, replace?: Record<string, any>) => {
        const result = tBase(key, {
            ...replace,
            returnObjects: false
        });
        
        if (typeof result !== 'string') return result;
        
        if (!replace) return result;
        
        // Legacy: también reemplazar :key por si acaso
        return Object.entries(replace).reduce(
            (s, [k, v]) => s.replace(new RegExp(`:${k}\\b`, 'g'), String(v)),
            result
        );
    };

    return { t, locale: i18n.language, i18n };
}
