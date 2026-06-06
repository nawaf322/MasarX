import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRef, useState, FormEventHandler, useCallback } from 'react';
import { Upload, X, Loader2, ArrowLeft, ClipboardCheck, CheckCircle, Package, Camera, FileText } from 'lucide-react';

interface Props {
    pickup: {
        id: number;
        status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
        contact_name: string;
        pickup_address: string;
        shipment: { id: number; tracking_number: string };
    };
    action: 'confirm' | 'complete';
}

export default function PickupsConfirm({ pickup, action }: Props) {
    const { t } = useTranslation();
    const fileRef  = useRef<HTMLInputElement>(null);
    const [photos, setPhotos]       = useState<File[]>([]);
    const [previews, setPreviews]   = useState<string[]>([]);
    const [notes, setNotes]         = useState('');
    const [processing, setProcessing] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const [dragging, setDragging]   = useState(false);

    const title    = action === 'confirm' ? t('pickups.confirm')  : t('pickups.complete');
    const subtitle = action === 'confirm' ? t('pickups.confirm_subtitle') : t('pickups.complete_subtitle');
    const ActionIcon = action === 'confirm' ? ClipboardCheck : CheckCircle;
    const accentColor = action === 'confirm' ? 'blue' : 'green';
    const btnClass = action === 'confirm'
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-green-600 hover:bg-green-700';

    function addFiles(files: File[]) {
        const imgs = files.filter(f => f.type.startsWith('image/'));
        if (imgs.length === 0) return;
        setPhotos(prev  => [...prev, ...imgs]);
        setPreviews(prev => [...prev, ...imgs.map(f => URL.createObjectURL(f))]);
        setPhotoError('');
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addFiles(Array.from(e.target.files ?? []));
        e.target.value = '';
    };

    function removePhoto(index: number) {
        URL.revokeObjectURL(previews[index]);
        setPhotos(prev   => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    }

    const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true);  }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); }, []);
    const onDrop      = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (photos.length === 0) { setPhotoError(t('pickups.photo_required')); return; }
        setProcessing(true);
        const routeName = action === 'confirm' ? 'pickups.confirm' : 'pickups.complete';
        const formData = new FormData();
        photos.forEach(p => formData.append('photos[]', p));
        formData.append('notes', notes);
        formData.append('_method', 'POST');
        router.post(route(routeName, pickup.id), formData, { onFinish: () => setProcessing(false) });
    };

    return (
        <AuthenticatedLayout>
            <Head title={title} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href={route('pickups.show', pickup.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${action === 'confirm' ? 'bg-blue-50' : 'bg-green-50'}`}>
                        <ActionIcon className={`w-5 h-5 ${action === 'confirm' ? 'text-blue-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Left sidebar: pickup summary ── */}
                        <div className="space-y-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('pickups.pickup_summary')}</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Package className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.tracking_col')}</p>
                                            <Link
                                                href={route('shipments.show', pickup.shipment.id)}
                                                className="text-sm font-mono font-semibold text-blue-600 hover:underline"
                                            >
                                                {pickup.shipment.tracking_number}
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <FileText className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.contact_name')}</p>
                                            <p className="text-sm font-semibold text-gray-900">{pickup.contact_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Camera className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">{t('pickups.pickup_address')}</p>
                                            <p className="text-sm font-medium text-gray-900">{pickup.pickup_address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    {t('pickups.notes')}
                                </label>
                                <textarea
                                    rows={5}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('pickups.notes_placeholder')}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none text-gray-700"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={`inline-flex items-center justify-center gap-2 w-full px-5 py-3 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors shadow-sm ${btnClass}`}
                                >
                                    {processing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <ActionIcon className="w-4 h-4" />
                                    }
                                    {processing ? t('common.saving') : title}
                                </button>
                                <Link
                                    href={route('pickups.show', pickup.id)}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('common.cancel')}
                                </Link>
                            </div>
                        </div>

                        {/* ── Right: Photo upload (2 cols) ── */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                            {t('pickups.upload_photos')} <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-xs text-gray-400">{t('pickups.photos_hint')}</p>
                                    </div>
                                    {photos.length > 0 && (
                                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                            {photos.length} {t('pickups.photos_added')}
                                        </span>
                                    )}
                                </div>

                                {/* Drop zone */}
                                <div
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-150 mb-5
                                        ${dragging
                                            ? 'border-green-400 bg-green-50 scale-[1.01]'
                                            : photos.length > 0
                                                ? 'border-green-300 bg-green-50/40 hover:border-green-400'
                                                : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/20'
                                        }
                                    `}
                                >
                                    <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dragging ? 'bg-green-100' : 'bg-gray-100'}`}>
                                        <Upload className={`w-6 h-6 ${dragging ? 'text-green-500' : 'text-gray-400'}`} />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">{t('pickups.drag_photos')}</p>
                                    <p className="text-xs text-gray-400 mt-1">{t('pickups.drag_photos_hint')}</p>
                                    {photos.length > 0 && (
                                        <p className="text-sm text-green-600 mt-2 font-bold">
                                            ✓ {t('pickups.photos_count', { count: photos.length })}
                                        </p>
                                    )}
                                </div>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {photoError && (
                                    <p className="text-red-500 text-sm mb-4 font-medium flex items-center gap-1.5">
                                        <X className="w-4 h-4" /> {photoError}
                                    </p>
                                )}

                                {/* Preview grid */}
                                {previews.length > 0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {previews.map((src, i) => (
                                            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                                <img
                                                    src={src}
                                                    alt={`Preview ${i + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                                                    title={t('pickups.remove_photo')}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <span className="absolute bottom-1 left-1 text-white text-xs font-bold bg-black/40 rounded px-1">
                                                    {i + 1}
                                                </span>
                                            </div>
                                        ))}
                                        {/* Add more button */}
                                        <div
                                            onClick={() => fileRef.current?.click()}
                                            className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors"
                                        >
                                            <Upload className="w-5 h-5 text-gray-300 mb-1" />
                                            <span className="text-xs text-gray-300">+</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
