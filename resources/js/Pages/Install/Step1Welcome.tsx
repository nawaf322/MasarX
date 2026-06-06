import React from 'react';
import { useTranslation } from 'react-i18next';
import InstallLayout from '@/Layouts/InstallLayout';
import { CheckCircle2, XCircle, Server } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Requirement {
    name: string;
    status: boolean;
    value: string;
}

interface Props {
    requirements: Requirement[];
    canProceed: boolean;
    currentStep: number;
}

export default function Step1Welcome({ requirements, canProceed, currentStep }: Props) {
    const { t } = useTranslation();

    return (
        <InstallLayout currentStep={currentStep}>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Server className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('install.welcome_title')}</h1>
                </div>
                <p className="text-slate-500 mb-1 ml-14">
                    {t('install.welcome_subtitle')}
                </p>
                <p className="text-slate-400 text-sm mb-8 ml-14">
                    {t('install.welcome_subtitle2')}
                </p>

                {/* Requirements checklist */}
                <div className="space-y-2 mb-8">
                    <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                        {t('install.checking_requirements')}
                    </h2>
                    {requirements.map((req) => (
                        <div
                            key={req.name}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                                req.status
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-red-50 border-red-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {req.status ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-slate-700">{req.name}</span>
                            </div>
                            <span
                                className={`text-xs font-mono px-2 py-0.5 rounded ${
                                    req.status
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {req.value}
                            </span>
                        </div>
                    ))}
                </div>

                {!canProceed && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700">
                        {t('install.requirements_failed_warning')}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end">
                    <button
                        onClick={() => router.get(route('install.step2'))}
                        disabled={!canProceed}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                            canProceed
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {t('install.next')} →
                    </button>
                </div>
            </div>
        </InstallLayout>
    );
}
