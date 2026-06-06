import { Button } from "@/Components/UI/button"
import { Checkbox } from "@/Components/UI/checkbox"
import { Input } from "@/Components/UI/input"
import { Label } from "@/Components/UI/label"
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Calculator } from 'lucide-react';

export default function Login({ status, canResetPassword, publicCalculatorEnabled = false, customerRegisterUrl }: { status?: string, canResetPassword?: boolean, publicCalculatorEnabled?: boolean, customerRegisterUrl?: string | null }) {
    const { props } = usePage();
    const branding = (props as any).branding || {};
    // Solo logo principal o login_logo - NUNCA sublogo en login
    const logoSrc = branding.login_logo_url || branding.logo_url;
    const { t } = useTranslation();

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    return (
        <GuestLayout>
            <Head title={t('common.login')} />

            <div className="flex flex-col space-y-4 text-left mb-10">
                {logoSrc ? (
                    <img src={logoSrc} alt="App Logo" className="h-14 w-auto object-contain self-center mb-4 mx-auto drop-shadow-sm" />
                ) : (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('auth.welcome_back')}</h1>
                        <p className="text-sm text-muted-foreground mt-2">{t('auth.sign_in_text')}</p>
                    </div>
                )}

                <p className="text-sm text-muted-foreground">
                    {t('auth.sign_in_text')}
                </p>
            </div>


            <form onSubmit={submit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('auth.enter_email')}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            required
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-gray-700 font-medium">{t('auth.password')}</Label>
                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    {t('auth.forgot_password')}
                                </Link>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t('auth.type_password')}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            required
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                    </div>
                </div>

                <div className="flex items-center">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', !!checked)}
                        className="border-gray-300 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="remember" className="ml-2 font-normal text-gray-500">{t('auth.remember_me')}</Label>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-md font-semibold transition-all shadow-lg text-white"
                    style={{ backgroundColor: branding.primary_color || '#4F46E5' }}
                    disabled={processing}
                >
                    {t('auth.sign_in')}
                </Button>
            </form>

            <div className="relative mt-10">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">
                        {t('auth.or_sign_in_with')}
                    </span>
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
                {(branding as any).google_login_enabled && (
                    <a
                        href={route('auth.google')}
                        className="flex items-center justify-center h-12 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-all gap-3 text-sm font-medium text-gray-700"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                        {t('auth.continue_with_google')}
                    </a>
                )}
                <Link
                    href={route('tracking.index')}
                    className="flex items-center justify-center h-12 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-400 transition-all gap-2 text-sm font-medium text-gray-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    {t('tracking.consult_tracking')}
                </Link>
                {publicCalculatorEnabled && (
                    <Link
                        href={route('public.calculator')}
                        className="flex items-center justify-center h-12 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-400 transition-all gap-2 text-sm font-medium text-indigo-700"
                    >
                        <Calculator size={18} />
                        {t('public_calc.calculate_rates_btn')}
                    </Link>
                )}
            </div>

            {customerRegisterUrl && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 text-center mb-3">{t('auth.customer_section_title')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <a
                            href={customerRegisterUrl}
                            className="flex flex-col items-center gap-1.5 px-3 py-3 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                            {t('auth.customer_register')}
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]');
                                if (emailInput) { emailInput.focus(); emailInput.scrollIntoView({ behavior: 'smooth' }); }
                            }}
                            className="flex flex-col items-center gap-1.5 px-3 py-3 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                            {t('auth.customer_login')}
                        </button>
                    </div>
                </div>
            )}
        </GuestLayout >
    );
}
