import React from 'react';
import { useTranslation } from 'react-i18next';
import InstallLayout from '@/Layouts/InstallLayout';
import { Settings, Loader2, Database } from 'lucide-react';
import { router, useForm } from '@inertiajs/react';

interface Props {
    currentStep: number;
}

const TIMEZONES = [
    'America/Bogota',
    'America/Mexico_City',
    'America/Lima',
    'America/Santiago',
    'America/Buenos_Aires',
    'America/Caracas',
    'America/Guayaquil',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Panama',
    'America/Costa_Rica',
    'America/Guatemala',
    'America/Havana',
    'America/Santo_Domingo',
    'Europe/Madrid',
    'Europe/London',
    'UTC',
];

const CURRENCIES = [
    { code: 'USD', name: 'USD — Dólar Estadounidense' },
    { code: 'EUR', name: 'EUR — Euro' },
    { code: 'COP', name: 'COP — Peso Colombiano' },
    { code: 'MXN', name: 'MXN — Peso Mexicano' },
    { code: 'ARS', name: 'ARS — Peso Argentino' },
    { code: 'BRL', name: 'BRL — Real Brasileño' },
    { code: 'CLP', name: 'CLP — Peso Chileno' },
    { code: 'PEN', name: 'PEN — Sol Peruano' },
    { code: 'BOB', name: 'BOB — Boliviano' },
    { code: 'PYG', name: 'PYG — Guaraní Paraguayo' },
    { code: 'UYU', name: 'UYU — Peso Uruguayo' },
    { code: 'GTQ', name: 'GTQ — Quetzal Guatemalteco' },
    { code: 'CRC', name: 'CRC — Colón Costarricense' },
    { code: 'DOP', name: 'DOP — Peso Dominicano' },
    { code: 'HNL', name: 'HNL — Lempira Hondureño' },
];

const DATE_FORMATS = [
    { value: 'd/m/Y',  label: 'DD/MM/AAAA (31/12/2025)' },
    { value: 'm/d/Y',  label: 'MM/DD/AAAA (12/31/2025)' },
    { value: 'Y-m-d',  label: 'AAAA-MM-DD (2025-12-31)' },
    { value: 'd-m-Y',  label: 'DD-MM-AAAA (31-12-2025)' },
    { value: 'd.m.Y',  label: 'DD.MM.AAAA (31.12.2025)' },
];

const selectClass =
    'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

export default function Step5Preferences({ currentStep }: Props) {
    const { t } = useTranslation();

    const { data, setData, post, processing, errors } = useForm({
        language:       'es',
        timezone:       'America/Bogota',
        currency:       'USD',
        date_format:    'd/m/Y',
        weight_unit:    'kg',
        dimension_unit: 'cm',
        load_demo:      false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.finalize'));
    };

    return (
        <InstallLayout currentStep={currentStep}>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('install.preferences_title')}</h1>
                </div>
                <p className="text-slate-500 text-sm mb-8 ml-14">
                    {t('install.preferences_subtitle')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Language */}
                    <div>
                        <label className={labelClass}>{t('install.language_system')}</label>
                        <div className="flex gap-3">
                            {(['es', 'en'] as const).map(lang => (
                                <label key={lang} className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                                    data.language === lang
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}>
                                    <input
                                        type="radio"
                                        name="language"
                                        value={lang}
                                        checked={data.language === lang}
                                        onChange={() => setData('language', lang)}
                                        className="sr-only"
                                    />
                                    <span className="font-medium text-sm">
                                        {lang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Timezone */}
                        <div>
                            <label className={labelClass}>{t('install.timezone_label')}</label>
                            <select value={data.timezone}
                                onChange={(e) => setData('timezone', e.target.value)}
                                className={selectClass}>
                                {TIMEZONES.map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>

                        {/* Currency */}
                        <div>
                            <label className={labelClass}>{t('install.currency_label')}</label>
                            <select value={data.currency}
                                onChange={(e) => setData('currency', e.target.value)}
                                className={selectClass}>
                                {CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date format */}
                    <div>
                        <label className={labelClass}>{t('install.date_format_label')}</label>
                        <select value={data.date_format}
                            onChange={(e) => setData('date_format', e.target.value)}
                            className={selectClass}>
                            {DATE_FORMATS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Weight unit */}
                        <div>
                            <label className={labelClass}>{t('install.weight_unit_label')}</label>
                            <div className="flex gap-3">
                                {(['kg', 'lb'] as const).map(unit => (
                                    <label key={unit} className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors flex-1 justify-center ${
                                        data.weight_unit === unit
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="weight_unit"
                                            value={unit}
                                            checked={data.weight_unit === unit}
                                            onChange={() => setData('weight_unit', unit)}
                                            className="sr-only"
                                        />
                                        <span className="font-medium text-sm">{unit}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Dimension unit */}
                        <div>
                            <label className={labelClass}>{t('install.dimension_unit_label')}</label>
                            <div className="flex gap-3">
                                {(['cm', 'in'] as const).map(unit => (
                                    <label key={unit} className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors flex-1 justify-center ${
                                        data.dimension_unit === unit
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="dimension_unit"
                                            value={unit}
                                            checked={data.dimension_unit === unit}
                                            onChange={() => setData('dimension_unit', unit)}
                                            className="sr-only"
                                        />
                                        <span className="font-medium text-sm">{unit}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Demo data */}
                    <div>
                        <label className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${
                            data.load_demo
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}>
                            <input
                                type="checkbox"
                                checked={data.load_demo}
                                onChange={(e) => setData('load_demo', e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
                            />
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Database className="w-4 h-4 text-indigo-600" />
                                    <span className="font-medium text-sm text-slate-800">
                                        {t('install.load_demo_label')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {t('install.load_demo_help')}
                                </p>
                            </div>
                        </label>
                    </div>

                    {(errors as any).finalize && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                            {(errors as any).finalize}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => router.get(route('install.step4'))}
                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {t('install.back')}
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? t('install.finalizing') : t('install.finish')}
                        </button>
                    </div>
                </form>
            </div>
        </InstallLayout>
    );
}
