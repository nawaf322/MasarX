import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { SearchableSelect } from "@/Components/UI/searchable-select";
import { Scan, FileText, X, ArrowLeft, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';

export default function Create({ drivers }: { drivers: any[] }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        driver_id: '',
        shipment_ids: [] as number[],
    });

    const [trackingInput, setTrackingInput] = useState('');
    const [scannedShipments, setScannedShipments] = useState<any[]>([]);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleScan = async (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault();
        setScanError(null);
        if (!trackingInput.trim() || scanning) return;

        setScanning(true);
        try {
            const response = await axios.get(route('warehouse.lookup'), {
                params: { tracking_number: trackingInput.trim() },
            });

            const shipment = response.data.shipment;
            if (!shipment?.id) {
                setScanError(t('warehouse.tracking_not_found'));
                return;
            }

            if (scannedShipments.some(s => s.id === shipment.id)) {
                setScanError(t('warehouse.already_in_list'));
                return;
            }

            const city = shipment.receiver_details?.city || '';
            const country = shipment.receiver_details?.country || '';
            const destination = [city, country].filter(Boolean).join(', ') || '—';

            setScannedShipments(prev => [...prev, { ...shipment, destination }]);
            setData('shipment_ids', [...data.shipment_ids, shipment.id]);
            setTrackingInput('');
        } catch (err: any) {
            setScanError(err.response?.status === 404
                ? t('warehouse.tracking_not_found')
                : (err.response?.data?.message || t('warehouse.tracking_not_found')));
        } finally {
            setScanning(false);
            inputRef.current?.focus();
        }
    };

    const removeShipment = (idx: number) => {
        const s = scannedShipments[idx];
        setScannedShipments(prev => prev.filter((_, i) => i !== idx));
        setData('shipment_ids', data.shipment_ids.filter((_, i) => i !== idx));
        inputRef.current?.focus();
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('warehouse.create_manifest_title')} />

            <div className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('warehouse.manifests.index')} className="gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            {t('warehouse.back_to_manifests')}
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-purple-100 rounded-lg">
                        <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{t('warehouse.create_manifest_title')}</h2>
                        <p className="text-muted-foreground">{t('warehouse.create_manifest_subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); post(route('warehouse.manifests.store')); }} className="space-y-6">
                    {/* Driver Selection - Input buscador con autoscroll */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <Label className="mb-3 block font-medium">{t('warehouse.assign_driver')}</Label>
                        <SearchableSelect
                            value={data.driver_id || ''}
                            onChange={(val) => setData('driver_id', val)}
                            placeholder={t('warehouse.select_driver')}
                            searchPlaceholder={t('warehouse.search_driver')}
                            className={errors.driver_id ? 'border-red-500 ring-red-500 h-11' : 'h-11'}
                            options={drivers.map((d: any) => ({ value: d.id.toString(), label: d.name }))}
                        />
                        {errors.driver_id && <p className="text-red-500 text-sm mt-2">{errors.driver_id}</p>}
                    </div>

                    {/* Scan Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold mb-4">{t('warehouse.add_shipments')}</h3>
                        <div className="flex gap-3 mb-4">
                            <div className="relative flex-1">
                                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    ref={inputRef}
                                    value={trackingInput}
                                    onChange={e => setTrackingInput(e.target.value)}
                                    placeholder={t('warehouse.scan_placeholder')}
                                    className="pl-10 h-11"
                                    autoFocus
                                    disabled={scanning}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleScan(e);
                                    }}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-11 px-6"
                                disabled={scanning || !trackingInput.trim()}
                                onClick={(e) => handleScan(e)}
                            >
                                {t('warehouse.add')}
                            </Button>
                        </div>

                        {scanError && (
                            <div className="flex items-center gap-2 mb-4 text-red-600 text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {scanError}
                            </div>
                        )}

                        <div className="border rounded-lg divide-y bg-gray-50/50">
                            {scannedShipments.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    {t('warehouse.no_shipments_added')}
                                </div>
                            ) : (
                                scannedShipments.map((s, idx) => (
                                    <div key={s.id} className="p-3 flex justify-between items-center text-sm bg-white first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-medium text-gray-900">{s.tracking_number}</span>
                                            <span className="text-gray-500">{s.destination}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            type="button"
                                            onClick={() => removeShipment(idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" asChild>
                            <Link href={route('warehouse.manifests.index')}>{t('common.cancel')}</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || scannedShipments.length === 0 || !data.driver_id}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {t('warehouse.create_manifest')} ({scannedShipments.length})
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
