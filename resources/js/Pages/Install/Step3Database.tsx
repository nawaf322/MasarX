import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstallLayout from '@/Layouts/InstallLayout';
import { Database, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { router, useForm } from '@inertiajs/react';
import axios from 'axios';

interface Props {
    currentStep: number;
    defaults: {
        db_host: string;
        db_port: string;
        db_name: string;
        db_user: string;
        db_password: string;
    };
}

interface TestResult {
    success: boolean;
    message: string;
}

const COUNTRIES = [
    { code: 'CO', name: 'Colombia' },
    { code: 'MX', name: 'México' },
    { code: 'US', name: 'United States' },
    { code: 'AR', name: 'Argentina' },
    { code: 'PE', name: 'Perú' },
    { code: 'CL', name: 'Chile' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'ES', name: 'España' },
    { code: 'BR', name: 'Brasil' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'PA', name: 'Panamá' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'HN', name: 'Honduras' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'DO', name: 'República Dominicana' },
];

export default function Step3Database({ currentStep, defaults }: Props) {
    const { t } = useTranslation();
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testing, setTesting] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        db_host:         defaults.db_host || '127.0.0.1',
        db_port:         defaults.db_port || '3306',
        db_name:         defaults.db_name || '',
        db_user:         defaults.db_user || '',
        db_password:     defaults.db_password || '',
        company_name:    '',
        company_email:   '',
        company_phone:   '',
        company_country: 'US',
        company_address: '',
    });

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post(route('install.test-database'), {
                db_host:     data.db_host,
                db_port:     parseInt(data.db_port),
                db_name:     data.db_name,
                db_user:     data.db_user,
                db_password: data.db_password,
            });
            setTestResult(res.data);
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.response?.data?.message || t('install.connection_failed'),
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.setup-database'));
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
                        <Database className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('install.database_title')}</h1>
                </div>
                <p className="text-slate-500 text-sm mb-8 ml-14">
                    {t('install.db_subtitle')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* DB Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="w-4 h-4 text-indigo-600" />
                            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                {t('install.db_config')}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>{t('install.host')}</label>
                                <input type="text" value={data.db_host}
                                    onChange={(e) => setData('db_host', e.target.value)}
                                    className={inputClass} placeholder="127.0.0.1" />
                            </div>
                            <div>
                                <label className={labelClass}>{t('install.port')}</label>
                                <input type="text" value={data.db_port}
                                    onChange={(e) => setData('db_port', e.target.value)}
                                    className={inputClass} placeholder="3306" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>{t('install.db_name_label')}</label>
                                <input type="text" value={data.db_name}
                                    onChange={(e) => setData('db_name', e.target.value)}
                                    className={inputClass} placeholder="masarx_db" />
                                {errors.db_name && <p className="text-xs text-red-500 mt-1">{errors.db_name}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>{t('install.user')}</label>
                                <input type="text" value={data.db_user}
                                    onChange={(e) => setData('db_user', e.target.value)}
                                    className={inputClass} placeholder="root" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className={labelClass}>{t('install.password_label')}</label>
                            <input type="password" value={data.db_password}
                                onChange={(e) => setData('db_password', e.target.value)}
                                className={inputClass} placeholder="••••••••" />
                        </div>

                        {/* Test connection */}
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testing}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                {testing && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('install.test_connection')}
                            </button>
                            {testResult && (
                                <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {testResult.success
                                        ? <CheckCircle2 className="w-4 h-4" />
                                        : <XCircle className="w-4 h-4" />}
                                    {testResult.message}
                                </div>
                            )}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Company Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                {t('install.company_title')}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>{t('install.company_name_req')}</label>
                                <input type="text" value={data.company_name}
                                    onChange={(e) => setData('company_name', e.target.value)}
                                    required className={inputClass} placeholder="Mi Empresa S.A.S" />
                                {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>{t('install.company_email_req')}</label>
                                <input type="email" value={data.company_email}
                                    onChange={(e) => setData('company_email', e.target.value)}
                                    required className={inputClass} placeholder="info@miempresa.com" />
                                {errors.company_email && <p className="text-xs text-red-500 mt-1">{errors.company_email}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>{t('install.company_phone')}</label>
                                <input type="text" value={data.company_phone}
                                    onChange={(e) => setData('company_phone', e.target.value)}
                                    className={inputClass} placeholder="+57 300 000 0000" />
                            </div>
                            <div>
                                <label className={labelClass}>{t('install.company_country')}</label>
                                <select value={data.company_country}
                                    onChange={(e) => setData('company_country', e.target.value)}
                                    className={inputClass}>
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>{t('install.company_address')}</label>
                            <input type="text" value={data.company_address}
                                onChange={(e) => setData('company_address', e.target.value)}
                                className={inputClass} placeholder="Calle 123 # 45-67, Ciudad" />
                        </div>
                    </div>

                    {/* Error display */}
                    {(errors as any).db_setup && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                            {(errors as any).db_setup}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => router.get(route('install.step2'))}
                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {t('install.back')}
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
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
