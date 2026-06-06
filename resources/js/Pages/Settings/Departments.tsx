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
import { Trash2, Edit2, MoreHorizontal, Building } from "lucide-react";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsTable } from './_components/SettingsTable';
import { useTranslation } from "@/hooks/useTranslation";

const emptyForm = () => ({ name: '', code: '' });

export default function Departments({ departments }: { departments: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<any>(null);
    const [formData, setFormData] = useState(emptyForm());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const swal = useSweetAlert();
    const { t } = useTranslation();

    const openCreateModal = () => {
        setEditingDepartment(null);
        setFormData(emptyForm());
        setErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (department: any) => {
        setEditingDepartment(department);
        setFormData({ name: department.name, code: department.code || '' });
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
        const payload = { name: formData.name, code: formData.code };
        if (editingDepartment) {
            handleAction('save', () => axios.put(route('settings.departments.update', editingDepartment.id), payload).then(r => r.data), () => {
                setIsModalOpen(false);
                setFormData(emptyForm());
                router.reload({ only: ['departments'] });
            }, t('settings.departments.updated'));
        } else {
            handleAction('save', () => axios.post(route('settings.departments.store'), payload).then(r => r.data), () => {
                setIsModalOpen(false);
                setFormData(emptyForm());
                router.reload({ only: ['departments'] });
            }, t('settings.departments.created'));
        }
    };

    const deleteDepartment = (department: any) => {
        const usersCount = department.users_count || 0;

        if (usersCount > 0) {
            swal.toast(
                t('settings.departments.has_users') || `This department has ${usersCount} user(s). Please reassign users before deleting.`,
                'error'
            );
            return;
        }

        swal.confirm(
            t('settings.departments.delete_title') || 'Are you sure?',
            (t('settings.departments.delete_msg') || 'Delete department {name}?').replace('{name}', department.name),
            t('settings.departments.confirm_delete') || 'Yes, delete'
        ).then((confirmed) => {
            if (confirmed) {
                handleAction('delete_' + department.id, () => axios.delete(route('settings.departments.destroy', department.id)).then(r => r.data), () => {
                    router.reload({ only: ['departments'] });
                }, t('settings.departments.deleted'));
            }
        });
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: t('settings.departments.name') || "Department Name",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Building className="h-4 w-4 text-gray-400" />
                    {row.original.name}
                </div>
            )
        },
        {
            accessorKey: "code",
            header: t('settings.departments.code') || "Code",
            cell: ({ row }) => row.original.code ? <Badge variant="outline">{row.original.code}</Badge> : <span className="text-gray-400">-</span>
        },
        {
            accessorKey: "users_count",
            header: t('settings.departments.users') || "Active Users",
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {row.original.users_count} {t('common.users') || "Users"}
                </Badge>
            )
        },
        {
            id: "actions",
            header: t('common.actions') || "Action",
            cell: ({ row }) => {
                const department = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 rounded-full">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(department)} className="cursor-pointer">
                                    <Edit2 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                    {t('common.edit') || "Edit details"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => deleteDepartment(department)}
                                    disabled={department.users_count > 0}
                                    className={department.users_count > 0
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50'
                                    }
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {t('settings.departments.delete_title') || "Delete Department"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        }
    ];

    return (
        <SettingsLayout title={t('settings.menu.departments') || "Department Management"}>
            <SettingsTable
                title={t('settings.departments.title') || "Departments"}
                description={t('settings.departments.desc') || "Manage your organization's departments and structure."}
                actionLabel={t('settings.departments.add') || "Add Department"}
                onAction={openCreateModal}
                columns={columns}
                data={departments || []}
                searchPlaceholder={t('common.search') || "Search..."}
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingDepartment ? (t('settings.departments.edit') || 'Edit Department') : (t('settings.departments.add') || 'Add New Department')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.departments.desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('settings.departments.name')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('settings.departments.name_placeholder')}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">{t('settings.departments.code')}</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                placeholder={t('settings.departments.code_placeholder')}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={loading.save} className="bg-primary hover:bg-primary/90">
                                {loading.save ? t('common.loading') : (t('settings.departments.save') || 'Save Department')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SettingsLayout>
    );
}
