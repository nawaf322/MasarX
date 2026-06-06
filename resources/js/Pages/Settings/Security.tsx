import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { Input } from "@/Components/UI/input";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from 'react-i18next';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { SettingsField } from './_components/SettingsField';
import { SettingsSaveBar } from './_components/SettingsSaveBar';
import { Switch } from "@/Components/UI/switch";
import { useState } from 'react';

export default function Security({ settings }: { settings: any }) {
    const { t } = useTranslation();
    const [data, setDataState] = useState({
        require_2fa_admin: settings?.require_2fa_admin || false,
        password_expiry_days: settings?.password_expiry_days || 0,
        session_timeout_minutes: settings?.session_timeout_minutes || 120,
        ip_whitelist: settings?.ip_whitelist || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const isDirty = true;

    const setData = (key: string, value: any) => setDataState(prev => ({ ...prev, [key]: value }));

    const alert = useSweetAlert();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setProcessing(true);
        try {
            const { data: resp } = await axios.post(route('settings.security.update'), data);
            alert.success(resp?.message || t('settings.security.saved_success'));
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setErrors(mapped);
            }
            alert.error(t('common.error_title'), t('settings.security.validation_failed'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <SettingsLayout title={t('settings.security.title')}>
            <SettingsShell description={t('settings.security.desc')}>
                <form onSubmit={submit} className="space-y-8">

                    <SettingsSection
                        title={t('settings.security.authentication')}
                        description={t('settings.security.authentication_desc')}
                    >
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50 col-span-1 md:col-span-2">
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{t('settings.security.require_2fa_admin')}</p>
                                <p className="text-xs text-gray-500">{t('settings.security.require_2fa_admin_desc')}</p>
                                {data.require_2fa_admin && (
                                    <p className="text-xs text-amber-600 mt-1 font-medium">{t('settings.security.require_2fa_admin_warning')}</p>
                                )}
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    checked={data.require_2fa_admin}
                                    onChange={e => setData('require_2fa_admin', e.target.checked)}
                                />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.security.session_policy')}
                        description={t('settings.security.session_policy_desc')}
                    >
                        <SettingsField
                            id="session_timeout_minutes"
                            label={t('settings.security.session_timeout')}
                            error={errors.session_timeout_minutes}
                        >
                            <Input
                                type="number"
                                id="session_timeout_minutes"
                                value={data.session_timeout_minutes}
                                onChange={e => setData('session_timeout_minutes', parseInt(e.target.value))}
                                min="5"
                            />
                        </SettingsField>

                        <SettingsField
                            id="password_expiry_days"
                            label={t('settings.security.password_expiry')}
                            help={t('settings.security.password_expiry_help')}
                            error={errors.password_expiry_days}
                        >
                            <Input
                                type="number"
                                id="password_expiry_days"
                                value={data.password_expiry_days}
                                onChange={e => setData('password_expiry_days', parseInt(e.target.value))}
                                min="0"
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.security.network_security')}
                        description={t('settings.security.network_security_desc')}
                    >
                        <SettingsField
                            id="ip_whitelist"
                            label={t('settings.security.ip_whitelist')}
                            help={t('settings.security.ip_whitelist_help')}
                            error={errors.ip_whitelist}
                            className="md:col-span-2"
                        >
                            <textarea
                                className={`flex min-h-[80px] w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.ip_whitelist ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                value={data.ip_whitelist}
                                onChange={e => setData('ip_whitelist', e.target.value)}
                                placeholder={t('settings.security.ip_whitelist_placeholder')}
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSaveBar processing={processing} isDirty={isDirty} />
                </form>
            </SettingsShell>
        </SettingsLayout>
    );
}
