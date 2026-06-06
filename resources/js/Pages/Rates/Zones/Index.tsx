import RatesLayout from '@/Layouts/RatesLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Plus, Pencil, Trash2, Map } from "lucide-react";
import React, { useState } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/Components/UI/dialog";
import { Label } from "@/Components/UI/label";
import { Input } from "@/Components/UI/input";
import { Switch } from "@/Components/UI/switch";
import { ProTable } from "@/Components/ProTable";
import { ColumnDef } from "@tanstack/react-table";
import { TableToolbar } from '@/ui/kit/TableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { SearchableSelect } from "@/ui/kit/SearchableSelect";

export default function Index({ zones = { data: [] }, countries = [], filters = {} }: any) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<any>(null);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: t('rates.zone_name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 font-medium text-gray-900">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                        <Map className="w-4 h-4" />
                    </div>
                    {row.original.name}
                </div>
            )
        },
        {
            accessorKey: 'origin',
            header: t('rates.calc_origin'),
            cell: ({ row }) => (
                <div className="text-sm">
                    <div className="font-medium">{row.original.origin_country?.name}</div>
                    <div className="text-muted-foreground text-xs">
                        {row.original.origin_state?.name || '—'}
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'destination',
            header: t('rates.calc_destination'),
            cell: ({ row }) => (
                <div className="text-sm">
                    <div className="font-medium">{row.original.dest_country?.name}</div>
                    <div className="text-muted-foreground text-xs">
                        {row.original.dest_state?.name || '—'}
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'active',
            header: t('rates.status'),
            cell: ({ row }) => (
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.original.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                    {row.original.active ? t('common.active') : t('common.inactive')}
                </div>
            )
        },
        {
            id: 'actions',
            header: t('rates.actions'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingZone(row.original)}>
                        <Pencil className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                </div>
            )
        }
    ];

    const handleDelete = async (id: number) => {
        const confirmed = await alert.confirm(t('rates.delete_zone_confirm'), t('rates.delete_zone_msg'));
        if (confirmed) {
            router.delete(route('rates.zones.destroy', id), {
                preserveScroll: true,
                onSuccess: () => alert.success(t('common.deleted'))
            });
        }
    };

    return (
        <RatesLayout title={t('rates.zones_title')}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('rates.zones_title')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('rates.zones_desc')}</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 shrink-0">
                        <Plus className="w-4 h-4" />
                        {t('rates.create_zone')}
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <ProTable
                            columns={columns}
                            data={zones.data || []}
                            meta={zones}
                            searchKey="name"
                            searchPlaceholder={t('rates.search_zones')}
                        />
                </div>
            </div>

            <ZoneDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                countries={countries}
                mode="create"
            />

            {editingZone && (
                <ZoneDialog
                    open={!!editingZone}
                    onOpenChange={(open: boolean) => !open && setEditingZone(null)}
                    countries={countries}
                    initialData={editingZone}
                    mode="edit"
                />
            )}
        </RatesLayout>
    );
}

function ZoneDialog({ open, onOpenChange, countries, initialData, mode }: any) {
    const { t } = useTranslation();
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: initialData?.name || '',
        origin_country_id: initialData?.origin_country_id || '',
        dest_country_id: initialData?.dest_country_id || '',
        active: initialData?.active ?? true,
    });

    const isEdit = mode === 'edit';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('rates.zones.update', initialData.id), {
                onSuccess: () => {
                    onOpenChange(false);
                    // reset(); // Don't reset on edit success to prevent flickering before close
                }
            });
        } else {
            post(route('rates.zones.store'), {
                onSuccess: () => {
                    onOpenChange(false);
                    reset();
                }
            });
        }
    };

    const countryOptions = countries.map((c: any) => ({ label: c.name, value: c.id }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('rates.edit_zone_dialog') : t('rates.create_zone_dialog')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('rates.zone_name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            placeholder="e.g., Miami to Bogota"
                            className="bg-gray-50"
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('rates.origin_country')}</Label>
                            <SearchableSelect
                                items={countryOptions}
                                value={String(data.origin_country_id || '')}
                                onChange={(val) => setData('origin_country_id', val)}
                                placeholder={t('rates.select_origin')}
                            />
                            {errors.origin_country_id && <p className="text-red-500 text-sm">{errors.origin_country_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('rates.dest_country')}</Label>
                            <SearchableSelect
                                items={countryOptions}
                                value={String(data.dest_country_id || '')}
                                onChange={(val) => setData('dest_country_id', val)}
                                placeholder={t('rates.select_dest')}
                            />
                            {errors.dest_country_id && <p className="text-red-500 text-sm">{errors.dest_country_id}</p>}
                        </div>
                    </div>

                    {isEdit && (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="active"
                                checked={data.active}
                                onCheckedChange={(checked) => setData('active', checked)}
                            />
                            <Label htmlFor="active">{t('common.active')}</Label>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                            {isEdit ? t('rates.update_zone') : t('rates.create_zone')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
