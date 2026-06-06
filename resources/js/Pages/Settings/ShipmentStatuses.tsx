import { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { Trash2, Edit2, MoreHorizontal, Package, Clock, RefreshCw, Truck, CheckCircle, CheckCircle2, XCircle, AlertTriangle, PauseCircle, RotateCcw, Circle, Loader2, MapPin, FileText } from "lucide-react";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsTable } from './_components/SettingsTable';
import { useTranslation } from "@/hooks/useTranslation";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
    Circle, Loader2, MapPin, FileText, Clock, RefreshCw, Truck, Package,
    CheckCircle, CheckCircle2, XCircle, AlertTriangle, PauseCircle, RotateCcw,
};

const getIconComponent = (iconName: string) => ICON_MAP[iconName] ?? Clock;

const AVAILABLE_ICONS = [
    { value: 'Clock', label: 'Clock', icon: Clock },
    { value: 'RefreshCw', label: 'Refresh', icon: RefreshCw },
    { value: 'Truck', label: 'Truck', icon: Truck },
    { value: 'Package', label: 'Package', icon: Package },
    { value: 'CheckCircle', label: 'Check Circle', icon: CheckCircle },
    { value: 'CheckCircle2', label: 'Check Circle 2', icon: CheckCircle2 },
    { value: 'XCircle', label: 'X Circle', icon: XCircle },
    { value: 'AlertTriangle', label: 'Alert', icon: AlertTriangle },
    { value: 'PauseCircle', label: 'Pause', icon: PauseCircle },
    { value: 'RotateCcw', label: 'Return', icon: RotateCcw },
    { value: 'Circle', label: 'Circle', icon: Circle },
    { value: 'Loader2', label: 'Loading', icon: Loader2 },
    { value: 'MapPin', label: 'Location', icon: MapPin },
    { value: 'FileText', label: 'Document', icon: FileText },
];

const emptyForm = () => ({
    name: '',
    code: '',
    icon: 'Clock',
    color: '#6B7280',
    order: 0,
    is_active: true,
});

