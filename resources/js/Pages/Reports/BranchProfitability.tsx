import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';

interface BranchRow {
    branch_name: string;
    branch_id: number;
    total_shipments: number;
    revenue: string;
    total_cost: string;
    profit: string;
    delivered_count: number;
}

interface Props {
    branchData: BranchRow[];
    filters: { from: string; to: string };
}

export default function BranchProfitability({ branchData, filters }: Props) {
    const { t } = useTranslation();

    function handleFilter(key: string, value: string) {
        router.get(route('reports.branch'), { ...filters, [key]: value }, { preserveState: true, replace: true });
    }

    const totals = branchData.reduce(
        (acc, r) => ({
            shipments: acc.shipments + Number(r.total_shipments),
            revenue:   acc.revenue   + Number(r.revenue),
            cost:      acc.cost      + Number(r.total_cost),
            profit:    acc.profit    + Number(r.profit),
            delivered: acc.delivered + Number(r.delivered_count),
        }),
        { shipments: 0, revenue: 0, cost: 0, profit: 0, delivered: 0 }
    );

    return (
        <AuthenticatedLayout>
            <Head title={t('reports.branch_profitability')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">{t('reports.branch_profitability')}</h1>
                    <a href={route('reports.index')} className="text-sm text-blue-600 hover:underline">← {t('reports.title')}</a>
                </div>

                {/* Date filters */}
                <div className="flex gap-3 mb-5 items-end">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('common.from')}</label>
                        <input type="date" defaultValue={filters.from} onChange={(e) => handleFilter('from', e.target.value)} className="border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('common.to')}</label>
                        <input type="date" defaultValue={filters.to} onChange={(e) => handleFilter('to', e.target.value)} className="border rounded px-3 py-2 text-sm" />
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.col_branch')}</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.col_shipments')}</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.col_delivered')}</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.col_revenue')}</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.col_cost')}</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.col_profit')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {branchData.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">{t('reports.no_data_period')}</td></tr>
                            ) : branchData.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium">{row.branch_name}</td>
                                    <td className="px-4 py-3 text-sm text-right">{row.total_shipments}</td>
                                    <td className="px-4 py-3 text-sm text-right">{row.delivered_count}</td>
                                    <td className="px-4 py-3 text-sm text-right font-mono">{Number(row.revenue).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-right font-mono text-red-600">{Number(row.total_cost).toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-sm text-right font-mono font-medium ${Number(row.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {Number(row.profit).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {branchData.length > 0 && (
                            <tfoot className="bg-gray-100 font-semibold">
                                <tr>
                                    <td className="px-4 py-3 text-sm">{t('reports.total_row')}</td>
                                    <td className="px-4 py-3 text-sm text-right">{totals.shipments}</td>
                                    <td className="px-4 py-3 text-sm text-right">{totals.delivered}</td>
                                    <td className="px-4 py-3 text-sm text-right font-mono">{totals.revenue.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-right font-mono text-red-700">{totals.cost.toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-sm text-right font-mono ${totals.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{totals.profit.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
