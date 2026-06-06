import { useEffect, useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Switch } from '@/Components/UI/switch';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/UI/select';
import { Checkbox } from '@/Components/UI/checkbox';

const CLIENT_TYPES = [
    { value: 'zapier',  label: 'Zapier' },
    { value: 'n8n',     label: 'n8n' },
    { value: 'make',    label: 'Make (Integromat)' },
    { value: 'custom',  label: 'Custom / Backend' },
    { value: 'mobile',  label: 'Mobile App' },
];

interface ClientFormData {
    id?: number;
    name: string;
    type: string;
    status?: string;
    callback_url?: string;
    allowed_scopes: string[];
    rate_limit_per_minute: number;
    ip_whitelist: string;
    is_active: boolean;
}

function HowToGuide({ clientId, t }: { clientId?: string; t: (k: string) => string }) {
    const [open, setOpen] = useState(false);
    const baseUrl = window.location.origin + '/api/v1';
    return (
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 text-xs">
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-blue-700 dark:text-blue-400 font-semibold hover:bg-blue-100/60 dark:hover:bg-blue-900/20 transition-colors rounded-xl"
                onClick={() => setOpen(v => !v)}
            >
                <span className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    {t('settings.api.how_to_guide_title')}
                </span>
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 space-y-4 text-blue-900 dark:text-blue-200">
                    <p className="leading-relaxed">
                        {t('settings.api.oauth_desc')}
                    </p>
                    <div className="space-y-1">
                        <p className="font-semibold">{t('settings.api.how_to_step1_title')}</p>
                        <pre className="bg-blue-100/80 dark:bg-blue-900/30 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono text-[11px]">
{`POST ${baseUrl.replace('/v1', '')}/v1/auth/client-token
Content-Type: application/json

{
  "client_id": "${clientId ?? '<your-client-id>'}",
  "client_secret": "<your-client-secret>",
  "grant_type": "client_credentials"
}`}
                        </pre>
                        <p className="text-[11px] text-blue-700 dark:text-blue-400">
                            Response: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{`{ "access_token": "...", "expires_in": 3600 }`}</code>
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">{t('settings.api.how_to_step2_title')}</p>
                        <pre className="bg-blue-100/80 dark:bg-blue-900/30 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono text-[11px]">
{`GET ${baseUrl}/shipments
Authorization: Bearer <access_token>`}
                        </pre>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">{t('settings.api.how_to_available_endpoints')}</p>
                        <div className="grid grid-cols-2 gap-1">
                            {([
                                ['GET', '/shipments'],
                                ['POST', '/shipments'],
                                ['GET', '/shipments/{id}'],
                                ['PUT', '/shipments/{id}'],
                                ['POST', '/rates/quote'],
                                ['GET', '/tracking/{number}'],
                            ] as [string, string][]).map(([method, path]) => (
                                <div key={path} className="flex items-center gap-1.5 font-mono">
                                    <span className={`font-bold ${method === 'GET' ? 'text-emerald-700 dark:text-emerald-400' : method === 'POST' ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>{method}</span>
                                    <span className="text-blue-800 dark:text-blue-300">{path}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <a
                        href="https://swagger.io/docs/specification/authentication/bearer-authentication/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                        {t('settings.api.bearer_auth_ref')}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
        </div>
    );
}

export default function ClientsForm({
    client,
    scopeOptions = [],
}: {
    client: ClientFormData | null;
    scopeOptions: string[];
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const isEditing = !!client?.id;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: client?.name ?? '',
        type: client?.type ?? 'custom',
        status: client?.status ?? 'active',
        callback_url: client?.callback_url ?? '',
        allowed_scopes: client?.allowed_scopes ?? [],
        rate_limit_per_minute: client?.rate_limit_per_minute ?? 60,
        ip_whitelist: client?.ip_whitelist ?? '',
        is_active: client?.is_active ?? true,
    });

    useEffect(() => {
        if (client) {
            setData('name', client.name);
            setData('type', client.type);
            setData('status', client.status ?? 'active');
            setData('callback_url', client.callback_url ?? '');
            setData('allowed_scopes', client.allowed_scopes ?? []);
            setData('rate_limit_per_minute', client.rate_limit_per_minute ?? 60);
            setData('ip_whitelist', client.ip_whitelist ?? '');
            setData('is_active', client.is_active ?? true);
        }
    }, [client]);

    const toggleScope = (scope: string) => {
        const current = data.allowed_scopes || [];
        setData('allowed_scopes', current.includes(scope)
            ? current.filter((s) => s !== scope)
            : [...current, scope]
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            put(route('settings.api.clients.update', client!.id!), {
                onSuccess: () => alert.success(t('settings.api.client_updated')),
                onError: () => alert.error(t('common.validation_error')),
            });
        } else {
            post(route('settings.api.clients.store'), {
                onError: () => alert.error(t('common.validation_error')),
            });
        }
    };

    const scopeGroups = [
        { key: 'scope_group_shipments', scopes: ['shipments.view', 'shipments.create', 'shipments.edit', 'tracking.view', 'rates.quote'] },
        { key: 'scope_group_warehouse', scopes: ['inventory.view', 'inventory.manage', 'manifests.view', 'manifests.create'] },
        { key: 'scope_group_dispatch',  scopes: ['dispatch.view', 'dispatch.assign'] },
        { key: 'scope_group_customers', scopes: ['customers.view', 'customers.create'] },
        { key: 'scope_group_finance',   scopes: ['invoices.view', 'payments.manage'] },
        { key: 'scope_group_locations', scopes: ['locations.view', 'locations.manage'] },
    ];

    const scopeDescKey: Record<string, string> = {
        'shipments.view':     'settings.api.scope_desc_shipments_view',
        'shipments.create':   'settings.api.scope_desc_shipments_create',
        'shipments.edit':     'settings.api.scope_desc_shipments_edit',
        'tracking.view':      'settings.api.scope_desc_tracking_view',
        'rates.quote':        'settings.api.scope_desc_rates_quote',
        'inventory.view':     'settings.api.scope_desc_inventory_view',
        'inventory.manage':   'settings.api.scope_desc_inventory_manage',
        'manifests.view':     'settings.api.scope_desc_manifests_view',
        'manifests.create':   'settings.api.scope_desc_manifests_create',
        'dispatch.view':      'settings.api.scope_desc_dispatch_view',
        'dispatch.assign':    'settings.api.scope_desc_dispatch_assign',
        'customers.view':     'settings.api.scope_desc_customers_view',
        'customers.create':   'settings.api.scope_desc_customers_create',
        'invoices.view':      'settings.api.scope_desc_invoices_view',
        'payments.manage':    'settings.api.scope_desc_payments_manage',
        'locations.view':     'settings.api.scope_desc_locations_view',
        'locations.manage':   'settings.api.scope_desc_locations_manage',
    };

    const knownScopes = scopeGroups.flatMap(g => g.scopes);
    const otherScopes = scopeOptions.filter(s => !knownScopes.includes(s));

    return (
        <SettingsLayout title={isEditing ? t('settings.api.edit_client') : t('settings.api.create_client')}>
            <div className="max-w-3xl mx-auto space-y-6 py-2">
                <Link
                    href={route('settings.api.clients.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('settings.api.back_to_clients')}
                </Link>

                <HowToGuide clientId={(client as any)?.client_id} t={t} />

                <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            {isEditing ? t('settings.api.edit_client') : t('settings.api.create_client')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('settings.api.oauth_desc')}</p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.api.col_name')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="My Zapier Integration"
                                    className={errors.name ? 'border-destructive' : ''}
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            {/* Type */}
                            <div className="space-y-1.5">
                                <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.api.integration_type')} <span className="text-destructive">*</span>
                                </Label>
                                <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLIENT_TYPES.map((ct) => (
                                            <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status (edit only) */}
                            {isEditing && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('settings.api.col_status')}
                                    </Label>
                                    <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                        <SelectTrigger id="status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('settings.api.status_active')}</SelectItem>
                                            <SelectItem value="inactive">{t('settings.api.status_inactive')}</SelectItem>
                                            <SelectItem value="revoked">{t('settings.api.status_revoked')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Rate limit */}
                            <div className="space-y-1.5">
                                <Label htmlFor="rate_limit" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.api.rate_limit_per_min')}
                                </Label>
                                <Input
                                    id="rate_limit"
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={data.rate_limit_per_minute}
                                    onChange={(e) => setData('rate_limit_per_minute', parseInt(e.target.value) || 60)}
                                />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3 pt-4">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(v) => setData('is_active', v)}
                                />
                                <Label htmlFor="is_active" className="font-medium text-foreground">{t('settings.api.client_active')}</Label>
                            </div>

                            {/* Callback URL */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="callback_url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.api.callback_url')}{' '}
                                    <span className="font-normal text-muted-foreground/60">({t('settings.api.callback_url_optional_label')})</span>
                                </Label>
                                <Input
                                    id="callback_url"
                                    type="url"
                                    value={data.callback_url}
                                    onChange={(e) => setData('callback_url', e.target.value)}
                                    placeholder="https://your-app.com/callback"
                                />
                            </div>

                            {/* IP Whitelist */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="ip_whitelist" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.api.ip_whitelist')}{' '}
                                    <span className="font-normal text-muted-foreground/60">({t('settings.api.ip_whitelist_hint')})</span>
                                </Label>
                                <textarea
                                    id="ip_whitelist"
                                    value={data.ip_whitelist}
                                    onChange={(e) => setData('ip_whitelist', e.target.value)}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                                    placeholder={"192.168.1.1\n10.0.0.0/24"}
                                />
                            </div>
                        </div>

                        {/* Scopes */}
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('settings.api.scopes')}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">{t('settings.api.scopes_help')}</p>
                            </div>
                            <div className="space-y-3">
                                {scopeGroups.map((group) => {
                                    const available = group.scopes.filter(s => scopeOptions.includes(s) || scopeOptions.length === 0);
                                    if (available.length === 0) return null;
                                    const allSelected = available.every(s => data.allowed_scopes.includes(s));
                                    return (
                                        <div key={group.key} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    {t(`settings.api.${group.key}`)}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="text-[10px] text-primary hover:text-primary/80 font-medium"
                                                    onClick={() => {
                                                        if (allSelected) {
                                                            setData('allowed_scopes', data.allowed_scopes.filter(s => !available.includes(s)));
                                                        } else {
                                                            setData('allowed_scopes', [...new Set([...data.allowed_scopes, ...available])]);
                                                        }
                                                    }}
                                                >
                                                    {allSelected ? t('settings.api.deselect_all') : t('settings.api.select_all')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {available.map((scope) => (
                                                    <div key={scope} className="flex items-start gap-2">
                                                        <Checkbox
                                                            id={`scope-${scope}`}
                                                            checked={data.allowed_scopes.includes(scope)}
                                                            onCheckedChange={() => toggleScope(scope)}
                                                            className="mt-0.5"
                                                        />
                                                        <label htmlFor={`scope-${scope}`} className="cursor-pointer leading-tight">
                                                            <span className="text-xs font-mono text-foreground/90">{scope}</span>
                                                            {scopeDescKey[scope] && (
                                                                <span className="block text-[10px] text-muted-foreground">{t(scopeDescKey[scope])}</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {otherScopes.length > 0 && (
                                    <div className="flex flex-wrap gap-3">
                                        {otherScopes.map((scope) => (
                                            <div key={scope} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`scope-${scope}`}
                                                    checked={data.allowed_scopes.includes(scope)}
                                                    onCheckedChange={() => toggleScope(scope)}
                                                />
                                                <label htmlFor={`scope-${scope}`} className="text-xs font-mono cursor-pointer text-foreground">{scope}</label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {scopeOptions.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">{t('settings.api.no_scopes_defined')}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-border">
                            <Button type="submit" disabled={processing}>
                                {processing
                                    ? t('settings.api.saving')
                                    : isEditing
                                        ? t('settings.api.update_client_btn')
                                        : t('settings.api.create_client_btn')
                                }
                            </Button>
                            <Link href={route('settings.api.clients.index')}>
                                <Button type="button" variant="outline">{t('common.cancel')}</Button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </SettingsLayout>
    );
}
