import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './i18n/en.json';
import es from './i18n/es.json';

// Idioma desde meta tag (blade) para alinearse con backend/org - evita LanguageDetector que sobrescribía
const getInitialLng = (): string => {
    if (typeof document === 'undefined') return 'en';
    const meta = document.querySelector('meta[name="app-locale"]');
    const raw = meta?.getAttribute('content') || '';
    return raw === 'es' || raw.startsWith('es') ? 'es' : 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
            'es-ES': { translation: es },
            'es-MX': { translation: es }
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

export default i18n;
