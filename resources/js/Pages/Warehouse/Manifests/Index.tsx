import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Plus, FileText, User, ArrowLeft, Eye, Printer, Package, Download, ChevronDown, ChevronUp, CalendarRange } from "lucide-react";
import { TableToolbar } from '@/ui/kit/TableToolbar';
import { useQueryState } from '@/ui/kit/useQueryState';
import { TablePagination } from '@/Components/Warehouse/TablePagination';
import { useTranslation } from '@/hooks/useTranslation';
import { useCallback, useState } from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
    open:       { label: '', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed:     { label: '', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    dispatched: { label: '', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

interface Driver { id: number; name: string; }

export default function Index({
    manifests = [],
    drivers   = [],
    meta,
    query = {},
}: {
    manifests: any[];
    drivers:   Driver[];
    meta?:     any;
    query?:    any;
}) {
    const { t } = useTranslation();
    const { params, submit } = useQueryState(
        { search: query?.search ?? '', page: query?.page ?? 1, per_page: query?.per_page ?? 15 },
        { baseUrl: route('warehouse.manifests.index') }
    );

    const handleSearch = useCallback((val: string) => {
        submit({ search: val, page: 1 });
    }, [submit]);

    // Export panel state
    const [exportOpen, setExportOpen] = useState(false);
    const [exportForm, setExportForm] = useState({ from_date: '', to_date: '', driver_id: 'all' });
    const [exporting, setExporting] = useState(false);

    const handleExport = () => {
        const qs = new URLSearchParams();
        if (exportForm.from_date) qs.set('from_date', exportForm.from_date);
        if (exportForm.to_date)   qs.set('to_date',   exportForm.to_date);
        if (exportForm.driver_id !== 'all') qs.set('driver_id', exportForm.driver_id);

        const url = route('warehouse.manifests.export-pdf') + (qs.toString() ? '?' + qs.toString() : '');

        setExporting(true);
        // Open in new tab — browser will trigger download
        const win = window.open(url, '_blank');
        // Re-enable button after a short delay
        setTimeout(() => setExporting(false), 2500);
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('warehouse.manifests_title')} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Back */}
                <div className="mb-5">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('warehouse.index')} className="gap-1.5 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            {t('warehouse.back_to_warehouse')}
                        </Link>
                    </Button>
                </div>

                {/* Page header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{t('warehouse.manifests_title')}</h1>
                            <p className="text-sm text-muted-foreground">{t('warehouse.manifests_subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                            onClick={() => setExportOpen(o => !o)}
                        >
                            <Download className="h-4 w-4" />
                            {t('warehouse.export_pdf')}
                            {exportOpen
                                ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
                                : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                            }
                        </Button>
                        <Button asChild className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <Link href={route('warehouse.manifests.create')}>
                                <Plus className="h-4 w-4" />
                                {t('warehouse.create_new_manifest')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ── Export filter panel ───────────────────── */}
                {exportOpen && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarRange className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-semibold text-purple-800">{t('warehouse.export_filters')}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            {/* From date */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">{t('warehouse.from_date')}</label>
                                <input
                                    type="date"
                                    value={exportForm.from_date}
                                    onChange={e => setExportForm(f => ({ ...f, from_date: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                />
                            </div>
                            {/* To date */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">{t('warehouse.to_date')}</label>
                                <input
                                    type="date"
                                    value={exportForm.to_date}
                                    onChange={e => setExportForm(f => ({ ...f, to_date: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                />
                            </div>
                            {/* Driver */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">{t('warehouse.driver')}</label>
                                <select
                                    value={exportForm.driver_id}
                                    onChange={e => setExportForm(f => ({ ...f, driver_id: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                >
                                    <option value="all">{t('warehouse.all_drivers')}</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Download button */}
                            <Button
                                onClick={handleExport}
                                disabled={exporting}
                                className="h-9 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Download className="h-4 w-4" />
                                {exporting ? t('warehouse.export_loading') : t('warehouse.export_pdf_btn')}
                            </Button>
                        </div>
                        <p className="text-xs text-purple-600/70 mt-2">
                            {t('warehouse.export_hint')}
                        </p>
                    </div>
                )}

                {/* Table card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Search toolbar */}
                    <div className="px-4 border-b border-gray-100">
                        <TableToolbar
                            placeholder={t('warehouse.search_manifests')}
                            search={params.search || ''}
                            onSearchChange={handleSearch}
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.manifest_number')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.driver')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.shipments_count')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('common.status')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.created')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide text-right">{t('warehouse.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {manifests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <FileText className="h-9 w-9 opacity-25" />
                                                <span className="text-sm">{t('warehouse.no_manifests')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    manifests.map((manifest) => {
                                        const s = statusConfig[manifest.status] || { label: manifest.status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
                                        const statusLabel = t(`warehouse.manifest_status_${manifest.status}`) || manifest.status;
                                        return (
                                            <tr key={manifest.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-mono font-semibold text-gray-900 text-sm tracking-wide">
                                                            {manifest.manifest_number}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-gray-700">
                                                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                        <span>{manifest.driver?.name || <span className="text-gray-400 italic">{t('warehouse.unassigned')}</span>}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="h-3.5 w-3.5 text-gray-400" />
                                                        <span className="font-medium text-gray-800">{manifest.shipments_count ?? 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${s.className}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm tabular-nums">
                                                    {new Date(manifest.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                            className="h-8 px-2.5 gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                        >
                                                            <Link href={route('warehouse.manifests.show', manifest.id)}>
                                                                <Eye className="h-3.5 w-3.5" />
                                                                {t('common.view')}
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2.5 gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                            onClick={() => router.visit(route('warehouse.manifests.show', manifest.id) + '?print=1')}
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                            {t('warehouse.print')}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <TablePagination
                        meta={meta}
                        onPageChange={(page) => submit({ page })}
                        onPerPageChange={(per_page) => submit({ per_page, page: 1 })}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
