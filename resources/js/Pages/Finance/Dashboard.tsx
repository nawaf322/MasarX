import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/UI/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { useTranslation } from '@/hooks/useTranslation';
import { DollarSign, TrendingUp, TrendingDown, Building, Calendar, Package, BarChart2, Info, RotateCcw, Coins, Clock, CheckCircle, BadgeCheck, Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Banknote } from 'lucide-react';
import {
    Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { Button } from '@/Components/UI/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/UI/popover";
import { Input } from "@/Components/UI/input";
import { cn } from "@/lib/utils";
import { EditionGate } from "@/Components/EditionGate";

/** Safe route helper — returns '#' if the named route is not registered (e.g. Premium-only features). */
const safeRoute = (name: string, ...args: any[]): string => {
    try {
        const ziggy = (window as any).Ziggy;
        if (!ziggy?.routes?.[name]) return '#';
        return route(name, ...args);
    } catch { return '#'; }
};
import { formatCurrencyLocale } from '@/utils/localeFormat';

const safeFormatCurrency = (value: number | null | undefined, currency = 'USD') => {
    try {
        return formatCurrencyLocale(Number(value ?? 0), currency);
    } catch {
        return `${currency} ${Number(value ?? 0).toFixed(2)}`;
    }
};

/** Parse YYYY-MM-DD without timezone shift */
function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

const BRANCH_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function Dashboard({ metrics, trend, topBranches, topDepartments, filters, branches, departments, returns_count, total_refunds, net_after_refunds, returns_by_reason, commission_metrics, top_commissionees, cod_pipeline }: {
    metrics: any;
    trend: any[];
    topBranches: any[];
    topDepartments: any[];
    filters: any;
    branches: any[];
    departments: any[];
    returns_count?: number;
    total_refunds?: number;
    net_after_refunds?: number;
    returns_by_reason?: Record<string, number>;
    commission_metrics?: any;
    top_commissionees?: any[];
    cod_pipeline?: any;
}) {
    const { t } = useTranslation();

    const handleFilterChange = (key: string, value: string) => {
        router.get(route('finance.index'), { ...filters, [key]: value }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const currency = (amount: number | null | undefined) => safeFormatCurrency(amount ?? 0);

    const totalRevenue = Number(metrics?.total_revenue ?? 0);
    const totalCost    = Number(metrics?.total_cost    ?? 0);
    const netRevenue   = Number(metrics?.net_revenue   ?? 0);
    const totalTax     = Number(metrics?.total_tax     ?? 0);
    const hasCostData  = totalCost > 0;

    // Commission expenses (gross = positive records only, net = after reversals)
    const commPending  = Number(commission_metrics?.pending_amount  ?? 0);
    const commApproved = Number(commission_metrics?.approved_amount ?? 0);
    const commPaid     = Number(commission_metrics?.paid_amount     ?? 0);
    const commGross    = Number(commission_metrics?.gross_amount    ?? 0);
    const commReversed = Number(commission_metrics?.reversed_amount ?? 0);
    const commNet      = Number(commission_metrics?.net_amount      ?? commGross);
    const commCount    = Number(commission_metrics?.total_count     ?? 0);

    // AR balance (invoiced but unpaid)
    const arBalance    = Number(metrics?.ar_balance ?? 0);
    const arCount      = Number(metrics?.ar_count   ?? 0);

    // COD pipeline
    const codPending   = Number(cod_pipeline?.pending_amount   ?? 0);
    const codCollected = Number(cod_pipeline?.collected_amount ?? 0);
    const codRemitted  = Number(cod_pipeline?.remitted_amount  ?? 0);
    const codTotal     = Number(cod_pipeline?.total_cod_value  ?? 0);
    const codCount     = Number(cod_pipeline?.total_cod_shipments ?? 0);

    // Real profit = revenue - operational cost - net commissions
    const profit       = hasCostData ? totalRevenue - totalCost - commNet : (commNet > 0 ? totalRevenue - commNet : null);
    const marginPct    = (profit !== null && totalRevenue > 0) ? ((profit / totalRevenue) * 100).toFixed(1) : null;

    return (
        <AuthenticatedLayout>
            <Head title={t('finance.page_title')} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.overview')}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('finance.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={filters.branch_id} onValueChange={(v) => handleFilterChange('branch_id', v)}>
                            <SelectTrigger className="h-9 w-[160px] bg-white dark:bg-gray-800">
                                <SelectValue placeholder={t('finance.all_branches')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('finance.all_branches')}</SelectItem>
                                {branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.department_id} onValueChange={(v) => handleFilterChange('department_id', v)}>
                            <SelectTrigger className="h-9 w-[160px] bg-white dark:bg-gray-800">
                                <SelectValue placeholder={t('finance.all_departments')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('finance.all_departments')}</SelectItem>
                                {departments.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <DateRangePicker filters={filters} />
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-md col-span-2 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-indigo-100">{t('finance.total_revenue')}</CardTitle>
                            <DollarSign className="h-4 w-4 text-indigo-200" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">{currency(totalRevenue)}</div>
                            <p className="text-xs text-indigo-200 mt-1">{t('finance.gross_income')}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-gray-500">{t('finance.net_revenue')}</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{currency(netRevenue)}</div>
                            <p className="text-xs text-gray-400 mt-1">{t('finance.excluding_taxes')}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-gray-500">{t('finance.taxes_collected')}</CardTitle>
                            <Building className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{currency(totalTax)}</div>
                            {totalTax === 0
                                ? <p className="text-xs text-amber-500 mt-1">{t('finance.tax_rate_zero')}</p>
                                : <p className="text-xs text-gray-400 mt-1">{t('finance.total_tax_liability')}</p>
                            }
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-gray-500">{t('finance.shipments')}</CardTitle>
                            <Package className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{metrics?.total_shipments ?? 0}</div>
                            <p className="text-xs text-gray-400 mt-1">{t('finance.total_processed')}</p>
                        </CardContent>
                    </Card>

                    <Card className={profit === null ? '' : profit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-1">
                                <CardTitle className="text-xs font-medium text-gray-500">{t('billing.net_profit')}</CardTitle>
                                {profit === null && (
                                    <span title={t('finance.cost_not_configured')}>
                                        <Info className="h-3 w-3 text-amber-400 cursor-help" />
                                    </span>
                                )}
                            </div>
                            {profit === null
                                ? <TrendingUp className="h-4 w-4 text-gray-400" />
                                : profit >= 0
                                    ? <TrendingUp className="h-4 w-4 text-green-500" />
                                    : <TrendingDown className="h-4 w-4 text-red-500" />
                            }
                        </CardHeader>
                        <CardContent>
                            {profit === null
                                ? <>
                                    <div className="text-xl font-bold text-gray-400">—</div>
                                    <p className="text-xs text-amber-500 mt-1">{t('finance.no_cost_data')}</p>
                                  </>
                                : <>
                                    <div className={`text-xl font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{currency(profit)}</div>
                                    <p className="text-xs text-gray-400 mt-1">{marginPct}% {t('billing.recon_margin')}</p>
                                  </>
                            }
                        </CardContent>
                    </Card>

                    {/* AR Balance */}
                    <Card className={arBalance > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-gray-500">{t('finance.ar_balance')}</CardTitle>
                            <Wallet className={`h-4 w-4 ${arBalance > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-xl font-bold ${arBalance > 0 ? 'text-orange-700' : 'text-gray-900 dark:text-white'}`}>
                                {currency(arBalance)}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{arCount} {t('finance.ar_invoices_pending')}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Commission Expenses Section (Premium only) ── */}
                <EditionGate feature="commissions">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Coins className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{t('finance.commissions_title')}</h3>
                                <p className="text-xs text-gray-500">{t('finance.commissions_subtitle')} · {commCount} {t('finance.commissions_count')}</p>
                            </div>
                        </div>
                        {safeRoute('commissions.index') !== '#' && (
                            <a href={safeRoute('commissions.index')} className="text-xs text-amber-700 font-semibold hover:underline">
                                {t('finance.view_commissions')} →
                            </a>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                        {[
                            { label: t('commissions.status_total'),    value: commGross,    icon: Coins,       color: 'text-amber-700',  bg: 'bg-amber-100' },
                            { label: t('commissions.status_pending'),  value: commPending,  icon: Clock,       color: 'text-yellow-700', bg: 'bg-yellow-100' },
                            { label: t('commissions.status_approved'), value: commApproved, icon: CheckCircle, color: 'text-blue-700',   bg: 'bg-blue-100' },
                            { label: t('commissions.status_paid'),     value: commPaid,     icon: BadgeCheck,  color: 'text-green-700',  bg: 'bg-green-100' },
                            { label: t('finance.comm_reversed'),       value: commReversed, icon: RotateCcw,   color: 'text-red-600',    bg: 'bg-red-100' },
                        ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-4 h-4 ${color}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{label}</p>
                                    <p className={`text-sm font-bold ${color}`}>{currency(value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {commReversed > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 mb-3 flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            {t('finance.comm_net_note', { net: currency(commNet), reversed: currency(commReversed) })}
                        </div>
                    )}

                    {(top_commissionees ?? []).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {t('finance.top_commissionees')}
                        </h4>
                        <div className="space-y-2">
                            {(top_commissionees ?? []).map((item: any, i: number) => {
                                const pct = commTotal > 0 ? (Number(item.total) / commTotal) * 100 : 0;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-4 shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-xs font-medium text-gray-800 truncate">{item.name}</span>
                                                <span className="text-xs font-semibold text-amber-700 ml-2 shrink-0">{currency(Number(item.total))}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct.toFixed(1)}%` }} />
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 shrink-0 w-10 text-right">{item.count}x</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    )}
                </div>

                </EditionGate>

                {/* ── COD Pipeline ── */}
                {codCount > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Banknote className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{t('finance.cod_pipeline_title')}</h3>
                                <p className="text-xs text-gray-500">
                                    {codCount} {t('finance.cod_shipments')} · {t('finance.cod_total')}: <strong>{currency(codTotal)}</strong>
                                </p>
                            </div>
                        </div>
                        <a href={route('cod.index')} className="text-xs text-blue-700 font-semibold hover:underline">
                            {t('finance.view_cod')} →
                        </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            {
                                label: t('finance.cod_pending'),
                                value: codPending,
                                count: cod_pipeline?.pending_count ?? 0,
                                icon: Clock,
                                color: 'text-yellow-700',
                                bg: 'bg-yellow-50',
                                border: 'border-yellow-200',
                                hint: t('finance.cod_pending_hint'),
                            },
                            {
                                label: t('finance.cod_collected'),
                                value: codCollected,
                                count: cod_pipeline?.collected_count ?? 0,
                                icon: ArrowDownToLine,
                                color: 'text-blue-700',
                                bg: 'bg-blue-50',
                                border: 'border-blue-200',
                                hint: t('finance.cod_collected_hint'),
                            },
                            {
                                label: t('finance.cod_remitted'),
                                value: codRemitted,
                                count: cod_pipeline?.remitted_count ?? 0,
                                icon: ArrowUpFromLine,
                                color: 'text-green-700',
                                bg: 'bg-green-50',
                                border: 'border-green-200',
                                hint: t('finance.cod_remitted_hint'),
                            },
                        ].map(({ label, value, count, icon: Icon, color, bg, border, hint }) => (
                            <div key={label} className={`rounded-xl border ${border} ${bg} p-4`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
                                    <Icon className={`w-4 h-4 ${color}`} />
                                </div>
                                <p className={`text-2xl font-bold ${color}`}>{currency(value)}</p>
                                <p className="text-xs text-gray-500 mt-1">{count} {t('finance.shipments')} · {hint}</p>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-7">
                    {/* Revenue Trend */}
                    <Card className="md:col-span-4">
                        <CardHeader>
                            <CardTitle className="text-base">{t('finance.revenue_trend')}</CardTitle>
                            <CardDescription className="text-xs">{t('finance.daily_revenue')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {trend.length === 0 ? (
                                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <BarChart2 className="h-10 w-10 opacity-20" />
                                    <p className="text-sm">{t('finance.no_data')}</p>
                                </div>
                            ) : (
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#888"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => parseLocalDate(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                            />
                                            <YAxis
                                                stroke="#888"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                width={60}
                                                tickFormatter={(v) => safeFormatCurrency(Number(v))}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                                                formatter={((value: any) => [safeFormatCurrency(Number(value)), t('finance.revenue')]) as any}
                                                labelFormatter={((label: string) => parseLocalDate(label).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })) as any}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Branches */}
                    <Card className="md:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-base">{t('finance.top_branches')}</CardTitle>
                            <CardDescription className="text-xs">{t('finance.highest_revenue_branches')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {topBranches.length === 0 ? (
                                <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <Building className="h-10 w-10 opacity-20" />
                                    <p className="text-sm">{t('finance.no_data')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3 pt-1">
                                    {topBranches.map((branch, i) => {
                                        const pct = Math.round((branch.value / (topBranches[0]?.value || 1)) * 100);
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                                                    style={{ background: BRANCH_COLORS[i] + '22', color: BRANCH_COLORS[i] }}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{branch.name}</p>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: BRANCH_COLORS[i] }} />
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold shrink-0">{currency(branch.value)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Returns & Refunds Section */}
                <Card className="border-red-100 dark:border-red-800">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-red-500" />
                            {t('returns.title')} & {t('returns.refund_amount')}
                        </CardTitle>
                        <CardDescription className="text-xs">{t('finance.returns_subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                                <p className="text-xs text-muted-foreground">{t('returns.total')}</p>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{returns_count ?? 0}</p>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4">
                                <p className="text-xs text-muted-foreground">{t('returns.refund_amount')}</p>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{currency(total_refunds ?? 0)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <p className="text-xs text-muted-foreground">{t('finance.net_after_refunds')}</p>
                                <p className={`text-2xl font-bold ${(net_after_refunds ?? 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {currency(net_after_refunds ?? 0)}
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <p className="text-xs text-muted-foreground">{t('finance.refund_rate')}</p>
                                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                                    {totalRevenue > 0 ? (((total_refunds ?? 0) / totalRevenue) * 100).toFixed(1) : '0.0'}%
                                </p>
                            </div>
                        </div>
                        {returns_by_reason && Object.keys(returns_by_reason).length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t('returns.reason')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(returns_by_reason).map(([reason, cnt]) => (
                                        <span key={reason} className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                                            {t(`returns.reason_${reason}`)} · {cnt}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Department Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('finance.department_performance')}</CardTitle>
                        <CardDescription className="text-xs">{t('finance.revenue_by_department')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topDepartments.length === 0 ? (
                            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <BarChart2 className="h-10 w-10 opacity-20" />
                                <p className="text-sm">{t('finance.no_data')}</p>
                            </div>
                        ) : (
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topDepartments} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                                            formatter={(value: any) => [safeFormatCurrency(Number(value)), t('finance.revenue')]}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                                            {topDepartments.map((_, i) => (
                                                <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </AuthenticatedLayout>
    );
}

function DateRangePicker({ filters }: { filters: any }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [from, setFrom] = useState(filters.start_date ?? '');
    const [to, setTo]     = useState(filters.end_date ?? '');

    const apply = (startDate: string, endDate: string) => {
        router.get(route('finance.index'), { ...filters, start_date: startDate, end_date: endDate }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
        setOpen(false);
    };

    const presets = [
        {
            label: t('finance.this_month'),
            fn: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                setFrom(start); setTo(end); apply(start, end);
            },
        },
        {
            label: t('finance.last_30_days'),
            fn: () => {
                const end   = new Date().toISOString().split('T')[0];
                const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
                setFrom(start); setTo(end); apply(start, end);
            },
        },
        {
            label: t('finance.last_quarter'),
            fn: () => {
                const end   = new Date().toISOString().split('T')[0];
                const start = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
                setFrom(start); setTo(end); apply(start, end);
            },
        },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 text-sm font-normal")}>
                    <Calendar className="h-3.5 w-3.5" />
                    {filters.start_date ? `${filters.start_date} → ${filters.end_date}` : t('finance.pick_date_range')}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-3">{t('finance.quick_select')}</p>
                <div className="flex flex-col gap-1 mb-4">
                    {presets.map((p) => (
                        <Button key={p.label} variant="ghost" size="sm" className="justify-start text-sm h-8" onClick={p.fn}>
                            {p.label}
                        </Button>
                    ))}
                </div>
                <div className="border-t pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">{t('billing.filter_date_from')}</label>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">{t('billing.filter_date_to')}</label>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs" />
                        </div>
                    </div>
                    <Button size="sm" className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => from && to && apply(from, to)}>
                        {t('billing.apply_filters')}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
