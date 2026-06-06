import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { SearchableSelect, type Option } from "@/Components/UI/searchable-select";
import { Switch } from "@/Components/UI/switch";
import { ArrowLeft, Save, User, MapPin, Lock } from "lucide-react";
import { FormEventHandler, useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import axios from 'axios';
import { CountryFlagIcon, getIso2ForPhoneCode } from '@/Components/CountryFlagIcon';

interface CountryOption {
    id: number;
    name: string;
    iso2: string;
    phone_code: string | null;
}

interface StateOption {
    id: number;
    name: string;
    code: string | null;
}

interface CityOption {
    id: number;
    name: string;
}

const GENDER_OPTIONS = [
    { value: 'male', labelKey: 'customers.gender.male' },
    { value: 'female', labelKey: 'customers.gender.female' },
    { value: 'other', labelKey: 'customers.gender.other' },
    { value: 'prefer_not_to_say', labelKey: 'customers.gender.prefer_not_to_say' },
];

const DOCUMENT_TYPE_OPTIONS = [
    { value: 'CC', labelKey: 'customers.doc_type.cc' },
    { value: 'NIF', labelKey: 'customers.doc_type.nif' },
    { value: 'RUC', labelKey: 'customers.doc_type.ruc' },
    { value: 'PASSPORT', labelKey: 'customers.doc_type.passport' },
    { value: 'CE', labelKey: 'customers.doc_type.ce' },
    { value: 'OTHER', labelKey: 'customers.doc_type.other' },
];

export default function CustomerCreate({ countries = [] }: { countries: CountryOption[] }) {
    const alert = useSweetAlert();
    const { t } = useTranslation();
    const [states, setStates] = useState<StateOption[]>([]);
    const [cities, setCities] = useState<CityOption[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [grantAccess, setGrantAccess] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        gender: '' as string,
        document_type: '' as string,
        document_id: '',
        date_of_birth: '',
        email: '',
        phone: '+1 ',
        address: '',
        address_line2: '',
        city: '',
        country: '',
        zip_code: '',
        country_id: undefined as number | undefined,
        state_id: undefined as number | undefined,
        city_id: undefined as number | undefined,
        password: '',
        password_confirmation: '',
    });

    const countryOptions: Option[] = useMemo(() =>
        countries.map(c => ({ value: String(c.id), label: c.name, keywords: [c.name, c.iso2].filter(Boolean) })),
        [countries]
    );
    const stateOptions: Option[] = useMemo(() =>
        states.map(s => ({ value: String(s.id), label: s.name, keywords: [s.name, s.code].filter(Boolean) as string[] })),
        [states]
    );
    const cityOptions: Option[] = useMemo(() =>
        cities.map(c => ({ value: String(c.id), label: c.name, keywords: [c.name] })),
        [cities]
    );
    // Un solo ítem por código; bandera correcta vía mapeo (ej. +1 → US) usando country-flag-icons
    const phoneCodeOptions: Option[] = useMemo(() => {
        const seen = new Set<string>();
        return countries
            .filter(c => {
                const code = c.phone_code ? `+${c.phone_code}` : '';
                if (!code || seen.has(code)) return false;
                seen.add(code);
                return true;
            })
            .map(c => {
                const code = c.phone_code ? `+${c.phone_code}` : '+1';
                const iso2 = getIso2ForPhoneCode(code) || c.iso2;
                return {
                    value: code,
                    label: (
                        <span className="inline-flex items-center gap-1.5">
                            <CountryFlagIcon iso2={iso2} className="h-4 w-5 shrink-0 rounded object-cover" />
                            <span>{code}</span>
                        </span>
                    ),
                    keywords: [c.name, c.iso2, code].filter(Boolean),
                };
            });
    }, [countries]);

    const prevCountryIdRef = useRef<number | undefined>(undefined);
    const prevStateIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!data.country_id) {
            setStates([]);
            setCities([]);
            setData('state_id', undefined);
            setData('city_id', undefined);
            prevCountryIdRef.current = undefined;
            prevStateIdRef.current = undefined;
            return;
        }
        const countryId = Number(data.country_id);
        const userChangedCountry = prevCountryIdRef.current !== undefined && prevCountryIdRef.current !== countryId;
        if (userChangedCountry) {
            setData('state_id', undefined);
            setData('city_id', undefined);
            setCities([]);
            prevStateIdRef.current = undefined;
        }
        prevCountryIdRef.current = countryId;
        setLoadingStates(true);
        axios.get(route('customers.locations.states'), { params: { country_id: countryId } })
            .then((res) => {
                if (prevCountryIdRef.current === countryId) setStates(res.data);
            })
            .catch(() => { if (prevCountryIdRef.current === countryId) setStates([]); })
            .finally(() => { if (prevCountryIdRef.current === countryId) setLoadingStates(false); });
    }, [data.country_id]);

    useEffect(() => {
        if (!data.state_id) {
            setCities([]);
            setData('city_id', undefined);
            prevStateIdRef.current = undefined;
            return;
        }
        const stateId = Number(data.state_id);
        const userChangedState = prevStateIdRef.current !== undefined && prevStateIdRef.current !== stateId;
        if (userChangedState) {
            setData('city_id', undefined);
        }
        prevStateIdRef.current = stateId;
        setLoadingCities(true);
        axios.get(route('customers.locations.cities'), { params: { state_id: stateId } })
            .then((res) => {
                if (prevStateIdRef.current === stateId) setCities(res.data);
            })
            .catch(() => { if (prevStateIdRef.current === stateId) setCities([]); })
            .finally(() => { if (prevStateIdRef.current === stateId) setLoadingCities(false); });
    }, [data.state_id]);

    const phoneParts = data.phone?.split(' ') ?? [];
    const phoneCode = phoneParts[0] || '';
    const phoneNumber = phoneParts.slice(1).join(' ') || '';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('customers.store'), {
            onSuccess: () => {
                alert.success(t('common.save') + '!', t('settings.save_success'));
            },
            onError: (errs: Record<string, string | string[]>) => {
                const messages = Object.values(errs).flat();
                const errorMessage = Array.isArray(messages) && messages.length
                    ? messages.join('\n')
                    : (t('common.error') || 'Error');
                alert.error(t('common.error'), String(errorMessage));
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('sidebar.customers')} />

            <div className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <Link href={route('customers.index')} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        {t('common.back')}
                    </Link>
                    <h2 className="text-2xl font-bold text-foreground">{t('common.create')} {t('roles.customer')}</h2>
                    <p className="text-muted-foreground mt-1">{t('customers.create_subtitle')}</p>
                </div>

                <form onSubmit={submit} className="space-y-8">
                    {/* Información personal */}
                    <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                            <User className="h-5 w-5 text-primary" />
                            {t('customers.personal_info')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('forms.name')} <span className="text-red-500">*</span></Label>
                                <Input
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="John Doe"
                                    required
                                />
                                {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('customers.gender_label')} ({t('forms.optional')})</Label>
                                <Select value={data.gender || ''} onValueChange={(v) => setData('gender', v)}>
                                    <SelectTrigger className={errors.gender ? 'border-destructive' : ''}>
                                        <SelectValue placeholder={t('customers.gender_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GENDER_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {t(opt.labelKey)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.gender && <p className="text-destructive text-sm">{errors.gender}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('customers.document_type')} ({t('forms.optional')})</Label>
                                <Select value={data.document_type || ''} onValueChange={(v) => setData('document_type', v)}>
                                    <SelectTrigger className={errors.document_type ? 'border-destructive' : ''}>
                                        <SelectValue placeholder={t('customers.document_type_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.document_type && <p className="text-destructive text-sm">{errors.document_type}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('customers.document_id')} ({t('forms.optional')})</Label>
                                <Input
                                    value={data.document_id}
                                    onChange={e => setData('document_id', e.target.value)}
                                    placeholder="Cédula / ID"
                                />
                                {errors.document_id && <p className="text-destructive text-sm">{errors.document_id}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('customers.date_of_birth')} ({t('forms.optional')})</Label>
                                <Input
                                    type="date"
                                    value={data.date_of_birth}
                                    onChange={e => setData('date_of_birth', e.target.value)}
                                />
                                {errors.date_of_birth && <p className="text-destructive text-sm">{errors.date_of_birth}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('forms.email')} <span className="text-red-500">*</span></Label>
                                <Input
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="john@example.com"
                                    required
                                />
                                {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('forms.phone')} <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <div className="w-[140px] shrink-0">
                                        <SearchableSelect
                                            options={phoneCodeOptions.length ? phoneCodeOptions : [
                                                { value: '+1', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="US" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+1</span></span> },
                                                { value: '+57', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="CO" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+57</span></span> },
                                                { value: '+52', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="MX" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+52</span></span> },
                                                { value: '+34', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="ES" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+34</span></span> },
                                            ]}
                                            value={phoneCode || '+1'}
                                            onChange={(v) => setData('phone', `${v} ${phoneNumber}`.trim())}
                                            placeholder={t('customers.phone_code_placeholder')}
                                            searchPlaceholder={t('common.search')}
                                        />
                                    </div>
                                    <Input
                                        value={phoneNumber}
                                        onChange={e => { const v = e.target.value.replace(/\D/g, ''); setData('phone', `${phoneCode} ${v}`.trim()); }}
                                        placeholder="5550123456"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="flex-1 min-w-0"
                                        required
                                    />
                                </div>
                                {errors.phone && <p className="text-destructive text-sm">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Dirección */}
                    <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                            <MapPin className="h-5 w-5 text-primary" />
                            {t('customers.address_info')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>{t('customers.country')} <span className="text-red-500">*</span></Label>
                                <SearchableSelect
                                    options={countryOptions}
                                    value={data.country_id != null ? String(data.country_id) : ''}
                                    onChange={(v) => setData('country_id', v ? parseInt(v, 10) : undefined)}
                                    placeholder={t('customers.country_placeholder')}
                                    searchPlaceholder={t('common.search')}
                                    className={errors.country_id ? 'border-destructive' : ''}
                                />
                                {errors.country_id && <p className="text-destructive text-sm">{errors.country_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('customers.state')} <span className="text-red-500">*</span></Label>
                                <SearchableSelect
                                    options={stateOptions}
                                    value={data.state_id != null ? String(data.state_id) : ''}
                                    onChange={(v) => setData('state_id', v ? parseInt(v, 10) : undefined)}
                                    placeholder={loadingStates ? t('common.loading') : t('customers.state_placeholder')}
                                    searchPlaceholder={t('common.search')}
                                    disabled={loadingStates || !data.country_id}
                                />
                                {errors.state_id && <p className="text-destructive text-sm">{errors.state_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('customers.city')} <span className="text-red-500">*</span></Label>
                                <SearchableSelect
                                    options={cityOptions}
                                    value={data.city_id != null ? String(data.city_id) : ''}
                                    onChange={(v) => setData('city_id', v ? parseInt(v, 10) : undefined)}
                                    placeholder={loadingCities ? t('common.loading') : t('customers.city_placeholder')}
                                    searchPlaceholder={t('common.search')}
                                    disabled={loadingCities || !data.state_id}
                                />
                                {errors.city_id && <p className="text-destructive text-sm">{errors.city_id}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('customers.zip_code')} ({t('forms.optional')})</Label>
                                <Input
                                    value={data.zip_code}
                                    onChange={e => setData('zip_code', e.target.value)}
                                    placeholder="12345"
                                />
                                {errors.zip_code && <p className="text-destructive text-sm">{errors.zip_code}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('forms.address')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                                placeholder="123 Main St"
                                required
                            />
                            {errors.address && <p className="text-destructive text-sm">{errors.address}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('customers.address_line2')} ({t('forms.optional')})</Label>
                            <Input
                                value={data.address_line2}
                                onChange={e => setData('address_line2', e.target.value)}
                                placeholder="Apt, suite, etc."
                            />
                            {errors.address_line2 && <p className="text-destructive text-sm">{errors.address_line2}</p>}
                        </div>
                    </div>

                    {/* Access / Password */}
                    <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg text-foreground">{t('customers.grant_access_title')}</h3>
                            </div>
                            <Switch
                                checked={grantAccess}
                                onCheckedChange={(v) => {
                                    setGrantAccess(v);
                                    if (!v) {
                                        setData('password', '');
                                        setData('password_confirmation', '');
                                    }
                                }}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">{t('customers.grant_access_hint')}</p>

                        {grantAccess && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label>{t('forms.password')} <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                    {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('forms.password_confirmation')} <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                    {errors.password_confirmation && <p className="text-destructive text-sm">{errors.password_confirmation}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                            {processing ? t('common.loading') : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('common.save')}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
