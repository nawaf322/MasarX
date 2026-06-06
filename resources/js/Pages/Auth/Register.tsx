import { Button } from "@/Components/UI/button"
import { Input } from "@/Components/UI/input"
import { Label } from "@/Components/UI/label"
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Register() {
    const { t } = useTranslation();
    const { props } = usePage();
    const branding = (props as any).branding || {};
    const googleLoginEnabled = !!(branding as any).google_login_enabled;
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'));
    };

    return (
        <GuestLayout>
            <Head title={t('auth.sign_up')} />

            <div className="flex flex-col space-y-4 text-left mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('auth.register_title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('auth.register_subtitle')}
                </p>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-700 font-medium">{t('auth.your_name')}</Label>
                        <Input
                            id="name"
                            name="name"
                            value={data.name}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="name"
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            placeholder={t('auth.enter_name')}
                        />
                        {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.email_or_phone')}</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            placeholder={t('auth.type_email_phone')}
                        />
                        {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-700 font-medium">{t('auth.password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                            placeholder={t('auth.type_password')}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t('auth.password_min_chars')}</p>
                        {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation" className="text-gray-700 font-medium">{t('auth.confirm_password')}</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                            placeholder={t('auth.retype_password')}
                        />
                        {errors.password_confirmation && <div className="text-red-500 text-xs mt-1">{errors.password_confirmation}</div>}
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input id="terms" type="checkbox" className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2" required />
                    </div>
                    <div className="ml-3 text-sm">
                        <Label htmlFor="terms" className="font-normal text-gray-500">
                            {t('auth.terms_agree')}
                        </Label>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-[#4F46E5] hover:bg-indigo-700 rounded-xl text-md font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
                    disabled={processing}
                >
                    {t('auth.sign_up')}
                </Button>
            </form>

            {googleLoginEnabled && (
                <>
                    <div className="relative mt-10">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-400">
                                {t('auth.or_other_accounts')}
                            </span>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col gap-3">
                        <a
                            href={route('auth.google')}
                            className="flex items-center justify-center h-12 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-all gap-3 text-sm font-medium text-gray-700"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                            {t('auth.continue_with_google')}
                        </a>
                    </div>
                </>
            )}

            <div className="text-center text-sm mt-6">
                {t('auth.already_have_account')}{" "}
                <Link href={route('login')} className="font-bold text-gray-900 hover:underline">
                    {t('auth.sign_in')}
                </Link>
            </div>
        </GuestLayout>
    );
}
