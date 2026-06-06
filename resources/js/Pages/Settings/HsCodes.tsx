import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { useTranslation } from '@/hooks/useTranslation';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Plus, Search, Pencil, Trash2, X, Check, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';

interface HsCodeData {
    id: number;
    code: string;
    description: string;
    category?: string;
    is_active: boolean;
}

interface PaginatedHsCodes {
    data: HsCodeData[];
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    hsCodes: PaginatedHsCodes;
    filters: { search?: string };
}

interface FormState {
    code: string;
    description: string;
    category: string;
    is_active: boolean;
}

const emptyForm = (): FormState => ({ code: '', description: '', category: '', is_active: true });

export default function HsCodes({ hsCodes, filters }: Props) {
    const { t } = useTranslation();
    const swal = useSweetAlert();
    const [search, setSearch] = useState(filters.search ?? '');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<HsCodeData | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    const openCreate = () => {
        setEditItem(null);
        setForm(emptyForm());
        setShowModal(true);
    };

    const openEdit = (item: HsCodeData) => {
        setEditItem(item);
        setForm({ code: item.code, description: item.description, category: item.category ?? '', is_active: item.is_active });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let data;
            if (editItem) {
                data = (await axios.put(route('settings.hs-codes.update', editItem.id), form)).data;
            } else {
                data = (await axios.post(route('settings.hs-codes.store'), form)).data;
            }
            swal.toast(editItem ? t('hs_codes.updated') : t('hs_codes.created'), 'success');
            setShowModal(false);
            router.reload({ only: ['hsCodes'] });
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            const msg = errs
                ? Object.values(errs).flat().join(' ')
                : err?.response?.data?.error || err?.response?.data?.message || 'An error occurred.';
            swal.toast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm(t('hs_codes.confirm_delete'))) {
            try {
                const { data } = await axios.delete(route('settings.hs-codes.destroy', id));
                swal.toast(t('hs_codes.deleted'), 'success');
                router.reload({ only: ['hsCodes'] });
            } catch (err: any) {
                const msg = err?.response?.data?.error || err?.response?.data?.message || 'An error occurred.';
                swal.toast(msg, 'error');
            }
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('settings.hs-codes.index'), { search }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('hs_codes.title')} />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => history.back()}>
                            <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
                        </Button>
                        <h1 className="text-2xl font-bold">{t('hs_codes.title')}</h1>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-1" />{t('hs_codes.add')}
                    </Button>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        placeholder={t('hs_codes.search_placeholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button type="submit" variant="outline" size="sm">
                        <Search className="w-4 h-4" />
                    </Button>
                </form>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="text-left p-3 font-medium">{t('hs_codes.code')}</th>
                                    <th className="text-left p-3 font-medium">{t('hs_codes.description')}</th>
                                    <th className="text-left p-3 font-medium">{t('hs_codes.category')}</th>
                                    <th className="text-left p-3 font-medium">{t('hs_codes.active')}</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {hsCodes.data.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('hs_codes.no_data')}</td></tr>
                                )}
                                {hsCodes.data.map(item => (
                                    <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="p-3 font-mono font-medium">{item.code}</td>
                                        <td className="p-3">{item.description}</td>
                                        <td className="p-3 text-muted-foreground">{item.category ?? '—'}</td>
                                        <td className="p-3">
                                            {item.is_active
                                                ? <span className="flex items-center gap-1 text-green-600 text-xs"><Check className="w-3.5 h-3.5" />{t('hs_codes.yes')}</span>
                                                : <span className="flex items-center gap-1 text-red-500 text-xs"><X className="w-3.5 h-3.5" />{t('hs_codes.no')}</span>
                                            }
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {hsCodes.last_page > 1 && (
                        <div className="p-4 flex gap-1 justify-end border-t border-gray-100 dark:border-gray-800">
                            {hsCodes.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editItem ? t('hs_codes.edit') : t('hs_codes.add')}</h2>
                            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="hs_code">{t('hs_codes.code')} *</Label>
                                <Input id="hs_code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required maxLength={20} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="hs_desc">{t('hs_codes.description')} *</Label>
                                <Input id="hs_desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="hs_cat">{t('hs_codes.category')}</Label>
                                <Input id="hs_cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="hs_active"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="hs_active">{t('hs_codes.active')}</Label>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('common.save')}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
