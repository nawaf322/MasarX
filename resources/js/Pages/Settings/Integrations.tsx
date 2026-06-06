import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { Switch } from "@/Components/UI/switch";
import { useState, useRef } from 'react';

const CARRIER_TEST_TIMEOUT_MS = 10000;
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { useTranslation } from 'react-i18next';

// ─── Documentation Guide Component ───────────────────────────────────────────
interface DocGuideProps {
    steps: string[];
    docUrl: string;
    docLabel: string;
}

function DocGuide({ steps, docUrl, docLabel }: DocGuideProps) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 text-xs">
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-blue-700 font-medium hover:bg-blue-100/60 transition-colors rounded-lg"
                onClick={() => setOpen(v => !v)}
            >
                <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                    </svg>
                    How to configure
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="px-3 pb-3 pt-1 space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-gray-700 leading-relaxed">
                        {steps.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ol>
                    <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium mt-1"
                    >
                        {docLabel}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            )}
        </div>
    );
}

// ─── Carrier doc guides ───────────────────────────────────────────────────────
const CARRIER_DOCS: Record<string, { steps: string[]; docUrl: string; docLabel: string }> = {
    dhl: {
        docUrl: 'https://developer.dhl.com/user/apps',
        docLabel: 'DHL Developer Portal →',
        steps: [
            'Go to developer.dhl.com and create a free account.',
            'Click "My Apps" → "Create App" and subscribe to the DHL Express – MyDHL API product.',
            'After approval, copy the API Key from your app\'s credentials.',
            'Your Account Number is the 9-digit DHL account number from your DHL contract.',
            'Use Sandbox mode for testing; switch to Live only after UAT approval.',
        ],
    },
    fedex: {
        docUrl: 'https://developer.fedex.com/api/en-us/home.html',
        docLabel: 'FedEx Developer Portal →',
        steps: [
            'Register at developer.fedex.com with your business email.',
            'Create a new project and add the "Rate v1" and "Ship v1" APIs.',
            'Go to API Keys → copy the Client ID (this is your API Key).',
            'Your Account Number is the 9-digit FedEx account number from your FedEx invoice.',
            'Sandbox credentials are separate from production — request production access after testing.',
        ],
    },
    ups: {
        docUrl: 'https://developer.ups.com/get-started',
        docLabel: 'UPS Developer Portal →',
        steps: [
            'Sign in at developer.ups.com with your UPS My Choice or business account.',
            'Click "Get Started" → create a new application.',
            'Add the Rating API and Shipping API to your application.',
            'Copy the Client ID (API Key) from the application overview.',
            'Your Account Number is the 6-character alphanumeric UPS account number.',
        ],
    },
    usps: {
        docUrl: 'https://www.usps.com/business/web-tools-apis/documentation-updates.htm',
        docLabel: 'USPS Web Tools Documentation →',
        steps: [
            'Visit usps.com/business/web-tools-apis and click "Register for Web Tools".',
            'Complete the registration form; USPS will email you a User ID (API Key) within 1 business day.',
            'For the staging environment use the sandbox URL provided in the welcome email.',
            'Account Number is your USPS Customer Registration ID (same as the emailed User ID).',
            'Request production access by emailing the USPS Web Tools team once testing is complete.',
        ],
    },
};

