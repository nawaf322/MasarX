import { ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    children: ReactNode;
    orgName?: string;
    orgLogo?: string | null;
}

export default function PublicLayout({ children, orgName, orgLogo }: Props) {
    const { t } = useTranslation();
    const { props } = usePage();
    const auth = (props as any).auth;
    const isAuth = !!auth?.user;
    const branding = (props as any).branding || {};

    const displayName = orgName || branding.app_name || 'MasarX';
    // orgLogo comes from the controller already resolved via Storage::url()
    const displayLogo = orgLogo || branding.logo_url || null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Navbar */}
            <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        {displayLogo ? (
                            <img src={displayLogo} alt={displayName} className="h-8 w-auto" />
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                    <span className="text-white font-bold text-sm">{displayName.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{displayName}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isAuth ? (
                            <Link
                                href={route('dashboard')}
                                className="text-sm font-medium text-primary hover:underline px-3 py-1.5"
                            >
                                {t('public_calc.go_to_dashboard')}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login') + '?from=rates'}
                                    className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    {t('public_calc.login_btn')}
                                </Link>
                                <Link
                                    href={route('register') + '?from=rates'}
                                    className="text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-lg transition-colors"
                                >
                                    {t('public_calc.register_btn')}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Page content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-5">
                <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-400 dark:text-slate-600">
                    &copy; {new Date().getFullYear()} {displayName} &mdash; {t('public_calc.powered_by')}
                </div>
            </footer>
        </div>
    );
}
