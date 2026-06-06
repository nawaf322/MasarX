import React, { PropsWithChildren, useState, useEffect, useRef } from 'react';
import Sidebar from '@/Components/Layout/Sidebar';
import Topbar from '@/Components/Layout/Topbar';
import { ThemeProvider } from "@/Components/ThemeProvider";
import { PageSkeleton } from '@/Components/Shared/PageSkeleton';
import { usePageLoading } from '@/hooks/usePageLoading';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';

import { QuickMessage } from "@/Components/QuickMessage"
import { Link } from '@inertiajs/react'
import { AlertTriangle, ArrowRight } from 'lucide-react'

import { usePage } from '@inertiajs/react';
// import { useSidebarStore } from '@/hooks/useSidebar';

/** Skeleton variant by route: cada módulo usa un estilo de skeleton distinto. */
function skeletonVariant(url: string): 'dashboard' | 'list' | 'tracking' | 'form' | 'settings' {
    if (url.startsWith('/settings')) return 'settings';
    if (url.startsWith('/tracking')) return 'tracking';
    if (url.startsWith('/shipments/create') || url.includes('/edit')) return 'form';
    if (url.startsWith('/shipments') || url.startsWith('/customers') || url.startsWith('/billing') || url.startsWith('/dispatch') || url.startsWith('/rates') || url.startsWith('/locations') || url.startsWith('/reports')) return 'list';
    return 'dashboard';
}

