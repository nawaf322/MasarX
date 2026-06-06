import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Checkbox } from "@/Components/UI/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { ArrowLeft, Save, Shield, Database, Truck, Users, DollarSign, MapPin } from "lucide-react";
import { FormEventHandler } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';

export default function Create() {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        permissions: [] as string[],
        rate_limit_per_minute: 60,
        ip_whitelist: '',
        expiration: 'never',
    });

    const SCOPE_CATEGORIES = [
        {
            key: 'cat_main',
            icon: <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
            scopes: [
                { id: 'shipments.view',   labelKey: 'scope_shipments_view' },
                { id: 'shipments.create', labelKey: 'scope_shipments_create' },
                { id: 'shipments.edit',   labelKey: 'scope_shipments_edit' },
                { id: 'tracking.view',    labelKey: 'scope_tracking_view' },
                { id: 'rates.quote',      labelKey: 'scope_rates_quote' },
            ]
        },
        {
            key: 'cat_warehouse',
            icon: <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
            scopes: [
                { id: 'inventory.view',    labelKey: 'scope_inventory_view' },
                { id: 'inventory.manage',  labelKey: 'scope_inventory_manage' },
                { id: 'manifests.view',    labelKey: 'scope_manifests_view' },
                { id: 'manifests.create',  labelKey: 'scope_manifests_create' },
            ]
        },
        {
            key: 'cat_dispatch',
            icon: <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
            scopes: [
                { id: 'dispatch.view',   labelKey: 'scope_dispatch_view' },
                { id: 'dispatch.assign', labelKey: 'scope_dispatch_assign' },
            ]
        },
        {
            key: 'cat_customers',
            icon: <Users className="h-4 w-4 text-green-600 dark:text-green-400" />,
            scopes: [
                { id: 'customers.view',   labelKey: 'scope_customers_view' },
                { id: 'customers.create', labelKey: 'scope_customers_create' },
            ]
        },
        {
            key: 'cat_finance',
            icon: <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
            scopes: [
                { id: 'invoices.view',    labelKey: 'scope_invoices_view' },
                { id: 'payments.manage',  labelKey: 'scope_payments_manage' },
            ]
        },
        {
            key: 'cat_locations',
            icon: <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />,
            scopes: [
                { id: 'locations.view',   labelKey: 'scope_locations_view' },
                { id: 'locations.manage', labelKey: 'scope_locations_manage' },
            ]
        },
    ];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('api-tokens.store'), {
            onError: () => alert.error(t('api_tokens.save_error'), t('api_tokens.check_form_data')),
        });
    };

    const togglePermission = (id: string) => {
        if (data.permissions.includes(id)) {
            setData('permissions', data.permissions.filter(p => p !== id));
        } else {
            setData('permissions', [...data.permissions, id]);
        }
    };

    const toggleCategory = (ids: string[]) => {
        const allSelected = ids.every(id => data.permissions.includes(id));
        if (allSelected) {
            setData('permissions', data.permissions.filter(p => !ids.includes(p)));
        } else {
            setData('permissions', [...new Set([...data.permissions, ...ids])]);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('api_tokens.create_page_title')} />

            <div className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <Link
                        href={route('api-tokens.index')}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('api_tokens.back_to_tokens')}
                    </Link>
                    <h2 className="text-2xl font-bold text-foreground">{t('api_tokens.create_page_title')}</h2>
                    <p className="text-muted-foreground mt-1">{t('api_tokens.create_subtitle')}</p>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border p-6 md:p-8">
                    <form onSubmit={submit} className="space-y-8">

                        {/* Token Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                                {t('api_tokens.token_details_section')}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <Label htmlFor="name">{t('api_tokens.token_name')}</Label>
                                    <Input
                                        id="name"
                                        placeholder={t('api_tokens.token_name_placeholder')}
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        className={errors.name ? 'border-destructive' : ''}
                                    />
                                    {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="expiration">{t('api_tokens.expiration_label')}</Label>
                                    <Select value={data.expiration} onValueChange={(val) => setData('expiration', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('api_tokens.expiration_label')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="never">{t('api_tokens.expiration_never')}</SelectItem>
                                            <SelectItem value="30">{t('api_tokens.expiration_30d')}</SelectItem>
                                            <SelectItem value="60">{t('api_tokens.expiration_60d')}</SelectItem>
                                            <SelectItem value="90">{t('api_tokens.expiration_90d')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="rate_limit">{t('api_tokens.rate_limit_label')}</Label>
                                    <Input
                                        id="rate_limit"
                                        type="number"
                                        value={data.rate_limit_per_minute}
                                        onChange={e => setData('rate_limit_per_minute', parseInt(e.target.value) || 0)}
                                    />
                                </div>

                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <Label htmlFor="ip_whitelist">{t('api_tokens.ip_whitelist_label')}</Label>
                                    <Input
                                        id="ip_whitelist"
                                        placeholder="192.168.1.1, 10.0.0.1"
                                        value={data.ip_whitelist}
                                        onChange={e => setData('ip_whitelist', e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">{t('api_tokens.ip_whitelist_hint')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <h3 className="text-lg font-semibold text-foreground">
                                    {t('api_tokens.permissions_section')}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {data.permissions.length} {t('api_tokens.selected_count')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {SCOPE_CATEGORIES.map((category) => (
                                    <div key={category.key} className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {category.icon}
                                                <h4 className="font-medium text-foreground">{t(`api_tokens.${category.key}`)}</h4>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                onClick={() => toggleCategory(category.scopes.map(s => s.id))}
                                                className="h-6 text-[10px] text-primary hover:text-primary/80"
                                            >
                                                {t('api_tokens.toggle_all')}
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {category.scopes.map((scope) => (
                                                <div key={scope.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={scope.id}
                                                        checked={data.permissions.includes(scope.id)}
                                                        onCheckedChange={() => togglePermission(scope.id)}
                                                    />
                                                    <label
                                                        htmlFor={scope.id}
                                                        className="text-sm text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full select-none"
                                                    >
                                                        {t(`api_tokens.${scope.labelKey}`)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end border-t border-border">
                            <Button type="submit" disabled={processing} className="min-w-[140px]">
                                {processing ? t('api_tokens.creating') : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {t('api_tokens.create_btn')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
