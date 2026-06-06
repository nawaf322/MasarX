import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency } from '@/utils/localeFormat';
import { Package, RotateCcw, DollarSign, Truck, FileText, Boxes, Receipt, ClipboardList, ScrollText, Coins } from 'lucide-react';

interface Stats {
    total_shipments: number;
    delivered: number;
    total_revenue: number;
    total_returns: number;
}

interface Props {
    stats: Stats;
}

interface ReportCard {
    titleKey: string;
    descKey: string;
    href: string;
    icon: React.ReactNode;
    color: string;
    external?: boolean;
}

export default function ReportsIndex({ stats }: Props) {
    const { t } = useTranslation();

    const cards: ReportCard[] = [
        {
            titleKey: 'reports.shipments_report',
            descKey: 'reports.shipments_desc',
            href: route('reports.shipments'),
            icon: <Package className="h-6 w-6" />,
            color: 'bg-blue-100 text-blue-600',
        },
        {
            titleKey: 'reports.returns_report',
            descKey: 'reports.returns_desc',
            href: route('reports.returns'),
            icon: <RotateCcw className="h-6 w-6" />,
            color: 'bg-red-100 text-red-600',
        },
        {
            titleKey: 'reports.financial_report',
            descKey: 'reports.financial_desc',
            href: route('reports.financial'),
            icon: <DollarSign className="h-6 w-6" />,
            color: 'bg-green-100 text-green-600',
        },
        {
            titleKey: 'reports.manifests_report',
            descKey: 'reports.manifests_desc',
            href: '/warehouse/manifests',
            icon: <Truck className="h-6 w-6" />,
            color: 'bg-purple-100 text-purple-600',
            external: true,
        },
        {
            titleKey: 'reports.warehouse_report',
            descKey: 'reports.warehouse_desc',
            href: '/warehouse/inventory',
            icon: <Boxes className="h-6 w-6" />,
            color: 'bg-orange-100 text-orange-600',
            external: true,
        },
        {
            titleKey: 'reports.billing_report',
            descKey: 'reports.billing_desc',
            href: '/billing',
            icon: <Receipt className="h-6 w-6" />,
            color: 'bg-yellow-100 text-yellow-600',
            external: true,
        },
        {
            titleKey: 'reports.pickups_report',
            descKey: 'reports.pickups_desc',
            href: '/pickups',
            icon: <ClipboardList className="h-6 w-6" />,
            color: 'bg-teal-100 text-teal-600',
            external: true,
        },
        {
            titleKey: 'reports.contracts_report',
            descKey: 'reports.contracts_desc',
            href: '/contracts',
            icon: <ScrollText className="h-6 w-6" />,
            color: 'bg-indigo-100 text-indigo-600',
            external: true,
        },
        {
            titleKey: 'reports.commissions_report',
            descKey: 'reports.commissions_desc',
            href: '/commissions',
            icon: <Coins className="h-6 w-6" />,
            color: 'bg-amber-100 text-amber-600',
            external: true,
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('reports.title')} />

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-green-600" />
                        {t('reports.title')}
                    </h2>
                    <p className="text-muted-foreground mt-1">{t('reports.subtitle')}</p>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {t('reports.col_tracking')} Total
                        </p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                            {stats.total_shipments.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {t('reports.summary_delivered')}
                        </p>
                        <p className="text-3xl font-bold text-green-700 mt-1">
                            {stats.delivered.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {t('reports.summary_revenue')}
                        </p>
                        <p className="text-3xl font-bold text-blue-700 mt-1">
                            {formatCurrency(stats.total_revenue)}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {t('reports.returns_report')}
                        </p>
                        <p className="text-3xl font-bold text-red-700 mt-1">
                            {stats.total_returns.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Report Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <div
                            key={card.titleKey}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${card.color}`}>
                                    {card.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base">
                                        {t(card.titleKey)}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                                        {t(card.descKey)}
                                    </p>
                                </div>
                            </div>
                            {card.external ? (
                                <a
                                    href={card.href}
                                    className="mt-auto inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    {t('reports.view_report')}
                                </a>
                            ) : (
                                <Link
                                    href={card.href}
                                    className="mt-auto inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    {t('reports.view_report')}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
