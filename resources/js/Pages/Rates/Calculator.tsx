import RatesLayout from '@/Layouts/RatesLayout';
import { useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from "@/Components/UI/button";
import { Label } from "@/Components/UI/label";
import { Input } from "@/Components/UI/input";
import { SearchableSelect } from "@/ui/kit/SearchableSelect";
import { ArrowRight, Calculator, MapPin } from "lucide-react";
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { RatesResultCard } from './RatesResultCard';

export default function RateCalculator({ countries = [] }: { countries?: Array<{ id: number; name: string; iso2?: string }> }) {
    const { t } = useTranslation();
    const { data, setData, setError, clearErrors, errors } = useForm({
        origin_country_id: '',
        origin_state_id: '',
        origin_city_id: '',
        dest_country_id: '',
        dest_state_id: '',
        dest_city_id: '',
        weight: '1',
        width: '10',
        height: '10',
        length: '10',
        declared_value: '0',
    });

    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const countryOptions = countries.map((c: any) => ({ label: c.name, value: c.id }));

    const sortedRates = useMemo(() => {
        const r = results?.rates || [];
        return [...r].sort((a: any, b: any) => parseFloat(String(a.total ?? a.total_price ?? 0)) - parseFloat(String(b.total ?? b.total_price ?? 0)));
    }, [results?.rates]);

    // Get country name by id
    const getCountryName = (id: string) => {
        const opt = countryOptions.find(c => String(c.value) === String(id));
        return opt ? opt.label : id;
    };

    const handleCalculate = async (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();
        setCalcError(null);
        setResults(null);

        const weightNum = parseFloat(String(data.weight || '0'));
        if (!data.origin_country_id) {
            setError('origin_country_id', t('rates.calc_origin_required'));
            return;
        }
        if (!data.dest_country_id) {
            setError('dest_country_id', t('rates.calc_dest_required'));
            return;
        }
        if (isNaN(weightNum) || weightNum < 0.1) {
            setError('weight', t('rates.calc_weight_min') || 'El peso debe ser al menos 0.1.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...data,
                origin_country_id: Number(data.origin_country_id) || data.origin_country_id,
                dest_country_id: Number(data.dest_country_id) || data.dest_country_id,
                weight: weightNum,
                length: Math.max(1, parseFloat(String(data.length || '10')) || 10),
                width: Math.max(1, parseFloat(String(data.width || '10')) || 10),
                height: Math.max(1, parseFloat(String(data.height || '10')) || 10),
                declared_value: parseFloat(String(data.declared_value || '0')) || 0,
            };
            const response = await axios.post(route('rates.calculate.post'), payload);
            setResults(response.data);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                Object.keys(error.response.data.errors).forEach((key: any) => {
                    setError(key, error.response.data.errors[key][0]);
                });
            } else if (error.response?.data?.error) {
                setCalcError(error.response.data.error);
            } else {
                setCalcError(t('rates.calc_error'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <RatesLayout title={t('rates.calculator')} wide>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Hero Header */}
                <div className="text-center space-y-2 pt-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
                        <Calculator className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {t('rates.calc_hero_title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                        {t('rates.calc_hero_subtitle')}
                    </p>
                </div>

                {/* Form */}
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleCalculate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 space-y-6">

                        {/* Row 1: Origin → Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-green-500" />
                                    {t('rates.calc_from')}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                    items={countryOptions}
                                    value={String(data.origin_country_id || '')}
                                    onChange={(val) => setData('origin_country_id', val)}
                                    placeholder={t('rates.select_origin')}
                                    className={errors.origin_country_id ? 'ring-2 ring-red-300 rounded-md' : ''}
                                />
                                {errors.origin_country_id && (
                                    <p className="text-red-500 text-xs">{errors.origin_country_id}</p>
                                )}
                            </div>

                            <div className="hidden sm:flex items-center justify-center pb-1">
                                <ArrowRight className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-red-500" />
                                    {t('rates.calc_to')}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                    items={countryOptions}
                                    value={String(data.dest_country_id || '')}
                                    onChange={(val) => setData('dest_country_id', val)}
                                    placeholder={t('rates.select_dest')}
                                    className={errors.dest_country_id ? 'ring-2 ring-red-300 rounded-md' : ''}
                                />
                                {errors.dest_country_id && (
                                    <p className="text-red-500 text-xs">{errors.dest_country_id}</p>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Package dimensions + value */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {/* Weight */}
                            <div className="space-y-2 col-span-2 sm:col-span-1 lg:col-span-1">
                                <Label className="text-sm font-medium">
                                    {t('rates.calc_weight')} <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min={0.1}
                                        value={data.weight}
                                        onChange={e => setData('weight', e.target.value)}
                                        className={`pr-8 ${errors.weight ? 'ring-2 ring-red-300' : ''}`}
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">kg</span>
                                </div>
                                {errors.weight && <p className="text-red-500 text-xs">{errors.weight}</p>}
                            </div>

                            {/* Length */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('rates.calc_length')}</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={data.length}
                                        onChange={e => setData('length', e.target.value)}
                                        className="pr-8"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cm</span>
                                </div>
                            </div>

                            {/* Width */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('rates.calc_width')}</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={data.width}
                                        onChange={e => setData('width', e.target.value)}
                                        className="pr-8"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cm</span>
                                </div>
                            </div>

                            {/* Height */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('rates.calc_height')}</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={data.height}
                                        onChange={e => setData('height', e.target.value)}
                                        className="pr-8"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cm</span>
                                </div>
                            </div>

                            {/* Declared value */}
                            <div className="space-y-2 col-span-2 sm:col-span-1 lg:col-span-2">
                                <Label className="text-sm font-medium">{t('rates.calc_value')}</Label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={data.declared_value}
                                        onChange={e => setData('declared_value', e.target.value)}
                                        className="pl-6"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Calculate button */}
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full sm:w-auto sm:min-w-[200px] bg-primary hover:bg-primary/90"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                                        {t('rates.calc_loading')}
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {t('rates.calc_btn')}
                                    </>
                                )}
                            </Button>

                            {calcError && (
                                <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800 text-center">
                                    {calcError}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Results section */}
                {results && (
                    <div className="space-y-5 animate-in fade-in-50 slide-in-from-bottom-4">
                        {/* Summary bar */}
                        <div className="max-w-3xl mx-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {getCountryName(String(data.origin_country_id))}
                                    {' → '}
                                    {getCountryName(String(data.dest_country_id))}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                <span>{data.weight} kg</span>
                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                <span>{data.length}×{data.width}×{data.height} cm</span>
                                {results.inputs?.volumetric_weight != null && (
                                    <>
                                        <span className="text-slate-300 dark:text-slate-600">·</span>
                                        <span>{t('rates.calc_summary_volumetric')}: {Number(results.inputs.volumetric_weight).toFixed(2)} kg</span>
                                    </>
                                )}
                                {parseFloat(String(data.declared_value)) > 0 && (
                                    <>
                                        <span className="text-slate-300 dark:text-slate-600">·</span>
                                        <span>${data.declared_value}</span>
                                    </>
                                )}
                                {results.zone_name && (
                                    <>
                                        <span className="text-slate-300 dark:text-slate-600">·</span>
                                        <span className="text-primary font-medium">{results.zone_name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Results grid */}
                        {sortedRates.length > 0 ? (
                            <>
                                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
                                    {t('rates.calc_results_summary')} ({sortedRates.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sortedRates.map((rate: any, index: number) => (
                                        <RatesResultCard
                                            key={`${rate.card_name}-${rate.service_type}-${index}`}
                                            rate={rate}
                                            index={index}
                                            countries={countries}
                                            calcInputs={data}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="max-w-3xl mx-auto text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                <Calculator className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="font-semibold text-slate-600 dark:text-slate-400">{t('rates.calc_no_rates')}</p>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                                    {t('rates.calc_no_rates_desc')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Initial empty state (before any calculation) */}
                {!results && !loading && (
                    <div className="max-w-3xl mx-auto text-center py-10 text-slate-400 dark:text-slate-600">
                        <p className="text-sm">{t('rates.calc_ready_desc')}</p>
                    </div>
                )}
            </div>
        </RatesLayout>
    );
}
