import { Card, CardContent } from '@/Components/UI/card';
import { Badge } from '@/Components/UI/badge';
import { Button } from '@/Components/UI/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Wind, Anchor, Truck, Package, ChevronDown, Clock } from 'lucide-react';
import { router } from '@inertiajs/react';
import React, { useState } from 'react';

type Country = { id: number; name: string; iso2?: string };

type CalcInputs = {
    origin_country_id: string;
    dest_country_id: string;
    weight: string;
    length: string;
    width: string;
    height: string;
    declared_value: string;
};

type RatesResultCardProps = {
    rate: {
        card_name: string;
        service_type: string;
        zone_name?: string;
        currency: string;
        total: string | number;
        total_price?: string | number;
        estimated_days?: number | null;
        breakdown?: Record<string, unknown>;
    };
    index: number;
    countries?: Country[];
    calcInputs?: CalcInputs;
};

const fmt = (v: unknown): string =>
    typeof v === 'number' ? v.toFixed(2) : parseFloat(String(v ?? 0)).toFixed(2);

function getModeIcon(cardName: string, serviceType: string) {
    const n = (cardName + ' ' + serviceType).toLowerCase();
    if (n.includes('air') || n.includes('aer')) {
        return { Icon: Wind, bgColor: 'bg-sky-500', label: 'air' };
    }
    if (n.includes('sea') || n.includes('ocean') || n.includes('mar')) {
        return { Icon: Anchor, bgColor: 'bg-blue-500', label: 'sea' };
    }
    if (n.includes('ground') || n.includes('road') || n.includes('truck') || n.includes('tierra')) {
        return { Icon: Truck, bgColor: 'bg-amber-500', label: 'ground' };
    }
    return { Icon: Package, bgColor: 'bg-slate-500', label: 'unknown' };
}

export function RatesResultCard({ rate, index, countries = [], calcInputs }: RatesResultCardProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const handleShipNow = () => {
        const find = (id: string) => countries.find(c => String(c.id) === String(id));
        const origin = calcInputs ? find(calcInputs.origin_country_id) : null;
        const dest   = calcInputs ? find(calcInputs.dest_country_id)   : null;

        const prefill = {
            sender_details: {
                country:      origin?.name ?? '',
                country_code: origin?.iso2 ?? '',
            },
            receiver_details: {
                country:      dest?.name ?? '',
                country_code: dest?.iso2 ?? '',
            },
            package_details: {
                weight:      parseFloat(calcInputs?.weight ?? '1') || 1,
                dimensions:  {
                    length: parseFloat(calcInputs?.length ?? '10') || 10,
                    width:  parseFloat(calcInputs?.width  ?? '10') || 10,
                    height: parseFloat(calcInputs?.height ?? '10') || 10,
                },
                pieces:               1,
                content_description:  '',
                declared_value:       parseFloat(calcInputs?.declared_value ?? '0') || 0,
            },
            service_type: rate.service_type,
            rate_data:    rate,
        };

        try {
            localStorage.setItem('masarx_calculator_prefill', JSON.stringify(prefill));
        } catch { /* storage unavailable */ }

        router.visit(route('shipments.from-rate'));
    };

    const { Icon, bgColor } = getModeIcon(rate.card_name, rate.service_type);
    const b = rate.breakdown || ({} as Record<string, unknown>);
    const isBestValue = index === 0;
    const totalValue = rate.total ?? rate.total_price ?? 0;

    const breakdownRows: Array<{ key: string; labelKey: string; value: unknown }> = [
        { key: 'base', labelKey: 'rates.calc_base', value: b.base },
        { key: 'weight_charge', labelKey: 'rates.calc_weight_charge', value: b.weight_charge },
        { key: 'handling_fee', labelKey: 'rates.calc_handling', value: b.handling_fee },
        { key: 'subtotal', labelKey: 'rates.calc_subtotal', value: b.subtotal },
        { key: 'fuel', labelKey: 'rates.calc_fuel', value: b.fuel },
        { key: 'insurance', labelKey: 'rates.calc_insurance', value: b.insurance },
        { key: 'tax', labelKey: 'rates.calc_tax', value: b.tax },
        { key: 'base_surcharge', labelKey: 'rates.calc_base_surcharge', value: b.base_surcharge },
    ].filter(row => row.value != null && parseFloat(String(row.value)) !== 0);

    return (
        <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${isBestValue ? 'ring-2 ring-primary border-primary/30' : 'border-slate-200 dark:border-slate-700'}`}>
            {/* Header */}
            <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`${bgColor} rounded-lg p-2 shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate leading-tight">
                                {rate.card_name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {rate.service_type}
                                {rate.zone_name ? ` · ${rate.zone_name}` : ''}
                            </div>
                        </div>
                    </div>
                    {isBestValue && (
                        <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-2">
                            {t('rates.calc_best_value')}
                        </Badge>
                    )}
                </div>

                {/* Price */}
                <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-primary leading-none">
                        {fmt(totalValue)}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {rate.currency}
                    </div>
                </div>

                {/* Meta info */}
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {rate.estimated_days != null
                            ? `${t('rates.calc_estimated')} ${rate.estimated_days} ${t('rates.calc_days')}`
                            : '—'}
                    </span>
                </div>
            </div>

            <CardContent className="p-0 flex-1 flex flex-col">
                {/* Breakdown toggle */}
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors border-t border-slate-100 dark:border-slate-800"
                >
                    <span>{open ? t('rates.calc_hide_breakdown') : t('rates.calc_show_breakdown')}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-1 text-xs">
                            {breakdownRows.map((row) => (
                                <div key={row.key} className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">{t(row.labelKey)}</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{fmt(row.value)}</span>
                                </div>
                            ))}
                            {b.weight_charge != null && b.chargeable_weight != null && b.price_per_kg != null && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 pl-2">
                                    ({fmt(b.chargeable_weight)} kg × {rate.currency} {fmt(b.price_per_kg)}/kg)
                                </div>
                            )}
                            <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                                <span>{t('rates.calc_total')}</span>
                                <span>{fmt(totalValue)} {rate.currency}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="p-4 pt-3 mt-auto">
                    <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleShipNow}
                    >
                        {t('rates.calc_ship_now')} →
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
