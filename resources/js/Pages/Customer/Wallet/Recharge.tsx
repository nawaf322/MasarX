import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Wallet, CreditCard, Building2, Smartphone, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

interface WalletData {
    balance: number;
    currency: string;
}

interface Props {
    wallet: WalletData;
}

type PaymentMethod = 'mada' | 'apple_pay' | 'bank_transfer' | 'stripe';

const methods: { id: PaymentMethod; label: string; sub: string; icon: React.ElementType }[] = [
    { id: 'mada',          label: 'بطاقة مدى',     sub: 'الدفع المباشر عبر مدى',        icon: CreditCard },
    { id: 'apple_pay',     label: 'Apple Pay',     sub: 'ادفع بلمسة واحدة',            icon: Smartphone },
    { id: 'stripe',        label: 'بطاقة ائتمان',  sub: 'فيزا / ماستركارد',           icon: CreditCard },
    { id: 'bank_transfer', label: 'تحويل بنكي',    sub: 'يتطلب مراجعة الإدارة',         icon: Building2 },
];

const quickAmounts = [50, 100, 250, 500, 1000];

function formatCurrency(amount: number, currency = 'SAR') {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

export default function WalletRecharge({ wallet }: Props) {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(100);

    const { data, setData, post, processing, errors } = useForm({
        amount: 100,
        payment_method: 'mada' as PaymentMethod,
    });

    function pickAmount(v: number) {
        setSelectedAmount(v);
        setData('amount', v);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('my-wallet.recharge.store'));
    }

    return (
        <AuthenticatedLayout>
            <Head title="شحن المحفظة — MasarX" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto" dir="rtl">

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href={route('my-wallet.index')}
                          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                        <ArrowRight className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">شحن المحفظة</h1>
                        <p className="text-sm text-gray-500">رصيدك الحالي: {formatCurrency(wallet.balance, wallet.currency)}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">

                    {/* Amount */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-4">مبلغ الشحن (ر.س)</label>

                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                            {quickAmounts.map(v => (
                                <button type="button" key={v} onClick={() => pickAmount(v)}
                                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                        selectedAmount === v
                                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                                            : 'border-gray-100 text-gray-600 hover:border-gray-200'
                                    }`}>
                                    {v}
                                </button>
                            ))}
                        </div>

                        <input type="number" min={10} max={50000} step="0.01"
                            value={data.amount}
                            onChange={e => { setData('amount', parseFloat(e.target.value)); setSelectedAmount(null); }}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                            placeholder="أدخل مبلغًا مخصصًا" />
                        {errors.amount && <p className="text-red-600 text-xs mt-2">{errors.amount}</p>}
                    </div>

                    {/* Payment method */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-4">طريقة الدفع</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {methods.map(m => {
                                const Icon = m.icon;
                                const active = data.payment_method === m.id;
                                return (
                                    <button type="button" key={m.id} onClick={() => setData('payment_method', m.id)}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all ${
                                            active ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                                        }`}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm text-gray-900">{m.label}</p>
                                            <p className="text-xs text-gray-500">{m.sub}</p>
                                        </div>
                                        {active && <Check className="w-5 h-5 text-orange-500" />}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.payment_method && <p className="text-red-600 text-xs mt-2">{errors.payment_method}</p>}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={processing}
                        className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #FF6B4A, #E2231A)' }}>
                        {processing ? 'جاري المعالجة...' : `شحن ${formatCurrency(data.amount || 0, wallet.currency)}`}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                        جميع المعاملات آمنة ومشفّرة. التحويل البنكي يتطلب موافقة الإدارة قبل إضافة الرصيد.
                    </p>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
