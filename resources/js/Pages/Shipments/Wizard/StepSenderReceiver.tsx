import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Button } from "@/Components/UI/button";
import { MapPin, Search, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { SearchableSelect, type Option } from "@/Components/UI/searchable-select";
import { CountryFlagIcon, getIso2ForPhoneCode } from '@/Components/CountryFlagIcon';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/Components/UI/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;

interface Country { id: number; name: string; iso2: string; phone_code?: string | null; }
interface StepProps {
    data: any;
    setData: (key: any, value?: any) => void;
    errors: any;
    countries?: Country[];
    step1Valid?: (d: any) => boolean;
}

export default function StepSenderReceiver({ data, setData, errors, countries = [], step1Valid }: StepProps) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const isCustomer = (auth?.roles ?? []).includes('customer');
    const [senderSearch, setSenderSearch] = useState('');
    const [receiverSearch, setReceiverSearch] = useState('');
    const [senderResults, setSenderResults] = useState<any[]>([]);
    const [receiverResults, setReceiverResults] = useState<any[]>([]);
    const [senderOpen, setSenderOpen] = useState(false);
    const [receiverOpen, setReceiverOpen] = useState(false);
    const [loadingSender, setLoadingSender] = useState(false);
    const [loadingReceiver, setLoadingReceiver] = useState(false);
    // Customer recipients (My Recipients)
    const [recipientSearch, setRecipientSearch] = useState('');
    const [recipientResults, setRecipientResults] = useState<any[]>([]);
    const [allRecipients, setAllRecipients] = useState<any[]>([]);
    const [recipientOpen, setRecipientOpen] = useState(false);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const recipientInputRef = useRef<HTMLInputElement>(null);
    const recipientBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createFor, setCreateFor] = useState<'sender' | 'receiver'>('sender');
    const [creating, setCreating] = useState(false);
    const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
    const [states, setStates] = useState<{ id: number; name: string; code: string | null }[]>([]);
    const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
    const [senderStates, setSenderStates] = useState<{ id: number; name: string; code: string | null }[]>([]);
    const [senderCities, setSenderCities] = useState<{ id: number; name: string }[]>([]);
    const [receiverStates, setReceiverStates] = useState<{ id: number; name: string; code: string | null }[]>([]);
    const [receiverCities, setReceiverCities] = useState<{ id: number; name: string }[]>([]);
    const [createForm, setCreateForm] = useState({ name: '', email: '', phoneCode: '+1', phoneNumber: '', address: '', country_id: '', state_id: '', city_id: '', document_id: '' });
    const senderInputRef = useRef<HTMLInputElement>(null);
    const receiverInputRef = useRef<HTMLInputElement>(null);
    const senderBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const receiverBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const phoneCodeOptions: Option[] = useMemo(() => {
        const seen = new Set<string>();
        return (countries || [])
            .filter(c => {
                const code = c.phone_code ? `+${String(c.phone_code).replace(/^\+/, '')}` : '';
                if (!code || seen.has(code)) return false;
                seen.add(code);
                return true;
            })
            .map(c => {
                const code = c.phone_code ? `+${String(c.phone_code).replace(/^\+/, '')}` : '+1';
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

    const updateNested = (section: 'sender_details' | 'receiver_details', field: string, value: string | number | null) => {
        setData(section, { ...data[section], [field]: value });
    };

    const updateCountry = (section: 'sender_details' | 'receiver_details', iso2: string) => {
        const c = countries.find(x => x.iso2 === iso2 || x.name === iso2);
        const updates: Record<string, any> = { country: c?.name ?? iso2, country_code: c?.iso2 ?? iso2, country_id: c?.id ?? null, state_id: null, city_id: null, state: '', city: '' };
        setData(section, { ...data[section], ...updates });
        if (section === 'sender_details' && c?.id) {
            axios.get(route('customers.locations.states'), { params: { country_id: c.id } }).then(res => setSenderStates(res.data));
            setSenderCities([]);
        } else if (section === 'receiver_details' && c?.id) {
            axios.get(route('customers.locations.states'), { params: { country_id: c.id } }).then(res => setReceiverStates(res.data));
            setReceiverCities([]);
        }
    };

    useEffect(() => {
        if (senderSearch.length < MIN_SEARCH_LENGTH) {
            setSenderResults([]);
            return;
        }
        const tid = setTimeout(() => {
            setLoadingSender(true);
            axios.get(route('api.customers.search'), { params: { q: senderSearch } })
                .then(res => setSenderResults(res.data))
                .finally(() => setLoadingSender(false));
        }, DEBOUNCE_MS);
        return () => clearTimeout(tid);
    }, [senderSearch]);

    useEffect(() => {
        if (receiverSearch.length < MIN_SEARCH_LENGTH) {
            setReceiverResults([]);
            return;
        }
        const tid = setTimeout(() => {
            setLoadingReceiver(true);
            axios.get(route('api.customers.search'), { params: { q: receiverSearch } })
                .then(res => setReceiverResults(res.data))
                .finally(() => setLoadingReceiver(false));
        }, DEBOUNCE_MS);
        return () => clearTimeout(tid);
    }, [receiverSearch]);

    useEffect(() => {
        const cid = data.sender_details?.country_id;
        if (cid) {
            axios.get(route('customers.locations.states'), { params: { country_id: cid } }).then(res => setSenderStates(res.data));
        } else {
            setSenderStates([]);
        }
    }, [data.sender_details?.country_id]);

    useEffect(() => {
        const sid = data.sender_details?.state_id;
        if (sid) {
            axios.get(route('customers.locations.cities'), { params: { state_id: sid } }).then(res => setSenderCities(res.data));
        } else {
            setSenderCities([]);
        }
    }, [data.sender_details?.state_id]);

    useEffect(() => {
        const cid = data.receiver_details?.country_id;
        if (cid) {
            axios.get(route('customers.locations.states'), { params: { country_id: cid } }).then(res => setReceiverStates(res.data));
        } else {
            setReceiverStates([]);
        }
    }, [data.receiver_details?.country_id]);

    useEffect(() => {
        const sid = data.receiver_details?.state_id;
        if (sid) {
            axios.get(route('customers.locations.cities'), { params: { state_id: sid } }).then(res => setReceiverCities(res.data));
        } else {
            setReceiverCities([]);
        }
    }, [data.receiver_details?.state_id]);

    const applyCustomer = (section: 'sender_details' | 'receiver_details', customer: any) => {
        const details = section === 'sender_details' ? customer.sender_details : customer.receiver_details;
        if (details) {
            setData(section, details);
            setData(section === 'sender_details' ? 'sender_customer_id' : 'receiver_customer_id', customer.id);
        }
        setSenderOpen(false);
        setReceiverOpen(false);
        setSenderResults([]);
        setReceiverResults([]);
        setSenderSearch('');
        setReceiverSearch('');
    };

    // Load all customer recipients on mount (for customer role only)
    useEffect(() => {
        if (!isCustomer) return;
        setLoadingRecipients(true);
        axios.get(route('my-contacts.api'))
            .then(res => setAllRecipients(res.data || []))
            .finally(() => setLoadingRecipients(false));
    }, [isCustomer]);

    // Filter recipients by search term
    useEffect(() => {
        if (!recipientSearch.trim()) {
            setRecipientResults([]);
            return;
        }
        const q = recipientSearch.toLowerCase();
        setRecipientResults(
            allRecipients.filter(c =>
                c.name?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                c.city?.toLowerCase().includes(q) ||
                c.country?.toLowerCase().includes(q)
            ).slice(0, 8)
        );
    }, [recipientSearch, allRecipients]);

    const applyRecipient = async (contact: any) => {
        setRecipientSearch('');
        setRecipientResults([]);
        setRecipientOpen(false);

        // Resolve country from text if IDs are missing (contacts saved without IDs)
        let countryCode  = contact.country_code ?? '';
        let countryId    = contact.country_id   ?? null;
        let stateId      = contact.state_id     ?? null;
        let cityId       = contact.city_id      ?? null;

        if (!countryCode && !countryId && contact.country) {
            const found = countries.find(c => c.name.toLowerCase() === contact.country.toLowerCase());
            if (found) { countryCode = found.iso2; countryId = found.id; }
        } else if (countryId && !countryCode) {
            const found = countries.find(c => c.id === countryId);
            if (found) countryCode = found.iso2;
        }

        // Set immediately so text fields appear right away
        const base = {
            name:          contact.name          ?? '',
            phone:         contact.phone         ?? '',
            email:         contact.email         ?? '',
            address:       contact.address       ?? '',
            address_line2: contact.address_line2 ?? '',
            city:          contact.city          ?? '',
            state:         contact.state         ?? '',
            country:       contact.country       ?? '',
            country_code:  countryCode,
            country_id:    countryId,
            state_id:      null as number | null,
            city_id:       null as number | null,
            zip_code:      contact.zip_code      ?? '',
        };
        setData('receiver_details', { ...base });

        if (!countryId) return;

        // Load states and resolve state_id by text if needed
        const statesRes = await axios.get(route('customers.locations.states'), { params: { country_id: countryId } });
        const loadedStates = statesRes.data as { id: number; name: string; code: string | null }[];
        setReceiverStates(loadedStates);

        if (!stateId && contact.state) {
            const found = loadedStates.find(s => s.name.toLowerCase() === contact.state.toLowerCase());
            if (found) stateId = found.id;
        }
        if (!stateId) return;

        setData('receiver_details', { ...base, state_id: stateId });

        // Load cities and resolve city_id by text if needed
        const citiesRes = await axios.get(route('customers.locations.cities'), { params: { state_id: stateId } });
        const loadedCities = citiesRes.data as { id: number; name: string }[];
        setReceiverCities(loadedCities);

        if (!cityId && contact.city) {
            const found = loadedCities.find(c => c.name.toLowerCase() === contact.city.toLowerCase());
            if (found) cityId = found.id;
        }
        if (!cityId) return;

        setData('receiver_details', { ...base, state_id: stateId, city_id: cityId });
    };

    const openCreateModal = (forWho: 'sender' | 'receiver') => {
        setCreateFor(forWho);
        setCreateForm({ name: '', email: '', phoneCode: '+1', phoneNumber: '', address: '', country_id: '', state_id: '', city_id: '', document_id: '' });
        setCreateFormErrors({});
        setStates([]);
        setCities([]);
        setCreateModalOpen(true);
    };

    const loadStates = (countryId: number) => {
        axios.get(route('customers.locations.states'), { params: { country_id: countryId } })
            .then(res => setStates(res.data));
        setCities([]);
    };
    const loadCities = (stateId: number) => {
        axios.get(route('customers.locations.cities'), { params: { state_id: stateId } })
            .then(res => setCities(res.data));
    };

    const submitQuickCreate = async () => {
        const f = createForm;
        const fullPhone = `${f.phoneCode || ''}${(f.phoneNumber || '').replace(/\s/g, '')}`;
        const errs: Record<string, string> = {};
        if (!f.name?.trim()) errs.name = t('shipments.wizard.validation.name_required');
        if (!fullPhone.trim()) errs.phone = t('shipments.wizard.validation.phone_required');
        if (!isCustomer && !f.email?.trim()) errs.email = t('shipments.wizard.validation.email_required');
        else if (f.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = t('shipments.wizard.validation.email_invalid');
        if (!f.address?.trim()) errs.address = t('shipments.wizard.validation.address_required');
        if (!f.country_id) errs.country_id = t('shipments.wizard.validation.country_required');
        if (!isCustomer && !f.state_id) errs.state_id = t('shipments.wizard.validation.state_required');
        if (!isCustomer && !f.city_id) errs.city_id = t('shipments.wizard.validation.city_required');
        setCreateFormErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setCreating(true);
        try {
            if (isCustomer) {
                // Customers save to their own contacts (My Recipients)
                const country = countries.find(c => String(c.id) === String(f.country_id));
                const stateObj = states.find(s => String(s.id) === String(f.state_id));
                const cityObj  = cities.find(c => String(c.id) === String(f.city_id));
                const res = await axios.post(route('my-contacts.api.store'), {
                    name:         f.name,
                    email:        f.email || undefined,
                    phone:        fullPhone,
                    address:      f.address,
                    city:         cityObj?.name  ?? '',
                    state:        stateObj?.name ?? '',
                    country:      country?.name  ?? '',
                    country_code: country?.iso2  ?? '',
                    country_id:   f.country_id ? Number(f.country_id) : undefined,
                    state_id:     f.state_id   ? Number(f.state_id)   : undefined,
                    city_id:      f.city_id    ? Number(f.city_id)    : undefined,
                    document_id:  f.document_id || undefined,
                });
                const contact = res.data;
                setAllRecipients(prev => [...prev, contact]);
                applyRecipient(contact);
                setCreateModalOpen(false);
            } else {
            const res = await axios.post(route('api.customers.quick-create'), {
                name: f.name,
                email: f.email,
                phone: fullPhone,
                address: f.address,
                country_id: Number(f.country_id),
                state_id: Number(f.state_id),
                city_id: Number(f.city_id),
                document_id: f.document_id || undefined,
            });
            const details = createFor === 'sender' ? res.data.sender_details : res.data.receiver_details;
            setData(createFor === 'sender' ? 'sender_details' : 'receiver_details', details);
            setData(createFor === 'sender' ? 'sender_customer_id' : 'receiver_customer_id', res.data.id);
            setCreateModalOpen(false);
            }
        } catch (e: any) {
            const d = e.response?.data;
            if (d?.errors) {
                const errs: Record<string, string> = {};
                for (const [k, v] of Object.entries(d.errors)) {
                    errs[k] = Array.isArray(v) ? (v[0] || '') : String(v);
                }
                setCreateFormErrors(errs);
            } else if (d?.message) {
                setCreateFormErrors({ form: d.message });
            }
        } finally {
            setCreating(false);
        }
    };

    const senderValid = step1Valid ? step1Valid(data.sender_details) : true;
    const receiverValid = step1Valid ? step1Valid(data.receiver_details) : true;

    const sameCustomer =
        data.sender_customer_id != null &&
        data.receiver_customer_id != null &&
        data.sender_customer_id === data.receiver_customer_id;

    return (
        <div className="space-y-4">
        {sameCustomer && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t('shipments.wizard.validation.same_customer_origin_dest')}
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Sender */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{t('shipments.wizard.origin')}</h3>
                    </div>
                    {isCustomer ? (
                        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                            {t('shipments.wizard.your_address')}
                        </span>
                    ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => openCreateModal('sender')}>
                            <UserPlus className="h-4 w-4 mr-1" /> {t('shipments.wizard.create_customer')}
                        </Button>
                    )}
                </div>
                {!isCustomer && (
                <div className="space-y-2">
                    <Label>{t('shipments.wizard.search_customer')}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                            ref={senderInputRef}
                            value={senderSearch}
                            onChange={e => setSenderSearch(e.target.value)}
                            onFocus={() => {
                                if (senderBlurTimerRef.current) clearTimeout(senderBlurTimerRef.current);
                                setSenderOpen(true);
                            }}
                            onBlur={() => {
                                senderBlurTimerRef.current = setTimeout(() => setSenderOpen(false), 200);
                            }}
                            placeholder={t('shipments.wizard.search_placeholder')}
                            className="pl-9"
                            autoComplete="off"
                        />
                        {loadingSender && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                        {senderOpen && (
                            <ul className="absolute z-20 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto" onMouseDown={e => e.preventDefault()}>
                                {loadingSender ? (
                                    <li className="px-3 py-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}</li>
                                ) : senderSearch.length < MIN_SEARCH_LENGTH ? (
                                    <li className="px-3 py-3 text-gray-500 text-sm">{t('shipments.wizard.type_to_search')}</li>
                                ) : senderResults.length === 0 ? (
                                    <li className="px-3 py-3 text-gray-500 text-sm">{t('shipments.wizard.no_customers_found')}</li>
                                ) : (
                                    senderResults.map(c => (
                                        <li key={c.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-0" onMouseDown={() => applyCustomer('sender_details', c)}>
                                            <span className="font-medium">{c.name}</span>
                                            <span className="text-gray-500 text-sm block">{c.email} · {c.phone}</span>
                                            {(c.country || c.city) && (
                                                <span className="text-gray-400 text-xs block">{[c.city, c.country].filter(Boolean).join(', ')}</span>
                                            )}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('forms.name')} *</Label>
                        <Input value={data.sender_details?.name ?? ''} onChange={e => updateNested('sender_details', 'name', e.target.value)} placeholder={t('forms.name')} disabled={isCustomer} className={`${isCustomer ? 'bg-gray-50 cursor-not-allowed' : ''} ${!senderValid && !data.sender_details?.name ? 'border-red-500' : ''}`} />
                        {errors['sender_details.name'] && <p className="text-red-500 text-xs">{errors['sender_details.name']}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('forms.phone')} *</Label>
                        <Input value={data.sender_details?.phone ?? ''} onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); updateNested('sender_details', 'phone', v); }} placeholder="+15550123456" inputMode="numeric" pattern="[0-9+]*" disabled={isCustomer} className={`${isCustomer ? 'bg-gray-50 cursor-not-allowed' : ''} ${!senderValid && !data.sender_details?.phone ? 'border-red-500' : ''}`} />
                        {errors['sender_details.phone'] && <p className="text-red-500 text-xs">{errors['sender_details.phone']}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>{t('forms.address')} *</Label>
                    <Input value={data.sender_details?.address ?? ''} onChange={e => updateNested('sender_details', 'address', e.target.value)} placeholder={t('forms.address')} disabled={isCustomer} className={`${isCustomer ? 'bg-gray-50 cursor-not-allowed' : ''} ${!senderValid && !data.sender_details?.address ? 'border-red-500' : ''}`} />
                    {errors['sender_details.address'] && <p className="text-red-500 text-xs">{errors['sender_details.address']}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('forms.country')} *</Label>
                        <Select
                            value={data.sender_details?.country_code || data.sender_details?.country || ''}
                            onValueChange={v => updateCountry('sender_details', v)}
                            disabled={isCustomer}
                        >
                            <SelectTrigger className={`${isCustomer ? 'bg-gray-50 cursor-not-allowed' : ''} ${!senderValid && !data.sender_details?.country_code && !data.sender_details?.country ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder={t('forms.country')} />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c.id} value={c.iso2}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {errors['sender_details.country'] && <p className="text-red-500 text-xs">{errors['sender_details.country']}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('forms.state')} *</Label>
                        <Select
                            value={data.sender_details?.state_id ? String(data.sender_details.state_id) : ''}
                            onValueChange={v => {
                                const sid = Number(v);
                                updateNested('sender_details', 'state_id', sid);
                                updateNested('sender_details', 'city_id', null);
                                axios.get(route('customers.locations.cities'), { params: { state_id: sid } }).then(res => setSenderCities(res.data));
                            }}
                            disabled={isCustomer}
                        >
                            <SelectTrigger className={`${isCustomer ? 'bg-gray-50 cursor-not-allowed' : ''} ${!senderValid && !data.sender_details?.state_id && !data.sender_details?.state ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder={
                                    data.sender_details?.state_id && senderStates.length === 0
                                        ? (data.sender_details?.state || t('forms.state'))
                                        : (data.sender_details?.state || t('forms.state'))
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {senderStates.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {!isCustomer && !data.sender_details?.country_id && <p className="text-gray-400 text-xs">{t('shipments.wizard.select_country_first')}</p>}
                        {!isCustomer && data.sender_details?.state && !data.sender_details?.state_id && (
                            <Input value={data.sender_details.state} onChange={e => updateNested('sender_details', 'state', e.target.value)} placeholder={t('forms.state')} className="mt-1" />
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>{t('forms.city')} *</Label>
                    {isCustomer ? (
                        <Input value={data.sender_details?.city ?? ''} disabled className="bg-gray-50 cursor-not-allowed" />
                    ) : (
                    <Select
                        value={data.sender_details?.city_id ? String(data.sender_details.city_id) : ''}
                        onValueChange={v => {
                            const cid = Number(v);
                            const city = senderCities.find(x => x.id === cid);
                            updateNested('sender_details', 'city_id', cid);
                            if (city) updateNested('sender_details', 'city', city.name);
                        }}
                    >
                        <SelectTrigger className={!senderValid && !data.sender_details?.city_id && !data.sender_details?.city ? 'border-red-500' : ''}>
                            <SelectValue placeholder={
                                data.sender_details?.city_id && senderCities.length === 0
                                    ? (data.sender_details?.city || t('forms.city'))
                                    : t('forms.city')
                            } />
                        </SelectTrigger>
                        <SelectContent>
                            {senderCities.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                    {!isCustomer && senderCities.length === 0 && data.sender_details?.state_id && <p className="text-gray-400 text-xs">{t('shipments.wizard.loading_cities')}</p>}
                    {!isCustomer && data.sender_details?.city && !data.sender_details?.city_id && (
                        <Input value={data.sender_details.city} onChange={e => updateNested('sender_details', 'city', e.target.value)} placeholder={t('forms.city')} className="mt-1" />
                    )}
                </div>
            </div>

            {/* Receiver */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{t('shipments.wizard.destination')}</h3>
                    </div>
                    {isCustomer ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => openCreateModal('receiver')}>
                            <UserPlus className="h-4 w-4 mr-1" /> {t('shipments.wizard.add_recipient') || 'Add Recipient'}
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => openCreateModal('receiver')}>
                            <UserPlus className="h-4 w-4 mr-1" /> {t('shipments.wizard.create_customer')}
                        </Button>
                    )}
                </div>
                {isCustomer && (
                <div className="space-y-2">
                    <Label>{t('shipments.wizard.search_recipient') || 'Search My Recipients'}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                            ref={recipientInputRef}
                            value={recipientSearch}
                            onChange={e => setRecipientSearch(e.target.value)}
                            onFocus={() => {
                                if (recipientBlurTimerRef.current) clearTimeout(recipientBlurTimerRef.current);
                                setRecipientOpen(true);
                            }}
                            onBlur={() => {
                                recipientBlurTimerRef.current = setTimeout(() => setRecipientOpen(false), 200);
                            }}
                            placeholder={t('shipments.wizard.search_placeholder')}
                            className="pl-9"
                            autoComplete="off"
                        />
                        {loadingRecipients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                        {recipientOpen && (
                            <ul className="absolute z-20 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto" onMouseDown={e => e.preventDefault()}>
                                {loadingRecipients ? (
                                    <li className="px-3 py-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}</li>
                                ) : !recipientSearch.trim() ? (
                                    allRecipients.length === 0
                                        ? <li className="px-3 py-3 text-gray-500 text-sm">{t('shipments.wizard.no_recipients') || 'No saved recipients yet. Add one!'}</li>
                                        : allRecipients.slice(0, 8).map(c => (
                                            <li key={c.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-0" onMouseDown={() => applyRecipient(c)}>
                                                <span className="font-medium">{c.name}</span>
                                                <span className="text-gray-500 text-sm block">{c.phone}</span>
                                                {(c.country || c.city) && <span className="text-gray-400 text-xs block">{[c.city, c.country].filter(Boolean).join(', ')}</span>}
                                            </li>
                                        ))
                                ) : recipientResults.length === 0 ? (
                                    <li className="px-3 py-3 text-gray-500 text-sm">{t('shipments.wizard.no_customers_found')}</li>
                                ) : (
                                    recipientResults.map(c => (
                                        <li key={c.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-0" onMouseDown={() => applyRecipient(c)}>
                                            <span className="font-medium">{c.name}</span>
                                            <span className="text-gray-500 text-sm block">{c.phone}</span>
                                            {(c.country || c.city) && <span className="text-gray-400 text-xs block">{[c.city, c.country].filter(Boolean).join(', ')}</span>}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </div>
                )}
                {!isCustomer && (
                <div className="space-y-2">
                    <Label>{t('shipments.wizard.search_customer')}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                            ref={receiverInputRef}
                            value={receiverSearch}
                            onChange={e => setReceiverSearch(e.target.value)}
                            onFocus={() => {
                                if (receiverBlurTimerRef.current) clearTimeout(receiverBlurTimerRef.current);
                                setReceiverOpen(true);
                            }}
                            onBlur={() => {
                                receiverBlurTimerRef.current = setTimeout(() => setReceiverOpen(false), 200);
                            }}
                            placeholder={t('shipments.wizard.search_placeholder')}
                            className="pl-9"
                            autoComplete="off"
                        />
                        {loadingReceiver && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                        {receiverOpen && (
                            <ul className="absolute z-20 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto" onMouseDown={e => e.preventDefault()}>
                                {loadingReceiver ? (
                                    <li className="px-3 py-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}</li>
                                ) : receiverSearch.length < MIN_SEARCH_LENGTH ? (
                                    <li className="px-3 py-3 text-gray-500 text-sm">{t('shipments.wizard.type_to_search')}</li>
                                ) : receiverResults.length === 0 ? (
                                    <li className="px-3 py-3 text-gray-500 text-sm">{t('shipments.wizard.no_customers_found')}</li>
                                ) : (
                                    receiverResults.map(c => (
                                        <li key={c.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-0" onMouseDown={() => applyCustomer('receiver_details', c)}>
                                            <span className="font-medium">{c.name}</span>
                                            <span className="text-gray-500 text-sm block">{c.email} · {c.phone}</span>
                                            {(c.country || c.city) && (
                                                <span className="text-gray-400 text-xs block">{[c.city, c.country].filter(Boolean).join(', ')}</span>
                                            )}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('forms.name')} *</Label>
                        <Input value={data.receiver_details?.name ?? ''} onChange={e => updateNested('receiver_details', 'name', e.target.value)} placeholder={t('forms.name')} className={!receiverValid && !data.receiver_details?.name ? 'border-red-500' : ''} />
                        {errors['receiver_details.name'] && <p className="text-red-500 text-xs">{errors['receiver_details.name']}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('forms.phone')} *</Label>
                        <Input value={data.receiver_details?.phone ?? ''} onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); updateNested('receiver_details', 'phone', v); }} placeholder="+15550123456" inputMode="numeric" pattern="[0-9+]*" className={!receiverValid && !data.receiver_details?.phone ? 'border-red-500' : ''} />
                        {errors['receiver_details.phone'] && <p className="text-red-500 text-xs">{errors['receiver_details.phone']}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>{t('forms.address')} *</Label>
                    <Input value={data.receiver_details?.address ?? ''} onChange={e => updateNested('receiver_details', 'address', e.target.value)} placeholder={t('forms.address')} className={!receiverValid && !data.receiver_details?.address ? 'border-red-500' : ''} />
                    {errors['receiver_details.address'] && <p className="text-red-500 text-xs">{errors['receiver_details.address']}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('forms.country')} *</Label>
                        <Select
                            value={data.receiver_details?.country_code || data.receiver_details?.country || ''}
                            onValueChange={v => updateCountry('receiver_details', v)}
                        >
                            <SelectTrigger className={!receiverValid && !data.receiver_details?.country_code && !data.receiver_details?.country ? 'border-red-500' : ''}>
                                <SelectValue placeholder={t('forms.country')} />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c.id} value={c.iso2}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('forms.state')} *</Label>
                        <Select
                            value={data.receiver_details?.state_id ? String(data.receiver_details.state_id) : ''}
                            onValueChange={v => {
                                const sid = Number(v);
                                updateNested('receiver_details', 'state_id', sid);
                                updateNested('receiver_details', 'city_id', null);
                                axios.get(route('customers.locations.cities'), { params: { state_id: sid } }).then(res => setReceiverCities(res.data));
                            }}
                        >
                            <SelectTrigger className={!receiverValid && !data.receiver_details?.state_id && !data.receiver_details?.state ? 'border-red-500' : ''}>
                                <SelectValue placeholder={t('forms.state')} />
                            </SelectTrigger>
                            <SelectContent>
                                {receiverStates.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {!data.receiver_details?.country_id && <p className="text-gray-400 text-xs">{t('shipments.wizard.select_country_first')}</p>}
                        {data.receiver_details?.state && !data.receiver_details?.state_id && (
                            <Input value={data.receiver_details.state} onChange={e => updateNested('receiver_details', 'state', e.target.value)} placeholder={t('forms.state')} className="mt-1" />
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>{t('forms.city')} *</Label>
                    <Select
                        value={data.receiver_details?.city_id ? String(data.receiver_details.city_id) : ''}
                        onValueChange={v => {
                            const cid = Number(v);
                            const city = receiverCities.find(x => x.id === cid);
                            updateNested('receiver_details', 'city_id', cid);
                            if (city) updateNested('receiver_details', 'city', city.name);
                        }}
                    >
                        <SelectTrigger className={!receiverValid && !data.receiver_details?.city_id && !data.receiver_details?.city ? 'border-red-500' : ''}>
                            <SelectValue placeholder={t('forms.city')} />
                        </SelectTrigger>
                        <SelectContent>
                            {receiverCities.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {receiverCities.length === 0 && data.receiver_details?.state_id && <p className="text-gray-400 text-xs">{t('shipments.wizard.loading_cities')}</p>}
                    {data.receiver_details?.city && !data.receiver_details?.city_id && (
                        <Input value={data.receiver_details.city} onChange={e => updateNested('receiver_details', 'city', e.target.value)} placeholder={t('forms.city')} className="mt-1" />
                    )}
                </div>
            </div>

            {/* Quick Create Customer Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isCustomer ? (t('shipments.wizard.add_recipient') || 'Add Recipient') : t('shipments.wizard.create_customer')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {createFormErrors.form && <p className="text-red-500 text-sm">{createFormErrors.form}</p>}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 space-y-2">
                                <Label>{t('forms.name')} *</Label>
                                <Input value={createForm.name} onChange={e => { setCreateForm(f => ({ ...f, name: e.target.value })); setCreateFormErrors(prev => ({ ...prev, name: '' })); }} className={createFormErrors.name ? 'border-red-500' : ''} />
                                {createFormErrors.name && <p className="text-red-500 text-xs">{createFormErrors.name}</p>}
                            </div>
                            <div className="col-span-4 space-y-2">
                                <Label>{t('customers.phone_code_placeholder')} *</Label>
                                <SearchableSelect
                                    options={phoneCodeOptions.length ? phoneCodeOptions : [
                                        { value: '+1', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="US" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+1</span></span> },
                                        { value: '+57', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="CO" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+57</span></span> },
                                        { value: '+52', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="MX" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+52</span></span> },
                                        { value: '+34', label: <span className="inline-flex items-center gap-1.5"><CountryFlagIcon iso2="ES" className="h-4 w-5 shrink-0 rounded object-cover" /><span>+34</span></span> },
                                    ]}
                                    value={createForm.phoneCode || '+1'}
                                    onChange={(v) => { setCreateForm(f => ({ ...f, phoneCode: v })); setCreateFormErrors(prev => ({ ...prev, phone: '' })); }}
                                    placeholder={t('customers.phone_code_placeholder')}
                                    searchPlaceholder={t('common.search')}
                                    className={createFormErrors.phone ? 'border-red-500' : ''}
                                />
                            </div>
                            <div className="col-span-8 space-y-2">
                                <Label>{t('forms.phone')} *</Label>
                                <Input
                                    value={createForm.phoneNumber}
                                    onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCreateForm(f => ({ ...f, phoneNumber: v })); setCreateFormErrors(prev => ({ ...prev, phone: '' })); }}
                                    placeholder="5550123456"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={createFormErrors.phone ? 'border-red-500' : ''}
                                />
                                {createFormErrors.phone && <p className="text-red-500 text-xs">{createFormErrors.phone}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('forms.email')} *</Label>
                            <Input type="email" value={createForm.email} onChange={e => { setCreateForm(f => ({ ...f, email: e.target.value })); setCreateFormErrors(prev => ({ ...prev, email: '' })); }} className={createFormErrors.email ? 'border-red-500' : ''} />
                            {createFormErrors.email && <p className="text-red-500 text-xs">{createFormErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('forms.address')} *</Label>
                            <Input value={createForm.address} onChange={e => { setCreateForm(f => ({ ...f, address: e.target.value })); setCreateFormErrors(prev => ({ ...prev, address: '' })); }} className={createFormErrors.address ? 'border-red-500' : ''} />
                            {createFormErrors.address && <p className="text-red-500 text-xs">{createFormErrors.address}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('forms.country')} *</Label>
                            <Select value={createForm.country_id} onValueChange={v => { setCreateForm(f => ({ ...f, country_id: v, state_id: '', city_id: '' })); loadStates(Number(v)); setCreateFormErrors(prev => ({ ...prev, country_id: '' })); }}>
                                <SelectTrigger className={createFormErrors.country_id ? 'border-red-500' : ''}><SelectValue placeholder={t('forms.country')} /></SelectTrigger>
                                <SelectContent>
                                    {countries.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {createFormErrors.country_id && <p className="text-red-500 text-xs">{createFormErrors.country_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('forms.state')} *</Label>
                            <Select value={createForm.state_id} onValueChange={v => { setCreateForm(f => ({ ...f, state_id: v, city_id: '' })); loadCities(Number(v)); setCreateFormErrors(prev => ({ ...prev, state_id: '' })); }}>
                                <SelectTrigger className={createFormErrors.state_id ? 'border-red-500' : ''}><SelectValue placeholder={t('forms.state')} /></SelectTrigger>
                                <SelectContent>
                                    {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {createFormErrors.state_id && <p className="text-red-500 text-xs">{createFormErrors.state_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('forms.city')} *</Label>
                            <Select value={createForm.city_id} onValueChange={v => { setCreateForm(f => ({ ...f, city_id: v })); setCreateFormErrors(prev => ({ ...prev, city_id: '' })); }}>
                                <SelectTrigger className={createFormErrors.city_id ? 'border-red-500' : ''}><SelectValue placeholder={t('forms.city')} /></SelectTrigger>
                                <SelectContent>
                                    {cities.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {createFormErrors.city_id && <p className="text-red-500 text-xs">{createFormErrors.city_id}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={submitQuickCreate} disabled={creating}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </div>
    );
}
