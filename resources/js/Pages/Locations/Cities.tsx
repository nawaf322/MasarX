import LocationsLayout from '@/Layouts/LocationsLayout';
import { useForm } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useMemo } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/UI/dialog";
import { Label } from "@/Components/UI/label";
import { Switch } from "@/Components/UI/switch";
import { ProTable } from "@/Components/ProTable";
import { ColumnDef } from "@tanstack/react-table";
import { useQueryState } from '@/ui/kit/useQueryState';
import { TableToolbar } from '@/ui/kit/TableToolbar';
import { SearchableSelect } from '@/ui/kit/SearchableSelect';
import { useTranslation } from '@/hooks/useTranslation';

export default function Cities({ items, meta, query, countries = [], states: allStates = [] }: any) {
    const { t } = useTranslation();
    if (!items) {
        return <LocationsLayout title={t('locations.cities')}><div className="p-12 text-center text-gray-500">{t('locations.loading_cities')}</div></LocationsLayout>;
    }

    const alert = useSweetAlert();
    const { update, submit } = useQueryState(query);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCity, setEditingCity] = useState<any>(null);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('locations.city_name'),
            cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>
        },
        {
            accessorKey: "state.name",
            header: t('locations.state'),
        },
        {
            accessorKey: "state.country.name",
            header: t('locations.country'),
        },
        {
            accessorKey: "is_active",
            header: t('locations.status'),
            cell: ({ row }) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.original.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {row.original.is_active ? t('common.active') : t('common.inactive')}
                </span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(row.original.id)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    const { data, setData, post, put, delete: destroy, processing, reset, errors } = useForm({
        country_id: '' as string | number,
        state_id: '' as string | number,
        name: '',
        latitude: '',
        longitude: '',
        timezone: '',
        is_active: true
    });

    const selectedCountryId = data.country_id ? Number(data.country_id) : null;
    const statesForCountry = useMemo(() => {
        if (!selectedCountryId) return [];
        const cid = Number(selectedCountryId);
        return allStates.filter((s: any) => Number(s.country_id ?? s.countryId) === cid);
    }, [allStates, selectedCountryId]);

    const handleFormCountryChange = (val: string) => {
        const countryId = val ? Number(val) : null;
        setData('country_id', countryId ?? '');
        setData('state_id', '');
    };

    const openCreate = () => {
        setEditingCity(null);
        reset();
        setIsCreateOpen(true);
    };

    const openEdit = (item: any) => {
        setEditingCity(item);
        const countryId = item.state?.country?.id ?? null;
        setData({
            country_id: countryId ?? '',
            state_id: item.state_id?.toString() ?? '',
            name: item.name ?? '',
            latitude: item.latitude || '',
            longitude: item.longitude || '',
            timezone: item.timezone || '',
            is_active: Boolean(item.is_active)
        });
        setIsCreateOpen(true);
    };

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCity) {
            put(route('locations.cities.update', editingCity.id), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    alert.success(t('locations.city_updated'));
                }
            });
        } else {
            post(route('locations.cities.store'), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    alert.success(t('locations.city_created'));
                }
            });
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await alert.confirm(t('locations.delete_confirm_title'), t('locations.delete_confirm_msg'), t('locations.confirm_delete_btn'));
        if (confirmed) {
            destroy(route('locations.cities.destroy', id), {
                onSuccess: () => alert.success(t('locations.city_deleted'))
            });
        }
    };

    return (
        <LocationsLayout title={t('locations.cities')}>
            <div className="space-y-6">

                {/* Toolbar */}
                <TableToolbar
                    placeholder={t('locations.search_cities')}
                    clearLabel={t('common.clear')}
                    search={query.search || ''}
                    onSearchChange={(val) => {
                        update({ search: val, page: 1 });
                        submit({ search: val, page: 1 });
                    }}
                >
                    <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('locations.add_city')}
                    </Button>
                </TableToolbar>

                {/* Table */}
                <div className="bg-white rounded-md border">
                    <ProTable
                        columns={columns}
                        data={items}
                        meta={meta}
                        emptyText={t('common.no_results')}
                        onPageChange={(page: number) => {
                            update({ page });
                            submit();
                        }}
                    />
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCity ? t('locations.edit_city') : t('locations.add_new_city')}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitForm} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('locations.country')}</Label>
                                <SearchableSelect
                                    value={data.country_id ? String(data.country_id) : ''}
                                    onChange={handleFormCountryChange}
                                    items={(countries || []).map((c: any) => ({ value: c.id, label: c.name }))}
                                    placeholder={t('locations.select_country')}
                                    searchPlaceholder={t('select.search_placeholder')}
                                    emptyText={t('select.no_results')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('locations.state')}</Label>
                                <SearchableSelect
                                    value={data.state_id ? String(data.state_id) : ''}
                                    onChange={(val) => setData('state_id', val)}
                                    items={statesForCountry.map((s: any) => ({ value: s.id, label: s.name }))}
                                    placeholder={selectedCountryId ? t('locations.select_state') : t('locations.select_country_first')}
                                    searchPlaceholder={t('select.search_placeholder')}
                                    emptyText={t('select.no_results')}
                                    disabled={!selectedCountryId}
                                />
                                {errors.state_id && <p className="text-red-500 text-xs">{errors.state_id}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('locations.city_name')}</Label>
                            <Input
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder={t('locations.placeholder_city_name')}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('locations.latitude')}</Label>
                                <Input
                                    value={data.latitude}
                                    onChange={e => setData('latitude', e.target.value)}
                                    placeholder={t('locations.placeholder_latitude')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('locations.longitude')}</Label>
                                <Input
                                    value={data.longitude}
                                    onChange={e => setData('longitude', e.target.value)}
                                    placeholder={t('locations.placeholder_longitude')}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <Label>{t('locations.active_status')}</Label>
                            <Switch
                                checked={data.is_active}
                                onCheckedChange={(checked) => setData('is_active', checked)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                                {editingCity ? t('locations.update_city') : t('locations.create_city')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </LocationsLayout>
    );
}
