import { useEffect, useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Switch } from '@/Components/UI/switch';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, ChevronDown, ChevronUp, Info, ExternalLink } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/UI/select';

const WEBHOOK_EVENTS = [
    {
        provider: 'shipment',
        event: 'shipment.created',
        description: 'Fired when a new shipment is created.',
        payload: `{
  "event": "shipment.created",
  "timestamp": "2026-01-01T00:00:00Z",
  "data": {
    "id": 123,
    "uuid": "abc-def",
    "tracking_number": "DEP-123456",
    "status": "pending",
    "organization_id": 1
  }
}`,
    },
    {
        provider: 'tracking',
        event: 'tracking.updated',
        description: 'Fired when a shipment status changes.',
        payload: `{
  "event": "tracking.updated",
  "timestamp": "2026-01-01T00:00:00Z",
  "data": {
    "tracking_number": "DEP-123456",
    "uuid": "abc-def",
    "status": "in_transit",
    "shipment_id": 123,
    "organization_id": 1
  }
}`,
    },
];

// ── Documentation panel ────────────────────────────────────────────────────
function WebhookDocsPanel({
    selectedEvent,
    t,
}: {
    selectedEvent: string;
    t: (key: string) => string;
}) {
    const [open, setOpen] = useState(false);
    const eventInfo = WEBHOOK_EVENTS.find(e => e.event === selectedEvent);

    return (
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 text-xs">
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors rounded-xl"
                onClick={() => setOpen(v => !v)}
            >
                <span className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    {t('settings.api.how_webhooks_work')}
                </span>
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 space-y-4 text-blue-900 dark:text-blue-200">
                    <p className="leading-relaxed">
                        {t('settings.api.webhook_integration_desc')}
                    </p>

                    <div className="space-y-1">
                        <p className="font-semibold">{t('settings.api.webhook_req_headers_title')}</p>
                        <pre className="bg-blue-100/80 dark:bg-blue-900/40 rounded p-2 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`Content-Type: application/json
X-MasarX-Event: shipment.created
X-MasarX-Timestamp: 1700000000
X-MasarX-Signature: sha256=<hmac_sha256>`}
                        </pre>
                    </div>

                    <div className="space-y-1">
                        <p className="font-semibold">{t('settings.api.webhook_verify_sig_title')}</p>
                        <pre className="bg-blue-100/80 dark:bg-blue-900/40 rounded p-2 font-mono text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap">
{`// PHP
$sig = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
$valid = hash_equals('sha256=' . $sig, $receivedSignature);

// Node.js
const sig = crypto.createHmac('sha256', secret)
  .update(timestamp + '.' + rawBody).digest('hex');
const valid = 'sha256=' + sig === receivedSignature;`}
                        </pre>
                    </div>

                    {eventInfo && (
                        <div className="space-y-1">
                            <p className="font-semibold">
                                {t('settings.api.example_payload')} — <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{eventInfo.event}</code>
                            </p>
                            <p className="text-blue-700 dark:text-blue-300">{eventInfo.description}</p>
                            <pre className="bg-blue-100/80 dark:bg-blue-900/40 rounded p-2 font-mono text-[11px] overflow-x-auto leading-relaxed">
{eventInfo.payload}
                            </pre>
                        </div>
                    )}

                    <div className="space-y-1">
                        <p className="font-semibold">{t('settings.api.webhook_retry_title')}</p>
                        <p>{t('settings.api.webhook_retry_desc')}</p>
                    </div>

                    <a
                        href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                        {t('settings.api.webhook_security_ref')}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
        </div>
    );
}

interface WebhookFormData {
    id?: number;
    provider: string;
    event: string;
    callback_url: string;
    secret?: string;
    is_active: boolean;
}

export default function WebhooksForm({ webhook }: { webhook: WebhookFormData | null }) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const isEditing = !!webhook?.id;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        provider: webhook?.provider ?? '',
        event: webhook?.event ?? '',
        callback_url: webhook?.callback_url ?? '',
        secret: webhook?.secret ?? '',
        is_active: webhook?.is_active ?? true,
    });

    useEffect(() => {
        if (webhook) {
            setData('provider', webhook.provider);
            setData('event', webhook.event);
            setData('callback_url', webhook.callback_url);
            setData('secret', webhook.secret ?? '');
            setData('is_active', webhook.is_active ?? true);
        }
    }, [webhook]);

    const handleEventChange = (value: string) => {
        setData(prev => ({
            ...prev,
            event: value,
            provider: value.split('.')[0] ?? prev.provider,
        }));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            put(route('settings.api.webhooks.update', webhook!.id!), {
                onSuccess: () => alert.success(t('settings.api.webhook_updated')),
                onError: () => alert.error(t('common.validation_error')),
            });
        } else {
            post(route('settings.api.webhooks.store'), {
                onSuccess: () => alert.success(t('settings.api.webhook_created')),
                onError: () => alert.error(t('common.validation_error')),
            });
        }
    };

    const isKnownEvent = WEBHOOK_EVENTS.some(e => e.event === data.event);

    return (
        <SettingsLayout title={isEditing ? t('settings.api.edit_webhook') : t('settings.api.create_webhook')}>
            <div className="max-w-2xl mx-auto space-y-6 py-2">
                <Link
                    href={route('settings.api.webhooks.index')}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('settings.api.back_to_webhooks')}
                </Link>

                <WebhookDocsPanel selectedEvent={data.event} t={t} />

                <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            {t('settings.api.new_webhook_title')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t('settings.api.webhook_subscribe_desc')}
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">

                        {/* Event selector */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.api.event')} <span className="text-destructive">*</span>
                            </Label>
                            <Select value={isKnownEvent ? data.event : '__custom__'} onValueChange={(v) => {
                                if (v !== '__custom__') handleEventChange(v);
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('settings.api.select_event_placeholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {WEBHOOK_EVENTS.map(e => (
                                        <SelectItem key={e.event} value={e.event}>
                                            <div>
                                                <span className="font-mono text-sm">{e.event}</span>
                                                <span className="text-xs text-muted-foreground ml-2">{e.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="__custom__">{t('settings.api.custom_event')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {(!isKnownEvent || data.event === '') && (
                                <Input
                                    value={data.event}
                                    onChange={(e) => handleEventChange(e.target.value)}
                                    placeholder="e.g. shipment.created"
                                    className={`mt-1.5 font-mono ${errors.event ? 'border-destructive' : ''}`}
                                />
                            )}
                            {errors.event && <p className="text-xs text-destructive">{errors.event}</p>}
                        </div>

                        {/* Provider */}
                        <div className="space-y-1.5">
                            <Label htmlFor="provider" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.api.provider')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="provider"
                                value={data.provider}
                                onChange={(e) => setData('provider', e.target.value)}
                                placeholder="e.g. shipment"
                                className={`font-mono ${errors.provider ? 'border-destructive' : ''}`}
                            />
                            <p className="text-[11px] text-muted-foreground">{t('settings.api.provider_hint')}</p>
                            {errors.provider && <p className="text-xs text-destructive">{errors.provider}</p>}
                        </div>

                        {/* Callback URL */}
                        <div className="space-y-1.5">
                            <Label htmlFor="callback_url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.api.callback_url')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="callback_url"
                                type="url"
                                value={data.callback_url}
                                onChange={(e) => setData('callback_url', e.target.value)}
                                placeholder="https://your-server.com/masarx/webhook"
                                className={errors.callback_url ? 'border-destructive' : ''}
                            />
                            {errors.callback_url && <p className="text-xs text-destructive">{errors.callback_url}</p>}
                        </div>

                        {/* Signing Secret */}
                        <div className="space-y-1.5">
                            <Label htmlFor="secret" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('settings.api.signing_secret_label')}{' '}
                                <span className="font-normal text-muted-foreground/70">({t('settings.api.signing_secret_optional')})</span>
                            </Label>
                            <Input
                                id="secret"
                                type="password"
                                value={data.secret}
                                onChange={(e) => setData('secret', e.target.value)}
                                placeholder={isEditing ? 'Leave blank to keep existing secret' : 'Random string used to sign payloads via HMAC-SHA256'}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {t('settings.api.signing_secret_desc')}
                            </p>
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center gap-3">
                            <Switch
                                id="is_active"
                                checked={data.is_active}
                                onCheckedChange={(v) => setData('is_active', v)}
                            />
                            <Label htmlFor="is_active" className="font-medium text-foreground">
                                {t('settings.api.webhook_active_label')}
                            </Label>
                            {!data.is_active && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                                    {t('settings.api.webhook_disabled_warning')}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-border">
                            <Button type="submit" disabled={processing}>
                                {processing
                                    ? t('settings.api.saving')
                                    : isEditing
                                        ? t('settings.api.update_webhook_btn')
                                        : t('settings.api.create_webhook_btn')}
                            </Button>
                            <Link href={route('settings.api.webhooks.index')}>
                                <Button type="button" variant="outline">{t('common.cancel')}</Button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </SettingsLayout>
    );
}