export default function AuthenticatedLayout({ children }: PropsWithChildren) {
    const { props, url } = usePage();
    const branding = (props as any).branding || {};
    const flash = (props as any).flash || {};
    const alert = useSweetAlert();
    const { t } = useTranslation();
    const flashHandled = useRef<string | null>(null);

    // Mostrar flash messages como toast traducido (i18n)
    useEffect(() => {
        if (!flash.success && !flash.error) {
            flashHandled.current = null;
            return;
        }
        if (flash.success && flashHandled.current !== flash.success) {
            flashHandled.current = flash.success;
            let msg: string;
            if (typeof flash.success === 'string' && /^[\w.]+$/.test(flash.success)) {
                const translated = t(flash.success);
                // Si t() devuelve la misma clave, la traducción no existe; usar fallback
                msg = translated !== flash.success ? translated : (t('common.saved') || 'Guardado correctamente');
            } else {
                msg = flash.success;
            }
            alert.toast(msg || flash.success, 'success');
        } else if (flash.error && flashHandled.current !== flash.error) {
            flashHandled.current = flash.error;
            let msg: string;
            if (typeof flash.error === 'string' && /^[\w.]+$/.test(flash.error)) {
                const translated = t(flash.error);
                msg = translated !== flash.error ? translated : (t('common.error') || 'Error');
            } else {
                msg = flash.error;
            }
            alert.error(msg || flash.error);
        }
    }, [flash.success, flash.error, t, alert]);

    // HTTP error modal (403, 404, 429 etc.) — styled SweetAlert2 with error code
    const httpErrorHandled = useRef<string | null>(null);
    useEffect(() => {
        const httpError = (flash as any).http_error;
        if (!httpError || !httpError.title) return;
        const key = httpError.title;
        if (httpErrorHandled.current === key) return;
        httpErrorHandled.current = key;

        import('sweetalert2').then(({ default: Swal }) => {
            Swal.fire({
                html: `
                    <div style="padding:0.5rem 0">
                        <div style="font-size:3rem;font-weight:800;background:linear-gradient(135deg,#6366f1,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.25rem;">${httpError.title.split(' — ')[0]}</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#1e293b;margin-bottom:0.75rem;">${httpError.title.split(' — ')[1] || ''}</div>
                        <p style="font-size:0.875rem;color:#64748b;line-height:1.6;">${httpError.text}</p>
                    </div>
                `,
                icon: httpError.icon || 'warning',
                confirmButtonText: 'OK',
                confirmButtonColor: '#6366f1',
                customClass: {
                    popup: 'rounded-2xl shadow-2xl',
                    confirmButton: 'px-6 py-2.5 rounded-xl font-semibold text-sm',
                },
                backdrop: 'rgba(0,0,0,0.4)',
                allowOutsideClick: true,
            });
        });
    }, [(flash as any).http_error]);

    const isLoading = usePageLoading();
    const isInSettings = url.startsWith('/settings');
    const isInShipmentCreate = url.startsWith('/shipments/create');
    const isInRates = url.startsWith('/rates');
    const isInDispatch = url.startsWith('/dispatch');

    // Estado del sidebar fuera de Settings: sigue "Compact Mode" (branding) o localStorage
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Colapsar automáticamente en create, rates y dispatch para dar más espacio al contenido (mapa/vista)
        if (isInShipmentCreate || isInRates || isInDispatch) return true;
        if (branding.sidebar_compact !== undefined) return branding.sidebar_compact;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved === 'true';
        }
        return false;
    });

    // Dentro de Settings: por defecto colapsado para dar más espacio al contenido (~50%); el usuario puede expandir con el botón
    const [settingsCollapsed, setSettingsCollapsed] = useState(true);
    useEffect(() => {
        if (isInSettings) setSettingsCollapsed(true);
    }, [isInSettings]);

    // Colapsar automáticamente cuando entramos a create, rates o dispatch (más espacio para mapa/formulario)
    useEffect(() => {
        if (isInDispatch || isInShipmentCreate || isInRates) {
            setIsCollapsed(true);
        }
    }, [isInShipmentCreate, isInRates, isInDispatch]);

    const effectiveCollapsed = isInSettings ? settingsCollapsed : isCollapsed;
    const toggleCollapse = () => {
        if (isInSettings) setSettingsCollapsed((s) => !s);
        else setIsCollapsed((c: boolean) => !c);
    };

    useEffect(() => {
        const root = document.documentElement;

        // —— Colores de marca (se aplican en toda la plantilla) ——
        if (branding.primary_color) {
            root.style.setProperty('--primary', branding.primary_color);
            root.style.setProperty('--brand-primary', branding.primary_color);
            root.style.setProperty('--primary-foreground', '#ffffff');
        }
        if (branding.secondary_color) {
            root.style.setProperty('--secondary', branding.secondary_color);
        }
        if (branding.accent_color) {
            root.style.setProperty('--accent', branding.accent_color);
        }

        // —— Tipografía: fuentes y tamaño base (aplicados en toda la plantilla) ——
        const primaryFont = branding.primary_font || 'Inter';
        const secondaryFont = branding.secondary_font || 'Inter';
        const fontStack = `"${primaryFont}", ui-sans-serif, system-ui, sans-serif`;
        root.style.setProperty('--font-sans', fontStack);
        root.style.setProperty('--font-body', fontStack);
        if (branding.base_font_size) {
            root.style.fontSize = branding.base_font_size;
        }
        document.body.style.fontFamily = fontStack;
        document.body.style.fontSize = branding.base_font_size || '';

        // Cargar fuentes desde Google Fonts si no son genéricas
        const googleFonts = [primaryFont, secondaryFont].filter((f) => !['system-ui', 'ui-sans-serif'].includes(f));
        if (googleFonts.length > 0) {
            const existing = document.getElementById('branding-google-fonts');
            if (existing) existing.remove();
            const link = document.createElement('link');
            link.id = 'branding-google-fonts';
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(primaryFont.replace(/ /g, '+'))}:wght@400;500;600;700${primaryFont !== secondaryFont ? `&family=${encodeURIComponent(secondaryFont.replace(/ /g, '+'))}:wght@400;500;600;700` : ''}&display=swap`;
            document.head.appendChild(link);
        }

        // —— Layout density (compact / normal / spacious) ——
        root.setAttribute('data-density', branding.layout_density || 'normal');

        // —— Modo monocromo (theme chrome) ——
        if (branding.monochrome_mode) {
            root.classList.add('monochrome-mode');
        } else {
            root.classList.remove('monochrome-mode');
        }

        // —— Favicon ——
        if (branding.favicon_url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = branding.favicon_url;
        }
    }, [branding]);

    const layoutBg = branding.layout_background || 'oklch(98.5% 0.002 247.839)';
    const cardSkin = branding.card_skin || 'shadow';

    // Track dark mode so we don't apply the light layoutBg inline when dark is active
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );
    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')));
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        setIsDark(root.classList.contains('dark'));
        return () => observer.disconnect();
    }, []);

    // In dark mode let CSS variables control the background; in light apply branding color
    const bgStyle = isDark ? undefined : { backgroundColor: layoutBg };

    return (
        <ThemeProvider defaultTheme={branding.ui_theme || 'system'} storageKey="deprixa-theme">
            <div className="min-h-screen flex w-full transition-colors duration-300 relative" style={bgStyle}>
                {!branding.security_locked && (
                    <Sidebar isCollapsed={effectiveCollapsed} toggleCollapse={toggleCollapse} />
                )}
                <div className={`flex flex-col flex-1 overflow-hidden ${branding.security_locked ? 'items-center justify-center' : ''}`}>
                    {(props as any).demo_mode && (
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span>DEMO MODE — You can explore and create data freely. Delete operations and admin account changes are restricted.</span>
                            <a href="https://codecanyon.net/user/coddingpro/portfolio" target="_blank" rel="noopener noreferrer" className="ml-2 px-3 py-0.5 bg-white text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors">
                                Buy License
                            </a>
                        </div>
                    )}
                    {branding.needs_company_setup && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 text-sm">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{t('common.company_setup_warning')}</span>
                            <Link
                                href={route('settings.company')}
                                className="flex items-center gap-1 font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 shrink-0"
                            >
                                {t('common.configure_now')}
                                <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                    )}
                    <Topbar />
                    <main
                        className={`flex-1 w-full transition-colors duration-300 ${
                            isInDispatch ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6 lg:p-8'
                        }`}
                        style={bgStyle}
                        data-card-skin={cardSkin}
                    >
                        <div className={`${isInDispatch ? 'w-full h-full' : 'w-full'} animate-in fade-in-0 duration-200`}>
                            {isLoading ? (
                                <PageSkeleton variant={skeletonVariant(url)} />
                            ) : (
                                children
                            )}
                        </div>
                    </main>
                </div>
                <QuickMessage />
            </div>
        </ThemeProvider>
    );
}
