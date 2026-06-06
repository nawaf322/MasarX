import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { SettingsField } from './_components/SettingsField';
import { SettingsSaveBar } from './_components/SettingsSaveBar';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from "@/Components/UI/searchable-select";
import { Button } from "@/Components/UI/button";
import { Switch } from "@/Components/UI/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/UI/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/Components/UI/dialog";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { useState, useEffect, useRef } from "react";
import { Plus, Search, Star, Check } from "lucide-react";
import { AppPagination } from "@/Components/Shared/AppPagination";

interface Currency {
    code: string;
    name: string;
    symbol: string;
}

interface CurrencyFull {
    id: number;
    code: string;
    name: string;
    symbol: string;
    exchange_rate: number;
    is_active: boolean;
    is_primary: boolean;
}

export default function Locale({ 
    settings, 
    effective_units,
    timezones = [], 
    currencies = [], 
    allCurrencies = [],
    currenciesMeta = null
}: { 
    settings: any; 
    effective_units?: { weight_unit: string; dimension_unit: string };
    timezones?: string[]; 
    currencies?: Currency[];
    allCurrencies?: CurrencyFull[];
    currenciesMeta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
    } | null;
}) {
    const { t, i18n } = useTranslation();
    const [localeData, setLocaleData] = useState({
        language: settings.language || 'en',
        timezone: settings.timezone || 'UTC',
        currency: settings.currency || 'USD',
        date_format: settings.date_format || 'd/m/Y',
        weight_unit: settings.weight_unit || 'kg',
        dimension_unit: settings.dimension_unit || 'cm',
        time_format: settings.time_format || '24h',
    });
    const [processing, setProcessing] = useState(false);
    const isDirty = useRef(false);

    const setData = (key: string, value: string) => {
        isDirty.current = true;
        setLocaleData(prev => ({ ...prev, [key]: value }));
    };

    // proxy data access
    const data = localeData;

    const alert = useSweetAlert();
    const { url } = usePage();
    const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
    
    // Inicializar búsqueda desde query params
    const getSearchFromUrl = () => {
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        return urlParams.get('search') || '';
    };
    const [searchCurrency, setSearchCurrency] = useState(getSearchFromUrl());
    
    // Sincronizar searchCurrency con query params cuando cambian
    useEffect(() => {
        const searchParam = getSearchFromUrl();
        if (searchParam !== searchCurrency) {
            setSearchCurrency(searchParam);
        }
    }, [url]);
    const [newCurrency, setNewCurrency] = useState({
        code: '',
        name: '',
        symbol: '',
        exchange_rate: 1.0,
        is_active: true,
    });

    // Manejar búsqueda con debounce y recargar desde servidor
    const handleSearchChange = (value: string) => {
        setSearchCurrency(value);
        // Usar router.get para buscar en el servidor
        router.get(route('settings.locale'), { search: value }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['allCurrencies', 'currenciesMeta'],
        });
    };

    // Función helper para obtener el token CSRF
    const getCsrfToken = (): string | null => {
        // Intentar obtener del meta tag
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (metaToken) return metaToken;
        
        // Intentar obtener de las cookies (Laravel usa XSRF-TOKEN)
        const cookies = document.cookie.split('; ');
        const xsrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN='));
        if (xsrfCookie) {
            return decodeURIComponent(xsrfCookie.split('=')[1]);
        }
        
        // Intentar obtener del head
        const headToken = document.querySelector('head meta[name="csrf-token"]')?.getAttribute('content');
        if (headToken) return headToken;
        
        return null;
    };

    const handleToggleCurrency = async (currencyId: number, currentStatus: boolean) => {
        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                // Si no hay token, intentar recargar la página para obtenerlo
                alert.error(t('settings.locale.csrf_not_found'));
                setTimeout(() => window.location.reload(), 1000);
                return;
            }

            const response = await fetch(route('settings.locale.currencies.toggle', currencyId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-XSRF-TOKEN': csrfToken, // Laravel también acepta este header
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin', // Importante para enviar cookies
                body: JSON.stringify({ is_active: !currentStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: t('settings.locale.server_error') }));
                alert.error(errorData.message || `Error ${response.status}: ${response.statusText}`);
                return;
            }

            const result = await response.json();

            if (result.success) {
                alert.success(result.message);
                // Recargar también la configuración de locale para actualizar el selector
                router.reload({
                    only: ['allCurrencies', 'currencies', 'currenciesMeta', 'settings'],
                    preserveUrl: true,
                    onSuccess: (page) => {
                        // Si la moneda desactivada era la seleccionada, cambiar a la primaria
                        const desactivatedCurrency = result.currency;
                        if (desactivatedCurrency && !desactivatedCurrency.is_active) {
                            const currentCurrency = data.currency;
                            if (desactivatedCurrency.code === currentCurrency) {
                                // Buscar la moneda primaria activa
                                const pageProps = (page?.props as any) || {};
                                const reloadedAllCurrencies = pageProps.allCurrencies || allCurrencies || [];
                                const primaryCurrency = reloadedAllCurrencies.find((c: CurrencyFull) => c.is_primary && c.is_active);
                                
                                if (primaryCurrency) {
                                    setData('currency', primaryCurrency.code);
                                } else {
                                    // Si no hay primaria, usar la primera moneda activa disponible
                                    const reloadedCurrencies = pageProps.currencies || currencies || [];
                                    if (reloadedCurrencies.length > 0) {
                                        setData('currency', reloadedCurrencies[0].code);
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                alert.error(result.message || t('settings.locale.currency_update_error'));
            }
        } catch (error: any) {
            console.error('Error updating currency:', error);
            alert.error(error?.message || t('settings.locale.connection_error'));
        }
    };

    const handleSetPrimaryCurrency = async (currencyId: number) => {
        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                // Si no hay token, intentar recargar la página para obtenerlo
                alert.error(t('settings.locale.csrf_not_found'));
                setTimeout(() => window.location.reload(), 1000);
                return;
            }

            const response = await fetch(route('settings.locale.currencies.set-primary', currencyId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-XSRF-TOKEN': csrfToken, // Laravel también acepta este header
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin', // Importante para enviar cookies
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: t('settings.locale.server_error') }));
                alert.error(errorData.message || `Error ${response.status}: ${response.statusText}`);
                return;
            }

            const result = await response.json();

            if (result.success) {
                alert.success(result.message);
                router.reload({ 
                    only: ['allCurrencies', 'currencies', 'currenciesMeta', 'settings'],
                    onSuccess: () => {
                        // Si la nueva moneda primaria es diferente a la seleccionada, actualizar
                        const newPrimaryCode = result.currency?.code;
                        if (newPrimaryCode && newPrimaryCode !== data.currency) {
                            // Opcional: actualizar automáticamente a la nueva primaria
                            // setData('currency', newPrimaryCode);
                        }
                    }
                });
            } else {
                alert.error(result.message || t('settings.locale.currency_primary_error'));
            }
        } catch (error: any) {
            console.error('Error setting primary currency:', error);
            alert.error(error?.message || t('settings.locale.currency_primary_error'));
        }
    };

    const handleAddCurrency = async () => {
        if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
            alert.error(t('settings.locale.complete_required_fields'));
            return;
        }

        if (newCurrency.code.length !== 3) {
            alert.error(t('settings.locale.currency_code_iso'));
            return;
        }

        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                alert.error(t('settings.locale.csrf_not_found'));
                setTimeout(() => window.location.reload(), 1000);
                return;
            }

            const response = await fetch(route('settings.locale.currencies.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-XSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(newCurrency),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: t('settings.locale.server_error') }));
                alert.error(errorData.message || `Error ${response.status}: ${response.statusText}`);
                return;
            }

            const result = await response.json();

            if (result.success) {
                alert.success(result.message);
                setCurrencyDialogOpen(false);
                setNewCurrency({
                    code: '',
                    name: '',
                    symbol: '',
                    exchange_rate: 1.0,
                    is_active: true,
                });
                router.reload({ only: ['allCurrencies', 'currencies', 'currenciesMeta'] });
            } else {
                alert.error(result.message || t('settings.locale.currency_update_error'));
            }
        } catch (error: any) {
            console.error('Error creating currency:', error);
            alert.error(error?.message || t('settings.locale.connection_error'));
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const { data: resp } = await axios.post(route('settings.locale.update'), data);
            alert.success(resp?.message || t('settings.save_success'));
            i18n.changeLanguage(data.language);
            window.location.reload();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || t('common.error_validation') || 'An error occurred.';
            alert.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <SettingsLayout title={t('settings.menu.locale')}>
            <SettingsShell description={t('settings.locale.desc')} className="max-w-[95%] xl:max-w-7xl">
                <form onSubmit={submit} className="space-y-8">

                    <SettingsSection
                        title={t('settings.menu.locale')}
                        description={t('settings.locale.desc')}
                    >
                        <SettingsField label={t('settings.locale.language')} id="language">
                            <Select value={data.language} onValueChange={(val) => setData('language', val)}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200">
                                    <SelectValue placeholder={t('forms.select')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">{t('settings.locale.lang_en')}</SelectItem>
                                    <SelectItem value="es">{t('settings.locale.lang_es')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        <SettingsField label={t('settings.locale.currency')} id="currency">
                            <SearchableSelect
                                value={data.currency}
                                onChange={(val) => setData('currency', val)}
                                options={(currencies || []).map(c => ({
                                    value: c.code,
                                    label: `${c.code} - ${c.name} (${c.symbol})`
                                }))}
                                placeholder={t('forms.select')}
                                searchPlaceholder={t('common.search')}
                            />
                        </SettingsField>

                        <SettingsField label={t('settings.locale.timezone')} id="timezone">
                            <SearchableSelect
                                value={data.timezone}
                                onChange={(val) => setData('timezone', val)}
                                placeholder={t('forms.select')}
                                searchPlaceholder={t('settings.locale.search_timezone')}
                                options={(timezones || []).map(tz => ({ value: tz, label: tz }))}
                            />
                        </SettingsField>

                        <SettingsField label={t('settings.locale.date_format')} id="date_format">
                            <Select value={data.date_format} onValueChange={(val) => setData('date_format', val)}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="d/m/Y">{t('settings.locale.date_dmy')}</SelectItem>
                                    <SelectItem value="m/d/Y">{t('settings.locale.date_mdy')}</SelectItem>
                                    <SelectItem value="Y-m-d">{t('settings.locale.date_ymd')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        <SettingsField label={t('settings.locale.time_format')} id="time_format">
                            <Select value={data.time_format} onValueChange={(val) => setData('time_format', val)}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12h">{t('settings.locale.time_12h')}</SelectItem>
                                    <SelectItem value="24h">{t('settings.locale.time_24h')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.locale.currency_management')}
                        description={t('settings.locale.currency_management_desc')}
                        fullWidth={true}
                    >
                        <div className="space-y-4 w-full">
                            <div className="flex items-center justify-between">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder={t('settings.locale.search_currency')}
                                        value={searchCurrency}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button type="button" size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('settings.locale.add_currency')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('settings.locale.add_new_currency')}</DialogTitle>
                                            <DialogDescription>
                                                {t('settings.locale.add_currency_desc')}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="currency-code">{t('settings.locale.currency_code')}</Label>
                                                <Input
                                                    id="currency-code"
                                                    placeholder="USD"
                                                    value={newCurrency.code}
                                                    onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                                                    maxLength={3}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="currency-name">{t('settings.locale.currency_name')}</Label>
                                                <Input
                                                    id="currency-name"
                                                    placeholder={t('settings.locale.currency_name_placeholder')}
                                                    value={newCurrency.name}
                                                    onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="currency-symbol">{t('settings.locale.currency_symbol')}</Label>
                                                <Input
                                                    id="currency-symbol"
                                                    placeholder="$"
                                                    value={newCurrency.symbol}
                                                    onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                                                    maxLength={10}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="currency-rate">{t('settings.locale.exchange_rate')}</Label>
                                                <Input
                                                    id="currency-rate"
                                                    type="number"
                                                    step="0.000001"
                                                    placeholder="1.000000"
                                                    value={newCurrency.exchange_rate}
                                                    onChange={(e) => setNewCurrency({ ...newCurrency, exchange_rate: parseFloat(e.target.value) || 1.0 })}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setCurrencyDialogOpen(false)}>
                                                {t('common.cancel')}
                                            </Button>
                                            <Button type="button" onClick={handleAddCurrency}>
                                                {t('settings.locale.add_currency')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[100px]">{t('settings.locale.code')}</TableHead>
                                                <TableHead className="min-w-[200px]">{t('settings.locale.name')}</TableHead>
                                                <TableHead className="min-w-[100px]">{t('settings.locale.symbol')}</TableHead>
                                                <TableHead className="min-w-[120px]">{t('settings.locale.exchange_rate')}</TableHead>
                                                <TableHead className="text-center min-w-[180px]">{t('settings.locale.primary_currency')}</TableHead>
                                                <TableHead className="text-center min-w-[150px]">{t('settings.locale.status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(allCurrencies || []).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                                        {t('settings.locale.no_currencies_found')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                (allCurrencies || []).map((currency) => (
                                                    <TableRow key={currency.id}>
                                                        <TableCell className="font-mono font-semibold">{currency.code}</TableCell>
                                                        <TableCell>{currency.name}</TableCell>
                                                        <TableCell>{currency.symbol}</TableCell>
                                                        <TableCell className="font-mono">
                                                            {typeof currency.exchange_rate === 'number' 
                                                                ? currency.exchange_rate.toFixed(6) 
                                                                : parseFloat(currency.exchange_rate || 0).toFixed(6)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {currency.is_primary ? (
                                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                                                                        <Star className="h-3 w-3 fill-blue-800" />
                                                                        {t('settings.locale.primary')}
                                                                    </span>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleSetPrimaryCurrency(currency.id)}
                                                                        disabled={!currency.is_active}
                                                                        className="h-7 px-2 text-xs text-gray-600 hover:text-blue-600"
                                                                        title={currency.is_active ? t('settings.locale.set_as_primary_title') : t('settings.locale.currency_must_be_active')}
                                                                    >
                                                                        <Star className="h-3 w-3 mr-1" />
                                                                        {t('settings.locale.set_as_primary')}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Switch
                                                                    checked={currency.is_active}
                                                                    onCheckedChange={() => handleToggleCurrency(currency.id, currency.is_active)}
                                                                    disabled={currency.is_primary}
                                                                />
                                                                <span className="text-sm text-gray-500 whitespace-nowrap">
                                                                    {currency.is_active ? t('settings.locale.active') : t('settings.locale.inactive')}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                
                                {/* Paginación */}
                                {currenciesMeta && currenciesMeta.total > 0 && (
                                    <div className="border-t bg-gray-50 px-4 py-3">
                                        <AppPagination variant="server" meta={currenciesMeta} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSaveBar processing={processing} isDirty={isDirty.current} />
                </form>
            </SettingsShell>
        </SettingsLayout>
    );
}
