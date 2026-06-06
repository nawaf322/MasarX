import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Package, AlertCircle, ArrowLeft, Download, ChevronDown, ChevronUp, CalendarRange } from "lucide-react";
import { formatDateTime } from '@/utils/localeFormat';
import { TableToolbar } from '@/ui/kit/TableToolbar';
import { useQueryState } from '@/ui/kit/useQueryState';
import { TablePagination } from '@/Components/Warehouse/TablePagination';
import { useTranslation } from '@/hooks/useTranslation';
import { useCallback, useState } from 'react';

export default function Index({
    inventory    = [],
    total_in_hub = 0,
    aging_count  = 0,
    meta,
    query = {},
}: {
    inventory:    any[];
    total_in_hub: number;
    aging_count:  number;
    meta?:        any;
    query?:       any;
}) {
    const { t } = useTranslation();
    const { params, submit } = useQueryState(
        { search: query?.search ?? '', page: query?.page ?? 1, per_page: query?.per_page ?? 15 },
        { baseUrl: route('warehouse.inventory.index') }
    );

    const handleSearch = useCallback((val: string) => {
        submit({ search: val, page: 1 });
    }, [submit]);

    // Export panel
    const [exportOpen, setExportOpen] = useState(false);
    const [exportForm, setExportForm] = useState({ from_date: '', to_date: '' });
    const [exporting, setExporting]   = useState(false);

    const handleExport = () => {
        const qs = new URLSearchParams();
        if (exportForm.from_date) qs.set('from_date', exportForm.from_date);
        if (exportForm.to_date)   qs.set('to_date',   exportForm.to_date);
        const url = route('warehouse.inventory.export-pdf') + (qs.toString() ? '?' + qs.toString() : '');
        window.open(url, '_blank');
        setExporting(true);
        setTimeout(() => setExporting(false), 2500);
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('warehouse.inventory_page_title')} />

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
                        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{t('warehouse.inventory_page_title')}</h1>
                            <p className="text-sm text-muted-foreground">{t('warehouse.inventory_subtitle_page')}</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 shrink-0"
                        onClick={() => setExportOpen(o => !o)}
                    >
                        <Download className="h-4 w-4" />
                        {t('warehouse.export_pdf')}
                        {exportOpen
                            ? <ChevronUp   className="h-3.5 w-3.5 ml-0.5" />
                            : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                        }
                    </Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{total_in_hub}</p>
                            <p className="text-xs text-muted-foreground">{t('warehouse.inv_total')}</p>
                        </div>
                    </div>
                    <div className={`rounded-xl border shadow-sm p-4 flex items-center gap-4 ${aging_count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${aging_count > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <AlertCircle className={`h-5 w-5 ${aging_count > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${aging_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>{aging_count}</p>
                            <p className="text-xs text-muted-foreground">{t('warehouse.inv_aging_count')}</p>
                        </div>
                    </div>
                </div>

                {/* Export panel */}
                {exportOpen && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarRange className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-semibold text-orange-800">{t('warehouse.export_filters')}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">{t('warehouse.from_date')}</label>
                                <input
                                    type="date"
                                    value={exportForm.from_date}
                                    onChange={e => setExportForm(f => ({ ...f, from_date: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">{t('warehouse.to_date')}</label>
                                <input
                                    type="date"
                                    value={exportForm.to_date}
                                    onChange={e => setExportForm(f => ({ ...f, to_date: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                            </div>
                            <Button
                                onClick={handleExport}
                                disabled={exporting}
                                className="h-9 gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                <Download className="h-4 w-4" />
                                {exporting ? t('warehouse.export_loading') : t('warehouse.export_pdf_btn')}
                            </Button>
                        </div>
                        <p className="text-xs text-orange-600/70 mt-2">{t('warehouse.inv_export_hint')}</p>
                    </div>
                )}

                {/* Table card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 border-b border-gray-100">
                        <TableToolbar
                            placeholder={t('warehouse.search_inventory')}
                            search={params.search || ''}
                            onSearchChange={handleSearch}
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.tracking_col')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.destination')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.received_at')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide">{t('warehouse.aging')}</th>
                                    <th className="px-6 py-3.5 font-semibold tracking-wide text-right">{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {inventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Package className="h-9 w-9 opacity-25" />
                                                <span className="text-sm">{t('warehouse.no_inventory')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    inventory.map((item) => {
                                        const receivedDate = new Date(item.updated_at);
                                        const diffHours    = Math.floor((Date.now() - receivedDate.getTime()) / 3_600_000);
                                        const isAging      = diffHours > 24;
                                        const dest         = [item.receiver_details?.city, item.receiver_details?.country].filter(Boolean).join(', ') || '—';

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-mono font-semibold text-gray-900 text-sm tracking-wide">
                                                            {item.tracking_number}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700">{dest}</td>
                                                <td className="px-6 py-4 text-gray-500 text-sm tabular-nums">
                                                    {formatDateTime(item.updated_at)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isAging ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {diffHours}{t('warehouse.aging_hours')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            {diffHours}{t('warehouse.aging_hours')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        {t('warehouse.received')}
                                                    </span>
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
