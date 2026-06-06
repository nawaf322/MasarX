import { useState, useMemo } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/Components/UI/button";
import { Badge } from "@/Components/UI/badge";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/UI/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Trash2, Edit2, MoreHorizontal, MapPin } from "lucide-react";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { SearchableSelect } from "@/ui/kit/SearchableSelect";
import { SettingsTable } from './_components/SettingsTable';

interface BranchPageProps {
    branches: any[];
    countries: any[];
    states: any[];
    cities: any[];
}

const emptyForm = () => ({
    name: '',
    code: '',
    country: '',
    country_id: '' as string | number,
    state: '',
    state_id: '' as string | number,
    city: '',
    city_id: '' as string | number,
});

export default function Branches({ branches, countries, states: allStates = [], cities: allCities = [] }: BranchPageProps) {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [formData, setFormData] = useState(emptyForm());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const swal = useSweetAlert();

    const selectedCountryId = formData.country_id ? Number(formData.country_id) : null;
    const selectedStateId = formData.state_id ? Number(formData.state_id) : null;

    const statesForCountry = useMemo(() => {
        if (!selectedCountryId) return [];
        const cid = Number(selectedCountryId);
        return allStates.filter((s: any) => Number(s.country_id ?? s.countryId) === cid);
    }, [allStates, selectedCountryId]);

    const citiesForState = useMemo(() => {
        if (!selectedStateId) return [];
        const sid = Number(selectedStateId);
        return allCities.filter((c: any) => Number(c.state_id ?? c.stateId) === sid);
    }, [allCities, selectedStateId]);

    const openCreateModal = () => {
        setEditingBranch(null);
        setFormData(emptyForm());
        setErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (branch: any) => {
        setEditingBranch(branch);
        const countryMatch = (countries || []).find((c: any) => c.name === branch.country);
        const cid = countryMatch?.id;
        const stateMatch = cid && branch.state
            ? allStates.find((s: any) => (s.name === branch.state) && (Number(s.country_id ?? s.countryId) === cid))
            : null;
        const sid = stateMatch?.id;
        const cityMatch = sid && branch.city
            ? allCities.find((c: any) => (c.name === branch.city) && (Number(c.state_id ?? c.stateId) === sid))
            : null;
        setErrors({});
        setFormData({
            name: branch.name,
            code: branch.code || '',
            country: branch.country || '',
            country_id: cid ?? '',
            state: branch.state || '',
            state_id: sid ?? '',
            city: branch.city || '',
            city_id: cityMatch?.id ?? '',
        });
        setIsModalOpen(true);
    };

    const handleCountryChange = (val: string) => {
        const countryId = Number(val);
        const country = (countries || []).find((c: any) => c.id === countryId);
        if (!country) return;
        setFormData(prev => ({ ...prev, country: country.name, country_id: country.id, state: '', state_id: '', city: '', city_id: '' }));
    };

    const handleStateChange = (val: string) => {
        const stateId = Number(val);
        const state = statesForCountry.find((s: any) => s.id === stateId);
        if (!state) return;
        setFormData(prev => ({ ...prev, state: state.name, state_id: state.id, city: '', city_id: '' }));
    };

    const handleCityChange = (val: string) => {
        const cityId = Number(val);
        const city = citiesForState.find((c: any) => c.id === cityId);
        if (!city) return;
        setFormData(prev => ({ ...prev, city: city.name, city_id: city.id }));
    };

    async function handleAction(key: string, action: () => Promise<any>, onOk?: (data: any) => void, successMsg?: string) {
        setLoading(prev => ({ ...prev, [key]: true }));
        try {
            const data = await action();
            swal.toast(successMsg || t('settings.save_success'), 'success');
            onOk?.(data);
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
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        const payload = {
            name: formData.name,
            code: formData.code,
            country: formData.country,
            state: formData.state,
            city: formData.city,
        };
        if (editingBranch) {
            handleAction('save', () => axios.put(route('settings.branches.update', editingBranch.id), payload).then(r => r.data), () => {
                setIsModalOpen(false);
                setFormData(emptyForm());
                router.reload({ only: ['branches'] });
            }, t('settings.branches.branch_updated'));
        } else {
            handleAction('save', () => axios.post(route('settings.branches.store'), payload).then(r => r.data), () => {
                setIsModalOpen(false);
                setFormData(emptyForm());
                router.reload({ only: ['branches'] });
            }, t('settings.branches.branch_created'));
        }
    };

    const deleteBranch = (branch: any) => {
        const usersCount = branch.users_count || 0;
        if (usersCount > 0) {
            swal.toast(t('settings.branches.cannot_delete_branch_users_msg', { count: usersCount }), 'error');
            return;
        }
        swal.confirm(t('settings.branches.delete_branch_confirm'), t('settings.branches.delete_branch_msg', { name: branch.name }), t('settings.branches.confirm_delete_btn')).then((confirmed) => {
            if (confirmed) {
                handleAction('delete_' + branch.id, () => axios.delete(route('settings.branches.destroy', branch.id)).then(r => r.data), () => {
                    router.reload({ only: ['branches'] });
                }, t('settings.branches.branch_deleted'));
            }
        });
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('settings.branches.name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 font-medium text-gray-900">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {row.original.name}
                </div>
            )
        },
        {
            accessorKey: "code",
            header: t('settings.branches.code'),
            cell: ({ row }) => row.original.code ? <Badge variant="outline">{row.original.code}</Badge> : <span className="text-gray-400">-</span>
        },
        {
            accessorKey: "city",
            header: t('settings.branches.city_location'),
            cell: ({ row }) => <span className="text-gray-600">{row.original.city || row.original.name}</span>
        },
        {
            accessorKey: "users_count",
            header: t('settings.branches.active_users'),
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {row.original.users_count} {t('settings.branches.users')}
                </Badge>
            )
        },
        {
            id: "actions",
            header: t('settings.branches.action'),
            cell: ({ row }) => {
                const branch = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 rounded-full">
                                    <span className="sr-only">{t('settings.branches.open_menu')}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(branch)} className="cursor-pointer">
                                    <Edit2 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                    {t('settings.branches.edit_details')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => deleteBranch(branch)}
                                    disabled={branch.users_count > 0}
                                    className={branch.users_count > 0
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50'
                                    }
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {t('settings.branches.delete_branch')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        }
    ];

    return (
        <SettingsLayout title={t('settings.branches.title')}>
            <SettingsTable
                title={t('settings.menu.branches')}
                description={t('settings.branches.desc')}
                actionLabel={t('settings.branches.add')}
                onAction={openCreateModal}
                columns={columns}
                data={branches || []}
                searchPlaceholder={t('common.search')}
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? t('settings.branches.edit') : t('settings.branches.add')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.branches.desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('settings.branches.name')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('settings.branches.name_placeholder')}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">{t('settings.branches.code')}</Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                    placeholder={t('settings.branches.code_placeholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('settings.company.country')}</Label>
                                <SearchableSelect
                                    value={formData.country_id ? String(formData.country_id) : ''}
                                    onChange={handleCountryChange}
                                    items={(countries || []).map((c: any) => ({ value: c.id, label: c.name }))}
                                    placeholder={t('settings.company.country')}
                                    searchPlaceholder={t('common.search')}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('settings.company.state_region')}</Label>
                            <SearchableSelect
                                value={formData.state_id ? String(formData.state_id) : ''}
                                onChange={handleStateChange}
                                items={statesForCountry.map((s: any) => ({ value: s.id, label: s.name }))}
                                placeholder={selectedCountryId ? t('settings.company.select_state') : t('settings.company.select_country_first')}
                                searchPlaceholder={t('common.search')}
                                disabled={!selectedCountryId}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('settings.company.city')}</Label>
                            <SearchableSelect
                                value={formData.city_id ? String(formData.city_id) : ''}
                                onChange={handleCityChange}
                                items={citiesForState.map((c: any) => ({ value: c.id, label: c.name }))}
                                placeholder={selectedStateId ? t('settings.company.city') : t('settings.company.select_state_first')}
                                searchPlaceholder={t('common.search')}
                                disabled={!selectedStateId}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={loading.save} className="bg-primary hover:bg-primary/90">
                                {loading.save ? t('common.loading') : t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SettingsLayout>
    );
}
