import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstallLayout from '@/Layouts/InstallLayout';
import { Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface Props {
    currentStep: number;
}

interface VerifyResult {
    status: boolean;
    message: string;
    retry?: boolean;
    error?: string;
}

export default function Step2License({ currentStep }: Props) {
    const { t } = useTranslation();
    const [purchaseCode, setPurchaseCode] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerifyResult | null>(null);

    const handleVerify = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await axios.post(route('install.verify-license'), {
                purchase_code: purchaseCode,
                username,
            });
            setResult({ status: res.data.status === true, message: res.data.message, retry: res.data.retry, error: res.data.error });
        } catch (err: any) {
            const data = err.response?.data;
            const retry = data?.retry === true;
            let msg = data?.message;
            if (!msg) {
                if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                    msg = t('install.envato_connection_failed');
                } else {
                    msg = t('install.verify_error');
                }
            }
            setResult({ status: false, message: msg, retry, error: data?.error });
        } finally {
            setLoading(false);
        }
    };

    const verified = result?.status === true;

    return (
        <InstallLayout currentStep={currentStep}>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Key className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('install.license_title')}</h1>
                </div>
                <p className="text-slate-500 text-sm mb-8 ml-14">
                    {t('install.license_subtitle')}
                </p>

                <div className="space-y-4 mb-6">
                    {/* Purchase code */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('install.purchase_code')}
                        </label>
                        <input
                            type="text"
                            value={purchaseCode}
                            onChange={(e) => setPurchaseCode(e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            <a
                                href="https://help.market.envato.com/hc/en-us/articles/202822600"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-indigo-600"
                            >
                                {t('install.purchase_code_help')}
                            </a>
                        </p>
                    </div>

                    {/* Envato username */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('install.envato_username')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your_envato_username"
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Result feedback */}
                {result && (
                    <div
                        className={`flex flex-col gap-2 px-4 py-3 rounded-lg mb-6 border ${
                            result.status
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            {result.status ? (
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            )}
                            <p className="text-sm">{result.message}</p>
                        </div>
                        {!result.status && (
                            <div className="flex flex-wrap gap-2 mt-1 ml-8">
                                {result.retry && (
                                    <button
                                        onClick={handleVerify}
                                        disabled={loading}
                                        className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md font-medium transition-colors"
                                    >
                                        {t('install.retry')}
                                    </button>
                                )}
                                <a
                                    href="https://tickets.masarxpro.site/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium transition-colors"
                                >
                                    {t('install.support_ticket')}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.get(route('install.step1'))}
                        className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        {t('install.back')}
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={handleVerify}
                            disabled={loading || !purchaseCode || !username}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('install.verify_license')}
                        </button>

                        <button
                            onClick={() => router.get(route('install.step3'))}
                            disabled={!verified}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                                verified
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {t('install.next')} →
                        </button>
                    </div>
                </div>
            </div>
        </InstallLayout>
    );
}
