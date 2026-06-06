import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Pencil, Trash2, User, X, Save, Users } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { PaginationBar } from '@/ui/kit/PaginationBar';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { SearchableSelect, type Option } from '@/Components/UI/searchable-select';
import axios from 'axios';

interface Contact {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;
    document_id: string | null;
    notes: string | null;
}

interface CountryOption { id: number; name: string; iso2: string; phone_code: string | null }
interface StateOption  { id: number; name: string; code: string | null }
interface CityOption   { id: number; name: string }

interface PaginatedContacts {
    data: Contact[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    contacts:  PaginatedContacts;
    countries: CountryOption[];
}

const emptyForm = {
    name: '', email: '', phone: '', address: '', address_line2: '',
    city: '', state: '', country: '', zip_code: '', document_id: '', notes: '',
};

export default function Contacts({ contacts, countries }: Props) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Cascading location state
    const [states, setStates]           = useState<StateOption[]>([]);
    const [cities, setCities]           = useState<CityOption[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
    const [selectedStateId, setSelectedStateId]     = useState<number | null>(null);
    const prevCountryIdRef = useRef<number | null>(null);
    const prevStateIdRef   = useRef<number | null>(null);

    const [data, setDataState] = useState({ ...emptyForm });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function setData(field: string, value: string) {
        setDataState(prev => ({ ...prev, [field]: value }));
    }

    function reset() {
        setDataState({ ...emptyForm });
        setErrors({});
    }

    // Country → states cascade
    useEffect(() => {
        if (!selectedCountryId) {
            setStates([]); setCities([]);
            setSelectedStateId(null);
            prevCountryIdRef.current = null;
            prevStateIdRef.current = null;
            return;
        }
        const id = selectedCountryId;
        if (prevCountryIdRef.current !== null && prevCountryIdRef.current !== id) {
            setSelectedStateId(null);
            setCities([]);
            setData('state', '');
            setData('city', '');
            prevStateIdRef.current = null;
        }
        prevCountryIdRef.current = id;
        setLoadingStates(true);
        axios.get(route('customers.locations.states'), { params: { country_id: id } })
            .then(res => { if (prevCountryIdRef.current === id) setStates(res.data); })
            .catch(() => { if (prevCountryIdRef.current === id) setStates([]); })
            .finally(() => { if (prevCountryIdRef.current === id) setLoadingStates(false); });
    }, [selectedCountryId]);

    // State → cities cascade
    useEffect(() => {
        if (!selectedStateId) { setCities([]); setData('city', ''); return; }
        const id = selectedStateId;
        if (prevStateIdRef.current !== null && prevStateIdRef.current !== id) {
            setData('city', '');
        }
        prevStateIdRef.current = id;
        setLoadingCities(true);
        axios.get(route('customers.locations.cities'), { params: { state_id: id } })
            .then(res => { if (prevStateIdRef.current === id) setCities(res.data); })
            .catch(() => { if (prevStateIdRef.current === id) setCities([]); })
            .finally(() => { if (prevStateIdRef.current === id) setLoadingCities(false); });
    }, [selectedStateId]);

    const countryOptions: Option[] = useMemo(() =>
        countries.map(c => ({ value: String(c.id), label: c.name, keywords: [c.name, c.iso2].filter(Boolean) })),
        [countries]
    );
    const stateOptions: Option[]  = useMemo(() =>
        states.map(s => ({ value: String(s.id), label: s.name })), [states]);
    const cityOptions: Option[]   = useMemo(() =>
        cities.map(c => ({ value: String(c.id), label: c.name })), [cities]);

    function openCreate() {
        reset();
        setEditingId(null);
        setSelectedCountryId(null);
        setSelectedStateId(null);
        setStates([]); setCities([]);
        setShowForm(true);
    }

    function openEdit(c: Contact) {
        setDataState({
            name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '',
            address: c.address ?? '', address_line2: c.address_line2 ?? '',
            city: c.city ?? '', state: c.state ?? '', country: c.country ?? '',
            zip_code: c.zip_code ?? '', document_id: c.document_id ?? '', notes: c.notes ?? '',
        });
        // find country by name to pre-load states
        const found = countries.find(co => co.name === c.country || co.iso2 === c.country);
        setSelectedCountryId(found?.id ?? null);
        setSelectedStateId(null);
        setEditingId(c.id);
        setShowForm(true);
    }

    function handleCountryChange(val: string) {
        const id = val ? Number(val) : null;
        const country = countries.find(c => c.id === id);
        setData('country', country?.name ?? '');
        setData('state', '');
        setData('city', '');
        setSelectedCountryId(id);
        setSelectedStateId(null);
    }

    function handleStateChange(val: string) {
        const id = val ? Number(val) : null;
        const state = states.find(s => s.id === id);
        setData('state', state?.name ?? '');
        setData('city', '');
        setSelectedStateId(id);
    }

    function handleCityChange(val: string) {
        const id = val ? Number(val) : null;
        const city = cities.find(c => c.id === id);
        setData('city', city?.name ?? '');
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrors({});
        setProcessing(true);
        try {
            if (editingId) {
                await axios.put(route('my-contacts.update', editingId), data);
            } else {
                await axios.post(route('my-contacts.store'), data);
            }
            setShowForm(false);
            reset();
            setEditingId(null);
            setSelectedCountryId(null);
            setSelectedStateId(null);
            router.reload({ only: ['contacts'] });
            alert.toast(t(editingId ? 'contacts.updated' : 'contacts.saved'), 'success');
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setErrors(mapped);
            } else {
                await alert.error(t('common.error_title'), t('common.error_server'));
            }
        } finally {
            setProcessing(false);
        }
    }

