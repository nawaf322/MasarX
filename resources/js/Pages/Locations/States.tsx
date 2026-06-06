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
import { SearchableSelect } from '@/ui/kit/SearchableSelect';
import { useTranslation } from '@/hooks/useTranslation';

export default function States({ items, meta, query, countries }: any) {
    const { t } = useTranslation();
    if (!items) {
        return <LocationsLayout title={t('locations.states')}><div className="p-12 text-center text-gray-500">{t('locations.loading_states')}</div></LocationsLayout>;
    }

    const alert = useSweetAlert();
    const { update, submit } = useQueryState(query);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingState, setEditingState] = useState<any>(null);

    // Columns
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('locations.state_name'),
            cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>
        },
        {
            accessorKey: "code",
            header: t('locations.code'),
            cell: ({ row }) => <span className="font-mono text-gray-500">{row.original.code}</span>
        },
        {
            accessorKey: "country.name",
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
        country_id: '',
        name: '',
        code: '',
        is_active: true
    });

    const openCreate = () => {
        setEditingState(null);
        reset();
        if (query.country_id && query.country_id !== 'all') {
            setData('country_id', query.country_id.toString());
        }
        setIsCreateOpen(true);
    };

    const openEdit = (item: any) => {
        setEditingState(item);
        setData({
            country_id: item.country_id.toString(),
            name: item.name,
            code: item.code || '',
            is_active: Boolean(item.is_active)
        });
        setIsCreateOpen(true);
    };

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingState) {
            put(route('locations.states.update', editingState.id), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    alert.success(t('locations.state_updated'));
                }
            });
        } else {
            post(route('locations.states.store'), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    alert.success(t('locations.state_created'));
                }
            });
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await alert.confirm(t('locations.delete_confirm_title'), t('locations.delete_confirm_msg'), t('locations.confirm_delete_btn'));
        if (confirmed) {
            destroy(route('locations.states.destroy', id), {
                onSuccess: () => alert.success(t('locations.state_deleted'))
            });
        }
    };

    return (
        <LocationsLayout title={t('locations.states')}>
            <div className="space-y-6">

                {/* Toolbar */}
                <TableToolbar
                    placeholder={t('locations.search_states')}
                    clearLabel={t('common.clear')}
                    search={query.search || ''}
                    onSearchChange={(val) => {
                        update({ search: val, page: 1 });
                        submit({ search: val, page: 1 });
                    }}
                >
                    <div className="w-48">
                        <SearchableSelect
                            value={query.country_id || 'all'}
                            onChange={(val) => {
                                update({ country_id: val === 'all' ? '' : val });
                                submit();
                            }}
                            items={[{ value: 'all', label: t('locations.all_countries') }, ...(countries || []).map((c: any) => ({ value: c.id, label: c.name }))]}
                            placeholder={t('locations.filter_by_country')}
                            searchPlaceholder={t('select.search_placeholder')}
                            emptyText={t('select.no_results')}
                        />
                    </div>
                    <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground ml-2">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('locations.add_state')}
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
                        <DialogTitle>{editingState ? t('locations.edit_state') : t('locations.add_new_state')}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitForm} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('locations.country')}</Label>
                            <SearchableSelect
                                value={data.country_id}
                                onChange={(val) => setData('country_id', val)}
                                items={(countries || []).map((c: any) => ({ value: c.id, label: c.name }))}
                                placeholder={t('locations.select_country')}
                                searchPlaceholder={t('select.search_placeholder')}
                                emptyText={t('select.no_results')}
                                disabled={!!editingState}
                            />
                            {errors.country_id && <p className="text-red-500 text-xs">{errors.country_id}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('locations.state_name')}</Label>
                                <Input
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder={t('locations.placeholder_state_name')}
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('locations.state_code_optional')}</Label>
                                <Input
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder={t('locations.placeholder_state_code')}
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
                                {editingState ? t('locations.update_state') : t('locations.create_state')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </LocationsLayout>
    );
}
