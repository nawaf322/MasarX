import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Textarea } from '@/Components/UI/textarea';
import { Badge } from '@/Components/UI/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';

interface ShipmentData {
    id: number;
    tracking_number: string;
    sender_details: { name?: string };
    receiver_details: { name?: string };
}

interface DeclarationItem {
    description: string;
    quantity: number;
    unit_value: number;
    total_value: number;
    hs_code: string;
    country_of_origin: string;
}

interface DeclarationData {
    id: number;
    declaration_type: string;
    items: DeclarationItem[];
    declared_value: number;
    currency: string;
    insurance_required: boolean;
    insurance_value?: number;
    notes?: string;
}

interface Props {
    shipment: ShipmentData;
    declaration: DeclarationData | null;
}

const emptyItem = (): DeclarationItem => ({
    description: '', quantity: 1, unit_value: 0, total_value: 0, hs_code: '', country_of_origin: '',
});

export default function CustomsDeclaration({ shipment, declaration }: Props) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [declarationType, setDeclarationType] = useState(declaration?.declaration_type ?? 'gift');
    const [items, setItems] = useState<DeclarationItem[]>(declaration?.items ?? [emptyItem()]);
    const [currency, setCurrency] = useState(declaration?.currency ?? 'USD');
    const [insuranceRequired, setInsuranceRequired] = useState(declaration?.insurance_required ?? false);
    const [insuranceValue, setInsuranceValue] = useState(declaration?.insurance_value?.toString() ?? '');
    const [notes, setNotes] = useState(declaration?.notes ?? '');

    const totalDeclared = items.reduce((sum, item) => sum + Number(item.total_value), 0);

    const updateItem = (index: number, field: keyof DeclarationItem, value: string | number) => {
        setItems(prev => prev.map((it, i) => {
            if (i !== index) return it;
            const updated = { ...it, [field]: value };
            if (field === 'quantity' || field === 'unit_value') {
                updated.total_value = Number(updated.quantity) * Number(updated.unit_value);
            }
            return updated;
        }));
    };

    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('shipments.customs.store', shipment.id), {
            declaration_type: declarationType,
            items,
            declared_value: totalDeclared,
            currency,
            insurance_required: insuranceRequired,
            insurance_value: insuranceValue ? Number(insuranceValue) : null,
            notes,
        }, { onFinish: () => setSubmitting(false) });
    };

    const handleDelete = () => {
        if (confirm(t('customs.confirm_delete'))) {
            router.delete(route('shipments.customs.destroy', shipment.id));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('customs.title')} />
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
                    </Button>
                    <h1 className="text-xl font-semibold">{t('customs.title')}</h1>
                </div>

                {/* Shipment Info */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-muted-foreground">{t('shipments.tracking_number')}:</span> <strong>{shipment.tracking_number}</strong></div>
                    <div><span className="text-muted-foreground">{t('shipments.sender')}:</span> <strong>{shipment.sender_details?.name ?? '—'}</strong></div>
                    <div><span className="text-muted-foreground">{t('shipments.receiver')}:</span> <strong>{shipment.receiver_details?.name ?? '—'}</strong></div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-medium">{t('customs.declaration_details')}</h2>
                        {declaration && (
                            <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                                {t('customs.delete_declaration')}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>{t('customs.declaration_type')}</Label>
                            <Select value={declarationType} onValueChange={setDeclarationType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['gift', 'sale', 'sample', 'return', 'other'].map(type => (
                                        <SelectItem key={type} value={type}>{t(`customs.type_${type}`)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('customs.currency')}</Label>
                            <Input value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3} />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>{t('customs.items')}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-1" />{t('customs.add_item')}
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-2 font-medium">{t('customs.item_description')}</th>
                                        <th className="text-left p-2 font-medium">{t('customs.qty')}</th>
                                        <th className="text-left p-2 font-medium">{t('customs.unit_value')}</th>
                                        <th className="text-left p-2 font-medium">{t('customs.total_value')}</th>
                                        <th className="text-left p-2 font-medium">{t('hs_codes.code')}</th>
                                        <th className="text-left p-2 font-medium">{t('customs.country_of_origin')}</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                                            <td className="p-1"><Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required /></td>
                                            <td className="p-1"><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-20" /></td>
                                            <td className="p-1"><Input type="number" min="0" step="0.01" value={item.unit_value} onChange={e => updateItem(i, 'unit_value', e.target.value)} className="w-24" /></td>
                                            <td className="p-1"><Input type="number" min="0" step="0.01" value={item.total_value} onChange={e => updateItem(i, 'total_value', e.target.value)} className="w-24" /></td>
                                            <td className="p-1"><Input value={item.hs_code} onChange={e => updateItem(i, 'hs_code', e.target.value)} className="w-28" /></td>
                                            <td className="p-1"><Input value={item.country_of_origin} onChange={e => updateItem(i, 'country_of_origin', e.target.value)} className="w-20" maxLength={2} /></td>
                                            <td className="p-1">
                                                {items.length > 1 && (
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-gray-200 dark:border-gray-700">
                                        <td colSpan={3} className="p-2 text-right font-medium">{t('customs.total_declared_value')}:</td>
                                        <td className="p-2 font-bold">{currency} {totalDeclared.toFixed(2)}</td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Insurance */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="insurance_required"
                            checked={insuranceRequired}
                            onChange={e => setInsuranceRequired(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="insurance_required">{t('customs.insurance_required')}</Label>
                        {insuranceRequired && (
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={t('customs.insurance_value')}
                                value={insuranceValue}
                                onChange={e => setInsuranceValue(e.target.value)}
                                className="w-40"
                            />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t('customs.notes')}</Label>
                        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? t('common.saving') : t('customs.save')}
                    </Button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
