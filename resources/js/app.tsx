import '../css/app.css';
import './bootstrap.js'; // Explicit extension
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ErrorBoundary } from '@/Components/ErrorBoundary';
import Swal from 'sweetalert2';
import { route as ziggyRoute } from 'ziggy-js';

// Inicializar route globalmente
if (typeof window !== 'undefined') {
    (window as any).route = ziggyRoute;
}

const appName = import.meta.env.VITE_APP_NAME || 'Deprixa Plus';

// Validation errors (422) - skip generic alert; form shows inline errors
router.on('error', (event) => {
    const errors = event?.detail?.errors;
    if (errors && typeof errors === 'object' && !Array.isArray(errors) && Object.keys(errors).length > 0) {
        return;
    }
    const title = typeof i18n?.t === 'function' ? i18n.t('common.error_title') : 'Error';
    const text = typeof i18n?.t === 'function' ? i18n.t('common.error_server') : 'A server error occurred. Please try again.';
    (Swal.fire as any)({
        title,
        text,
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: typeof i18n?.t === 'function' ? i18n.t('common.confirm') : 'OK',
        customClass: { popup: 'rounded-2xl shadow-xl' },
        backdrop: true,
        allowEscapeKey: true,
        allowOutsideClick: true,
        zIndex: 99999,
        didOpen: (popup: HTMLElement) => {
            popup.style.zIndex = '99999';
            const container = popup.closest('.swal2-container');
            if (container) (container as HTMLElement).style.zIndex = '99999';
        },
    });
});

// Server exceptions (500) - show generic error
router.on('exception', () => {
    const title = typeof i18n?.t === 'function' ? i18n.t('common.error_title') : 'Error';
    const text = typeof i18n?.t === 'function' ? i18n.t('common.error_server') : 'A server error occurred. Please try again.';
    (Swal.fire as any)({
        title,
        text,
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: typeof i18n?.t === 'function' ? i18n.t('common.confirm') : 'OK',
        customClass: { popup: 'rounded-2xl shadow-xl' },
        backdrop: true,
        allowEscapeKey: true,
        allowOutsideClick: true,
        zIndex: 99999,
        didOpen: (popup: HTMLElement) => {
            popup.style.zIndex = '99999';
            const container = popup.closest('.swal2-container');
            if (container) (container as HTMLElement).style.zIndex = '99999';
        },
    });
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),

    setup({ el, App, props }) {
        // Inicializar Ziggy route con las props de Inertia ANTES de renderizar
        if (props.initialPage.props.ziggy && typeof window !== 'undefined') {
            (window as any).Ziggy = props.initialPage.props.ziggy;
            // Asegurar que route esté disponible globalmente usando la configuración de Ziggy
            try {
                if (!(window as any).route) {
                    (window as any).route = (name: string, params?: any, absolute?: boolean) => {
                        return ziggyRoute(name, params, absolute, props.initialPage.props.ziggy);
                    };
                }
            } catch (e) {
                console.error('Error initializing route:', e);
            }
        }

        // Hydrate i18n with the locale from the backend (Organization settings or Middleware detection)
        const backendLocale = props.initialPage.props.locale as string;
        const normalizedLocale = backendLocale && (backendLocale === 'es' || backendLocale.startsWith('es')) ? 'es' : 'en';
        if (normalizedLocale && i18n.language !== normalizedLocale) {
            i18n.changeLanguage(normalizedLocale);
        }
        const root = createRoot(el);
        root.render(
            <I18nextProvider i18n={i18n}>
                <ErrorBoundary>
                    <App {...props} />
                </ErrorBoundary>
            </I18nextProvider>
        );
    },
    progress: {
        // Usa el color primario de la plantilla (Branding); por defecto --brand-primary en app.css
        color: 'var(--brand-primary, #4F46E5)',
    },
});