export default function ShipmentStatuses({ statuses }: { statuses: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<any>(null);
    const [formData, setFormData] = useState(emptyForm());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const swal = useSweetAlert();
    const { t } = useTranslation();

    const openCreateModal = () => {
        setEditingStatus(null);
        setFormData(emptyForm());
        setErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (status: any) => {
        setEditingStatus(status);
        setFormData({
            name: status.name,
            code: status.code,
            icon: status.icon || 'Clock',
            color: status.color || '#6B7280',
            order: status.order || 0,
            is_active: status.is_active !== undefined ? status.is_active : true,
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
        if (editingStatus) {
            handleAction('save', () => axios.put(route('settings.shipment-statuses.update', editingStatus.id), formData).then(r => r.data), () => {
                setIsModalOpen(false);
                router.reload({ only: ['statuses'] });
            }, t('settings.shipment_statuses.updated'));
        } else {
            handleAction('save', () => axios.post(route('settings.shipment-statuses.store'), formData).then(r => r.data), () => {
                setIsModalOpen(false);
                router.reload({ only: ['statuses'] });
            }, t('settings.shipment_statuses.created'));
        }
    };

    const deleteStatus = (status: any) => {
        const shipmentsCount = status.shipments_count || 0;

        if (shipmentsCount > 0) {
            swal.toast(
                t('settings.shipment_statuses.has_shipments', { count: shipmentsCount }) || `This status has ${shipmentsCount} shipment(s) assigned. Please reassign them first.`,
                'error'
            );
            return;
        }

        swal.confirm(
            t('settings.shipment_statuses.delete_title') || 'Are you sure?',
            (t('settings.shipment_statuses.delete_msg') || 'Delete status {name}?').replace('{name}', status.name),
            t('settings.shipment_statuses.confirm_delete') || 'Yes, delete'
        ).then((confirmed) => {
            if (confirmed) {
                handleAction('delete_' + status.id, () => axios.delete(route('settings.shipment-statuses.destroy', status.id)).then(r => r.data), () => {
                    router.reload({ only: ['statuses'] });
                }, t('settings.shipment_statuses.deleted'));
            }
        });
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('settings.shipment_statuses.name') || "Status Name",
            cell: ({ row }) => {
                const status = row.original;
                const IconComponent = getIconComponent(status.icon || 'Clock');
                return (
                    <div className="flex items-center gap-2 font-medium">
                        <div
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border"
                            style={{
                                backgroundColor: `${status.color}20`,
                                color: status.color,
                                borderColor: `${status.color}40`
                            }}
                        >
                            <IconComponent className="h-3.5 w-3.5" />
                            {status.name}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: "code",
            header: t('settings.shipment_statuses.code') || "Code",
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-xs">
                    {row.original.code}
                </Badge>
            )
        },
        {
            accessorKey: "icon",
            header: t('settings.shipment_statuses.icon') || "Icon",
            cell: ({ row }) => {
                const IconComponent = getIconComponent(row.original.icon || 'Clock');
                return <IconComponent className="h-4 w-4 text-muted-foreground" />;
            }
        },
        {
            accessorKey: "color",
            header: t('settings.shipment_statuses.color') || "Color",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div
                        className="h-5 w-5 rounded border border-border"
                        style={{ backgroundColor: row.original.color }}
                    />
                    <span className="text-xs font-mono text-muted-foreground">{row.original.color}</span>
                </div>
            )
        },
        {
            accessorKey: "order",
            header: t('settings.shipment_statuses.order') || "Order",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.order || 0}</span>
            )
        },
        {
            accessorKey: "shipments_count",
            header: t('settings.shipment_statuses.shipments') || "Shipments",
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {row.original.shipments_count || 0} {t('common.shipments') || "Shipments"}
                </Badge>
            )
        },
        {
            accessorKey: "is_active",
            header: t('common.status') || "Status",
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? "default" : "secondary"}>
                    {row.original.is_active ? (t('common.active') || "Active") : (t('common.inactive') || "Inactive")}
                </Badge>
            )
        },
        {
            id: "actions",
            header: t('common.actions') || "Actions",
            cell: ({ row }) => {
                const status = row.original;
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
                                <DropdownMenuItem onClick={() => openEditModal(status)} className="cursor-pointer">
                                    <Edit2 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                    {t('common.edit') || "Edit"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => deleteStatus(status)}
                                    disabled={(status.shipments_count || 0) > 0}
                                    className={(status.shipments_count || 0) > 0
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50'
                                    }
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {t('settings.shipment_statuses.delete') || "Delete"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        }
    ];

    return (
        <SettingsLayout title={t('settings.menu.shipment_statuses') || "Shipment Statuses"}>
            <SettingsTable
                title={t('settings.shipment_statuses.title') || "Shipment Statuses"}
                description={t('settings.shipment_statuses.desc') || "Manage shipment statuses with custom icons and colors."}
                actionLabel={t('settings.shipment_statuses.add') || "Add Status"}
                onAction={openCreateModal}
                columns={columns}
                data={statuses || []}
                searchPlaceholder={t('common.search') || "Search..."}
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStatus
                                ? (t('settings.shipment_statuses.edit') || 'Edit Status')
                                : (t('settings.shipment_statuses.add') || 'Add New Status')
                            }
                        </DialogTitle>
                        <DialogDescription>
                            {t('settings.shipment_statuses.desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    {t('settings.shipment_statuses.name')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Pending, Delivered"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    {t('settings.shipment_statuses.code')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                                    placeholder="e.g. pending, delivered"
                                    required
                                />
                                {errors.code && <p className="text-red-500 text-xs">{errors.code}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="icon">
                                    {t('settings.shipment_statuses.icon')} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={formData.icon} onValueChange={(value) => setFormData(p => ({ ...p, icon: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('settings.shipment_statuses.select_icon') || "Select icon"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AVAILABLE_ICONS.map((icon) => {
                                            const IconComponent = icon.icon;
                                            return (
                                                <SelectItem key={icon.value} value={icon.value}>
                                                    <div className="flex items-center gap-2">
                                                        <IconComponent className="h-4 w-4" />
                                                        <span>{icon.label}</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {errors.icon && <p className="text-red-500 text-xs">{errors.icon}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="color">
                                    {t('settings.shipment_statuses.color')} <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
                                        className="h-10 w-20 p-1 cursor-pointer"
                                        required
                                    />
                                    <Input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
                                        placeholder="#6B7280"
                                        className="flex-1"
                                        required
                                    />
                                </div>
                                {errors.color && <p className="text-red-500 text-xs">{errors.color}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="order">{t('settings.shipment_statuses.order')}</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={formData.order}
                                    onChange={(e) => setFormData(p => ({ ...p, order: parseInt(e.target.value) || 0 }))}
                                    min="0"
                                />
                                {errors.order && <p className="text-red-500 text-xs">{errors.order}</p>}
                            </div>

                            <div className="space-y-2 flex items-end">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">
                                        {t('common.active') || "Active"}
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="space-y-2">
                            <Label>{t('settings.shipment_statuses.preview') || "Preview"}</Label>
                            <div className="p-4 border rounded-lg bg-muted/30">
                                <div
                                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border w-fit"
                                    style={{
                                        backgroundColor: `${formData.color}20`,
                                        color: formData.color,
                                        borderColor: `${formData.color}40`
                                    }}
                                >
                                    {(() => {
                                        const IconComponent = getIconComponent(formData.icon);
                                        return <IconComponent className="h-3.5 w-3.5" />;
                                    })()}
                                    {formData.name || t('settings.shipment_statuses.status_name') || "Status Name"}
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
                                    : (editingStatus
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
