import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './i18n/en.json';
import es from './i18n/es.json';
import ar from './i18n/ar.json';

// Idioma desde meta tag (blade) para alinearse con backend/org - evita LanguageDetector que sobrescribía
const getInitialLng = (): string => {
    if (typeof document === 'undefined') return 'ar';
    const meta = document.querySelector('meta[name="app-locale"]');
    const raw = meta?.getAttribute('content') || '';
    if (raw === 'ar' || raw.startsWith('ar')) return 'ar';
    if (raw === 'es' || raw.startsWith('es')) return 'es';
    return 'en';
};

// Apply text direction (RTL for Arabic) on <html> so the whole UI mirrors correctly
const applyDir = (lng: string): void => {
    if (typeof document === 'undefined') return;
    const rtl = lng.startsWith('ar');
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lng);
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
            'es-ES': { translation: es },
            'es-MX': { translation: es },
            ar: { translation: ar },
            'ar-SA': { translation: ar }
        },
        lng: getInitialLng(),
        fallbackLng: 'en',
        debug: false,
        returnObjects: false,
        returnEmptyString: false,
        returnNull: false,
        interpolation: {
            escapeValue: false
        }
    });

// Set initial direction and keep it in sync on language change
applyDir(i18n.language || getInitialLng());
i18n.on('languageChanged', applyDir);

export default i18n;
