import SettingsLayout from '@/Layouts/SettingsLayout';
import { usePage } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Label } from "@/Components/UI/label";
import { Switch } from "@/Components/UI/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/UI/tabs";
import { Input } from "@/Components/UI/input";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { useState, useEffect } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { NotificationsEditor } from './_components/NotificationsEditor';
import { ErrorBoundary } from '@/Components/ErrorBoundary';
import axios from 'axios';

export default function Notifications({ rules: initialRules, templates, channels, default_events }: any) {
    const { t } = useTranslation();
    const { props } = usePage();
    const [activeTab, setActiveTab] = useState('rules');
    const swal = useSweetAlert();
    const [rules, setRules] = useState<Record<string, any>>(initialRules || {});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const setLoadingKey = (key: string, val: boolean) =>
        setLoading(prev => ({ ...prev, [key]: val }));

    // ── axios helper ──────────────────────────────────────────────────
    async function apiPost(url: string, data: Record<string, any>) {
        const res = await axios.post(url, data);
        return res.data;
    }

    async function handleAction(key: string, action: () => Promise<any>, onOk?: (data: any) => void) {
        setLoadingKey(key, true);
        try {
            const data = await action();
            const msg = data?.message || t('common.saved');
            swal.toast(msg, 'success');
            onOk?.(data);
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || t('common.error_server');
            swal.toast(msg, 'error');
        } finally {
            setLoadingKey(key, false);
        }
    }

    // ── SMTP ──────────────────────────────────────────────────────────
    const existingSmtp = channels?.find((c: any) => c.channel_type === 'smtp')?.config || {};
    const [smtpConfig, setSmtpConfig] = useState({
        host: existingSmtp.host || 'smtp.mailtrap.io',
        port: existingSmtp.port || '2525',
        username: existingSmtp.username || '',
        password: existingSmtp.password || '',
        encryption: existingSmtp.encryption || 'tls',
        from_email: existingSmtp.from_email || '',
        from_name: existingSmtp.from_name || '',
    });

    const handleSmtpSave = () => handleAction('smtp_save', () =>
        apiPost(route('settings.notifications.channel'), { channel_type: 'smtp', name: 'Default SMTP', config: smtpConfig })
    );

    const handleSmtpTest = () => handleAction('smtp_test', () =>
        apiPost(route('settings.notifications.channel.test'), { channel_type: 'smtp' })
    );

    // ── Twilio ────────────────────────────────────────────────────────
    const existingTwilio = channels?.find((c: any) => c.channel_type === 'twilio')?.config || {};
    const [twilioConfig, setTwilioConfig] = useState({
        sid: existingTwilio.sid || '',
        token: existingTwilio.token || '',
        whatsapp_from: existingTwilio.whatsapp_from || '',
        sms_from: existingTwilio.sms_from || '',
    });
    const [twilioTestPhone, setTwilioTestPhone] = useState('');

    const handleTwilioSave = () => handleAction('twilio_save', () =>
        apiPost(route('settings.notifications.channel'), { channel_type: 'twilio', name: 'Twilio', config: twilioConfig })
    );

    const handleTwilioTest = () => handleAction('twilio_test', () =>
        apiPost(route('settings.notifications.channel.test'), { channel_type: 'twilio', test_phone: twilioTestPhone.trim() || undefined })
    );

    // ── Rules ─────────────────────────────────────────────────────────
    const toggleRule = (eventKey: string, channel: string, currentStatus: boolean) => {
        const rule = rules[eventKey] || { channels: [] };
        let newChannels = [...(rule.channels || [])];
        if (currentStatus) {
            newChannels = newChannels.filter((c: string) => c !== channel);
        } else {
            newChannels.push(channel);
        }
        // Optimistic update
        setRules(prev => ({ ...prev, [eventKey]: { ...rule, channels: newChannels } }));

        handleAction(`rule_${eventKey}_${channel}`, () =>
            apiPost(route('settings.notifications.rule'), { event_key: eventKey, channels: newChannels, is_active: true })
        );
    };

    // ── Templates ─────────────────────────────────────────────────────
    const [selectedEvent, setSelectedEvent] = useState(default_events[0] || 'shipment_created');
    const [selectedChannel, setSelectedChannel] = useState('email');
    const [messageSubject, setMessageSubject] = useState('');
    const [messageContent, setMessageContent] = useState('');

    useEffect(() => {
        const found = templates.find((t: any) => t.event_key === selectedEvent && t.channel === selectedChannel);
        setMessageSubject(found?.subject || '');
        setMessageContent(found?.content || '');
    }, [selectedEvent, selectedChannel, templates]);

    return (
        <SettingsLayout title={t('settings.menu.notifications')}>
            <SettingsShell description={t('settings.notifications.desc')}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-8 grid w-full grid-cols-3 max-w-[400px]">
                        <TabsTrigger value="rules">{t('settings.notifications.rules')}</TabsTrigger>
                        <TabsTrigger value="templates">{t('settings.notifications.templates')}</TabsTrigger>
                        <TabsTrigger value="channels">{t('settings.notifications.channels')}</TabsTrigger>
                    </TabsList>

                    {/* RULES TAB */}
                    <TabsContent value="rules" className="space-y-6">
                        <div className="overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                    <tr>
                                        <th className="p-4">{t('settings.notifications.event')}</th>
                                        <th className="p-4 text-center">{t('settings.notifications.email')}</th>
                                        <th className="p-4 text-center">{t('settings.notifications.whatsapp')}</th>
                                        <th className="p-4 text-center">{t('settings.notifications.webhook')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-b md:border-b-0">
                                    {default_events.map((event: string) => {
                                        const rule = rules[event] || { channels: [] };
                                        return (
                                            <tr key={event}>
                                                <td className="p-4 font-medium">{t(`settings.notifications.events.${event}`) || event.replace(/_/g, ' ')}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Switch
                                                            checked={rule.channels?.includes('email')}
                                                            onCheckedChange={(checked) => toggleRule(event, 'email', !checked)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Switch
                                                            checked={rule.channels?.includes('whatsapp')}
                                                            onCheckedChange={(checked) => toggleRule(event, 'whatsapp', !checked)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Switch
                                                            checked={rule.channels?.includes('webhook')}
                                                            onCheckedChange={(checked) => toggleRule(event, 'webhook', !checked)}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    {/* TEMPLATES TAB */}
                    <TabsContent value="templates">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Left Sidebar: Event Selection */}
                            <div className="md:col-span-4 lg:col-span-3 border rounded-lg overflow-hidden bg-white shadow-sm h-fit">
                                <div className="bg-gray-50 px-4 py-3 border-b">
                                    <h3 className="font-medium text-gray-700">{t('settings.notifications.select_event')}</h3>
                                </div>
                                <div className="divide-y max-h-[400px] overflow-y-auto">
                                    {default_events.map((event: string) => (
                                        <button
                                            key={event}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex justify-between items-center ${selectedEvent === event ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'}`}
                                        >
                                            <span>{t(`settings.notifications.events.${event}`) || event.replace(/_/g, ' ')}</span>
                                            {templates.some((t: any) => t.event_key === event && t.channel === selectedChannel) && (
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right Content: Editor */}
                            <div className="md:col-span-8 lg:col-span-9 border rounded-lg p-6 bg-white shadow-sm space-y-4">
                                <ErrorBoundary fallback={
                                    <div className="p-4 border border-yellow-200 bg-yellow-50 rounded text-sm text-yellow-800">
                                        {t('settings.notifications.editor_failed')}
                                    </div>
                                }>
                                    <NotificationsEditor
                                        event={selectedEvent}
                                        channel={selectedChannel}
                                        templates={templates}
                                        branding={(props as any).branding || {}}
                                        onSave={(newContent, newSubject, language, designType) => {
                                            handleAction('template_save', () =>
                                                apiPost(route('settings.notifications.template'), {
                                                    event_key: selectedEvent,
                                                    channel: selectedChannel,
                                                    subject: newSubject,
                                                    content: newContent,
                                                    language: language,
                                                    design_type: designType,
                                                })
                                            );
                                        }}
                                    />
                                </ErrorBoundary>
                            </div>
                        </div>
                    </TabsContent>

                    {/* CHANNELS TAB */}
                    <TabsContent value="channels">
                        <SettingsSection
                            title={t('settings.notifications.smtp_server')}
                            description={t('settings.notifications.smtp_server_desc')}
                        >
                            <div className="col-span-1 md:col-span-2 space-y-6">
                                <div className="flex justify-end gap-2 mb-4">
                                    <Button size="sm" variant="outline" onClick={handleSmtpTest} disabled={loading.smtp_test}>
                                        {loading.smtp_test ? t('common.loading') : t('settings.notifications.test_connection')}
                                    </Button>
                                    <Button size="sm" onClick={handleSmtpSave} disabled={loading.smtp_save}>
                                        {loading.smtp_save ? t('common.loading') : t('settings.notifications.save_configuration')}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>{t('settings.notifications.host')}</Label>
                                        <Input value={smtpConfig.host} onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settings.notifications.port')}</Label>
                                        <Input value={smtpConfig.port} onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settings.notifications.username')}</Label>
                                        <Input value={smtpConfig.username} onChange={e => setSmtpConfig({ ...smtpConfig, username: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settings.notifications.password')}</Label>
                                        <Input type="password" value={smtpConfig.password} onChange={e => setSmtpConfig({ ...smtpConfig, password: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>{t('settings.notifications.encryption')}</Label>
                                        <Select value={smtpConfig.encryption} onValueChange={(val) => setSmtpConfig({ ...smtpConfig, encryption: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tls">{t('settings.notifications.encryption_tls')}</SelectItem>
                                                <SelectItem value="ssl">{t('settings.notifications.encryption_ssl')}</SelectItem>
                                                <SelectItem value="none">{t('settings.notifications.encryption_none')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settings.notifications.from_email')}</Label>
                                        <Input value={smtpConfig.from_email} onChange={e => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settings.notifications.from_name')}</Label>
                                        <Input value={smtpConfig.from_name} onChange={e => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        <div className="mt-8 border-t pt-8">
                            <SettingsSection
                                title={t('settings.notifications.twilio_title')}
                                description={t('settings.notifications.twilio_desc')}
                            >
                                <div className="col-span-1 md:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>{t('settings.notifications.account_sid')}</Label>
                                            <Input
                                                value={twilioConfig.sid || ''}
                                                onChange={e => setTwilioConfig({ ...twilioConfig, sid: e.target.value })}
                                                placeholder={t('settings.notifications.account_sid_placeholder')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('settings.notifications.auth_token')}</Label>
                                            <Input
                                                type="password"
                                                value={twilioConfig.token || ''}
                                                onChange={e => setTwilioConfig({ ...twilioConfig, token: e.target.value })}
                                                placeholder={t('settings.notifications.auth_token_placeholder')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('settings.notifications.whatsapp_from')}</Label>
                                            <Input
                                                value={twilioConfig.whatsapp_from || ''}
                                                onChange={e => setTwilioConfig({ ...twilioConfig, whatsapp_from: e.target.value })}
                                                placeholder={t('settings.notifications.whatsapp_from_placeholder')}
                                            />
                                            <p className="text-xs text-muted-foreground">{t('settings.notifications.whatsapp_from_hint')}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('settings.notifications.sms_from')}</Label>
                                            <Input
                                                value={twilioConfig.sms_from || ''}
                                                onChange={e => setTwilioConfig({ ...twilioConfig, sms_from: e.target.value })}
                                                placeholder={t('settings.notifications.sms_from_placeholder')}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>{t('settings.notifications.test_phone')}</Label>
                                            <Input
                                                value={twilioTestPhone}
                                                onChange={e => setTwilioTestPhone(e.target.value)}
                                                placeholder={t('settings.notifications.test_phone_placeholder')}
                                            />
                                            <p className="text-xs text-muted-foreground">{t('settings.notifications.test_phone_hint')}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={handleTwilioTest} disabled={loading.twilio_test}>
                                            {loading.twilio_test ? t('common.loading') : t('settings.notifications.test_connection_send')}
                                        </Button>
                                        <Button size="sm" onClick={handleTwilioSave} disabled={loading.twilio_save}>
                                            {loading.twilio_save ? t('common.loading') : t('settings.notifications.save_configuration')}
                                        </Button>
                                    </div>
                                </div>
                            </SettingsSection>
                        </div>
                    </TabsContent>
                </Tabs>
            </SettingsShell>
        </SettingsLayout>
    );
}
