import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Textarea } from '@/Components/UI/textarea';
import { Badge } from '@/Components/UI/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, Download, CheckCircle2, Camera, PenLine } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ShipmentData {
    id: number;
    tracking_number: string;
    sender_details: { name?: string };
    receiver_details: { name?: string };
    status: string;
}

interface PodData {
    id: number;
    recipient_name: string;
    recipient_id_number?: string;
    signature?: string;
    photos?: string[];
    notes?: string;
    delivered_at: string;
    created_by?: { name: string };
}

interface Props {
    shipment: ShipmentData;
    pod: PodData | null;
}

export default function ProofOfDelivery({ shipment, pod }: Props) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatureData, setSignatureData] = useState<string>('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        recipient_name: '',
        recipient_id_number: '',
        notes: '',
        delivered_at: new Date().toISOString().slice(0, 16),
    });

    // Canvas drawing
    const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            const rect = canvasRef.current!.getBoundingClientRect();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        }
    };
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const rect = canvasRef.current!.getBoundingClientRect();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#111';
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
        }
    };
    const endDraw = () => {
        setIsDrawing(false);
        setSignatureData(canvasRef.current?.toDataURL('image/png') ?? '');
    };
    const clearSignature = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setSignatureData('');
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        setPhotos(files);
        setPreviews(files.map(f => URL.createObjectURL(f)));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const data = new FormData();
        data.append('recipient_name', form.recipient_name);
        data.append('recipient_id_number', form.recipient_id_number);
        data.append('notes', form.notes);
        data.append('delivered_at', form.delivered_at);
        if (signatureData) data.append('signature', signatureData);
        photos.forEach(p => data.append('photos[]', p));

        router.post(route('shipments.pod.store', shipment.id), data as any, {
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('pod.title')} />
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {t('common.back')}
                    </Button>
                    <h1 className="text-xl font-semibold">{t('pod.title')}</h1>
                </div>

                {/* Shipment Info */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1">
                    <p className="text-sm text-muted-foreground">{t('shipments.tracking_number')}: <strong>{shipment.tracking_number}</strong></p>
                    <p className="text-sm text-muted-foreground">{t('shipments.sender')}: <strong>{shipment.sender_details?.name ?? '—'}</strong></p>
                    <p className="text-sm text-muted-foreground">{t('shipments.receiver')}: <strong>{shipment.receiver_details?.name ?? '—'}</strong></p>
                    <Badge variant="outline">{shipment.status}</Badge>
                </div>

                {pod ? (
                    /* ── Already captured ── */
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">{t('pod.already_captured')}</span>
                            </div>
                            <Button size="sm" asChild>
                                <a href={route('shipments.pod.download', shipment.id)}>
                                    <Download className="w-4 h-4 mr-1" />
                                    {t('pod.download')}
                                </a>
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-muted-foreground">{t('pod.recipient_name')}:</span> <strong>{pod.recipient_name}</strong></div>
                            {pod.recipient_id_number && <div><span className="text-muted-foreground">{t('pod.recipient_id')}:</span> <strong>{pod.recipient_id_number}</strong></div>}
                            <div><span className="text-muted-foreground">{t('pod.delivered_at')}:</span> <strong>{new Date(pod.delivered_at).toLocaleString()}</strong></div>
                            {pod.created_by && <div><span className="text-muted-foreground">{t('common.captured_by')}:</span> <strong>{pod.created_by.name}</strong></div>}
                        </div>
                        {pod.notes && <p className="text-sm"><span className="text-muted-foreground">{t('pod.notes')}:</span> {pod.notes}</p>}
                        {pod.signature && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">{t('pod.signature')}:</p>
                                <img src={pod.signature} alt="signature" className="border rounded max-w-xs" />
                            </div>
                        )}
                        {pod.photos && pod.photos.length > 0 && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">{t('pod.photos')}:</p>
                                <div className="flex flex-wrap gap-2">
                                    {pod.photos.map((p, i) => (
                                        <img key={i} src={`/storage/${p}`} alt="delivery photo" className="w-24 h-24 object-cover rounded border" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Capture form ── */
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                        <h2 className="font-medium text-lg">{t('pod.capture')}</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="recipient_name">{t('pod.recipient_name')} *</Label>
                                <Input
                                    id="recipient_name"
                                    value={form.recipient_name}
                                    onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="recipient_id_number">{t('pod.recipient_id')}</Label>
                                <Input
                                    id="recipient_id_number"
                                    value={form.recipient_id_number}
                                    onChange={e => setForm(f => ({ ...f, recipient_id_number: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="delivered_at">{t('pod.delivered_at')} *</Label>
                                <Input
                                    id="delivered_at"
                                    type="datetime-local"
                                    value={form.delivered_at}
                                    onChange={e => setForm(f => ({ ...f, delivered_at: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Signature */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1"><PenLine className="w-4 h-4" />{t('pod.signature')}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                                    {t('pod.clear_signature')}
                                </Button>
                            </div>
                            <canvas
                                ref={canvasRef}
                                width={500}
                                height={150}
                                className="border rounded w-full bg-gray-50 dark:bg-gray-800 cursor-crosshair"
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={endDraw}
                                onMouseLeave={endDraw}
                            />
                        </div>

                        {/* Photos */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1"><Camera className="w-4 h-4" />{t('pod.photos')}</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoChange}
                            />
                            {previews.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {previews.map((src, i) => (
                                        <img key={i} src={src} alt="preview" className="w-20 h-20 object-cover rounded border" />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label htmlFor="notes">{t('pod.notes')}</Label>
                            <Textarea
                                id="notes"
                                rows={3}
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                maxLength={1000}
                            />
                        </div>

                        <Button type="submit" disabled={submitting} className="w-full">
                            {submitting ? t('common.saving') : t('pod.save')}
                        </Button>
                    </form>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
