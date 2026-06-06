import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import {
    ArrowLeft, FileText, User, Tag, Calendar, Clock, Shield,
    Upload, X, Loader2, Hash, Edit as EditIcon, Download,
} from 'lucide-react';

interface Customer { id: number; name: string; email: string }
interface RateCard  { id: number; name: string }
interface Contract {
    id: number;
    contract_number: string;
    title: string;
    terms: string | null;
    status: string;
    start_date: string;
    end_date: string | null;
    file_path: string | null;
    file_paths: string[] | null;
    customer_id: number;
    rate_card_id: number | null;
}
interface Props { contract: Contract; customers: Customer[]; rateCards: RateCard[] }

// ── Searchable select ────────────────────────────────────────────────────
function SearchSelect<T extends { id: number; name: string }>({
    items, value, onChange, placeholder, noResultsText, renderItem, error,
}: {
    items: T[]; value: string; onChange: (id: string) => void;
    placeholder: string; noResultsText: string;
    renderItem?: (item: T) => string; error?: string;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen]   = useState(false);
    const wrapRef           = useRef<HTMLDivElement>(null);

    const selected = items.find(i => String(i.id) === value);
    const filtered = query.trim()
        ? items.filter(i => {
            const label = renderItem ? renderItem(i) : i.name;
            return label.toLowerCase().includes(query.toLowerCase());
          })
        : items;

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function select(item: T) { onChange(String(item.id)); setQuery(''); setOpen(false); }
    function clear() { onChange(''); setQuery(''); }
    const displayLabel = selected ? (renderItem ? renderItem(selected) : selected.name) : '';

    return (
        <div ref={wrapRef} className="relative">
            <div
                className={`flex items-center w-full border rounded-xl px-3 py-2.5 text-sm cursor-pointer bg-white ${error ? 'border-red-400' : 'border-gray-200'} focus-within:ring-2 focus-within:ring-indigo-400`}
                onClick={() => setOpen(true)}
            >
                {selected && !open ? (
                    <span className="flex-1 truncate text-gray-900">{displayLabel}</span>
                ) : (
                    <input
                        autoFocus={open}
                        className="flex-1 outline-none text-sm bg-transparent text-gray-700"
                        placeholder={selected ? displayLabel : placeholder}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                    />
                )}
                {selected && (
                    <button type="button" onClick={e => { e.stopPropagation(); clear(); }}
                        className="ml-2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
                <span className="ml-1 text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">{noResultsText}</p>
                    ) : filtered.map(item => (
                        <div key={item.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${String(item.id) === value ? 'bg-indigo-100 font-medium' : ''}`}
                            onMouseDown={() => select(item)}>
                            {renderItem ? renderItem(item) : item.name}
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

const STATUS_OPTS = ['draft', 'active', 'expired', 'cancelled'];

const STATUS_BADGE: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    active:    'bg-green-100 text-green-700',
    expired:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
};

// ── Main component ───────────────────────────────────────────────────────
export default function ContractEdit({ contract, customers, rateCards }: Props) {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);

    const initialFiles: string[] = contract.file_paths ?? (contract.file_path ? [contract.file_path] : []);
    const [existingFiles, setExistingFiles] = useState<string[]>(initialFiles);
    const [removedFiles, setRemovedFiles]   = useState<string[]>([]);
    const [newFiles, setNewFiles]           = useState<File[]>([]);

    const [data, setData] = useState({
        customer_id:  String(contract.customer_id),
        rate_card_id: contract.rate_card_id ? String(contract.rate_card_id) : '',
        title:        contract.title,
        terms:        contract.terms ?? '',
        start_date:   contract.start_date,
        end_date:     contract.end_date ?? '',
        status:       contract.status,
    });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors]         = useState<Record<string, string>>({});

    function setField<K extends keyof typeof data>(key: K, value: string) {
        setData(prev => ({ ...prev, [key]: value }));
    }

    function removeExisting(path: string) {
        setExistingFiles(prev => prev.filter(p => p !== path));
        setRemovedFiles(prev => [...prev, path]);
    }

    function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        setNewFiles(prev => [...prev, ...files].slice(0, 10));
        if (fileRef.current) fileRef.current.value = '';
    }

    function removeNew(index: number) {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        const formData = new FormData();
        formData.append('_method', 'PUT');
        Object.entries(data).forEach(([k, v]) => formData.append(k, v));
        newFiles.forEach(f => formData.append('files[]', f));
        removedFiles.forEach(p => formData.append('remove_files[]', p));
        router.post(route('contracts.update', contract.id), formData, {
            onError: (errs) => { setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    }

    const inputCls = (field: string) =>
        `w-full border rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 ${errors[field] ? 'border-red-400' : 'border-gray-200'}`;

    const fileName = (path: string) => path.split('/').pop() ?? path;

    return (
        <AuthenticatedLayout>
            <Head title={t('contracts.edit_contract')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href={route('contracts.show', contract.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <EditIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('contracts.edit_contract')}</h1>
                        <p className="text-sm text-gray-500 font-mono mt-0.5">{contract.contract_number}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Left: main form fields (2 cols) ── */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Core info */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    {t('contracts.contract_details')}
                                </h3>

                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                        {t('contracts.title')} <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" value={data.title}
                                        onChange={e => setField('title', e.target.value)}
                                        className={inputCls('title')} />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>

                                {/* Customer */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        {t('contracts.customer')} <span className="text-red-500">*</span>
                                    </label>
                                    <SearchSelect
                                        items={customers}
                                        value={data.customer_id}
                                        onChange={v => setField('customer_id', v)}
                                        placeholder={t('contracts.search_customer')}
                                        noResultsText={t('contracts.no_customers')}
                                        renderItem={c => `${c.name} (${c.email})`}
                                        error={errors.customer_id}
                                    />
                                </div>

                                {/* Rate Card */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" />
                                        {t('contracts.rate_card')}
                                        <span className="text-gray-400 font-normal ml-1">({t('contracts.optional')})</span>
                                    </label>
                                    <SearchSelect
                                        items={rateCards}
                                        value={data.rate_card_id}
                                        onChange={v => setField('rate_card_id', v)}
                                        placeholder={t('contracts.search_rate_card')}
                                        noResultsText={t('contracts.no_rate_cards')}
                                    />
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {t('contracts.start_date')} <span className="text-red-500">*</span>
                                        </label>
                                        <input type="date" value={data.start_date}
                                            onChange={e => setField('start_date', e.target.value)}
                                            className={inputCls('start_date')} />
                                        {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {t('contracts.end_date')}
                                            <span className="text-gray-400 font-normal ml-1">({t('contracts.optional')})</span>
                                        </label>
                                        <input type="date" value={data.end_date}
                                            onChange={e => setField('end_date', e.target.value)}
                                            className={inputCls('end_date')} />
                                        {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5" />
                                        {t('contracts.status')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {STATUS_OPTS.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setField('status', s)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                    data.status === s
                                                        ? `${STATUS_BADGE[s]} border-transparent ring-2 ring-offset-1 ring-current`
                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                {t(`contracts.status_${s}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    {t('contracts.terms')}
                                    <span className="text-gray-400 font-normal normal-case">({t('contracts.optional')})</span>
                                </label>
                                <textarea rows={8} value={data.terms}
                                    onChange={e => setField('terms', e.target.value)}
                                    className={inputCls('terms') + ' resize-none'} />
                            </div>
                        </div>

                        {/* ── Right: files + submit ── */}
                        <div className="space-y-5">

                            {/* Files card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('contracts.files')}</h3>
                                <p className="text-xs text-gray-400 mb-4">{t('contracts.files_hint')}</p>

                                {/* Existing files */}
                                {existingFiles.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">{t('contracts.files_existing')}</p>
                                        <ul className="space-y-2">
                                            {existingFiles.map((path, i) => (
                                                <li key={i} className="flex items-center justify-between gap-2 text-xs bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                                                    <a href={`/storage/${path}`} target="_blank" rel="noopener noreferrer"
                                                        className="truncate text-blue-700 hover:underline flex items-center gap-1.5">
                                                        <Download className="w-3.5 h-3.5 shrink-0" />
                                                        {fileName(path)}
                                                    </a>
                                                    <button type="button" onClick={() => removeExisting(path)}
                                                        className="text-red-400 hover:text-red-600 shrink-0">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Upload zone */}
                                <div
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">{t('contracts.file_replace')}</p>
                                    {newFiles.length > 0 && (
                                        <p className="text-sm text-indigo-600 mt-1 font-semibold">
                                            {t('contracts.files_count', { count: newFiles.length })}
                                        </p>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" multiple accept="application/pdf" onChange={handleFilePick} className="hidden" />

                                {newFiles.length > 0 && (
                                    <ul className="mt-3 space-y-2">
                                        {newFiles.map((f, i) => (
                                            <li key={i} className="flex items-center justify-between gap-2 text-xs bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                                <span className="truncate text-gray-700 flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                    {f.name}
                                                    <span className="text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span>
                                                </span>
                                                <button type="button" onClick={() => removeNew(i)}
                                                    className="text-red-400 hover:text-red-600 shrink-0">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {errors['files'] && <p className="text-red-500 text-xs mt-2">{errors['files']}</p>}
                            </div>

                            {/* Contract ref card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Hash className="w-3.5 h-3.5" />
                                    {t('contracts.contract_number')}
                                </h3>
                                <p className="text-sm font-mono font-semibold text-gray-800">{contract.contract_number}</p>
                            </div>

                            {/* Submit */}
                            <div className="flex flex-col gap-3">
                                <button type="submit" disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors shadow-sm">
                                    {processing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <EditIcon className="w-4 h-4" />
                                    }
                                    {processing ? t('common.saving') : t('common.save')}
                                </button>
                                <Link href={route('contracts.show', contract.id)}
                                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('common.cancel')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
