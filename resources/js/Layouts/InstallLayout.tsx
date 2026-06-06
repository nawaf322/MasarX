import React from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Key, Database, User, Settings, Check } from 'lucide-react';

interface Props {
    currentStep: number;
    children: React.ReactNode;
}

export default function InstallLayout({ currentStep, children }: Props) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language.startsWith('es') ? 'es' : 'en';

    const switchLang = (l: 'es' | 'en') => {
        i18n.changeLanguage(l);
    };

    const STEPS = [
        { number: 1, label: t('install.step1_label'), icon: <Server    className="w-4 h-4" /> },
        { number: 2, label: t('install.step2_label'), icon: <Key       className="w-4 h-4" /> },
        { number: 3, label: t('install.step3_label'), icon: <Database  className="w-4 h-4" /> },
        { number: 4, label: t('install.step4_label'), icon: <User      className="w-4 h-4" /> },
        { number: 5, label: t('install.step5_label'), icon: <Settings  className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 flex flex-col">
            {/* Top bar */}
            <div className="w-full flex items-center justify-between px-6 py-3 bg-white/70 backdrop-blur border-b border-slate-200 shadow-sm">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">D</span>
                    </div>
                    <span className="font-bold text-slate-800 text-lg tracking-tight">Deprixa Plus</span>
                </div>

                {/* Language selector */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => switchLang('es')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            lang === 'es'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        ES
                    </button>
                    <button
                        onClick={() => switchLang('en')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            lang === 'en'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        EN
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-start py-10 px-4">
                {/* Progress bar */}
                <div className="w-full max-w-2xl mb-8">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, idx) => {
                            const isCompleted = step.number < currentStep;
                            const isCurrent   = step.number === currentStep;
                            return (
                                <React.Fragment key={step.number}>
                                    {/* Step bubble */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 ${
                                                isCompleted
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : isCurrent
                                                    ? 'bg-white border-indigo-600 text-indigo-600'
                                                    : 'bg-white border-slate-300 text-slate-400'
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                step.icon
                                            )}
                                        </div>
                                        <span
                                            className={`text-xs font-medium hidden sm:block ${
                                                isCurrent
                                                    ? 'text-indigo-600'
                                                    : isCompleted
                                                    ? 'text-indigo-500'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>

                                    {/* Connector line */}
                                    {idx < STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-2 transition-colors ${
                                                step.number < currentStep
                                                    ? 'bg-indigo-600'
                                                    : 'bg-slate-200'
                                            }`}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                    {/* Step counter */}
                    <p className="text-center text-xs text-slate-400 mt-3">
                        {t('install.step')} {currentStep} {t('install.of')} {STEPS.length}
                    </p>
                </div>

                {/* Card */}
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                    {children}
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full text-center py-4 text-xs text-slate-400">
                {t('install.powered_by')} · v1.0
            </footer>
        </div>
    );
}
