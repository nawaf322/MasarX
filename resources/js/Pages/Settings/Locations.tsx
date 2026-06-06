import SettingsLayout from '@/Layouts/SettingsLayout';
import { useEffect, useState } from 'react';
import { LocationsService, Country, State, City } from '@/Services/locationsService';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/Components/UI/card";
import { Badge } from "@/Components/UI/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/UI/tabs";
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/Components/UI/dialog";
import { SearchableSelect } from "@/Components/UI/searchable-select";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus } from 'lucide-react';

export default function Locations() {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [activeTab, setActiveTab] = useState("countries");

    // Data State
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    // Selection State (use IDs to match API: countries.id, states.id)
    const [selectedCountryForStateTab, setSelectedCountryForStateTab] = useState<string>('');
    const [selectedCountryForCityTab, setSelectedCountryForCityTab] = useState<string>('');
    const [selectedStateForCityTab, setSelectedStateForCityTab] = useState<string>('');

    // Fetch Countries on Mount
    useEffect(() => {
        loadCountries();
    }, []);

    const loadCountries = () => {
        LocationsService.getCountries().then(setCountries);
    };

    // State Tab Logic (API uses country_id)
    const handleCountryChangeForStates = async (countryId: string) => {
        setSelectedCountryForStateTab(countryId);
        if (!countryId) { setStates([]); return; }
        const fetchedStates = await LocationsService.getStates(Number(countryId));
        setStates(fetchedStates);
    };

    // City Tab Logic (API uses country_id for states, state_id for cities)
    const handleCountryChangeForCities = async (countryId: string) => {
        setSelectedCountryForCityTab(countryId);
        setCities([]);
        setSelectedStateForCityTab('');
        if (!countryId) { setStates([]); return; }
        const fetchedStates = await LocationsService.getStates(Number(countryId));
        setStates(fetchedStates);
    };

    const handleStateChangeForCities = async (stateId: string) => {
        setSelectedStateForCityTab(stateId);
        if (!stateId) { setCities([]); return; }
        const fetchedCities = await LocationsService.getCities(Number(stateId));
        setCities(fetchedCities);
    };

    // Creation Handlers
    const [isCreateCountryOpen, setIsCreateCountryOpen] = useState(false);
    const [newCountry, setNewCountry] = useState({ name: '', iso2: '', phone_code: '', currency: '', region: '' });

    const handleCreateCountry = async () => {
        try {
            await LocationsService.createCountry(newCountry);
            alert.success(t('locations.create_country_title'), t('locations.create_country_msg'));
            setIsCreateCountryOpen(false);
            setNewCountry({ name: '', iso2: '', phone_code: '', currency: '', region: '' });
            loadCountries();
        } catch (error) {
            alert.error(t('locations.error_title'), t('locations.create_country_error'));
        }
    };

    const [isCreateStateOpen, setIsCreateStateOpen] = useState(false);
    const [newState, setNewState] = useState({ name: '', iso2: '' });

    const handleCreateState = async () => {
        try {
            const countryId = Number(selectedCountryForStateTab);
            if (!countryId) return;

            await LocationsService.createState({ ...newState, country_id: countryId });
            alert.success(t('locations.create_state_title'), t('locations.create_state_msg'));
            setIsCreateStateOpen(false);
            setNewState({ name: '', iso2: '' });
            handleCountryChangeForStates(selectedCountryForStateTab); // Reload
        } catch (error) {
            alert.error(t('locations.error_title'), t('locations.create_state_error'));
        }
    };

    const [isCreateCityOpen, setIsCreateCityOpen] = useState(false);
    const [newCityName, setNewCityName] = useState('');

    const handleCreateCity = async () => {
        try {
            const stateId = Number(selectedStateForCityTab);
            if (!stateId) return;

            await LocationsService.createCity({ name: newCityName, state_id: stateId });
            alert.success(t('locations.create_city_title'), t('locations.create_city_msg'));
            setIsCreateCityOpen(false);
            setNewCityName('');
            handleStateChangeForCities(selectedStateForCityTab); // Reload
        } catch (error) {
            alert.error(t('locations.error_title'), t('locations.create_city_error'));
        }
    };


    return (
        <SettingsLayout title={t('settings.locations.title') || "Location Management"}>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">{t('settings.locations.geographic_database') || "Geographic Database"}</h3>
                    <p className="text-sm text-gray-500">{t('settings.locations.geographic_database_desc') || "Configure Countries, States and Cities available for selection throughout the system."}</p>
                </div>

                <Tabs defaultValue="countries" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="countries">{t('settings.locations.countries') || "Countries"}</TabsTrigger>
                        <TabsTrigger value="states">{t('settings.locations.states') || "States / Departments"}</TabsTrigger>
                        <TabsTrigger value="cities">{t('settings.locations.cities') || "Cities"}</TabsTrigger>
                    </TabsList>

                    {/* COUNTRIES TAB */}
                    <TabsContent value="countries" className="space-y-4">
                        <div className="flex justify-end">
                            <Dialog open={isCreateCountryOpen} onOpenChange={setIsCreateCountryOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2"><Plus className="h-4 w-4" /> {t('settings.locations.add_country')}</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('settings.locations.add_new_country')}</DialogTitle>
                                        <DialogDescription>{t('settings.locations.add_country_desc')}</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label>{t('settings.locations.name')}</Label>
                                            <Input value={newCountry.name} onChange={e => setNewCountry({ ...newCountry, name: e.target.value })} placeholder="Ej. Argentina" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.iso2_code')}</Label>
                                                <Input value={newCountry.iso2} onChange={e => setNewCountry({ ...newCountry, iso2: e.target.value.toUpperCase() })} placeholder="US" maxLength={2} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.phone_code')}</Label>
                                                <Input value={newCountry.phone_code} onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); setNewCountry({ ...newCountry, phone_code: v }); }} placeholder="1" inputMode="numeric" pattern="[0-9+]*" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.currency')}</Label>
                                                <Input value={newCountry.currency} onChange={e => setNewCountry({ ...newCountry, currency: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.region')}</Label>
                                                <Input value={newCountry.region} onChange={e => setNewCountry({ ...newCountry, region: e.target.value })} placeholder="Americas" />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateCountry}>{t('settings.locations.save_country')}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {countries.map(country => (
                                <div key={country.iso2} className="flex items-center justify-between p-3 border rounded-md bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-700">{country.name}</span>
                                        <span className="text-xs text-gray-400">({country.iso2})</span>
                                    </div>
                                    <Badge variant="outline" className="bg-gray-50">
                                        {t('common.active')}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* STATES TAB */}
                    <TabsContent value="states" className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                            <Label className="whitespace-nowrap">{t('settings.locations.filter_by_country')}</Label>
                            <SearchableSelect
                                value={selectedCountryForStateTab}
                                onChange={handleCountryChangeForStates}
                                placeholder={t('settings.locations.select_country')}
                                searchPlaceholder={t('common.search')}
                                className="w-[280px]"
                                options={countries.map(c => ({ value: String(c.id), label: c.name, keywords: [c.iso2 || ''] }))}
                            />

                            <div className="ml-auto">
                                <Dialog open={isCreateStateOpen} onOpenChange={setIsCreateStateOpen}>
                                    <DialogTrigger asChild>
                                        <Button disabled={!selectedCountryForStateTab} className="gap-2"><Plus className="h-4 w-4" /> {t('settings.locations.add_state')}</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('settings.locations.add_new_state')}</DialogTitle>
                                            <DialogDescription>{t('settings.locations.add_country_desc')}: {countries.find(c => c.id === Number(selectedCountryForStateTab))?.name}</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.name')}</Label>
                                                <Input value={newState.name} onChange={e => setNewState({ ...newState, name: e.target.value })} placeholder="Ej. California" />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.iso2_optional')}</Label>
                                                <Input value={newState.iso2} onChange={e => setNewState({ ...newState, iso2: e.target.value.toUpperCase() })} placeholder="US-CA" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleCreateState}>{t('settings.locations.save_state')}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px]">
                            {states.length > 0 ? states.map(state => (
                                <div key={state.id} className="flex items-center p-3 border rounded-md bg-white">
                                    <span className="font-medium text-gray-700">{state.name}</span>
                                    {state.iso2 && <span className="ml-2 text-xs text-gray-400">({state.iso2})</span>}
                                </div>
                            )) : (
                                <div className="col-span-full flex items-center justify-center text-gray-400 italic py-10">
                                    {selectedCountryForStateTab ? t('settings.locations.no_states_for_country') : t('settings.locations.select_country_to_see_states')}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* CITIES TAB */}
                    <TabsContent value="cities" className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <Label>{t('settings.locations.country')}</Label>
                                <SearchableSelect
                                    value={selectedCountryForCityTab}
                                    onChange={handleCountryChangeForCities}
                                    placeholder={t('settings.locations.country')}
                                    searchPlaceholder={t('common.search')}
                                    className="w-[200px]"
                                    options={countries.map(c => ({ value: String(c.id), label: c.name, keywords: [c.iso2 || ''] }))}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label>{t('settings.locations.state')}</Label>
                                <SearchableSelect
                                    value={selectedStateForCityTab}
                                    onChange={handleStateChangeForCities}
                                    placeholder={t('settings.locations.state')}
                                    searchPlaceholder={t('common.search')}
                                    className="w-[200px]"
                                    disabled={!selectedCountryForCityTab}
                                    options={states.map(s => ({ value: String(s.id), label: s.name, keywords: [s.iso2 || ''] }))}
                                />
                            </div>

                            <div className="md:ml-auto">
                                <Dialog open={isCreateCityOpen} onOpenChange={setIsCreateCityOpen}>
                                    <DialogTrigger asChild>
                                        <Button disabled={!selectedStateForCityTab} className="gap-2"><Plus className="h-4 w-4" /> {t('settings.locations.add_city')}</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('settings.locations.add_new_city')}</DialogTitle>
                                            <DialogDescription>
                                                {t('settings.locations.add_country_desc')}: {states.find(s => s.id === Number(selectedStateForCityTab))?.name}, {countries.find(c => c.id === Number(selectedCountryForCityTab))?.name}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label>{t('settings.locations.city_name')}</Label>
                                                <Input value={newCityName} onChange={e => setNewCityName(e.target.value)} placeholder="Ej. Los Angeles" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleCreateCity}>{t('settings.locations.save_city')}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 min-h-[200px]">
                            {cities.length > 0 ? cities.map(city => (
                                <div key={city.id} className="flex items-center p-3 border rounded-md bg-white">
                                    <span className="font-medium text-gray-700">{city.name}</span>
                                </div>
                            )) : (
                                <div className="col-span-full flex items-center justify-center text-gray-400 italic py-10">
                                    {selectedStateForCityTab ? t('settings.locations.no_cities_for_state') : t('settings.locations.select_state_to_see_cities')}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </SettingsLayout>
    );
}
