import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { AppPagination } from '@/Components/Shared/AppPagination';
import { useState, FormEventHandler, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { ArrowLeft, Plus, Pencil, Trash2, Calculator, Search, ChevronRight, ToggleLeft, ToggleRight, BadgeCheck, Clock, Users, GitBranch, Globe } from 'lucide-react';

type TriggerOn = 'on_creation' | 'on_delivery' | 'on_cod_remittance' | 'on_pickup_completion';

interface CommissionRule {
    id: number;
    name: string;
    description: string | null;
    type: 'percentage' | 'fixed';
    rate: string;
    currency: string;
    applies_to: 'all' | 'branch' | 'user' | 'zone';
    reference_id: number | null;
    min_amount: string | null;
    max_amount: string | null;
    priority: number;
    is_active: boolean;
    trigger_on: TriggerOn;
}

interface UserOption   { id: number; name: string; email: string }
interface BranchOption { id: number; name: string }

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number; last_page: number;
    per_page: number; total: number; from: number; to: number;
}

interface Props {
    rules:    Paginated<CommissionRule>;
    users:    UserOption[];
    branches: BranchOption[];
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CommissionsRules({ rules, users, branches }: Props) {
    const { t } = useTranslation();

    // Form visibility
    const [showForm, setShowForm]       = useState(false);
    const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);

    // Search within table
    const [ruleSearch, setRuleSearch]   = useState('');

    // Reference field dropdowns
    const [userSearch, setUserSearch]     = useState('');
    const [showUserDrop, setShowUserDrop] = useState(false);
    const [branchSearch, setBranchSearch]     = useState('');
    const [showBranchDrop, setShowBranchDrop] = useState(false);

