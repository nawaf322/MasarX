import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Package, Plus, Wallet, Clock, Truck, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { PaginationBar } from '@/ui/kit/PaginationBar';

interface WalletData {
    balance: number;
    currency: string;
    formatted_balance: string;
}

interface Shipment {
    id: number;
    tracking_number: string;
    status: string;
    payment_status: string;
    receiver_name: string;
    receiver_city: string;
    receiver_country: string;
    total_amount: number;
    currency: string;
    weight: number;
    service_name: string | null;
    created_at: string;
    delivered_at: string | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Stats {
    total: number;
    pending: number;
    in_transit: number;
    delivered: number;
    returned: number;
}

interface Props {
    shipments: Paginated<Shipment>;
    wallet: WalletData;
    stats: Stats;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending:          { label: 'معلقة',           color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
    confirmed:        { label: 'مؤكدة',           color: 'bg-blue-50 text-blue-700 border-blue-200',      icon: CheckCircle },
    picked_up:        { label: 'تم الاستلام',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package },
    in_transit:       { label: 'في الطريق',       color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Truck },
    out_for_delivery: { label: 'خارج للتسليم',   color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck },
    delivered:        { label: 'تم التسليم',      color: 'bg-green-50 text-green-700 border-green-200',   icon: CheckCircle },
    failed_delivery:  { label: 'فشل التسليم',    color: 'bg-red-50 text-red-700 border-red-200',         icon: XCircle },
    returned:         { label: 'مرتجعة',          color: 'bg-gray-100 text-gray-700 border-gray-200',    icon: RotateCcw },
    cancelled:        { label: 'ملغاة',           color: 'bg-red-50 text-red-600 border-red-200',        icon: XCircle },
};

function formatDate(d: string) {
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d));
}

function formatCurrency(amount: number, currency = 'SAR') {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

export default function CustomerShipmentsIndex({ shipments, wallet, stats }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="شحناتي — MasarX" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" dir="rtl">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                             style={{ background: 'linear-gradient(135deg, #FF6B4A, #FF512F)' }}>
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">شحناتي</h1>
                            <p className="text-sm text-gray-500 mt-0.5">تتبع وإدارة جميع شحناتك</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Wallet Balance Mini */}
                        <Link href={route('my-wallet.index')}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                            <Wallet className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold">{formatCurrency(wallet.balance, wallet.currency)}</span>
                        </Link>

                        <Link href={route('shipments.create')}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #FF6B4A, #FF512F)' }}>
                            <Plus className="w-4 h-4" />
                            إنشاء شحنة
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                    {[
                        { label: 'الكل',          value: stats.total,      color: 'text-gray-900', bg: 'bg-gray-50' },
                        { label: 'معلقة',         value: stats.pending,    color: 'text-yellow-700', bg: 'bg-yellow-50' },
                        { label: 'في الطريق',     value: stats.in_transit, color: 'text-orange-700', bg: 'bg-orange-50' },
                        { label: 'مُسلَّمة',      value: stats.delivered,  color: 'text-green-700',  bg: 'bg-green-50' },
                        { label: 'مرتجعة',        value: stats.returned,   color: 'text-red-700',   bg: 'bg-red-50' },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Shipments Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">قائمة الشحنات</h2>
                    </div>

                    {shipments.data.length === 0 ? (
                        <div className="py-20 text-center">
                            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد شحنات بعد</h3>
                            <p className="text-sm text-gray-400 mb-6">أنشئ شحنتك الأولى الآن وقارن الأسعار بين شركات الشحن</p>
                            <Link href={route('shipments.create')}
                                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
                                  style={{ background: 'linear-gradient(135deg, #FF6B4A, #FF512F)' }}>
                                <Plus className="w-4 h-4" />
                                إنشاء شحنة جديدة
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-100">
                                        <th className="px-4 py-3 text-right font-medium">رقم التتبع</th>
                                        <th className="px-4 py-3 text-right font-medium">المستلِم</th>
                                        <th className="px-4 py-3 text-right font-medium">الوجهة</th>
                                        <th className="px-4 py-3 text-right font-medium">الحالة</th>
                                        <th className="px-4 py-3 text-right font-medium">التكلفة</th>
                                        <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                                        <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {shipments.data.map(shipment => {
                                        const sc = statusConfig[shipment.status] ?? statusConfig.pending;
                                        const Icon = sc.icon;
                                        return (
                                            <tr key={shipment.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-bold text-gray-900">{shipment.tracking_number}</span>
                                                    {shipment.service_name && (
                                                        <span className="text-xs text-gray-400 block">{shipment.service_name}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-gray-800">{shipment.receiver_name}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 text-xs">
                                                    {shipment.receiver_city}، {shipment.receiver_country}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.color}`}>
                                                        <Icon className="w-3 h-3" />
                                                        {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-900">
                                                    {formatCurrency(shipment.total_amount, shipment.currency)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {formatDate(shipment.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link href={route('shipments.show', shipment.id)}
                                                          className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                                                        عرض
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {shipments.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100">
                            <PaginationBar
                                currentPage={shipments.current_page}
                                lastPage={shipments.last_page}
                                from={shipments.from}
                                to={shipments.to}
                                total={shipments.total}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
