import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { PaginationBar } from '@/ui/kit/PaginationBar';

interface WalletData {
    balance: number;
    currency: string;
    formatted_balance: string;
    last_recharged_at: string | null;
    last_debited_at: string | null;
}

interface Transaction {
    id: number;
    type: 'credit' | 'debit' | 'refund' | 'hold';
    amount: number;
    balance_before: number;
    balance_after: number;
    description: string;
    reference: string | null;
    payment_method: string | null;
    shipment: { id: number; tracking_number: string } | null;
    created_at: string;
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
    total_credited: number;
    total_spent: number;
    recharge_count: number;
}

interface Props {
    wallet: WalletData;
    transactions: Paginated<Transaction>;
    stats: Stats;
}

function formatAmount(amount: number, currency = 'SAR'): string {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

const typeConfig = {
    credit:  { label: 'إيداع',  color: 'bg-green-100 text-green-700 border-green-200',  icon: ArrowUpRight,   sign: '+' },
    debit:   { label: 'خصم',    color: 'bg-red-100 text-red-700 border-red-200',         icon: ArrowDownLeft,  sign: '-' },
    refund:  { label: 'استرداد', color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: RefreshCw,      sign: '+' },
    hold:    { label: 'تجميد',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: ArrowDownLeft, sign: '-' },
};

export default function WalletIndex({ wallet, transactions, stats }: Props) {
    const { t } = useTranslation();

    return (
        <AuthenticatedLayout>
            <Head title="محفظتي — MasarX" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto" dir="rtl">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                             style={{ background: 'linear-gradient(135deg, #FF6B4A, #FF512F)' }}>
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">محفظتي</h1>
                            <p className="text-sm text-gray-500 mt-0.5">إدارة رصيدك ومعاملاتك المالية</p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.visit(route('my-wallet.recharge'))}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #FF6B4A, #FF512F)' }}
                    >
                        <Plus className="w-4 h-4" />
                        شحن المحفظة
                    </button>
                </div>

                {/* Balance Card */}
                <div className="rounded-2xl p-8 mb-6 text-white relative overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, #FF6B4A 0%, #E2231A 100%)' }}>
                    <div className="absolute inset-0 opacity-10"
                         style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                    <div className="relative">
                        <p className="text-white/80 text-sm font-medium mb-2">الرصيد المتاح</p>
                        <p className="text-5xl font-black tracking-tight mb-1">
                            {formatAmount(wallet.balance, wallet.currency)}
                        </p>
                        {wallet.last_recharged_at && (
                            <p className="text-white/70 text-xs mt-3">
                                آخر شحن: {formatDate(wallet.last_recharged_at)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">إجمالي المُودَع</p>
                                <p className="text-lg font-bold text-gray-900">{formatAmount(stats.total_credited, wallet.currency)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">إجمالي المُنفَق</p>
                                <p className="text-lg font-bold text-gray-900">{formatAmount(stats.total_spent, wallet.currency)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">عدد عمليات الشحن</p>
                                <p className="text-lg font-bold text-gray-900">{stats.recharge_count}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">سجل المعاملات</h2>
                        <span className="text-xs text-gray-500">{transactions.total} معاملة</span>
                    </div>

                    {transactions.data.length === 0 ? (
                        <div className="py-16 text-center">
                            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">لا توجد معاملات بعد</p>
                            <p className="text-xs text-gray-400 mt-1">ابدأ بشحن محفظتك أو إنشاء شحنة</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-xs">
                                        <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                                        <th className="px-4 py-3 text-right font-medium">النوع</th>
                                        <th className="px-4 py-3 text-right font-medium">الوصف</th>
                                        <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                                        <th className="px-4 py-3 text-right font-medium">الرصيد بعد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {transactions.data.map(tx => {
                                        const cfg = typeConfig[tx.type] ?? typeConfig.debit;
                                        const Icon = cfg.icon;
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                    {formatDate(tx.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                                                        <Icon className="w-3 h-3" />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 max-w-48 truncate">
                                                    {tx.description}
                                                    {tx.shipment && (
                                                        <span className="text-xs text-gray-400 block">#{tx.shipment.tracking_number}</span>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 font-bold tabular-nums ${tx.type === 'credit' || tx.type === 'refund' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {cfg.sign}{formatAmount(tx.amount, wallet.currency)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 font-medium tabular-nums">
                                                    {formatAmount(tx.balance_after, wallet.currency)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {transactions.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100">
                            <PaginationBar
                                currentPage={transactions.current_page}
                                lastPage={transactions.last_page}
                                from={transactions.from}
                                to={transactions.to}
                                total={transactions.total}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
