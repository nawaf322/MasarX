import LocationsLayout from '@/Layouts/LocationsLayout';
import { useForm } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/UI/dialog";
import { Label } from "@/Components/UI/label";
import { Switch } from "@/Components/UI/switch";
import { ProTable } from "@/Components/ProTable";
import { ColumnDef } from "@tanstack/react-table";
import { useQueryState } from '@/ui/kit/useQueryState';
import { TableToolbar } from '@/ui/kit/TableToolbar';
import { useTranslation } from '@/hooks/useTranslation';

export default function Countries({ items, meta, query }: any) {
    const { t } = useTranslation();
    if (!items) return <LocationsLayout title={t('locations.countries')}><div className="p-12 text-center text-gray-500">{t('locations.loading')}</div></LocationsLayout>;

    const alert = useSweetAlert();
    const { update, submit } = useQueryState(query);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState<any>(null);

    // Columns
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('locations.name'),
            cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>
        },
        {
            accessorKey: "iso2",
            header: t('locations.iso_code'),
            cell: ({ row }) => <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{row.original.iso2}</span>
        },
        {
            accessorKey: "phone_code",
            header: t('locations.phone_code'),
        },
        {
            accessorKey: "currency",
            header: t('locations.currency'),
        },
        {
            accessorKey: "region",
            header: t('locations.region'),
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
        name: '',
        iso2: '',
        phone_code: '',
        currency: '',
        region: '',
        is_active: true
    });

    const openCreate = () => {
        setEditingCountry(null);
        reset();
        setIsCreateOpen(true);
    };

    const openEdit = (country: any) => {
        setEditingCountry(country);
        setData({
            name: country.name,
            iso2: country.iso2,
            phone_code: country.phone_code || '',
            currency: country.currency || '',
            region: country.region || '',
            is_active: Boolean(country.is_active)
        });
        setIsCreateOpen(true);
    };

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCountry) {
            put(route('locations.countries.update', editingCountry.id), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    alert.success(t('locations.country_updated'));
                }
            });
        } else {
            post(route('locations.countries.store'), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    alert.success(t('locations.country_created'));
                }
            });
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await alert.confirm(t('locations.delete_confirm_title'), t('locations.delete_confirm_msg'), t('locations.confirm_delete_btn'));
        if (confirmed) {
            destroy(route('locations.countries.destroy', id), {
                onSuccess: () => alert.success(t('locations.country_deleted'))
            });
        }
    };

    return (
        <LocationsLayout title={t('locations.countries')}>
            <div className="space-y-6">

                {/* Toolbar */}
                <TableToolbar
                    placeholder={t('locations.search_countries')}
                    clearLabel={t('common.clear')}
                    search={query.search || ''}
                    onSearchChange={(val) => {
                        update({ search: val, page: 1 });
                        submit({ search: val, page: 1 });
                    }}
                >
                    <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('locations.add_country')}
                    </Button>
                </TableToolbar>

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
                        <DialogTitle>{editingCountry ? t('locations.edit_country') : t('locations.add_new_country')}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitForm} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('locations.country_name')}</Label>
                                <Input
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder={t('locations.placeholder_country_name')}
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('locations.iso_code_2')}</Label>
                                <Input
                                    value={data.iso2}
                                    onChange={e => setData('iso2', e.target.value.toUpperCase())}
                                    placeholder={t('locations.placeholder_iso2')}
                                    maxLength={2}
                                    required
                                />
                                {errors.iso2 && <p className="text-red-500 text-xs">{errors.iso2}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('locations.phone_code')}</Label>
                                <Input
                                    value={data.phone_code}
                                    onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); setData('phone_code', v); }}
                                    placeholder={t('locations.placeholder_phone_code')}
                                    inputMode="numeric"
                                    pattern="[0-9+]*"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('locations.currency')}</Label>
                                <Input
                                    value={data.currency}
                                    onChange={e => setData('currency', e.target.value)}
                                    placeholder={t('locations.placeholder_currency')}
                                    maxLength={3}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('locations.region')}</Label>
                            <Input
                                value={data.region}
                                onChange={e => setData('region', e.target.value)}
                                placeholder={t('locations.placeholder_region')}
                            />
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
                                {editingCountry ? t('locations.update_country') : t('locations.create_country')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </LocationsLayout>
    );
}
