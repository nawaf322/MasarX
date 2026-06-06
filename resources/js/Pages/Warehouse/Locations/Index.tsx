import React, { useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';

interface Warehouse { id: number; name: string }
interface InventoryLocation {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
    photos: string[] | null;
    warehouse: Warehouse | null;
}
interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    locations: Paginated<InventoryLocation>;
    filters: { search?: string };
}

export default function WarehouseLocationsIndex({ locations, filters }: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search ?? '');

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('warehouse.inventory.locations.index'), { search }, { preserveState: true, replace: true });
    }

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t('warehouse.locations_title')}</h2>
                <Link href={route('warehouse.index')} className="text-sm text-blue-600 hover:underline">
                    ← {t('warehouse.back_to_warehouse')}
                </Link>
            </div>
        }>
            <Head title={t('warehouse.locations_title')} />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('common.search')}
                        className="flex-1 border rounded px-3 py-2 text-sm max-w-sm"
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                         {t('common.search')}
                    </button>
                </form>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.data.length === 0 ? (
                        <p className="col-span-3 text-center text-gray-400 py-12">
                            {t('warehouse.no_locations')}
                        </p>
                    ) : locations.data.map(loc => (
                        <LocationCard key={loc.id} location={loc} t={t} />
                    ))}
                </div>

                {/* Pagination */}
                {locations.links.length > 3 && (
                    <div className="flex gap-1 flex-wrap">
                        {locations.links.map((link, i) => (
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`px-3 py-1 text-sm rounded border ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span key={i} className="px-3 py-1 text-sm rounded border text-gray-300" dangerouslySetInnerHTML={{ __html: link.label }} />
                            )
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function LocationCard({ location, t }: { location: InventoryLocation; t: (k: string) => string }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [photos, setPhotos] = useState<string[]>(location.photos ?? []);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        const form = new FormData();
        Array.from(files).forEach(f => form.append('photos[]', f));

        fetch(route('warehouse.inventory.locations.photos', location.id), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
            body: form,
        })
            .then(r => r.json())
            .then(data => { setPhotos(data.photos ?? []); })
            .finally(() => { setUploading(false); });
    }

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Photo gallery */}
            <div className="relative bg-gray-100 h-36 flex items-center justify-center overflow-hidden">
                {photos.length > 0 ? (
                    <div className="flex gap-1 overflow-x-auto w-full h-full p-1">
                        {photos.map((p, i) => (
                            <img
                                key={i}
                                src={`/storage/${p}`}
                                alt={`photo ${i + 1}`}
                                onClick={() => setPreview(`/storage/${p}`)}
                                className="h-full w-auto rounded object-cover cursor-pointer hover:opacity-90 flex-shrink-0"
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-xs">{t('warehouse.no_photos')}</p>
                )}
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg leading-none hover:bg-blue-700 disabled:opacity-50 shadow"
                    title={t('warehouse.upload_photos')}
                >
                    {uploading ? '…' : '+'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {/* Info */}
            <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{location.code}</span>
                    <span className={`text-xs font-medium ${location.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {location.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                </div>
                <p className="font-semibold text-sm text-gray-900 truncate">{location.name}</p>
                {location.warehouse && (
                    <p className="text-xs text-gray-400 mt-1">{location.warehouse.name}</p>
                )}
                <p className="text-xs text-blue-500 mt-1">{photos.length} {t('warehouse.photos')}</p>
            </div>

            {/* Lightbox */}
            {preview && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={() => setPreview(null)}
                >
                    <img src={preview} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded shadow-xl" />
                </div>
            )}
        </div>
    );
}
