import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstallLayout from '@/Layouts/InstallLayout';
import { User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { router, useForm } from '@inertiajs/react';

interface Props {
    currentStep: number;
}

export default function Step4Admin({ currentStep }: Props) {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name:                  '',
        email:                 '',
        password:              '',
        password_confirmation: '',
    });

    const passwordsMatch =
        data.password.length === 0 ||
        data.password_confirmation.length === 0 ||
        data.password === data.password_confirmation;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.create-admin'));
    };

    const inputClass =
        'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
    const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

    return (
        <InstallLayout currentStep={currentStep}>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('install.admin_title')}</h1>
                </div>
                <p className="text-slate-500 text-sm mb-8 ml-14">
                    {t('install.admin_subtitle')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className={labelClass}>{t('install.name_required')}</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            className={inputClass}
                            placeholder="Juan Admin García"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelClass}>{t('install.email_required')}</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            className={inputClass}
                            placeholder="admin@miempresa.com"
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label className={labelClass}>{t('install.password_required')}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                minLength={8}
                                className={`${inputClass} pr-10`}
                                placeholder={t('install.min_8_chars')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className={labelClass}>{t('install.confirm_password_required')}</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                                className={`${inputClass} pr-10 ${
                                    !passwordsMatch ? 'border-red-400 focus:ring-red-500' : ''
                                }`}
                                placeholder={t('install.repeat_password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {!passwordsMatch && (
                            <p className="text-xs text-red-500 mt-1">{t('install.passwords_no_match')}</p>
                        )}
                        {errors.password_confirmation && (
                            <p className="text-xs text-red-500 mt-1">{errors.password_confirmation}</p>
                        )}
                    </div>

                    {/* General error */}
                    {(errors as any).create_admin && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                            {(errors as any).create_admin}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                        <button
                            type="button"
                            onClick={() => router.get(route('install.step3'))}
                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {t('install.back')}
                        </button>

                        <button
                            type="submit"
                            disabled={processing || !passwordsMatch}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('install.continue')}
                        </button>
                    </div>
                </form>
            </div>
        </InstallLayout>
    );
}
