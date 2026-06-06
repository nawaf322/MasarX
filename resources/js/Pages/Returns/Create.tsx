import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Textarea } from '@/Components/UI/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, Search, AlertTriangle } from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface ShipmentData {
    id: number;
    tracking_number: string;
    sender_details: { name?: string };
    receiver_details: { name?: string };
    total: number;
    currency: string;
    status?: string;
}

interface Props {
    shipment: ShipmentData | null;
    deliveredShipments: ShipmentData[];
    blockedByReturn?: boolean;
}

export default function ReturnsCreate({ shipment, deliveredShipments, blockedByReturn = false }: Props) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [shipmentSearch, setShipmentSearch] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<ShipmentData | null>(shipment);
    const [form, setForm] = useState({
        original_shipment_id: shipment?.id?.toString() ?? '',
        reason: '',
        reason_notes: '',
        refund_amount: shipment?.total?.toString() ?? '',
        refund_method: '',
    });

    const filteredShipments = useMemo(() => {
        if (!shipmentSearch) return deliveredShipments.slice(0, 50);
        const q = shipmentSearch.toLowerCase();
        return deliveredShipments.filter(s =>
            s.tracking_number.toLowerCase().includes(q) ||
            (s.sender_details?.name ?? '').toLowerCase().includes(q) ||
            (s.receiver_details?.name ?? '').toLowerCase().includes(q)
        ).slice(0, 50);
    }, [shipmentSearch, deliveredShipments]);

    const handleSelectShipment = (s: ShipmentData) => {
        setSelectedShipment(s);
        setForm(f => ({
            ...f,
            original_shipment_id: s.id.toString(),
            refund_amount: s.total?.toString() ?? '',
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('returns.store'), form, {
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('returns.create')} />
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
                    </Button>
                    <h1 className="text-xl font-semibold">{t('returns.create')}</h1>
                </div>

                {/* Blocked alert — shown when the pre-selected shipment already has a return */}
                {blockedByReturn && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                        <div>
                            <p className="font-semibold">{t('returns.duplicate_return')}</p>
                            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{t('returns.shipment_already_returned')}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

                    {/* Shipment selector — hidden if pre-selected via ?shipment_id= */}
                    {!shipment && (
                        <div className="space-y-2">
                            <Label>{t('returns.original_shipment')} *</Label>
                            {selectedShipment ? (
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm">
                                    <div>
                                        <p className="font-mono font-medium">{selectedShipment.tracking_number}</p>
                                        <p className="text-muted-foreground text-xs mt-0.5">
                                            {selectedShipment.sender_details?.name} → {selectedShipment.receiver_details?.name}
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                                        setSelectedShipment(null);
                                        setForm(f => ({ ...f, original_shipment_id: '', refund_amount: '' }));
                                    }}>{t('common.change')}</Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('returns.search_shipment')}
                                            value={shipmentSearch}
                                            onChange={e => setShipmentSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    {deliveredShipments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground px-1">{t('returns.no_delivered_shipments')}</p>
                                    ) : (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                            {filteredShipments.map(s => (
                                                <button
                                                    type="button"
                                                    key={s.id}
                                                    onClick={() => handleSelectShipment(s)}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-medium">{s.tracking_number}</span>
                                                        {s.status && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                                                {s.status.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-muted-foreground text-xs">
                                                        {s.sender_details?.name} → {s.receiver_details?.name}
                                                        {s.total ? ` · ${s.currency} ${Number(s.total).toFixed(2)}` : ''}
                                                    </span>
                                                </button>
                                            ))}
                                            {filteredShipments.length === 0 && (
                                                <p className="px-4 py-3 text-sm text-muted-foreground">{t('common.no_results')}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pre-selected shipment info */}
                    {selectedShipment && shipment && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 text-sm space-y-1">
                            <p className="font-medium text-blue-800 dark:text-blue-300">{t('returns.original_shipment')}</p>
                            <p>{t('shipments.tracking_number')}: <strong>{selectedShipment.tracking_number}</strong></p>
                            <p>{t('shipments.sender')}: <strong>{selectedShipment.sender_details?.name ?? '—'}</strong></p>
                            <p>{t('shipments.receiver')}: <strong>{selectedShipment.receiver_details?.name ?? '—'}</strong></p>
                            <p>{t('returns.order_value')}: <strong>{selectedShipment.currency} {Number(selectedShipment.total).toFixed(2)}</strong></p>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <Label>{t('returns.reason')} *</Label>
                        <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                            <SelectTrigger><SelectValue placeholder={t('returns.select_reason')} /></SelectTrigger>
                            <SelectContent>
                                {['damaged', 'wrong_item', 'not_delivered', 'customer_request', 'other'].map(r => (
                                    <SelectItem key={r} value={r}>{t(`returns.reason_${r}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="reason_notes">{t('returns.reason_notes')}</Label>
                        <Textarea
                            id="reason_notes"
                            rows={3}
                            value={form.reason_notes}
                            onChange={e => setForm(f => ({ ...f, reason_notes: e.target.value }))}
                            maxLength={1000}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="refund_amount">{t('returns.refund_amount')}</Label>
                            <Input
                                id="refund_amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.refund_amount}
                                onChange={e => setForm(f => ({ ...f, refund_amount: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('returns.refund_method')}</Label>
                            <Select value={form.refund_method} onValueChange={v => setForm(f => ({ ...f, refund_method: v }))}>
                                <SelectTrigger><SelectValue placeholder={t('returns.select_method')} /></SelectTrigger>
                                <SelectContent>
                                    {['original', 'store_credit', 'cash'].map(m => (
                                        <SelectItem key={m} value={m}>{t(`returns.method_${m}`)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={submitting || !form.reason || !form.original_shipment_id || blockedByReturn}
                        className="w-full"
                    >
                        {submitting ? t('common.saving') : t('returns.submit_return')}
                    </Button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