    async function deleteContact(id: number) {
        const ok = await alert.confirm(
            t('contacts.delete_title'),
            t('contacts.delete_confirm'),
            t('common.yes_delete'),
        );
        if (!ok) return;

        try {
            await axios.delete(route('my-contacts.destroy', id));
            router.reload({ only: ['contacts'] });
        } catch (err: any) {
            const data = err?.response?.data;
            if (err?.response?.status === 422 && data?.blocked) {
                const reason = data.reason as string;
                const count  = data.count as number;
                const bodyKey = reason === 'pending_shipments'
                    ? 'contacts.blocked_shipments'
                    : 'contacts.blocked_pre_alerts';
                await alert.error(
                    t('contacts.blocked_title'),
                    t(bodyKey, { count }),
                );
            } else {
                await alert.error(t('common.error_title'), t('common.error_server'));
            }
        }
    }

    const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 text-gray-700";
    const err = (field: string) => errors[field]
        ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
        : null;

    return (
        <AuthenticatedLayout>
            <Head title={t('contacts.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('contacts.title')}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{t('contacts.subtitle')}</p>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('contacts.add')}
                    </Button>
                </div>

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-gray-800">
                                {editingId ? t('contacts.edit') : t('contacts.new')}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            {/* Row 1: Name + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('forms.name')} <span className="text-red-500">*</span></Label>
                                    <Input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} />
                                    {err('name')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('forms.email')}</Label>
                                    <Input className={inputCls} type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                    {err('email')}
                                </div>
                            </div>

                            {/* Row 2: Phone + Document */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('forms.phone')} <span className="text-red-500">*</span></Label>
                                    <Input className={inputCls} value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+1 555 000 0000" />
                                    {err('phone')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('customers.document_id')}</Label>
                                    <Input className={inputCls} value={data.document_id} onChange={e => setData('document_id', e.target.value)} />
                                </div>
                            </div>

                            {/* Row 3: Address line 1 */}
                            <div className="space-y-1.5">
                                <Label>{t('forms.address')} <span className="text-red-500">*</span></Label>
                                <Input className={inputCls} value={data.address} onChange={e => setData('address', e.target.value)} placeholder={t('contacts.address_placeholder')} />
                                {err('address')}
                            </div>

                            {/* Row 4: Address line 2 */}
                            <div className="space-y-1.5">
                                <Label>{t('contacts.address_line2')}</Label>
                                <Input className={inputCls} value={data.address_line2} onChange={e => setData('address_line2', e.target.value)} placeholder={t('contacts.address_line2_placeholder')} />
                            </div>

                            {/* Row 5: Country + State */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('customers.country')} <span className="text-red-500">*</span></Label>
                                    <SearchableSelect
                                        options={countryOptions}
                                        value={selectedCountryId ? String(selectedCountryId) : ''}
                                        onChange={handleCountryChange}
                                        placeholder={t('contacts.select_country')}
                                    />
                                    {err('country')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('customers.state')}</Label>
                                    <SearchableSelect
                                        options={stateOptions}
                                        value={selectedStateId ? String(selectedStateId) : ''}
                                        onChange={handleStateChange}
                                        placeholder={loadingStates ? t('common.loading') : (states.length === 0 ? t('contacts.select_country_first') : t('contacts.select_state'))}
                                        disabled={!selectedCountryId || loadingStates}
                                    />
                                    {err('state')}
                                </div>
                            </div>

                            {/* Row 6: City + Zip */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('customers.city')} <span className="text-red-500">*</span></Label>
                                    {cities.length > 0 ? (
                                        <SearchableSelect
                                            options={cityOptions}
                                            value={cities.find(c => c.name === data.city) ? String(cities.find(c => c.name === data.city)!.id) : ''}
                                            onChange={handleCityChange}
                                            placeholder={loadingCities ? t('common.loading') : t('contacts.select_city')}
                                            disabled={loadingCities}
                                        />
                                    ) : (
                                        <Input
                                            className={inputCls}
                                            value={data.city}
                                            onChange={e => setData('city', e.target.value)}
                                            placeholder={t('contacts.city_placeholder')}
                                        />
                                    )}
                                    {err('city')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('customers.zip_code')}</Label>
                                    <Input className={inputCls} value={data.zip_code} onChange={e => setData('zip_code', e.target.value)} placeholder="00000" />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label>{t('lockers.notes')}</Label>
                                <textarea
                                    rows={2}
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    className={inputCls + ' resize-none'}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={processing} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    {processing ? t('common.saving') : t('common.save')}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Contacts list */}
                {contacts.data.length === 0 && !showForm ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-600 mb-2">{t('contacts.empty_title')}</h3>
                        <p className="text-sm text-gray-400 mb-5">{t('contacts.empty_body')}</p>
                        <Button onClick={openCreate} className="gap-2">
                            <Plus className="w-4 h-4" />
                            {t('contacts.add')}
                        </Button>
                    </div>
                ) : contacts.data.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-50">
                            {contacts.data.map(c => (
                                <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-violet-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {[c.email, c.phone].filter(Boolean).join(' · ')}
                                        </p>
                                        {(c.address || c.city || c.country) && (
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {[c.address, c.city, c.state, c.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => openEdit(c)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            title={t('common.edit')}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteContact(c.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-100">
                            <PaginationBar
                                meta={{
                                    current_page: contacts.current_page,
                                    last_page:    contacts.last_page,
                                    per_page:     contacts.per_page,
                                    total:        contacts.total,
                                    from:         contacts.from ?? 0,
                                    to:           contacts.to   ?? 0,
                                }}
                                onPageChange={(page) =>
                                    router.get(route('my-contacts.index'), { page, per_page: contacts.per_page }, { preserveScroll: true })
                                }
                                onPerPageChange={(per_page) =>
                                    router.get(route('my-contacts.index'), { page: 1, per_page }, { preserveScroll: true })
                                }
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </AuthenticatedLayout>
    );
}
