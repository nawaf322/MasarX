import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { RadioGroup, RadioGroupItem } from '@/Components/UI/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/UI/select';
import {
    ArrowLeft,
    Wind,
    Anchor,
    Truck,
    Package,
    Clock,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Search,
    UserCheck,
    X,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface Country { id: number; name: string; iso2: string; phone_code?: string | null; }

const fmt = (v: unknown): string =>
    typeof v === 'number' ? v.toFixed(2) : parseFloat(String(v ?? 0)).toFixed(2);

function getModeIcon(mode?: string | null, cardName?: string) {
    const n = ((mode ?? '') + ' ' + (cardName ?? '')).toLowerCase();
    if (n.includes('air') || n.includes('aer'))                              return { Icon: Wind,    bg: 'bg-sky-500' };
    if (n.includes('sea') || n.includes('ocean') || n.includes('mar'))      return { Icon: Anchor,  bg: 'bg-blue-600' };
    if (n.includes('ground') || n.includes('road') || n.includes('truck'))  return { Icon: Truck,   bg: 'bg-amber-500' };
    return { Icon: Package, bg: 'bg-slate-500' };
}

type AddressSection = 'sender_details' | 'receiver_details';

interface AddressFormProps {
    section: AddressSection;
    data: any;
    errors: any;
    countries: Country[];
    onChange: (field: string, value: any) => void;
    t: (k: string) => string;
}

function AddressForm({ section, data, errors, countries, onChange, t }: AddressFormProps) {
    const [states, setStates]             = useState<{ id: number; name: string }[]>([]);
    const [cities, setCities]             = useState<{ id: number; name: string }[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    // Customer search
    const [searchQuery,    setSearchQuery]    = useState('');
    const [searchResults,  setSearchResults]  = useState<any[]>([]);
    const [searching,      setSearching]      = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [showDropdown,   setShowDropdown]   = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Prevents country-change effect from wiping state/city when doing autofill
    const autofillRef = useRef(false);

    const d   = data[section] ?? {};
    const e   = errors?.[section] ?? {};
    const pfx = section === 'sender_details' ? 'sender_details.' : 'receiver_details.';

    useEffect(() => {
        if (d.country_id) {
            setLoadingStates(true);
            axios.get(route('customers.locations.states'), { params: { country_id: d.country_id } })
                .then(res => {
                    setStates(res.data);
                    setCities([]);
                    if (!autofillRef.current) {
                        onChange(section, { ...d, state_id: null, state: '', city_id: null, city: '' });
                    }
                    autofillRef.current = false;
                })
                .finally(() => setLoadingStates(false));
        } else {
            setStates([]);
            setCities([]);
        }
    }, [d.country_id]);

    useEffect(() => {
        if (d.state_id) {
            setLoadingCities(true);
            axios.get(route('customers.locations.cities'), { params: { state_id: d.state_id } })
                .then(res => setCities(res.data))
                .finally(() => setLoadingCities(false));
        } else {
            setCities([]);
        }
    }, [d.state_id]);

    const handleSearchInput = (q: string) => {
        setSearchQuery(q);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (q.length < 3) { setSearchResults([]); setShowDropdown(false); return; }
        searchTimer.current = setTimeout(() => {
            setSearching(true);
            axios.get(route('api.customers.search'), { params: { q } })
                .then(res => { setSearchResults(res.data); setShowDropdown(true); })
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false));
        }, 300);
    };

    const handleSelectCustomer = (customer: any) => {
        setSelectedCustomer(customer);
        setSearchQuery('');
        setShowDropdown(false);
        setSearchResults([]);
        const sd = section === 'sender_details' ? customer.sender_details : customer.receiver_details;
        autofillRef.current = true;
        onChange(section, {
            name:         customer.name     ?? '',
            phone:        customer.phone    ?? '',
            email:        customer.email    ?? '',
            address:      customer.address  ?? '',
            country:      customer.country  ?? sd?.country      ?? '',
            country_code: sd?.country_code  ?? '',
            country_id:   customer.country_id  ?? null,
            state_id:     customer.state_id    ?? null,
            state:        customer.state       ?? '',
            city_id:      customer.city_id     ?? null,
            city:         customer.city        ?? '',
        });
    };

    const updateField = (field: string, value: any) => onChange(section, { ...d, [field]: value });

    const updateCountry = (iso2: string) => {
        const c = countries.find(x => x.iso2 === iso2);
        onChange(section, {
            ...d,
            country:      c?.name ?? iso2,
            country_code: c?.iso2 ?? iso2,
            country_id:   c?.id   ?? null,
            state_id: null, state: '',
            city_id:  null, city:  '',
        });
    };

    const errFor = (f: string) => errors?.[pfx + f] ?? e[f];

    return (
        <div className="space-y-4">

            {/* ── Customer search ── */}
            <div className="relative">
                <Label className="text-xs text-muted-foreground font-normal">
                    {t('from_calc.search_customer')}
                </Label>

                {selectedCustomer ? (
                    <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <UserCheck className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200 flex-1 truncate">
                            {selectedCustomer.name}
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedCustomer(null)}
                            className="text-green-600 hover:text-green-800 dark:hover:text-green-400 ml-1"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="relative mt-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchQuery}
                            onChange={ev => handleSearchInput(ev.target.value)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            placeholder={t('from_calc.search_placeholder')}
                            className="pl-8 text-sm"
                        />
                        {searching && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">…</span>
                        )}
                        {showDropdown && (
                            <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                {searchResults.length === 0 ? (
                                    <div className="px-3 py-2.5 text-sm text-muted-foreground">
                                        {t('from_calc.no_customers')}
                                    </div>
                                ) : (
                                    searchResults.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            onMouseDown={() => handleSelectCustomer(c)}
                                        >
                                            <div className="text-sm font-medium truncate">{c.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {c.phone}{c.email ? ` · ${c.email}` : ''}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t('from_calc.full_name')} <span className="text-red-500">*</span></Label>
                    <Input value={d.name ?? ''} onChange={ev => updateField('name', ev.target.value)}
                        className={errFor('name') ? 'border-red-400' : ''} />
                    {errFor('name') && <p className="text-red-500 text-xs">{errFor('name')}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t('from_calc.phone')} <span className="text-red-500">*</span></Label>
                    <Input value={d.phone ?? ''} onChange={ev => updateField('phone', ev.target.value)}
                        className={errFor('phone') ? 'border-red-400' : ''} />
                    {errFor('phone') && <p className="text-red-500 text-xs">{errFor('phone')}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t('from_calc.email')}</Label>
                    <Input type="email" value={d.email ?? ''} onChange={ev => updateField('email', ev.target.value)} />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t('from_calc.address')} <span className="text-red-500">*</span></Label>
                    <Input value={d.address ?? ''} onChange={ev => updateField('address', ev.target.value)}
                        className={errFor('address') ? 'border-red-400' : ''} />
                    {errFor('address') && <p className="text-red-500 text-xs">{errFor('address')}</p>}
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t('from_calc.country')} <span className="text-red-500">*</span></Label>
                    <Select value={d.country_code ?? ''} onValueChange={updateCountry}>
                        <SelectTrigger className={errFor('country_id') ? 'border-red-400' : ''}>
                            <SelectValue placeholder={t('from_calc.select_country')} />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map(c => (
                                <SelectItem key={c.id} value={c.iso2}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errFor('country_id') && <p className="text-red-500 text-xs">{errFor('country_id')}</p>}
                </div>

                {/* State */}
                {(states.length > 0 || loadingStates) && (
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t('from_calc.state')} <span className="text-red-500">*</span></Label>
                        <Select
                            value={d.state_id ? String(d.state_id) : ''}
                            onValueChange={val => {
                                const s = states.find(x => String(x.id) === val);
                                onChange(section, { ...d, state_id: s?.id ?? null, state: s?.name ?? '', city_id: null, city: '' });
                            }}
                            disabled={loadingStates}
                        >
                            <SelectTrigger className={errFor('state_id') ? 'border-red-400' : ''}>
                                <SelectValue placeholder={loadingStates ? t('from_calc.loading_states') : t('from_calc.select_state')} />
                            </SelectTrigger>
                            <SelectContent>
                                {states.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errFor('state_id') && <p className="text-red-500 text-xs">{errFor('state_id')}</p>}
                    </div>
                )}

                {/* City */}
                {(cities.length > 0 || loadingCities) && (
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t('from_calc.city')} <span className="text-red-500">*</span></Label>
                        <Select
                            value={d.city_id ? String(d.city_id) : ''}
                            onValueChange={val => {
                                const c = cities.find(x => String(x.id) === val);
                                onChange(section, { ...d, city_id: c?.id ?? null, city: c?.name ?? '' });
                            }}
                            disabled={loadingCities}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={loadingCities ? t('from_calc.loading_cities') : t('from_calc.select_city')} />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Manual city fallback when no city list */}
                {!d.state_id && !d.city_id && d.country_id && cities.length === 0 && !loadingCities && (
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t('from_calc.city')} <span className="text-red-500">*</span></Label>
                        <Input value={d.city ?? ''} onChange={ev => updateField('city', ev.target.value)}
                            className={errFor('city') ? 'border-red-400' : ''} placeholder={t('from_calc.city')} />
                        {errFor('city') && <p className="text-red-500 text-xs">{errFor('city')}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CreateFromCalculator({
    countries = [],
    session_prefill = null,
    effectiveSettings = {},
    paymentMethods = [],
}: {
    countries?: Country[];
    session_prefill?: any;
    effectiveSettings?: any;
    paymentMethods?: { id: string; label: string; enabled: boolean }[];
}) {
    const { t } = useTranslation();
    const hasLoaded = useRef(false);
    const currency   = effectiveSettings.currency       ?? 'USD';
    const weightUnit = effectiveSettings.weight_unit    ?? 'kg';
    const dimUnit    = effectiveSettings.dimension_unit ?? 'cm';

    const { data, setData, post, processing, errors } = useForm<any>({
        sender_details:   { name: '', phone: '', email: '', address: '', city: '', state: '', country: '', country_code: '', country_id: null, state_id: null, city_id: null },
        receiver_details: { name: '', phone: '', email: '', address: '', city: '', state: '', country: '', country_code: '', country_id: null, state_id: null, city_id: null },
        package_details:  { weight: 1, dimensions: { length: 10, width: 10, height: 10 }, pieces: 1, declared_value: 0, content_description: 'General cargo' },
        service_type:     '',
        rate_data:        null as any,
        payment_status:   'unpaid',
        payment_method:   paymentMethods[0]?.id ?? 'manual',
    });

    const [prefillError, setPrefillError] = useState(false);

    useEffect(() => {
        if (hasLoaded.current) return;
        hasLoaded.current = true;

        // 1. Session prefill (from public calculator → auth bridge)
        if (session_prefill) {
            const sp = session_prefill;
            const rd = sp.rate_data  ?? {};
            const ci = sp.calc_inputs ?? {};
            const originCountry = countries.find(c => String(c.id) === String(ci.origin_country_id ?? ''));
            const destCountry   = countries.find(c => String(c.id) === String(ci.dest_country_id   ?? ''));

            setData('sender_details', {
                ...data.sender_details,
                country:      originCountry?.name ?? '',
                country_code: originCountry?.iso2 ?? '',
                country_id:   originCountry?.id   ?? null,
            });
            setData('receiver_details', {
                ...data.receiver_details,
                country:      destCountry?.name ?? '',
                country_code: destCountry?.iso2 ?? '',
                country_id:   destCountry?.id   ?? null,
            });
            setData('package_details', {
                weight:     parseFloat(String(ci.weight  ?? 1)) || 1,
                dimensions: {
                    length: parseFloat(String(ci.length ?? 10)) || 10,
                    width:  parseFloat(String(ci.width  ?? 10)) || 10,
                    height: parseFloat(String(ci.height ?? 10)) || 10,
                },
                pieces:              1,
                declared_value:      parseFloat(String(ci.declared_value ?? 0)) || 0,
                content_description: 'General cargo',
            });
            setData('service_type', rd.service_type ?? '');
            setData('rate_data',    rd);
            return;
        }

        // 2. localStorage prefill (from authenticated internal calculator)
        try {
            const raw = localStorage.getItem('deprixa_calculator_prefill');
            if (raw) {
                localStorage.removeItem('deprixa_calculator_prefill');
                const cp = JSON.parse(raw);

                if (cp.sender_details) {
                    const oc = countries.find(c => c.iso2 === cp.sender_details.country_code);
                    setData('sender_details', {
                        ...data.sender_details,
                        country:      cp.sender_details.country      ?? '',
                        country_code: cp.sender_details.country_code ?? '',
                        country_id:   oc?.id ?? null,
                    });
                }
                if (cp.receiver_details) {
                    const dc = countries.find(c => c.iso2 === cp.receiver_details.country_code);
                    setData('receiver_details', {
                        ...data.receiver_details,
                        country:      cp.receiver_details.country      ?? '',
                        country_code: cp.receiver_details.country_code ?? '',
                        country_id:   dc?.id ?? null,
                    });
                }
                if (cp.package_details) {
                    setData('package_details', {
                        weight:     cp.package_details.weight ?? 1,
                        dimensions: cp.package_details.dimensions ?? { length: 10, width: 10, height: 10 },
                        pieces:     cp.package_details.pieces ?? 1,
                        declared_value:      cp.package_details.declared_value ?? 0,
                        content_description: 'General cargo',
                    });
                }
                if (cp.service_type) setData('service_type', cp.service_type);
                if (cp.rate_data)    setData('rate_data',    cp.rate_data);
                return;
            }
        } catch { localStorage.removeItem('deprixa_calculator_prefill'); }

        // No prefill found
        setPrefillError(true);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pd   = data.package_details ?? {};
        const dims = pd.dimensions ?? {};
        const flatPackage = {
            weight:              pd.weight   ?? 1,
            length:              dims.length ?? 10,
            width:               dims.width  ?? 10,
            height:              dims.height ?? 10,
            pieces:              pd.pieces   ?? 1,
            declared_value:      pd.declared_value ?? 0,
            content_description: pd.content_description || 'General cargo',
        };
        router.post(route('shipments.store'), {
            ...data,
            packages: [flatPackage],
            package_details: undefined,
        });
    };

    const rate = data.rate_data;
    const { Icon, bg } = getModeIcon(rate?.service_mode, rate?.card_name ?? rate?.carrier_name);
    const pd   = data.package_details ?? {};
    const dims = pd.dimensions ?? {};

    return (
        <AuthenticatedLayout>
            <Head title={t('from_calc.title')} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* Back link */}
                <div>
                    <Link
                        href={route('rates.calculator')}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('from_calc.back')}
                    </Link>
                </div>

                {/* No prefill warning */}
                {prefillError && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-200">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="font-medium">{t('from_calc.no_prefill')}</p>
                            <Link href={route('rates.calculator')} className="text-sm underline mt-0.5 inline-block">
                                {t('from_calc.back')}
                            </Link>
                        </div>
                    </div>
                )}

                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('from_calc.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('from_calc.subtitle')}</p>
                </div>

                {/* Selected rate summary */}
                {rate && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className={`${bg} p-3 rounded-xl shrink-0`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                                        {t('from_calc.rate_summary')}
                                    </div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                                        {rate.card_name ?? rate.service_type}
                                    </div>
                                    <div className="text-sm text-slate-500 mt-0.5">
                                        {rate.service_type}{rate.zone_name ? ` · ${rate.zone_name}` : ''}
                                    </div>
                                    {rate.estimated_days != null && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {t('from_calc.transit')}: {rate.estimated_days} {t('public_calc.days')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-3xl font-extrabold text-primary leading-none">
                                    {fmt(rate.total_price ?? rate.total ?? 0)}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">{rate.currency ?? currency}</div>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Sender + Receiver */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sender */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                </div>
                                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('from_calc.sender_title')}</h2>
                            </div>
                            <AddressForm
                                section="sender_details"
                                data={data}
                                errors={errors}
                                countries={countries}
                                onChange={(section, value) => setData(section as any, value)}
                                t={t}
                            />
                        </div>

                        {/* Receiver */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <MapPin className="w-4 h-4 text-red-500" />
                                </div>
                                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('from_calc.receiver_title')}</h2>
                            </div>
                            <AddressForm
                                section="receiver_details"
                                data={data}
                                errors={errors}
                                countries={countries}
                                onChange={(section, value) => setData(section as any, value)}
                                t={t}
                            />
                        </div>
                    </div>

                    {/* Package summary */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('from_calc.package_title')}</h2>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <span><span className="font-medium text-slate-800 dark:text-slate-200">{t('from_calc.weight_label')}:</span> {pd.weight ?? 1} {weightUnit}</span>
                            <span><span className="font-medium text-slate-800 dark:text-slate-200">{t('from_calc.dims_label')}:</span> {dims.length ?? 10}×{dims.width ?? 10}×{dims.height ?? 10} {dimUnit}</span>
                            <span><span className="font-medium text-slate-800 dark:text-slate-200">{t('from_calc.value_label')}:</span> ${pd.declared_value ?? 0}</span>
                        </div>
                    </div>

                    {/* Payment method */}
                    {paymentMethods.length > 1 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">{t('from_calc.payment_title')}</h2>
                            <RadioGroup
                                value={data.payment_method ?? 'manual'}
                                onValueChange={val => setData('payment_method', val)}
                                className="flex flex-wrap gap-4"
                            >
                                {paymentMethods.filter(m => m.enabled).map(m => (
                                    <div key={m.id} className="flex items-center gap-2">
                                        <RadioGroupItem value={m.id} id={`pm-${m.id}`} />
                                        <Label htmlFor={`pm-${m.id}`} className="cursor-pointer">{m.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    )}

                    {/* Global errors */}
                    {errors && Object.keys(errors).length > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="font-medium text-sm">Please review the errors below</span>
                            </div>
                            <ul className="text-sm text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                                {Object.entries(errors).map(([k, v]) => (
                                    <li key={k}>{String(v)}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex items-center gap-4">
                        <Button
                            type="submit"
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
                            disabled={processing || prefillError}
                        >
                            {processing ? (
                                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />{t('from_calc.creating')}</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" />{t('from_calc.confirm_btn')}</>
                            )}
                        </Button>
                        <Link href={route('rates.calculator')} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            {t('from_calc.back')}
                        </Link>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
