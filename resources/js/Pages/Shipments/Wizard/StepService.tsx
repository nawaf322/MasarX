import React, { useEffect, useState } from "react";
import { Button } from "@/Components/UI/button";
import { Label } from "@/Components/UI/label";
import { Truck, CheckCircle2, Loader2, AlertCircle, Wind, Anchor, Package } from "lucide-react";
import axios from "axios";
import { useTranslation } from '@/hooks/useTranslation';

interface StepProps {
    data: any;
    setData: (key: string, value: any) => void;
    errors: any;
}

export default function StepService({ data, setData, errors }: StepProps) {
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const originCode = data.sender_details?.country_code ?? data.sender_details?.country ?? data.sender_details?.country_id;
        const destCode = data.receiver_details?.country_code ?? data.receiver_details?.country ?? data.receiver_details?.country_id;
        if (!originCode || !destCode) {
            setError(t('shipments.wizard.complete_origin_dest_first'));
            setRates([]);
            setLoading(false);
            return;
        }
        fetchRates();
    }, [data.sender_details?.country_code, data.sender_details?.country, data.receiver_details?.country_code, data.receiver_details?.country]);

    const fetchRates = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload: Record<string, any> = {
                sender_details: data.sender_details,
                receiver_details: data.receiver_details,
            };
            if (data.packages && Array.isArray(data.packages) && data.packages.length > 0) {
                payload.packages = data.packages.map((p: any) => ({
                    weight: p.weight ?? 1,
                    pieces: p.pieces ?? 1,
                    length: p.length ?? p.dimensions?.length ?? 10,
                    width: p.width ?? p.dimensions?.width ?? 10,
                    height: p.height ?? p.dimensions?.height ?? 10,
                    declared_value: p.declared_value ?? (p.items?.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unit_value || 0), 0) ?? 0),
                    content_description: p.content_description ?? '',
                }));
            } else {
                const pd = data.package_details || {};
                const dims = pd.dimensions || {};
                payload.package_details = {
                    weight: pd.weight ?? 1,
                    length: dims.length ?? 10,
                    width: dims.width ?? 10,
                    height: dims.height ?? 10,
                    pieces: pd.pieces ?? 1,
                    declared_value: pd.declared_value ?? 0,
                    content_description: pd.content_description ?? '',
                };
            }
            const response = await axios.post(route('shipments.rates'), payload);
            const fetchedRates = Array.isArray(response.data) ? response.data : [];

            // Show all rates returned by the backend.
            // The backend already gatekeeps by active carrier accounts — only configured carriers
            // appear in the response. External adapters (DHL/FedEx/UPS) are marked is_stub:true
            // because they are stub implementations, but they ARE valid configured rates.
            const activeRates = fetchedRates.filter((r: any) =>
                r.carrier_code && r.total_price != null
            );
            
            setRates(activeRates);

            const existingRuleId = data.rate_data?.rate_rule_id ?? null;
            const existingServiceCode = data.service_type ?? '';

            if (activeRates.length > 0) {
                if (existingRuleId) {
                    // Rule-based rate: match by rule ID
                    const match = activeRates.find((r: any) => (r.rate_rule_id ?? null) == existingRuleId);
                    if (!match) {
                        setData('rate_data', null);
                        setData('service_type', '');
                        setError(t('shipments.wizard.rate_invalid_reselect'));
                    } else {
                        // Always refresh rate_data so prices reflect current packages/config
                        selectRate(match);
                        setError(null);
                    }
                } else if (existingServiceCode) {
                    // No rule ID (e.g. internal fallback): match by service_code and ALWAYS
                    // refresh rate_data — stale draft prices must not bleed into Review & Confirm.
                    const match = activeRates.find((r: any) => r.service_code === existingServiceCode)
                        ?? activeRates[0];
                    selectRate(match);
                    setError(null);
                } else {
                    // Nothing previously selected: auto-select first
                    selectRate(activeRates[0]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch rates", err);
            setError(t('shipments.wizard.no_rates'));
        } finally {
            setLoading(false);
        }
    };

    const selectRate = (rate: any) => {
        setData('service_type', rate.service_code);
        setData('rate_data', rate);
        setError(null);
    };

    // Mode badge config — reuses i18n keys already defined under "services.*"
    const modeMeta: Record<string, { label: string; iconCls: string; badgeCls: string; Icon: React.ElementType }> = {
        air:  { label: t('settings.services.mode_air'),  iconCls: 'text-sky-500',    badgeCls: 'bg-sky-100 text-sky-700',      Icon: Wind   },
        sea:  { label: t('settings.services.mode_sea'),  iconCls: 'text-blue-500',   badgeCls: 'bg-blue-100 text-blue-700',    Icon: Anchor },
        land: { label: t('settings.services.mode_land'), iconCls: 'text-amber-500',  badgeCls: 'bg-amber-100 text-amber-700',  Icon: Truck  },
    };

    const getModeIcon = (mode?: string, selected?: boolean): React.ReactNode => {
        const m = mode ? modeMeta[mode] : null;
        const Ic = m?.Icon ?? Package;
        const cls = selected ? 'text-blue-600' : (m?.iconCls ?? 'text-gray-500');
        return <Ic className={`h-8 w-8 ${cls}`} />;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-gray-900 text-xl">{t('shipments.wizard.select_service')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('shipments.wizard.final_rate_note')}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRates} disabled={loading} className="shrink-0">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('shipments.wizard.refresh')}
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}
            {!data.service_type && rates.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm mb-4">
                    {t('shipments.wizard.select_service_required')}
                </div>
            )}
            {!data.service_type && errors?.service_type && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    {errors.service_type}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                        {t('shipments.wizard.processing')}
                    </div>
                ) : rates.length > 0 ? (
                    rates.map((rate, index) => {
                        const breakdown = rate.breakdown || {};
                        const isSelected = data.service_type === rate.service_code;
                        const mode = rate.service_mode as string | undefined;
                        const modeInfo = mode ? modeMeta[mode] : null;

                        return (
                            <div
                                key={index}
                                className={`relative border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 bg-white shadow-sm hover:shadow-lg
                                    ${isSelected
                                        ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500 ring-offset-2'
                                        : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                onClick={() => selectRate(rate)}
                            >
                                {/* Card Header */}
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        {/* Mode icon */}
                                        <div className={`p-4 rounded-xl ${isSelected ? 'bg-blue-100' : 'bg-gray-100'} shrink-0`}>
                                            {getModeIcon(mode, isSelected)}
                                        </div>

                                        {/* Badges — Selected + Mode + Stub stacked */}
                                        <div className="flex flex-col items-end gap-1.5">
                                            {isSelected && (
                                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-200">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    {t('common.selected')}
                                                </div>
                                            )}
                                            {modeInfo && (() => {
                                                const ModeIcon = modeInfo.Icon;
                                                return (
                                                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${modeInfo.badgeCls}`}>
                                                        <ModeIcon className="h-3 w-3" />
                                                        {modeInfo.label}
                                                    </span>
                                                );
                                            })()}
                                            {rate.is_stub && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                                    {t('shipments.wizard.stub_badge')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Service name & meta */}
                                    <div className="mb-4">
                                        <h4 className="font-bold text-lg text-gray-900 leading-snug">
                                            {rate.service_name || rate.carrier_name}
                                        </h4>
                                        {/* Show carrier sub-line only for rule-based rates (no mode) */}
                                        {rate.carrier_name !== rate.service_name && !mode && (
                                            <p className="text-sm text-gray-500 mt-0.5">{rate.carrier_name}</p>
                                        )}
                                        {rate.zone_name && (
                                            <p className="text-xs text-gray-400 mt-0.5">{rate.zone_name}</p>
                                        )}
                                        <p className="text-sm text-gray-600 mt-2">
                                            <span className="font-medium">{t('shipments.wizard.estimated')}:</span>{' '}
                                            {rate.estimated_days} {t('shipments.wizard.days')}
                                        </p>
                                    </div>

                                    {/* Total price */}
                                    <div className="border-t pt-4">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm text-gray-600">{t('shipments.wizard.total')}:</span>
                                            <span className="text-3xl font-bold text-blue-600">
                                                {rate.currency || 'USD'} {rate.total_price}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Price Breakdown */}
                                {breakdown && Object.keys(breakdown).length > 0 && (
                                    <div className={`border-t ${isSelected ? 'bg-blue-50/50' : 'bg-gray-50'} p-5`}>
                                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                                            {t('shipments.wizard.price_breakdown')}
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            {breakdown.base !== undefined && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">{t('shipments.wizard.base_price')}:</span>
                                                    <span className="font-semibold text-gray-900">{rate.currency || 'USD'} {Number(breakdown.base).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {breakdown.weight_charge !== undefined && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">{t('shipments.wizard.weight_charge')}:</span>
                                                    <span className="font-semibold text-gray-900">{rate.currency || 'USD'} {Number(breakdown.weight_charge).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {breakdown.subtotal !== undefined && (
                                                <div className="flex justify-between items-center pt-2 border-t font-medium">
                                                    <span className="text-gray-700">{t('shipments.wizard.subtotal')}:</span>
                                                    <span className="text-gray-900">{rate.currency || 'USD'} {Number(breakdown.subtotal).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {breakdown.base_surcharge !== undefined && breakdown.base_surcharge > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">{t('shipments.wizard.base_surcharge')}:</span>
                                                    <span className="text-gray-700">{rate.currency || 'USD'} {Number(breakdown.base_surcharge).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {breakdown.fuel !== undefined && breakdown.fuel > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">{t('shipments.wizard.fuel_surcharge')}:</span>
                                                    <span className="text-gray-700">{rate.currency || 'USD'} {Number(breakdown.fuel).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {breakdown.insurance !== undefined && breakdown.insurance > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">{t('shipments.wizard.insurance')}:</span>
                                                    <span className="text-gray-700">{rate.currency || 'USD'} {Number(breakdown.insurance).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {breakdown.tax !== undefined && breakdown.tax > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">{t('shipments.wizard.tax')}:</span>
                                                    <span className="text-gray-700">{rate.currency || 'USD'} {Number(breakdown.tax).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-medium mb-2">{t('shipments.wizard.no_services_available')}</p>
                        <p className="text-sm">{t('shipments.wizard.configure_zones_rules')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
