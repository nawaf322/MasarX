import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Eye, EyeOff, Package, Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    slug:            string;
    orgName:         string;
    orgLogo:         string | null;
    orgPrimaryColor: string;
}

export default function CustomerRegister({ slug, orgName, orgLogo, orgPrimaryColor }: Props) {
    const { t } = useTranslation();
    const [showPassword, setShowPassword]   = useState(false);
    const [showConfirm,  setShowConfirm]    = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name:                  '',
        email:                 '',
        phone:                 '',
        password:              '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('customer.portal.register.store', { slug }));
    };

    const inputBase = 'w-full border rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-colors';
    const inputOk   = 'border-gray-200 focus:ring-indigo-400 focus:border-indigo-400';
    const inputErr  = 'border-red-400 focus:ring-red-300';

    return (
        <GuestLayout>
            <Head title={t('customer_portal.register_title')} />

            {/* Org identity */}
            <div className="mb-8 text-center">
                {orgLogo ? (
                    <img src={orgLogo} alt={orgName} className="h-12 mx-auto mb-4 object-contain" />
                ) : (
                    <div className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
                         style={{ backgroundColor: orgPrimaryColor + '20' }}>
                        <Package className="w-7 h-7" style={{ color: orgPrimaryColor }} />
                    </div>
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                    {t('customer_portal.join_as_customer', { org: orgName })}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {t('customer_portal.register_subtitle', { org: orgName })}
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('customer_portal.name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        placeholder={t('customer_portal.name_placeholder')}
                        required
                        autoFocus
                        className={`${inputBase} ${errors.name ? inputErr : inputOk}`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('customer_portal.email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={data.email}
                        onChange={e => setData('email', e.target.value)}
                        placeholder="you@example.com"
                        required
                        className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('customer_portal.phone')}
                    </label>
                    <input
                        type="tel"
                        value={data.phone}
                        onChange={e => setData('phone', e.target.value)}
                        placeholder="+1 555 000 0000"
                        className={`${inputBase} ${errors.phone ? inputErr : inputOk}`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('customer_portal.password')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            placeholder={t('auth.password_min_chars')}
                            required
                            className={`${inputBase} pr-10 ${errors.password ? inputErr : inputOk}`}
                        />
                        <button type="button" tabIndex={-1}
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('customer_portal.confirm_password')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            placeholder={t('auth.retype_password')}
                            required
                            className={`${inputBase} pr-10 ${errors.password_confirmation ? inputErr : inputOk}`}
                        />
                        <button type="button" tabIndex={-1}
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password_confirmation && (
                        <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>
                    )}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 pt-1">
                    <input id="terms" type="checkbox" required
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="terms" className="text-xs text-gray-500">
                        {t('auth.terms_agree')}
                    </label>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={processing}
                    style={{ backgroundColor: orgPrimaryColor }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-semibold rounded-xl text-sm transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:opacity-90 mt-2"
                >
                    {processing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('customer_portal.creating')}</>
                        : <><UserPlus className="w-4 h-4" /> {t('customer_portal.create_account')}</>
                    }
                </button>

                {/* Sign in link */}
                <p className="text-center text-sm text-gray-500 pt-1">
                    {t('auth.already_have_account')}{' '}
                    <a href={route('login')} className="font-semibold text-gray-900 hover:underline">
                        {t('auth.sign_in')}
                    </a>
                </p>
            </form>
        </GuestLayout>
    );
}
