import { useMemo, FormEvent, useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Country, State, City } from '@/Services/locationsService';
import { SearchableSelect } from "@/ui/kit/SearchableSelect";
import { useTranslation } from '@/hooks/useTranslation';
import { Copy, Check, ExternalLink, Users } from 'lucide-react';

interface StateWithCountry extends State {
    country_id?: number;
}
interface CityWithState extends City {
    state_id?: number;
}

interface CompanyProps {
    settings?: Record<string, any>;
    countries?: Country[];
    states?: StateWithCountry[];
    cities?: CityWithState[];
    customer_portal_url?: string | null;
}

export default function Company({ settings = {}, countries = [], states: allStates = [], cities: allCities = [], customer_portal_url }: CompanyProps) {
    const { t } = useTranslation();
    const swal = useSweetAlert();
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        name: settings?.name || '',
        legal_name: settings?.legal_name || '',
        tax_id: settings?.tax_id || '',
        email: settings?.email || '',
        phone: settings?.phone || '',
        website: settings?.website || '',
        address: settings?.address || '',
        city: settings?.city || '',
        state: settings?.state || '',
        country: settings?.country || '',
        country_id: settings?.country_id || '' as string | number,
        state_id: settings?.state_id || '' as string | number,
        city_id: settings?.city_id || '' as string | number,
    });

    const copyPortalLink = () => {
        if (customer_portal_url) {
            navigator.clipboard.writeText(customer_portal_url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const selectedCountryId = formData.country_id ? Number(formData.country_id) : null;
    const selectedStateId = formData.state_id ? Number(formData.state_id) : null;
    const selectedCityId = formData.city_id ? Number(formData.city_id) : null;

    const statesForCountry = useMemo(() => {
        if (!selectedCountryId) return [];
        const cid = Number(selectedCountryId);
        return allStates.filter((s) => {
            const sid = Number(s.country_id ?? (s as any).countryId);
            return sid === cid;
        });
    }, [allStates, selectedCountryId]);

    const citiesForState = useMemo(() => {
        if (!selectedStateId) return [];
        const sid = Number(selectedStateId);
        return allCities.filter((c) => {
            const cStateId = Number(c.state_id ?? (c as any).stateId);
            return cStateId === sid;
        });
    }, [allCities, selectedStateId]);

    const handleCountryChange = (val: string) => {
        const countryId = Number(val);
        const country = countries.find((c) => c.id === countryId);
        if (!country) return;
        setFormData(prev => ({ ...prev, country: country.name, country_id: country.id, state: '', state_id: '', city: '', city_id: '' }));
    };

    const handleStateChange = (val: string) => {
        const stateId = Number(val);
        const state = statesForCountry.find((s) => s.id === stateId);
        if (!state) return;
        setFormData(prev => ({ ...prev, state: state.name, state_id: state.id, city: '', city_id: '' }));
    };

    const handleCityChange = (val: string) => {
        const cityId = Number(val);
        const city = citiesForState.find((c) => c.id === cityId);
        if (!city) return;
        setFormData(prev => ({ ...prev, city: city.name, city_id: city.id }));
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);
        const payload = {
            name: formData.name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            email: formData.email,
            phone: formData.phone,
            website: formData.website,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            country: formData.country,
        };
        try {
            const { data } = await axios.post(route('settings.company.update'), payload);
            swal.toast(t('settings.save_success'), 'success');
            router.reload({ only: ['settings'] });
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setErrors(mapped);
            }
            const msg = errs
                ? Object.values(errs).flat().join(' ')
                : err?.response?.data?.error || err?.response?.data?.message || 'An error occurred.';
            swal.toast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const countryOptions = countries.map((c) => ({ value: c.id, label: c.name }));
    const stateOptions = statesForCountry.map((s) => ({ value: s.id, label: s.name }));
    const cityOptions = citiesForState.map((c) => ({ value: c.id, label: c.name }));

    return (
        <SettingsLayout title={t('settings.menu.profile')}>
            <form onSubmit={submit} className="max-w-5xl space-y-10">

                {/* Header */}
                <div className="border-b pb-4">
                    <p className="text-gray-500 text-sm">{t('settings.company.desc')}</p>
                </div>

                {/* Identity Section */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            {t('settings.company.title')}
                        </h3>
                        <p className="text-sm text-gray-500">{t('settings.company.desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.name')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej. MasarX Logistics"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.legal_name')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.legal_name}
                                onChange={e => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                                placeholder="Ej. MasarX SAS"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.legal_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.legal_name && <p className="text-red-500 text-xs mt-1">{errors.legal_name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.tax_id')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.tax_id}
                                onChange={e => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                                placeholder="NIT-123456789"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.tax_id ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.tax_id && <p className="text-red-500 text-xs mt-1">{errors.tax_id}</p>}
                        </div>
                    </div>
                </div>

                <div className="border-t pt-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{t('settings.company.contact_info')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.company.desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.email')} <span className="text-red-500">*</span></Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="contacto@empresa.com"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.phone')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.phone}
                                onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); setFormData(prev => ({ ...prev, phone: v })); }}
                                placeholder="+15550123456"
                                inputMode="numeric"
                                pattern="[0-9+]*"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.website')}</Label>
                            <Input
                                value={formData.website}
                                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                placeholder="https://empresa.com"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.website ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website}</p>}
                        </div>
                    </div>
                </div>

                <div className="border-t pt-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{t('settings.company.main_address')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.company.desc')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        {/* Country Selector */}
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.country')} <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                                value={selectedCountryId || ''}
                                onChange={handleCountryChange}
                                items={countryOptions}
                                placeholder={t('settings.company.country')}
                                searchPlaceholder="Search..."
                            />
                            {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                        </div>

                        {/* State Selector */}
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.state_region')} <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                                value={selectedStateId || ''}
                                onChange={handleStateChange}
                                items={stateOptions}
                                placeholder={selectedCountryId ? t('settings.company.select_state') : t('settings.company.select_country_first')}
                                searchPlaceholder="Search..."
                                disabled={!selectedCountryId}
                            />
                            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                        </div>

                        {/* City Selector */}
                        <div className="space-y-2">
                            <Label className="text-gray-700">{t('settings.company.city')} <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                                value={selectedCityId || ''}
                                onChange={handleCityChange}
                                items={cityOptions}
                                placeholder={selectedStateId ? t('settings.company.city') : t('settings.company.select_state_first')}
                                searchPlaceholder="Search..."
                                disabled={!selectedStateId}
                            />
                            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-3">
                            <Label className="text-gray-700">{t('settings.company.address')} <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.address}
                                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="Calle 123 # 45 - 67"
                                className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all ${errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                        </div>
                    </div>
                </div>

                {/* Customer Portal Registration Link */}
                {customer_portal_url && (
                    <div className="border-t pt-8 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">
                                    {t('customer_portal.portal_link_label')}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {t('customer_portal.portal_link_desc')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                <span className="text-sm text-gray-600 font-mono truncate">{customer_portal_url}</span>
                            </div>
                            <Button type="button" variant="outline" onClick={copyPortalLink}
                                className="shrink-0 gap-2 h-10">
                                {copied
                                    ? <><Check className="h-4 w-4 text-green-500" /> {t('customer_portal.portal_link_copied')}</>
                                    : <><Copy className="h-4 w-4" /> {t('customer_portal.portal_link_copy')}</>
                                }
                            </Button>
                            <a href={customer_portal_url} target="_blank" rel="noopener noreferrer">
                                <Button type="button" variant="outline" className="shrink-0 h-10 gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    {t('customer_portal.portal_link_preview')}
                                </Button>
                            </a>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-8">
                    <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-10 shadow-lg shadow-primary/20">
                        {loading ? t('common.loading') : t('common.save')}
                    </Button>
                </div>
            </form>
        </SettingsLayout>
    );
}