    // Live preview — lifted up so it survives parent re-renders
    const [previewAmount, setPreviewAmount] = useState('');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:         '',
        description:  '',
        type:         'percentage' as 'percentage' | 'fixed',
        rate:         '',
        currency:     'USD',
        applies_to:   'all' as 'all' | 'branch' | 'user' | 'zone',
        reference_id: '' as string | number,
        min_amount:   '',
        max_amount:   '',
        priority:     '0',
        is_active:    true,
        trigger_on:   'on_creation' as TriggerOn,
    });

    // Live commission preview
    const previewCommission = useMemo(() => {
        const a = parseFloat(previewAmount);
        const r = parseFloat(data.rate);
        if (!data.rate || isNaN(a) || isNaN(r) || a <= 0 || r < 0) return null;
        return data.type === 'percentage' ? (a * r) / 100 : r;
    }, [previewAmount, data.rate, data.type]);

    const filteredUsers = useMemo(() =>
        users.filter(u =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase())
        ).slice(0, 10),
    [users, userSearch]);

    const filteredBranches = useMemo(() =>
        branches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase())).slice(0, 10),
    [branches, branchSearch]);

    const visibleRules = useMemo(() =>
        ruleSearch
            ? rules.data.filter(r => r.name.toLowerCase().includes(ruleSearch.toLowerCase()))
            : rules.data,
    [rules.data, ruleSearch]);

    function startEdit(rule: CommissionRule) {
        setEditingRule(rule);
        setPreviewAmount('');
        const refUser   = users.find(u => u.id === rule.reference_id);
        const refBranch = branches.find(b => b.id === rule.reference_id);
        setUserSearch(rule.applies_to === 'user'   ? (refUser?.name   ?? '') : '');
        setBranchSearch(rule.applies_to === 'branch' ? (refBranch?.name ?? '') : '');
        setData({
            name:         rule.name,
            description:  rule.description ?? '',
            type:         rule.type,
            rate:         rule.rate,
            currency:     rule.currency,
            applies_to:   rule.applies_to,
            reference_id: rule.reference_id ?? '',
            min_amount:   rule.min_amount ?? '',
            max_amount:   rule.max_amount ?? '',
            priority:     String(rule.priority ?? 0),
            is_active:    rule.is_active,
            trigger_on:   rule.trigger_on ?? 'on_creation',
        });
        setShowForm(true);
        setTimeout(() => document.getElementById('rule-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }

    function openNewForm() {
        setEditingRule(null);
        setPreviewAmount('');
        setUserSearch('');
        setBranchSearch('');
        reset();
        setShowForm(true);
    }

    function cancelForm() {
        setShowForm(false);
        setEditingRule(null);
        setUserSearch('');
        setBranchSearch('');
        setPreviewAmount('');
        reset();
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingRule) {
            put(route('commissions.rules.update', editingRule.id), { onSuccess: cancelForm });
        } else {
            post(route('commissions.rules.store'), { onSuccess: cancelForm });
        }
    };

    function deleteRule(id: number) {
        Swal.fire({
            title: t('commissions.delete_confirm'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: t('common.delete'),
            cancelButtonText: t('common.cancel'),
            reverseButtons: true,
            customClass: { popup: 'rounded-2xl shadow-2xl' },
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('commissions.rules.destroy', id));
            }
        });
    }

    // Icon for applies_to
    const appliesToIcon = (type: string) => {
        switch (type) {
            case 'user':   return <Users className="w-3.5 h-3.5 text-indigo-500" />;
            case 'branch': return <GitBranch className="w-3.5 h-3.5 text-blue-500" />;
            case 'zone':   return <Globe className="w-3.5 h-3.5 text-purple-500" />;
            default:       return <Globe className="w-3.5 h-3.5 text-green-500" />;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('commissions.rules')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <a href={route('commissions.index')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </a>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('commissions.rules')}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('commissions.rules_subtitle')}</p>
                        </div>
                    </div>
                    {!showForm && (
                        <button
                            onClick={openNewForm}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            {t('commissions.new_rule')}
                        </button>
                    )}
                </div>

                {/* How commissions work — info banner */}
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 text-sm text-indigo-800 dark:text-indigo-300">
                    <div className="flex items-start gap-3">
                        <BadgeCheck className="w-5 h-5 mt-0.5 shrink-0 text-indigo-500" />
                        <div className="space-y-1">
                            <p className="font-semibold">{t('commissions.how_it_works_title')}</p>
                            <p className="text-indigo-700 dark:text-indigo-400 text-xs leading-relaxed">{t('commissions.how_it_works_body')}</p>
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <span className="inline-flex items-center gap-1 text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3" />{t('commissions.status_pending')}
                                </span>
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    <BadgeCheck className="w-3 h-3" />{t('commissions.status_approved')}
                                </span>
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    <BadgeCheck className="w-3 h-3" />{t('commissions.status_paid')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Form ── */}
                {showForm && (
                    <div id="rule-form" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                                {editingRule ? t('commissions.edit') : t('commissions.new_rule')}
                            </h2>
                            <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                        </div>

                        <form onSubmit={submit} className="p-6 space-y-5">

                            {/* Row 1: Name + Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.rule_name')} <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.rule_description')} <span className="text-xs text-gray-400">({t('common.optional')})</span></label>
                                    <input
                                        type="text"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder={t('commissions.rule_description_placeholder')}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Type + Rate + Currency */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.type')} <span className="text-red-500">*</span></label>
                                    <select
                                        value={data.type}
                                        onChange={(e) => { setData('type', e.target.value as any); setPreviewAmount(''); }}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="percentage">{t('commissions.type_percentage')}</option>
                                        <option value="fixed">{t('commissions.type_fixed')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('commissions.rate')} {data.type === 'percentage' ? '(%)' : `(${data.currency})`} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        value={data.rate}
                                        onChange={(e) => setData('rate', e.target.value)}
                                        required
                                        placeholder="0.00"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.currency')}</label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        value={data.currency}
                                        onChange={(e) => setData('currency', e.target.value.toUpperCase())}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Applies To + Reference */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.applies_to')} <span className="text-red-500">*</span></label>
                                    <select
                                        value={data.applies_to}
                                        onChange={(e) => {
                                            setData('applies_to', e.target.value as any);
                                            setData('reference_id', '');
                                            setUserSearch('');
                                            setBranchSearch('');
                                        }}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="all">{t('commissions.applies_all')}</option>
                                        <option value="user">{t('commissions.applies_user')}</option>
                                        <option value="branch">{t('commissions.applies_branch')}</option>
                                        <option value="zone">{t('commissions.applies_zone')}</option>
                                    </select>
                                </div>

                                {/* User picker */}
                                {data.applies_to === 'user' && (
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.applies_user')} <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={e => { setUserSearch(e.target.value); setShowUserDrop(true); setData('reference_id', ''); }}
                                            onFocus={() => setShowUserDrop(true)}
                                            onBlur={() => setTimeout(() => setShowUserDrop(false), 200)}
                                            placeholder={t('commissions.search_user')}
                                            autoComplete="off"
                                            required
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        {showUserDrop && filteredUsers.length > 0 && (
                                            <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                {filteredUsers.map(u => (
                                                    <li key={u.id}
                                                        onMouseDown={() => { setData('reference_id', u.id); setUserSearch(u.name); setShowUserDrop(false); }}
                                                        className="px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer">
                                                        <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                                                        <div className="text-xs text-gray-400">{u.email}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {errors.reference_id && <p className="text-red-500 text-xs mt-1">{errors.reference_id}</p>}
                                    </div>
                                )}

                                {/* Branch picker */}
                                {data.applies_to === 'branch' && (
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.applies_branch')} <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={branchSearch}
                                            onChange={e => { setBranchSearch(e.target.value); setShowBranchDrop(true); setData('reference_id', ''); }}
                                            onFocus={() => setShowBranchDrop(true)}
                                            onBlur={() => setTimeout(() => setShowBranchDrop(false), 200)}
                                            placeholder={t('commissions.search_branch')}
                                            autoComplete="off"
                                            required
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        {showBranchDrop && filteredBranches.length > 0 && (
                                            <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                {filteredBranches.map(b => (
                                                    <li key={b.id}
                                                        onMouseDown={() => { setData('reference_id', b.id); setBranchSearch(b.name); setShowBranchDrop(false); }}
                                                        className="px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer font-medium text-gray-900 dark:text-white">
                                                        {b.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {errors.reference_id && <p className="text-red-500 text-xs mt-1">{errors.reference_id}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Row 4: Thresholds + Priority */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.min_amount')} <span className="text-xs text-gray-400">({t('common.optional')})</span></label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={data.min_amount}
                                        onChange={(e) => setData('min_amount', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-0.5">{t('commissions.min_amount_hint')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.max_amount')} <span className="text-xs text-gray-400">({t('common.optional')})</span></label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={data.max_amount}
                                        onChange={(e) => setData('max_amount', e.target.value)}
                                        placeholder={t('commissions.max_amount_placeholder')}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-0.5">{t('commissions.max_amount_hint')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('commissions.priority')}</label>
                                    <input
                                        type="number" step="1" min="0" max="9999"
                                        value={data.priority}
                                        onChange={(e) => setData('priority', e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-0.5">{t('commissions.priority_hint')}</p>
                                </div>
                            </div>

                            {/* Row 5: Trigger */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('commissions.trigger_on')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.trigger_on}
                                    onChange={(e) => setData('trigger_on', e.target.value as TriggerOn)}
                                    className="w-full sm:w-1/2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="on_creation">{t('commissions.trigger_on_creation')}</option>
                                    <option value="on_delivery">{t('commissions.trigger_on_delivery')}</option>
                                    <option value="on_cod_remittance">{t('commissions.trigger_on_cod_remittance')}</option>
                                    <option value="on_pickup_completion">{t('commissions.trigger_on_pickup_completion')}</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-0.5">{t('commissions.trigger_on_hint')}</p>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={data.is_active}
                                    onClick={() => setData('is_active', !data.is_active)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('commissions.is_active')}</span>
                            </div>

                            {/* ── Live Preview Calculator (state lifted to parent) ── */}
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calculator className="w-4 h-4 text-indigo-600" />
                                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{t('commissions.preview_title')}</span>
                                    {data.type === 'fixed' && data.rate && (
                                        <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-auto">
                                            {t('commissions.type_fixed')}: <strong>{data.rate} {data.currency}</strong> {t('commissions.preview_per_shipment')}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-indigo-600 dark:text-indigo-400 mb-1">{t('commissions.preview_shipment_amount')}</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={previewAmount}
                                            onChange={e => setPreviewAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-indigo-600 dark:text-indigo-400 mb-1">{t('commissions.preview_commission')}</label>
                                        <div className={`w-full border rounded-lg px-3 py-2 text-sm min-h-[38px] font-semibold ${
                                            previewCommission !== null
                                                ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                                                : 'border-indigo-200 bg-white text-gray-400 dark:bg-gray-800 dark:border-indigo-700 dark:text-gray-500'
                                        }`}>
                                            {previewCommission !== null
                                                ? `${previewCommission.toFixed(2)} ${data.currency}`
                                                : previewAmount
                                                    ? '—'
                                                    : <span className="font-normal text-xs italic">{t('commissions.preview_hint')}</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                                {/* Range warning */}
                                {previewCommission !== null && (data.min_amount || data.max_amount) && (() => {
                                    const a = parseFloat(previewAmount);
                                    const min = data.min_amount ? parseFloat(data.min_amount) : -Infinity;
                                    const max = data.max_amount ? parseFloat(data.max_amount) : Infinity;
                                    if (a < min || a > max) {
                                        return (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                                ⚠ {t('commissions.preview_out_of_range')} ({data.min_amount ?? '0'} – {data.max_amount ?? '∞'})
                                            </p>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button type="submit" disabled={processing}
                                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                                    {processing ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                                    {processing ? t('common.saving') : t('commissions.save')}
                                </button>
                                <button type="button" onClick={cancelForm}
                                    className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    {t('commissions.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Rules Table ── */}
                <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                    {/* Table header */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-white">{t('commissions.rules_list')}</span>
                            <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{rules.total}</span>
                        </div>
                        <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                value={ruleSearch}
                                onChange={(e) => setRuleSearch(e.target.value)}
                                placeholder={t('commissions.search_rule_name')}
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 w-full sm:w-52"
                            />
                        </div>
                    </div>

                    {/* Scrollable table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-[800px] w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.rule_name')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.type')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.rate')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.applies_to')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.trigger_on')}</th>
                                    <th className="px-4 py-3 text-left font-semibold">{t('commissions.thresholds')}</th>
                                    <th className="px-4 py-3 text-center font-semibold">{t('commissions.priority')}</th>
                                    <th className="px-4 py-3 text-center font-semibold">{t('commissions.is_active')}</th>
                                    <th className="px-4 py-3 text-right font-semibold">{t('commissions.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {visibleRules.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400 italic">
                                            {t('commissions.no_rules')}
                                        </td>
                                    </tr>
                                ) : visibleRules.map((rule) => {
                                    const refUser   = rule.applies_to === 'user'   ? users.find(u => u.id === rule.reference_id)     : null;
                                    const refBranch = rule.applies_to === 'branch' ? branches.find(b => b.id === rule.reference_id)  : null;
                                    return (
                                        <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900 dark:text-white">{rule.name}</div>
                                                {rule.description && (
                                                    <div className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{rule.description}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    rule.type === 'percentage'
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                }`}>
                                                    {t(`commissions.type_${rule.type}`)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                                {rule.type === 'percentage'
                                                    ? `${parseFloat(rule.rate)}%`
                                                    : `${parseFloat(rule.rate).toFixed(2)} ${rule.currency}`}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                <div className="flex items-center gap-1.5">
                                                    {appliesToIcon(rule.applies_to)}
                                                    <div>
                                                        <div>{t(`commissions.applies_${rule.applies_to}`)}</div>
                                                        {refUser   && <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{refUser.name}</div>}
                                                        {refBranch && <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{refBranch.name}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {(() => {
                                                    const triggerColors: Record<string, string> = {
                                                        on_creation:         'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                                                        on_delivery:         'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                                                        on_cod_remittance:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                                                        on_pickup_completion:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                                                    };
                                                    const key = rule.trigger_on ?? 'on_creation';
                                                    return (
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${triggerColors[key] ?? triggerColors['on_creation']}`}>
                                                            {t(`commissions.trigger_${key}`)}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {(rule.min_amount || rule.max_amount)
                                                    ? <span className="font-mono">{rule.min_amount ?? '0'} – {rule.max_amount ?? '∞'}</span>
                                                    : <span className="text-gray-300 dark:text-gray-600">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                                    {rule.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex px-2.5 py-1 text-xs rounded-full font-medium ${
                                                    rule.is_active
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                                }`}>
                                                    {rule.is_active ? t('common.yes') : t('common.no')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => startEdit(rule)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        {t('commissions.edit')}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRule(rule.id)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        {t('commissions.delete')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700">
                        <AppPagination variant="server" meta={rules} />
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
