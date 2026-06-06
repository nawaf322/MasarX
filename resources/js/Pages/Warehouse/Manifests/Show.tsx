import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { ArrowLeft, Printer, FileText, User, Package, Calendar, Hash } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';
import { useEffect } from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
    open:       { label: '', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed:     { label: '', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    dispatched: { label: '', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function Show({ manifest }: { manifest: any }) {
    const { t } = useTranslation();
    const shipments: any[] = manifest.shipments ?? [];

    // Auto-trigger print dialog when ?print=1
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('print') === '1') {
            const timer = setTimeout(() => window.print(), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const s = statusConfig[manifest.status] || { label: manifest.status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
    const statusLabel = t(`warehouse.manifest_status_${manifest.status}`) || manifest.status;

    return (
        <AuthenticatedLayout>
            <Head title={`${manifest.manifest_number}`} />

            {/* Print-only styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-area { padding: 0 !important; max-width: 100% !important; }
                    body { background: #fff !important; }
                    nav, header, aside { display: none !important; }
                }
            `}</style>

            <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 print-area">

                {/* Top bar */}
                <div className="flex items-center justify-between mb-6 no-print">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('warehouse.manifests.index')} className="gap-1.5 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            {t('warehouse.back_to_manifests')}
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-gray-200 hover:border-gray-300"
                        onClick={() => window.print()}
                    >
                        <Printer className="h-4 w-4" />
                        {t('warehouse.print')}
                    </Button>
                </div>

                {/* Manifest header card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-wide">
                                    {manifest.manifest_number}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">{t('warehouse.manifest_details')}</p>
                            </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${s.className}`}>
                            {statusLabel}
                        </span>
                    </div>

                    {/* Meta info grid */}
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5 border-t border-gray-100">
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <User className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('warehouse.driver')}</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                    {manifest.driver?.name || <span className="text-gray-400 font-normal italic">{t('warehouse.unassigned')}</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('warehouse.created')}</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                    {new Date(manifest.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Package className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('warehouse.shipments_count')}</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{shipments.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shipments table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        <h2 className="font-semibold text-gray-900">{t('warehouse.shipments_in_manifest')}</h2>
                        <span className="ml-auto text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                            {shipments.length}
                        </span>
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold w-10">#</th>
                                <th className="px-6 py-3 text-left font-semibold">{t('warehouse.tracking_col')}</th>
                                <th className="px-6 py-3 text-left font-semibold">{t('warehouse.destination')}</th>
                                <th className="px-6 py-3 text-left font-semibold">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {shipments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                        {t('warehouse.no_shipments_added')}
                                    </td>
                                </tr>
                            ) : (
                                shipments.map((shipment: any, idx: number) => {
                                    const dest = [
                                        shipment.receiver_details?.city,
                                        shipment.receiver_details?.country,
                                    ].filter(Boolean).join(', ') || '—';

                                    return (
                                        <tr key={shipment.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3.5 text-gray-400 text-xs tabular-nums">{idx + 1}</td>
                                            <td className="px-6 py-3.5">
                                                <span className="font-mono font-semibold text-gray-900 text-sm tracking-wide">
                                                    {shipment.tracking_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-gray-600">{dest}</td>
                                            <td className="px-6 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                                                    {shipment.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {shipments.length > 0 && (
                            <tfoot className="border-t border-gray-200 bg-gray-50/50">
                                <tr>
                                    <td colSpan={4} className="px-6 py-3 text-right text-sm text-muted-foreground">
                                        Total: <span className="font-bold text-gray-900">{shipments.length}</span> {t('warehouse.shipments_count').toLowerCase()}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
