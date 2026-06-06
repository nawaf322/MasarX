import { useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/Components/UI/button";
import { Badge } from "@/Components/UI/badge";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Switch } from "@/Components/UI/switch";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { SearchableSelect } from "@/Components/UI/searchable-select";
import { Trash2, Edit2, MoreHorizontal, Plane, Ship, Truck } from "lucide-react";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsTable } from './_components/SettingsTable';
import { useTranslation } from "@/hooks/useTranslation";

const MODES = [
    { value: 'air', labelKey: 'settings.services.mode_air', icon: Plane },
    { value: 'sea', labelKey: 'settings.services.mode_sea', icon: Ship },
    { value: 'land', labelKey: 'settings.services.mode_land', icon: Truck },
];

const emptyForm = (defaultCurrency: string) => ({
    name: '',
    code: '',
    mode: 'air',
    description: '',
    base_price: 5.00,
    price_per_kg: 2.00,
    currency: defaultCurrency,
    sort_order: 0,
    is_active: true,
});

export default function Services({ services, currencies = [] }: { services: any[]; currencies?: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const swal = useSweetAlert();
    const { t } = useTranslation();
    const defaultCurrency = currencies?.[0]?.code || 'USD';
    const [formData, setFormData] = useState<any>(() => emptyForm(defaultCurrency));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const openCreateModal = () => {
        setEditingService(null);
        setFormData(emptyForm(defaultCurrency));
        setErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (service: any) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            code: service.code,
            mode: service.mode || 'air',
            description: service.description || '',
            base_price: service.base_price ?? 5.00,
            price_per_kg: service.price_per_kg ?? 2.00,
            currency: service.currency || 'USD',
            sort_order: service.sort_order ?? 0,
            is_active: service.is_active !== undefined ? service.is_active : true,
        });
        setErrors({});
        setIsModalOpen(true);
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
        if (editingService) {
            handleAction('save', () => axios.put(route('settings.services.update', editingService.id), formData).then(r => r.data), () => {
                setIsModalOpen(false);
                router.reload({ only: ['services'] });
            }, t('settings.services.updated'));
        } else {
            handleAction('save', () => axios.post(route('settings.services.store'), formData).then(r => r.data), () => {
                setIsModalOpen(false);
                router.reload({ only: ['services'] });
            }, t('settings.services.created'));
        }
    };

    const toggleActive = (service: any) => {
        handleAction('toggle_' + service.id, () => axios.post(route('settings.services.toggle-active', service.id)).then(r => r.data), () => {
            router.reload({ only: ['services'] });
        }, t('settings.save_success'));
    };

    const deleteService = (service: any) => {
        swal.confirm(
            t('settings.services.delete_title'),
            t('settings.services.delete_msg', { name: service.name }),
            t('settings.services.confirm_delete')
        ).then((confirmed) => {
            if (confirmed) {
                handleAction('delete_' + service.id, () => axios.delete(route('settings.services.destroy', service.id)).then(r => r.data), () => {
                    router.reload({ only: ['services'] });
                }, t('settings.services.deleted'));
            }
        });
    };

    const getModeIcon = (mode: string) => {
        const m = MODES.find(x => x.value === mode);
        return m ? m.icon : Truck;
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('settings.services.name') || "Name",
            cell: ({ row }) => {
                const s = row.original;
                const IconComponent = getModeIcon(s.mode);
                return (
                    <div className="flex items-center gap-2 font-medium">
                        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <IconComponent className="h-3.5 w-3.5" />
                            {s.name}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: "code",
            header: t('settings.services.code') || "Code",
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-xs">
                    {row.original.code}
                </Badge>
            )
        },
        {
            accessorKey: "mode",
            header: t('settings.services.mode') || "Mode",
            cell: ({ row }) => {
                const mode = row.original.mode || 'air';
                const labelKey = `settings.services.mode_${mode}`;
                return (
                    <span className="text-sm text-muted-foreground capitalize">
                        {t(labelKey) || mode}
                    </span>
                );
            }
        },
        {
            accessorKey: "currency",
            header: t('settings.services.currency_label'),
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-xs">
                    {row.original.currency || 'USD'}
                </Badge>
            )
        },
        {
            accessorKey: "is_active",
            header: t('common.status') || "Status",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Switch
                        checked={row.original.is_active}
                        onCheckedChange={() => toggleActive(row.original)}
                    />
                    <Badge variant={row.original.is_active ? "default" : "secondary"}>
                        {row.original.is_active ? (t('common.active') || "Active") : (t('common.inactive') || "Inactive")}
                    </Badge>
                </div>
            )
        },
        {
            id: "actions",
            header: t('common.actions') || "Actions",
            cell: ({ row }) => {
                const service = row.original;
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
                                <DropdownMenuItem onClick={() => openEditModal(service)} className="cursor-pointer">
                                    <Edit2 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                    {t('common.edit') || "Edit"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => deleteService(service)}
                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {t('settings.services.delete') || "Delete"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        }
    ];

    return (
        <SettingsLayout title={t('settings.menu.services') || "Services"}>
            <SettingsTable
                title={t('settings.services.title') || "Services"}
                description={t('settings.services.desc') || "Manage shipping services by mode: air, sea, land. Active services appear in the shipment wizard."}
                actionLabel={t('settings.services.add') || "Add Service"}
                onAction={openCreateModal}
                columns={columns}
                data={services || []}
                searchPlaceholder={t('common.search') || "Search..."}
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingService
                                ? (t('settings.services.edit') || 'Edit Service')
                                : (t('settings.services.add') || 'Add New Service')
                            }
                        </DialogTitle>
                        <DialogDescription>
                            {t('settings.services.desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    {t('settings.services.name')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))}
                                    placeholder={t('settings.services.name_placeholder') || "e.g. Express Air, Standard Sea"}
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    {t('settings.services.code')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData((p: any) => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                                    placeholder={t('settings.services.code_placeholder')}
                                    required
                                />
                                {errors.code && <p className="text-red-500 text-xs">{errors.code}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mode">
                                {t('settings.services.mode')} <span className="text-red-500">*</span>
                            </Label>
                            <Select value={formData.mode} onValueChange={(value) => setFormData((p: any) => ({ ...p, mode: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('settings.services.select_mode') || "Select mode"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {MODES.map((m) => {
                                        const IconComponent = m.icon;
                                        return (
                                            <SelectItem key={m.value} value={m.value}>
                                                <div className="flex items-center gap-2">
                                                    <IconComponent className="h-4 w-4" />
                                                    {t(m.labelKey) || m.value}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {errors.mode && <p className="text-red-500 text-xs">{errors.mode}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t('settings.services.description')}</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData((p: any) => ({ ...p, description: e.target.value }))}
                                placeholder={t('settings.services.description_placeholder') || "Optional description"}
                            />
                            {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">
                                {t('settings.services.currency_label')} <span className="text-red-500">*</span>
                            </Label>
                            <SearchableSelect
                                value={formData.currency}
                                onChange={(value) => setFormData((p: any) => ({ ...p, currency: value }))}
                                options={(currencies || []).map((curr: { code: string; name: string; symbol: string }) => ({
                                    value: curr.code,
                                    label: `${curr.code} - ${curr.name} (${curr.symbol})`,
                                    keywords: [curr.name, curr.symbol],
                                }))}
                                placeholder={t('settings.services.select_currency')}
                                searchPlaceholder={t('settings.services.search_currency')}
                                emptyText={t('settings.services.no_currencies')}
                            />
                            <p className="text-xs text-gray-500">{t('settings.services.currency_hint')}</p>
                            {errors.currency && <p className="text-red-500 text-xs">{errors.currency}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="base_price">
                                    {t('settings.services.base_price') || 'Base Price'} ({formData.currency || 'USD'})
                                </Label>
                                <Input
                                    id="base_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData((p: any) => ({ ...p, base_price: parseFloat(e.target.value) || 0 }))}
                                    placeholder={t('settings.services.base_price_placeholder')}
                                />
                                <p className="text-xs text-gray-500">{t('settings.services.base_price_hint')}</p>
                                {errors.base_price && <p className="text-red-500 text-xs">{errors.base_price}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price_per_kg">
                                    {t('settings.services.price_per_kg') || 'Price per Kg'} ({formData.currency || 'USD'})
                                </Label>
                                <Input
                                    id="price_per_kg"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price_per_kg}
                                    onChange={(e) => setFormData((p: any) => ({ ...p, price_per_kg: parseFloat(e.target.value) || 0 }))}
                                    placeholder={t('settings.services.price_per_kg_placeholder')}
                                />
                                <p className="text-xs text-gray-500">{t('settings.services.price_per_kg_hint')}</p>
                                {errors.price_per_kg && <p className="text-red-500 text-xs">{errors.price_per_kg}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sort_order">{t('settings.services.sort_order')}</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData((p: any) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                                    min="0"
                                />
                                {errors.sort_order && <p className="text-red-500 text-xs">{errors.sort_order}</p>}
                            </div>

                            <div className="space-y-2 flex items-end">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData((p: any) => ({ ...p, is_active: checked }))}
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">
                                        {t('common.active') || "Active"}
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={loading.save} className="bg-primary hover:bg-primary/90">
                                {loading.save
                                    ? (t('common.loading') || 'Loading...')
                                    : (editingService
                                        ? (t('common.update') || 'Update')
                                        : (t('common.create') || 'Create')
                                    )
                                }
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SettingsLayout>
    );
}
