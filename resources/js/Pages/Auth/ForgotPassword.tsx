import { Button } from "@/Components/UI/button"
import { Input } from "@/Components/UI/input"
import { Label } from "@/Components/UI/label"
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useTranslation();
    const { props } = usePage();
    const branding = (props as any).branding || {};
    const logoSrc = branding.login_logo_url || branding.logo_url;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title={t('auth.forgot_password_title')} />

            <div className="flex flex-col space-y-4 text-left mb-10">
                {logoSrc && (
                    <img src={logoSrc} alt="Logo" className="h-14 w-auto object-contain self-center mb-3 mx-auto drop-shadow-sm" />
                )}
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('auth.forgot_password_title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('auth.forgot_password_text')}
                </p>
            </div>

            {status && <div className="mb-4 font-medium text-sm text-green-600 dark:text-green-400">{status}</div>}

            <form onSubmit={submit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        placeholder={t('auth.enter_registered_email')}
                        className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-[#4F46E5] hover:bg-indigo-700 rounded-xl text-md font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
                    disabled={processing}
                >
                    {t('auth.email_reset_link')}
                </Button>
            </form>

            <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                </div>
            </div>

            <div className="flex flex-col gap-4 text-center text-sm mt-8">
                <div>
                    {t('auth.remember_password')}{" "}
                    <Link href={route('login')} className="font-bold text-gray-900 hover:underline">
                        {t('auth.sign_in')}
                    </Link>
                </div>
                <div>
                    {t('auth.dont_have_account')}{" "}
                    <Link href={route('register')} className="font-bold text-gray-900 hover:underline">
                        {t('auth.sign_up')}
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
