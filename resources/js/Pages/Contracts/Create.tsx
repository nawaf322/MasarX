import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';

interface Customer { id: number; name: string; email: string }
interface RateCard  { id: number; name: string }
interface Props { customers: Customer[]; rateCards: RateCard[] }

function SearchSelect<T extends { id: number; name: string }>({
    items,
    value,
    onChange,
    placeholder,
    noResultsText,
    renderItem,
    error,
}: {
    items: T[];
    value: string;
    onChange: (id: string) => void;
    placeholder: string;
    noResultsText: string;
    renderItem?: (item: T) => string;
    error?: string;
}) {
    const [query, setQuery]     = useState('');
    const [open, setOpen]       = useState(false);
    const wrapRef               = useRef<HTMLDivElement>(null);

    const selected = items.find(i => String(i.id) === value);
    const filtered = query.trim()
        ? items.filter(i => {
            const label = renderItem ? renderItem(i) : i.name;
            return label.toLowerCase().includes(query.toLowerCase());
          })
        : items;

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function select(item: T) {
        onChange(String(item.id));
        setQuery('');
        setOpen(false);
    }

    function clear() {
        onChange('');
        setQuery('');
    }

    const displayLabel = selected ? (renderItem ? renderItem(selected) : selected.name) : '';

    return (
        <div ref={wrapRef} className="relative">
            <div
                className={`flex items-center w-full border rounded px-3 py-2 text-sm cursor-pointer bg-white ${error ? 'border-red-400' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-blue-400`}
                onClick={() => { setOpen(true); }}
            >
                {selected && !open ? (
                    <span className="flex-1 truncate text-gray-900">{displayLabel}</span>
                ) : (
                    <input
                        autoFocus={open}
                        className="flex-1 outline-none text-sm bg-transparent"
                        placeholder={selected ? displayLabel : placeholder}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                    />
                )}
                {selected && (
                    <button type="button" onClick={e => { e.stopPropagation(); clear(); }} className="ml-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                )}
                <span className="ml-1 text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">{noResultsText}</p>
                    ) : filtered.map(item => (
                        <div
                            key={item.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${String(item.id) === value ? 'bg-blue-100 font-medium' : ''}`}
                            onMouseDown={() => select(item)}
                        >
                            {renderItem ? renderItem(item) : item.name}
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

export default function ContractCreate({ customers, rateCards }: Props) {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const { data, setData, post, processing, errors } = useForm<{
        customer_id:  string;
        rate_card_id: string;
        title:        string;
        terms:        string;
        start_date:   string;
        end_date:     string;
        status:       string;
    }>({
        customer_id:  '',
        rate_card_id: '',
        title:        '',
        terms:        '',
        start_date:   '',
        end_date:     '',
        status:       'draft',
    });

    function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        setSelectedFiles(prev => {
            const combined = [...prev, ...files];
            return combined.slice(0, 10);
        });
        // Reset input so same file can be re-added after removal
        if (fileRef.current) fileRef.current.value = '';
    }

    function removeFile(index: number) {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => formData.append(k, v));
        selectedFiles.forEach(f => formData.append('files[]', f));

        post(route('contracts.store'), { forceFormData: true, data: formData } as any);
    }

    const inputCls = (field: string) =>
        `w-full border rounded px-3 py-2 text-sm ${errors[field as keyof typeof errors] ? 'border-red-400' : 'border-gray-300'}`;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">{t('contracts.new_contract')}</h2>}>
            <Head title={t('contracts.new_contract')} />
            <div className="py-6 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-5">

                    {/* Customer — searchable */}
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('contracts.customer')} *</label>
                        <SearchSelect
                            items={customers}
                            value={data.customer_id}
                            onChange={v => setData('customer_id', v)}
                            placeholder={t('contracts.search_customer')}
                            noResultsText={t('contracts.no_customers')}
                            renderItem={c => `${c.name} (${c.email})`}
                            error={errors.customer_id}
                        />
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('contracts.title')} *</label>
                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} className={inputCls('title')} />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    {/* Rate Card — searchable */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            {t('contracts.rate_card')} <span className="text-gray-400 text-xs">({t('contracts.optional')})</span>
                        </label>
                        <SearchSelect
                            items={rateCards}
                            value={data.rate_card_id}
                            onChange={v => setData('rate_card_id', v)}
                            placeholder={t('contracts.search_rate_card')}
                            noResultsText={t('contracts.no_rate_cards')}
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('contracts.start_date')} *</label>
                            <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} className={inputCls('start_date')} />
                            {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {t('contracts.end_date')} <span className="text-gray-400 text-xs">({t('contracts.optional')})</span>
                            </label>
                            <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} className={inputCls('end_date')} />
                            {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('contracts.status')}</label>
                        <select value={data.status} onChange={e => setData('status', e.target.value)} className={inputCls('status')}>
                            {['draft','active','cancelled'].map(s => (
                                <option key={s} value={s}>{t(`contracts.status_${s}`)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Terms */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            {t('contracts.terms')} <span className="text-gray-400 text-xs">({t('contracts.optional')})</span>
                        </label>
                        <textarea rows={5} value={data.terms} onChange={e => setData('terms', e.target.value)} className={inputCls('terms')} />
                    </div>

                    {/* Multiple PDFs */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            {t('contracts.files')} <span className="text-gray-400 text-xs">({t('contracts.optional')})</span>
                        </label>
                        <p className="text-xs text-gray-400 mb-2">{t('contracts.files_hint')}</p>

                        {/* Drop zone */}
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                            onClick={() => fileRef.current?.click()}
                        >
                            <p className="text-sm text-gray-500">
                                📎 {t('contracts.files_hint')}
                            </p>
                            {selectedFiles.length > 0 && (
                                <p className="text-sm text-blue-600 mt-1 font-medium">
                                    {t('contracts.files_count', { count: selectedFiles.length })}
                                </p>
                            )}
                        </div>
                        <input ref={fileRef} type="file" multiple accept="application/pdf" onChange={handleFilePick} className="hidden" />

                        {/* File list */}
                        {selectedFiles.length > 0 && (
                            <ul className="mt-2 space-y-1">
                                {selectedFiles.map((f, i) => (
                                    <li key={i} className="flex items-center justify-between text-sm bg-gray-50 border rounded px-3 py-1.5">
                                        <span className="truncate text-gray-700">📄 {f.name} <span className="text-gray-400 text-xs">({(f.size / 1024).toFixed(0)} KB)</span></span>
                                        <button type="button" onClick={() => removeFile(i)} className="ml-3 text-red-500 hover:text-red-700 text-xs shrink-0">
                                            {t('contracts.file_remove')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {errors['files'] && <p className="text-red-500 text-xs mt-1">{errors['files']}</p>}
                        {errors['files.*'] && <p className="text-red-500 text-xs mt-1">{errors['files.*']}</p>}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <a href={route('contracts.index')} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">
                            {t('common.cancel')}
                        </a>
                        <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                            {processing ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