export default function Integrations({ settings, carrier_accounts }: { settings: any, carrier_accounts: any[] }) {
    const alert = useSweetAlert();
    const { t } = useTranslation();

    // Google OAuth Form
    const [oauthData, setOauthData] = useState({
        google_client_id: settings?.google_client_id || '',
        google_client_secret: settings?.google_client_secret || '',
    });
    const [oauthProcessing, setOauthProcessing] = useState(false);

    const oauthForm = {
        data: oauthData,
        setData: (key: string, value: any) => setOauthData(prev => ({ ...prev, [key]: value })),
        processing: oauthProcessing,
    };

    const submitOAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!oauthData.google_client_id || !oauthData.google_client_secret) {
            alert.error(t('settings.integrations.missing_credentials'), t('settings.integrations.client_id_secret_required'));
            return;
        }

        setOauthProcessing(true);
        try {
            const { data: res } = await axios.post(route('settings.integrations.update'), oauthData);
            alert.success(res?.message || t('settings.save_success'));
        } catch {
            alert.error(t('settings.integrations.failed_save_oauth'));
        } finally {
            setOauthProcessing(false);
        }
    };

    // Helper: credencial vacía o enmascarada = inválido cuando carrier está activo
    const isCredentialEmpty = (v: unknown): boolean => {
        const s = String(v ?? '').trim();
        return !s || s.startsWith('********');
    };

    // Helper for carrier forms (DHL, FedEx, UPS, USPS)
    const CarrierForm = ({ code, name, accounts }: { code: string, name: string, accounts: any[] }) => {
        const account = accounts.find(a => a.carrier_code === code) || {};
        const [testing, setTesting] = useState(false);
        const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
        const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const statusRef = useRef(account.status ?? false);

        const [carrierData, setCarrierData] = useState<Record<string, any>>({
            carrier_code: code,
            mode: account.mode || 'test',
            status: account.status ?? false,
            credentials: {
                api_key: account.credentials?.api_key || '',
                account_number: account.credentials?.account_number || '',
            },
        });
        const [carrierErrors, setCarrierErrors] = useState<Record<string, string>>({});
        const [processing, setProcessing] = useState(false);

        const data = carrierData;
        const setData = (key: string, value: any) => setCarrierData(prev => ({ ...prev, [key]: value }));
        const errors = carrierErrors;
        const clearErrors = () => setCarrierErrors({});

        statusRef.current = data.status ?? false;

        const clearTestTimeout = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        const validateBeforeSubmit = (): boolean => {
            setLocalErrors({});
            const currentStatus = statusRef.current;
            if (!currentStatus) return true;
            const apiKey = data.credentials?.api_key ?? '';
            const accountNum = data.credentials?.account_number ?? '';
            const errs: Record<string, string> = {};
            if (isCredentialEmpty(apiKey)) errs.api_key = t('settings.integrations.carriers.errors.api_key_required');
            if (isCredentialEmpty(accountNum)) errs.account_number = t('settings.integrations.carriers.errors.account_number_required');
            if (Object.keys(errs).length > 0) {
                setLocalErrors(errs);
                alert.error(t('settings.integrations.save_failed'), t('settings.integrations.carriers.errors.enable_requires_credentials'));
                return false;
            }
            return true;
        };

        const handleStatusChange = (checked: boolean) => {
            statusRef.current = checked;
            setData('status', checked);
        };

        const submit = async (e: React.FormEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!validateBeforeSubmit()) return;
            clearErrors();
            setLocalErrors({});
            setProcessing(true);
            try {
                const { data: res } = await axios.post(route('settings.carrier.update'), carrierData);
                setLocalErrors({});
                alert.success(res?.message || t('settings.save_success'), t('settings.integrations.carrier_settings_updated'));
            } catch (err: any) {
                const errs = err?.response?.data?.errors;
                if (errs) {
                    const mapped: Record<string, string> = {};
                    Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                    setCarrierErrors(mapped);
                }
                alert.error(t('settings.integrations.save_failed'), t('settings.integrations.carriers.errors.enable_requires_credentials'));
            } finally {
                setProcessing(false);
            }
        };

        const handleTest = async (e: React.MouseEvent) => {
            e.preventDefault();
            clearTestTimeout();
            setTesting(true);

            timeoutRef.current = setTimeout(() => {
                timeoutRef.current = null;
                setTesting(false);
                alert.error(t('settings.integrations.connection_test_timeout'), t('settings.integrations.carrier_no_response'));
            }, CARRIER_TEST_TIMEOUT_MS);

            try {
                const { data: res } = await axios.post(route('settings.carrier.test'), { carrier_code: code });
                clearTestTimeout();
                setTesting(false);
                if (res?.success) {
                    const msg = typeof res.success === 'string' && res.success.includes('.') ? t(res.success) : res.success;
                    alert.success(t('settings.integrations.connection_verified'), msg);
                } else if (res?.error) {
                    const msg = typeof res.error === 'string' && res.error.includes('.') ? t(res.error) : res.error;
                    alert.error(t('settings.integrations.connection_failed'), msg);
                } else {
                    alert.success(t('settings.integrations.connection_verified'), res?.message || '');
                }
            } catch (err: any) {
                clearTestTimeout();
                setTesting(false);
                const msg = err?.response?.data?.error || t('settings.integrations.server_timeout');
                alert.error(t('settings.integrations.connection_failed'), msg);
            }
        };

        const isLive = data.mode === 'live';

        const errBag = errors as Record<string, string | string[] | undefined>;
        const getBackendErr = (key: string) => {
            const v = errBag?.[key];
            return (Array.isArray(v) ? v[0] : v) as string | undefined;
        };
        const errApiKey = localErrors.api_key || getBackendErr('credentials.api_key');
        const errAccount = localErrors.account_number || getBackendErr('credentials.account_number');

        const doc = CARRIER_DOCS[code];

        return (
            <div className={`p-5 rounded-xl border transition-colors space-y-4 ${isLive ? 'border-purple-200 bg-purple-50/20' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900">{name}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${isLive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {isLive ? t('settings.integrations.production') : t('settings.integrations.sandbox')}
                    </span>
                </div>
                {doc && <DocGuide steps={doc.steps} docUrl={doc.docUrl} docLabel={doc.docLabel} />}
                <form onSubmit={submit} className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <Label className="text-xs text-gray-500 font-medium">{t('settings.integrations.enabled')}</Label>
                        <Switch checked={!!data.status} onCheckedChange={handleStatusChange} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <Label className="text-xs text-gray-500 font-medium">{t('settings.integrations.sandbox')}</Label>
                        <Switch checked={data.mode === 'test'} onCheckedChange={(c) => setData('mode', c ? 'test' : 'live')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                {t('settings.integrations.api_key')}
                                {data.status && <span className="text-red-500 ml-0.5">*</span>}
                            </Label>
                            <Input
                                type="password"
                                value={data.credentials?.api_key ?? ''}
                                onChange={e => setData('credentials', { ...(data.credentials || {}), api_key: e.target.value })}
                                placeholder={t('settings.integrations.api_key_placeholder')}
                                required={!!data.status}
                                className={`bg-white border-gray-200 shadow-sm focus:ring-blue-500/20 ${errApiKey ? 'border-red-500' : ''}`}
                            />
                            {errApiKey && <p className="text-xs text-red-600">{errApiKey}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                {t('settings.integrations.account_number')}
                                {data.status && <span className="text-red-500 ml-0.5">*</span>}
                            </Label>
                            <Input
                                value={data.credentials?.account_number ?? ''}
                                onChange={e => setData('credentials', { ...(data.credentials || {}), account_number: e.target.value })}
                                required={!!data.status}
                                className={`bg-white border-gray-200 shadow-sm focus:ring-blue-500/20 ${errAccount ? 'border-red-500' : ''}`}
                                placeholder={t('settings.integrations.account_number_placeholder')}
                            />
                            {errAccount && <p className="text-xs text-red-600">{errAccount}</p>}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span />
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="ghost" onClick={handleTest} disabled={testing} className="h-8 text-xs hover:bg-white hover:shadow-sm">
                                {testing ? t('settings.integrations.testing') : t('settings.integrations.test_connection')}
                            </Button>
                            <Button size="sm" type="submit" disabled={processing} className="h-8 text-xs bg-gray-900 hover:bg-black text-white shadow-sm">
                                {processing ? t('settings.integrations.saving') : t('settings.integrations.save_config')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        );
    };

    // Helper for MeLi Form
    const MercadoLibreForm = () => {
        const meli = settings?.strategies?.mercadolibre || {};
        const [meliData, setMeliData] = useState({ app_id: meli.app_id || '', client_secret: meli.client_secret || '' });
        const [meliProcessing, setMeliProcessing] = useState(false);

        const data = meliData;
        const setData = (key: string, value: any) => setMeliData(prev => ({ ...prev, [key]: value }));
        const processing = meliProcessing;

        const submit = async (e: React.FormEvent) => {
            e.preventDefault();

            if (!data.app_id || !data.client_secret) {
                alert.error(t('settings.integrations.missing_credentials'), t('settings.integrations.client_id_secret_required'));
                return;
            }

            setMeliProcessing(true);
            try {
                const { data: res } = await axios.post(route('settings.mercadolibre.update'), meliData);
                alert.success(res?.message || t('settings.integrations.mercadolibre_saved'));
            } catch {
                alert.error(t('settings.integrations.save_failed'), t('settings.integrations.check_inputs'));
            } finally {
                setMeliProcessing(false);
            }
        };

        return (
            <div className={`p-5 rounded-xl border transition-colors ${meli.connected ? 'border-green-200 bg-green-50/20' : 'border-yellow-200 bg-yellow-50/20'} space-y-4`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__small.png" alt={t('settings.integrations.mercadolibre')} className="h-6" />
                        <h4 className="font-semibold text-gray-900">{t('settings.integrations.mercadolibre')}</h4>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${meli.connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {meli.connected ? t('settings.integrations.connected') : t('settings.integrations.not_connected')}
                    </span>
                </div>
                <DocGuide
                    steps={[
                        'Go to developers.mercadolibre.com and sign in with your Mercado Libre account.',
                        'Click "Create App" → fill in the app name, description, and short description.',
                        'Set the Redirect URI to: ' + window.location.origin + '/integrations/mercadolibre/callback',
                        'Copy the App ID (numeric) and Client Secret from the app dashboard.',
                        'Save the credentials below, then click "Authorize App" to link your seller account.',
                    ]}
                    docUrl="https://developers.mercadolibre.com/en_us/authentication-and-authorization"
                    docLabel="Mercado Libre – OAuth Guide →"
                />
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('settings.integrations.app_id')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={data.app_id}
                                onChange={e => setData('app_id', e.target.value)}
                                className="bg-white border-gray-200"
                                placeholder={t('settings.integrations.app_id_placeholder')}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('settings.integrations.client_secret')} <span className="text-red-500">*</span></Label>
                            <Input
                                type="password"
                                value={data.client_secret}
                                onChange={e => setData('client_secret', e.target.value)}
                                className="bg-white border-gray-200"
                                placeholder={t('settings.integrations.client_secret_placeholder')}
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-3 pt-1">
                        {!meli.connected && data.app_id && (
                            <a
                                href={route('integrations.mercadolibre.redirect')}
                                className="h-9 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-bold rounded shadow-sm inline-flex items-center"
                                onClick={(e) => {
                                    if (!data.app_id) {
                                        e.preventDefault();
                                        alert.error(t('settings.integrations.config_required'), t('settings.integrations.config_required_msg'));
                                    }
                                }}
                            >
                                {t('settings.integrations.authorize_app')}
                            </a>
                        )}
                        <Button size="sm" type="submit" disabled={processing} className="bg-gray-900 text-white">{t('settings.integrations.save_config')}</Button>
                    </div>
                </form>
            </div>
        );
    };

    const runGoogleTest = async () => {
        if (!oauthData.google_client_id) {
            alert.error(t('settings.integrations.config_missing'), t('settings.integrations.config_missing_msg'));
            return;
        }
        try {
            await axios.post(route('settings.google.test'));
            alert.success(t('settings.integrations.connection_verified'), t('settings.integrations.google_api_reachable'));
        } catch {
            alert.error(t('settings.integrations.connection_failed'), t('settings.integrations.google_api_reachable'));
        }
    };

    return (
        <SettingsLayout title={t('settings.menu.integrations')}>
            <SettingsShell description={t('settings.integrations.desc')}>

                {/* 1. Google OAuth */}
                <SettingsSection
                    title={t('settings.integrations.google.title')}
                    description={t('settings.integrations.google.desc')}
                >
                    <div className="col-span-1 md:col-span-2">
                        <DocGuide
                            steps={[
                                'Open Google Cloud Console (console.cloud.google.com) and select or create a project.',
                                'Go to APIs & Services → OAuth consent screen — configure your app name and authorized domains.',
                                'Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID.',
                                'Application type: Web application.',
                                'Add Authorized redirect URI: ' + window.location.origin + '/auth/google/callback',
                                'Copy the Client ID and Client Secret and paste them below.',
                            ]}
                            docUrl="https://console.cloud.google.com/apis/credentials"
                            docLabel="Google Cloud Console – Credentials →"
                        />
                    </div>
                    <form onSubmit={submitOAuth} className="contents">
                        <div className="space-y-2">
                            <Label>{t('settings.integrations.client_id')}</Label>
                            <Input
                                value={oauthForm.data.google_client_id}
                                onChange={e => oauthForm.setData('google_client_id', e.target.value)}
                                placeholder={t('settings.integrations.client_id_placeholder')}
                                className="bg-gray-50 border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('settings.integrations.client_secret')}</Label>
                            <Input
                                type="password"
                                value={oauthForm.data.google_client_secret}
                                onChange={e => oauthForm.setData('google_client_secret', e.target.value)}
                                placeholder={t('settings.integrations.client_secret_placeholder')}
                                className="bg-gray-50 border-gray-200"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 flex justify-between mt-2">
                            <Button type="button" variant="outline" onClick={runGoogleTest}>
                                {t('settings.integrations.test_connection_real')}
                            </Button>
                            <Button type="submit" disabled={oauthForm.processing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                {t('common.save')}
                            </Button>
                        </div>
                    </form>
                </SettingsSection>

                {/* 3. Carriers */}
                <SettingsSection
                    title={t('settings.integrations.carrier.title')}
                    description={t('settings.integrations.carrier.desc')}
                >
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <CarrierForm key="dhl" code="dhl" name={t('settings.integrations.carrier_dhl')} accounts={carrier_accounts} />
                        <CarrierForm key="fedex" code="fedex" name={t('settings.integrations.carrier_fedex')} accounts={carrier_accounts} />
                        <CarrierForm key="ups" code="ups" name={t('settings.integrations.carrier_ups')} accounts={carrier_accounts} />
                        <CarrierForm key="usps" code="usps" name={t('settings.integrations.carrier_usps')} accounts={carrier_accounts} />
                    </div>
                </SettingsSection>

                {/* 4. Marketplaces (Mercado Libre) */}
                <SettingsSection
                    title={t('settings.integrations.marketplaces')}
                    description={t('settings.integrations.marketplaces_desc')}
                >
                    <div className="col-span-1 md:col-span-2">
                        <MercadoLibreForm />
                    </div>
                </SettingsSection>

                {/* 5. Public Calculator */}
                <PublicCalculatorSection enabled={settings?.public_calculator?.enabled ?? false} />

                {/* 6. Maps */}
                <MapsSettingsSection settings={settings?.maps || {}} />

            </SettingsShell>
        </SettingsLayout>
    );
}

// Public Calculator Settings Component
function PublicCalculatorSection({ enabled }: { enabled: boolean }) {
    const alert = useSweetAlert();
    const { t } = useTranslation();

    const [calcEnabled, setCalcEnabled] = useState(enabled);
    const [calcProcessing, setCalcProcessing] = useState(false);

    const form = {
        data: { enabled: calcEnabled },
        setData: (_key: string, value: any) => setCalcEnabled(value),
        processing: calcProcessing,
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCalcProcessing(true);
        try {
            const { data: res } = await axios.post(route('settings.public-calculator.update'), { enabled: calcEnabled });
            alert.success(res?.message || t('settings.save_success'), t('settings_public_calc.saved'));
        } catch {
            alert.error(t('settings.integrations.save_failed'), t('settings.integrations.check_inputs'));
        } finally {
            setCalcProcessing(false);
        }
    };

    const publicUrl = window.location.origin + '/rate';

    return (
        <SettingsSection
            title={t('settings_public_calc.title')}
            description={t('settings_public_calc.desc')}
        >
            <form onSubmit={submit} className="col-span-1 md:col-span-2">
                <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="text-sm font-medium text-gray-900">{t('settings_public_calc.enable_label')}</Label>
                            <p className="text-xs text-gray-500 mt-0.5">{t('settings_public_calc.enable_hint')}</p>
                        </div>
                        <Switch
                            checked={form.data.enabled}
                            onCheckedChange={(checked) => form.setData('enabled', checked)}
                        />
                    </div>

                    {form.data.enabled && (
                        <div className="space-y-1 pt-1">
                            <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('settings_public_calc.public_url')}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={publicUrl}
                                    className="bg-white border-gray-200 text-sm font-mono text-gray-600 cursor-text select-all"
                                    onFocus={e => e.target.select()}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => { window.open(publicUrl, '_blank'); }}
                                >
                                    ↗
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-1">
                        <Button type="submit" size="sm" disabled={form.processing} className="bg-gray-900 hover:bg-black text-white shadow-sm">
                            {form.processing ? t('settings.integrations.saving') : t('settings.integrations.save_config')}
                        </Button>
                    </div>
                </div>
            </form>
        </SettingsSection>
    );
}

// Maps Settings Component
function MapsSettingsSection({ settings }: { settings: any }) {
    const alert = useSweetAlert();
    const { t } = useTranslation();
    const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});

    const [mapsData, setMapsData] = useState({
        default_provider: settings?.default_provider || 'osm',
        mapbox_token: settings?.mapbox_token || '',
        google_maps_key: settings?.google_maps_key || '',
        mapbox_enabled: settings?.mapbox_enabled || false,
        google_enabled: settings?.google_enabled || false,
        default_center_lat: settings?.default_center_lat ?? '',
        default_center_lng: settings?.default_center_lng ?? '',
        default_zoom: settings?.default_zoom ?? 4,
    });
    const [mapsProcessing, setMapsProcessing] = useState(false);

    const mapsForm = {
        data: mapsData,
        setData: (key: string, value: any) => setMapsData(prev => ({ ...prev, [key]: value })),
        errors: inlineErrors,
        processing: mapsProcessing,
    };

    const validateMaps = (): boolean => {
        const { default_provider, mapbox_token, mapbox_enabled, google_maps_key, google_enabled } = mapsData;
        const mapboxRequired = default_provider === 'mapbox' || mapbox_enabled;
        const googleRequired = google_enabled;
        const errs: Record<string, string> = {};

        if (mapboxRequired && !mapbox_token?.trim()) {
            errs.mapbox_token = t('settings.integrations.maps.errors.mapbox_required');
        } else if (mapboxRequired && mapbox_token?.trim() && !mapbox_token.trim().startsWith('pk.')) {
            errs.mapbox_token = t('settings.integrations.maps.errors.mapbox_invalid');
        }
        if (googleRequired && !google_maps_key?.trim()) {
            errs.google_maps_key = t('settings.integrations.maps.errors.google_required');
        } else if (googleRequired && google_maps_key?.trim() && !google_maps_key.trim().startsWith('AIza')) {
            errs.google_maps_key = t('settings.integrations.maps.errors.google_invalid');
        }

        setInlineErrors(errs);
        if (Object.keys(errs).length > 0) {
            alert.error(t('settings.integrations.save_failed'), Object.values(errs)[0]);
            return false;
        }
        setInlineErrors({});
        return true;
    };

    const submitMaps = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateMaps()) return;
        setMapsProcessing(true);
        try {
            const { data: res } = await axios.post(route('settings.maps.update'), mapsData);
            alert.success(res?.message || t('settings.save_success'), t('settings.integrations.maps.saved'));
        } catch {
            alert.error(t('settings.integrations.save_failed'), t('settings.integrations.check_inputs'));
        } finally {
            setMapsProcessing(false);
        }
    };

    return (
        <SettingsSection
            title={t('settings.integrations.maps.title')}
            description={t('settings.integrations.maps.desc')}
        >
            <form onSubmit={submitMaps} className="contents">
                <div className="col-span-1 md:col-span-2 space-y-4">
                    {/* Default Provider */}
                    <div className="space-y-2">
                        <Label>{t('settings.integrations.maps.default_provider')}</Label>
                        <Select
                            value={mapsForm.data.default_provider}
                            onValueChange={(val) => mapsForm.setData('default_provider', val as 'mapbox' | 'google' | 'osm')}
                        >
                            <SelectTrigger className="bg-white border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mapbox">{t('settings.integrations.maps.provider_mapbox')}</SelectItem>
                                <SelectItem value="google">{t('settings.integrations.maps.provider_google')}</SelectItem>
                                <SelectItem value="osm">{t('settings.integrations.maps.provider_osm')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Mapbox Settings */}
                    <div className="p-4 border rounded-lg space-y-4 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-semibold">{t('settings.integrations.maps.mapbox_title')}</Label>
                                <p className="text-xs text-gray-500 mt-1">{t('settings.integrations.maps.mapbox_desc')}</p>
                            </div>
                            <Switch
                                checked={mapsForm.data.mapbox_enabled}
                                onCheckedChange={(checked) => mapsForm.setData('mapbox_enabled', checked)}
                            />
                        </div>
                        {mapsForm.data.mapbox_enabled && (
                            <div className="space-y-2">
                                <DocGuide
                                    steps={[
                                        'Create a free account at mapbox.com.',
                                        'Go to Account → Access Tokens → Create a token.',
                                        'Add public scopes: styles:read, tiles:read, geocoding:read.',
                                        'The token starts with "pk." — paste it in the field below.',
                                        'Restrict the token to your domain in the token settings for added security.',
                                    ]}
                                    docUrl="https://docs.mapbox.com/help/getting-started/access-tokens/"
                                    docLabel="Mapbox – Access Tokens Guide →"
                                />
                                <Label>{t('settings.integrations.maps.mapbox_token')}</Label>
                                <Input
                                    type="password"
                                    value={mapsForm.data.mapbox_token}
                                    onChange={e => { mapsForm.setData('mapbox_token', e.target.value); setInlineErrors(prev => ({ ...prev, mapbox_token: '' })); }}
                                    placeholder={t('settings.integrations.maps.mapbox_token_placeholder')}
                                    className={`bg-white border-gray-200 ${(inlineErrors.mapbox_token || (mapsForm.errors as any)?.mapbox_token) ? 'border-red-500' : ''}`}
                                />
                                {(inlineErrors.mapbox_token || (mapsForm.errors as any)?.mapbox_token) && (
                                    <p className="text-xs text-red-600">{inlineErrors.mapbox_token || (mapsForm.errors as any)?.mapbox_token}</p>
                                )}
                                {!mapsForm.data.mapbox_token && !inlineErrors.mapbox_token && !(mapsForm.errors as any)?.mapbox_token && (
                                    <p className="text-xs text-amber-600">{t('settings.integrations.maps.mapbox_token_hint')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Google Maps Settings */}
                    <div className="p-4 border rounded-lg space-y-4 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-semibold">{t('settings.integrations.maps.google_title')}</Label>
                                <p className="text-xs text-gray-500 mt-1">{t('settings.integrations.maps.google_desc')}</p>
                            </div>
                            <Switch
                                checked={mapsForm.data.google_enabled}
                                onCheckedChange={(checked) => mapsForm.setData('google_enabled', checked)}
                            />
                        </div>
                        {mapsForm.data.google_enabled && (
                            <div className="space-y-2">
                                <DocGuide
                                    steps={[
                                        'Open Google Cloud Console (console.cloud.google.com) and select your project.',
                                        'Go to APIs & Services → Library and enable: Maps JavaScript API, Geocoding API, Places API.',
                                        'Go to APIs & Services → Credentials → Create Credentials → API Key.',
                                        'Click "Restrict Key" → add HTTP referrer restrictions for your domain.',
                                        'The key starts with "AIza" — paste it in the field below.',
                                    ]}
                                    docUrl="https://developers.google.com/maps/documentation/javascript/get-api-key"
                                    docLabel="Google Maps – Get API Key →"
                                />
                                <Label>{t('settings.integrations.maps.google_key')}</Label>
                                <Input
                                    type="password"
                                    value={mapsForm.data.google_maps_key}
                                    onChange={e => { mapsForm.setData('google_maps_key', e.target.value); setInlineErrors(prev => ({ ...prev, google_maps_key: '' })); }}
                                    placeholder={t('settings.integrations.maps.google_key_placeholder')}
                                    className={`bg-white border-gray-200 ${(inlineErrors.google_maps_key || (mapsForm.errors as any)?.google_maps_key) ? 'border-red-500' : ''}`}
                                />
                                {(inlineErrors.google_maps_key || (mapsForm.errors as any)?.google_maps_key) && (
                                    <p className="text-xs text-red-600">{inlineErrors.google_maps_key || (mapsForm.errors as any)?.google_maps_key}</p>
                                )}
                                {!mapsForm.data.google_maps_key && !inlineErrors.google_maps_key && !(mapsForm.errors as any)?.google_maps_key && (
                                    <p className="text-xs text-amber-600">{t('settings.integrations.maps.google_key_hint')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Default Map Center & Zoom */}
                    <div className="p-4 border rounded-lg space-y-3 bg-gray-50/50">
                        <div>
                            <Label className="font-semibold">{t('settings.integrations.maps.default_center')}</Label>
                            <p className="text-xs text-gray-500 mt-0.5">{t('settings.integrations.maps.default_center_desc')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{t('settings.integrations.maps.center_lat')}</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    min="-90"
                                    max="90"
                                    value={mapsForm.data.default_center_lat}
                                    onChange={e => mapsForm.setData('default_center_lat', e.target.value)}
                                    placeholder="19.432608"
                                    className="bg-white border-gray-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('settings.integrations.maps.center_lng')}</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    min="-180"
                                    max="180"
                                    value={mapsForm.data.default_center_lng}
                                    onChange={e => mapsForm.setData('default_center_lng', e.target.value)}
                                    placeholder="-99.133209"
                                    className="bg-white border-gray-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('settings.integrations.maps.default_zoom')}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={mapsForm.data.default_zoom}
                                    onChange={e => mapsForm.setData('default_zoom', Number(e.target.value))}
                                    placeholder="4"
                                    className="bg-white border-gray-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fallback Info */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                            {t('settings.integrations.maps.fallback_info')}
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={mapsForm.processing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            {mapsForm.processing ? t('common.loading') : t('common.save')}
                        </Button>
                    </div>
                </div>
            </form>
        </SettingsSection>
    );
}
