import RatesLayout from '@/Layouts/RatesLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import React, { useState } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/UI/dialog";
import { Label } from "@/Components/UI/label";
import { Input } from "@/Components/UI/input";
import { Switch } from "@/Components/UI/switch";
import { ProTable } from "@/Components/ProTable";
import { ColumnDef } from "@tanstack/react-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { SearchableSelect } from "@/Components/UI/searchable-select";

export default function Index({ cards = { data: [] }, currencies = [], filters = {}, defaultVolumetricDivisor = 5000 }: any) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<any>(null);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: t('rates.card_name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 font-medium text-gray-900">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                        <CreditCard className="w-4 h-4" />
                    </div>
                    {row.original.name}
                </div>
            )
        },
        {
            accessorKey: 'currency',
            header: t('rates.currency'),
        },
        {
            accessorKey: 'chargeable_weight_rule',
            header: t('rates.weight_rule'),
            cell: ({ row }) => {
                const rule = row.original.chargeable_weight_rule;
                const label = rule === 'max' ? t('rates.weight_max') : rule === 'actual' ? t('rates.weight_actual') : t('rates.weight_volumetric');
                return (
                    <span className="capitalize px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                        {label || rule}
                    </span>
                );
            }
        },
        {
            accessorKey: 'rules_count',
            header: t('rates.rules'),
            cell: ({ row }) => (
                <div className="text-gray-500 text-sm">{t('rates.rules_count')?.replace('{{count}}', String(row.original.rules_count || 0)) || `${row.original.rules_count || 0} rules`}</div>
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
                    <Button variant="ghost" size="icon" onClick={() => setEditingCard(row.original)}>
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
        const confirmed = await alert.confirm(t('rates.delete_card_confirm'), t('rates.delete_card_msg'));
        if (confirmed) {
            router.delete(route('rates.cards.destroy', id), {
                preserveScroll: true,
                onSuccess: () => alert.success(t('common.deleted'))
            });
        }
    };

    return (
        <RatesLayout title={t('rates.cards_title')}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('rates.cards_title')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('rates.cards_desc')}</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 shrink-0">
                        <Plus className="w-4 h-4" />
                        {t('rates.create_card')}
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <ProTable
                            columns={columns}
                            data={cards.data || []}
                            meta={cards}
                            searchKey="name"
                            searchPlaceholder={t('rates.search_cards')}
                        />
                </div>
            </div>

            <CardDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                currencies={currencies}
                mode="create"
                defaultVolumetricDivisor={defaultVolumetricDivisor}
            />

            {editingCard && (
                <CardDialog
                    open={!!editingCard}
                    onOpenChange={(open: boolean) => !open && setEditingCard(null)}
                    initialData={editingCard}
                    currencies={currencies}
                    mode="edit"
                    defaultVolumetricDivisor={defaultVolumetricDivisor}
                />
            )}
        </RatesLayout>
    );
}

function CardDialog({ open, onOpenChange, initialData, currencies = [], mode, defaultVolumetricDivisor = 5000 }: any) {
    const { t } = useTranslation();
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: initialData?.name || '',
        currency: initialData?.currency || 'USD',
        chargeable_weight_rule: initialData?.chargeable_weight_rule || 'max',
        volumetric_divisor: initialData?.volumetric_divisor || defaultVolumetricDivisor,
        active: initialData?.active ?? true,
    });

    const isEdit = mode === 'edit';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('rates.cards.update', initialData.id), {
                onSuccess: () => {
                    onOpenChange(false);
                }
            });
        } else {
            post(route('rates.cards.store'), {
                onSuccess: () => {
                    onOpenChange(false);
                    reset();
                }
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('rates.edit_card_dialog') : t('rates.create_card_dialog')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('rates.card_name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            placeholder="e.g., Air Freight 2026"
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('rates.currency')}</Label>
                            <SearchableSelect
                                options={(currencies || []).map((c: any) => ({
                                    value: c.code,
                                    label: `${c.code} - ${c.name || c.code} (${c.symbol || ''})`
                                }))}
                                value={data.currency}
                                onChange={(val) => setData('currency', val)}
                                placeholder={t('rates.select_currency')}
                                searchPlaceholder={t('common.search')}
                            />
                            {errors.currency && <p className="text-red-500 text-sm">{errors.currency}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('rates.weight_rule')}</Label>
                            <Select value={data.chargeable_weight_rule} onValueChange={(val) => setData('chargeable_weight_rule', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('common.search')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="max">{t('rates.weight_max')}</SelectItem>
                                    <SelectItem value="actual">{t('rates.weight_actual')}</SelectItem>
                                    <SelectItem value="volumetric">{t('rates.weight_volumetric')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {data.chargeable_weight_rule !== 'actual' && (
                        <div className="space-y-2">
                            <Label>{t('rates.volumetric_divisor')}</Label>
                            <Input
                                type="number"
                                value={data.volumetric_divisor}
                                onChange={e => setData('volumetric_divisor', e.target.value)}
                            />
                            <p className="text-xs text-gray-500">{t('rates.volumetric_hint')}</p>
                        </div>
                    )}

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
                            {isEdit ? t('rates.update_card') : t('rates.create_card')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
