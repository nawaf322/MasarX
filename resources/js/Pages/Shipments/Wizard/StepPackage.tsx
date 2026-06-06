import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Textarea } from "@/Components/UI/textarea";
import { Button } from "@/Components/UI/button";
import { Box, Plus, Trash2, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

export interface PackageItem {
    description: string;
    quantity: number;
    unit_value: number;
}

export interface PackageBox {
    id: string;
    weight: number;
    pieces: number;
    declared_value: number;
    length: number;
    width: number;
    height: number;
    content_description: string;
    items: PackageItem[];
}

interface StepProps {
    data: any;
    setData: (key: string, value: any) => void;
    errors: any;
    onCalculateAndNext?: () => void;
    onCalculationComplete?: (done: boolean, stale: boolean) => void;
    effectiveSettings?: {
        weight_unit?: string;
        dimension_unit?: string;
        currency?: string;
        volumetric_divisor?: number;
        tax_rate?: number;
        base_surcharge?: number;
        fuel_surcharge_percent?: number;
        insurance_percent?: number;
    };
}

/** Physical-only calculation. Source of truth for price is backend (ShippingRateService). */
function calcPackagePhysical(box: PackageBox, cfg: StepProps['effectiveSettings']) {
    const divisor = (cfg?.volumetric_divisor ?? 5000) || 5000;
    const weight = Math.max(0, Number(box.weight) || 0);
    const l = Math.max(0, Number(box.length) || 0);
    const w = Math.max(0, Number(box.width) || 0);
    const h = Math.max(0, Number(box.height) || 0);
    const volumetric = (l && w && h) ? (l * w * h) / divisor : 0;
    const chargeable = Math.max(weight, volumetric) || weight || 1;
    const declaredValue = box.declared_value ?? (box.items?.reduce((s, i) => s + (i.quantity || 0) * (i.unit_value || 0), 0) ?? 0);
    return {
        volumetric_weight: volumetric,
        chargeable_weight: chargeable,
        declared_value: declaredValue,
    };
}

export default function StepPackage({ data, setData, errors, onCalculateAndNext, onCalculationComplete, effectiveSettings: eff }: StepProps) {
    const { t } = useTranslation();
    const weightUnit = eff?.weight_unit || 'kg';
    const dimUnit = eff?.dimension_unit || 'cm';
    const currency = eff?.currency || 'USD';
    const divisor = eff?.volumetric_divisor ?? 5000;

    const packages: PackageBox[] = data.packages && Array.isArray(data.packages) && data.packages.length > 0
        ? data.packages
        : [{
            id: '1',
            weight: data.package_details?.weight ?? 1,
            pieces: data.package_details?.pieces ?? 1,
            declared_value: 0,
            length: data.package_details?.dimensions?.length ?? 10,
            width: data.package_details?.dimensions?.width ?? 10,
            height: data.package_details?.dimensions?.height ?? 10,
            content_description: data.package_details?.content_description ?? '',
            items: [],
        }];

    const [editingId, setEditingId] = useState<string | null>(packages[0]?.id ?? null);

    const syncPackages = (packs: PackageBox[]) => {
        setData('packages', packs);
        const single = packs[0];
        setData('package_details', {
            weight: packs.reduce((s, p) => s + (Number(p.weight) || 0), 0),
            pieces: packs.reduce((s, p) => s + (Number(p.pieces) || 1), 0),
            dimensions: {
                length: single?.length ?? 10,
                width: single?.width ?? 10,
                height: single?.height ?? 10,
            },
            content_description: packs.map(p => p.content_description).filter(Boolean).join(', '),
        });
    };

    const [estimate, setEstimate] = useState<{ total_price: string; currency: string; breakdown?: any } | null>(null);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [noRatesError, setNoRatesError] = useState<string | null>(null);
    const [calculationDone, setCalculationDone] = useState(false);
    const [calculationStale, setCalculationStale] = useState(false);
    const [lastCalculatedPackages, setLastCalculatedPackages] = useState<PackageBox[]>([]);
    const estimateAbortRef = useRef<AbortController | null>(null);

    const hasOriginDest = (data.sender_details?.country_code || data.sender_details?.country || data.sender_details?.country_id)
        && (data.receiver_details?.country_code || data.receiver_details?.country || data.receiver_details?.country_id);

    const fetchRates = useCallback(async (): Promise<any[]> => {
        if (!hasOriginDest) return [];
        estimateAbortRef.current?.abort();
        estimateAbortRef.current = new AbortController();
        setEstimateLoading(true);
        setEstimate(null);
        try {
            const payload: Record<string, unknown> = {
                sender_details: data.sender_details,
                receiver_details: data.receiver_details,
            };
            if (packages.length > 0) {
                payload.packages = packages.map((p: PackageBox) => ({
                    weight: p.weight,
                    pieces: p.pieces,
                    length: p.length,
                    width: p.width,
                    height: p.height,
                    declared_value: p.declared_value ?? (p.items?.reduce((s: number, i: PackageItem) => s + (i.quantity || 0) * (i.unit_value || 0), 0) ?? 0),
                    content_description: p.content_description,
                }));
            } else {
                payload.package_details = data.package_details;
            }
            const res = await axios.post(route('shipments.rates'), payload, {
                signal: estimateAbortRef.current.signal,
            });
            return Array.isArray(res.data) ? res.data : [];
        } catch {
            return [];
        } finally {
            setEstimateLoading(false);
            estimateAbortRef.current = null;
        }
    }, [data.sender_details, data.receiver_details, data.package_details, packages]);

    const fetchEstimate = useCallback(async () => {
        const rates = await fetchRates();
        if (rates.length > 0) {
            const first = rates[0];
            setEstimate({ 
                total_price: String(first.total_price ?? 0), 
                currency: first.currency ?? currency,
                breakdown: first.breakdown || null
            });
            setCalculationDone(true);
            setCalculationStale(false);
            setLastCalculatedPackages([...packages]);
            onCalculationComplete?.(true, false);
        } else {
            setNoRatesError(t('shipments.wizard.no_rates') || 'No hay tarifas disponibles');
            setCalculationDone(false);
            onCalculationComplete?.(false, false);
        }
    }, [fetchRates, currency, packages, onCalculationComplete, t]);

    // Extract only pricing-relevant fields for stale comparison.
    // content_description, item descriptions, etc. don't affect pricing — skip them.
    const pricingKey = useCallback((p: PackageBox): string => {
        const dv = p.declared_value ?? (p.items?.reduce((s, i) => s + (i.quantity || 0) * (i.unit_value || 0), 0) ?? 0);
        return `${p.weight}|${p.pieces}|${p.length}|${p.width}|${p.height}|${dv}`;
    }, []);

    // Detectar cambios en packages y marcar como stale solo cuando cambian campos que afectan el precio
    useEffect(() => {
        if (calculationDone) {
            const currentSig = packages.map(pricingKey).join(';');
            const calcSig = lastCalculatedPackages.map(pricingKey).join(';');
            if (currentSig !== calcSig) {
                setCalculationStale(true);
                onCalculationComplete?.(true, true);
            }
        }
    }, [packages, calculationDone, lastCalculatedPackages, onCalculationComplete, pricingKey]);

    const physicalTotals = useMemo(() => {
        let totalWeight = 0;
        let totalChargeable = 0;
        let totalPieces = 0;
        packages.forEach((p) => {
            const c = calcPackagePhysical(p, eff);
            totalWeight += Number(p.weight) || 0;
            totalChargeable += c.chargeable_weight;
            totalPieces += Number(p.pieces) || 1;
        });
        return { totalWeight, totalChargeable, totalPieces };
    }, [packages, eff]);

    const addBox = () => {
        const id = String(Date.now());
        const newPackages = [...packages, {
            id,
            weight: 1,
            pieces: 1,
            declared_value: 0,
            length: 10,
            width: 10,
            height: 10,
            content_description: '',
            items: [],
        }];
        syncPackages(newPackages);
        setEditingId(id);
    };

    const removeBox = (id: string) => {
        const next = packages.filter(p => p.id !== id);
        if (next.length === 0) return;
        syncPackages(next);
        setEditingId(null);
    };

    const updateBox = (id: string, field: keyof PackageBox, value: any) => {
        const next = packages.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        );
        syncPackages(next);
    };

    const addItem = (boxId: string) => {
        const next = packages.map(p =>
            p.id === boxId
                ? { ...p, items: [...(p.items || []), { description: '', quantity: 1, unit_value: 0 }] }
                : p
        );
        syncPackages(next);
    };

    const updateItem = (boxId: string, idx: number, field: keyof PackageItem, value: any) => {
        const next = packages.map(p => {
            if (p.id !== boxId) return p;
            const items = [...(p.items || [])];
            items[idx] = { ...items[idx], [field]: value };
            return { ...p, items };
        });
        syncPackages(next);
    };

    const removeItem = (boxId: string, idx: number) => {
        const next = packages.map(p => {
            if (p.id !== boxId) return p;
            const items = (p.items || []).filter((_, i) => i !== idx);
            return { ...p, items };
        });
        syncPackages(next);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <Box className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{t('shipments.wizard.step2')}</h3>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addBox}>
                        <Plus className="h-4 w-4 mr-1" /> {t('shipments.wizard.add_box')}
                    </Button>
                </div>

                {packages.map((box, idx) => {
                    const calc = calcPackagePhysical(box, eff);
                    const isEditing = editingId === box.id;
                    return (
                        <div key={box.id} className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                                onClick={() => setEditingId(isEditing ? null : box.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-gray-700">{t('shipments.wizard.box')} {idx + 1}</span>
                                    <span className="text-sm text-gray-500">
                                        {box.weight}{weightUnit} • {box.length}×{box.width}×{box.height} {dimUnit} • {t('shipments.wizard.chargeable')}: {calc.chargeable_weight?.toFixed(2)} {weightUnit}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">{t('shipments.wizard.chargeable')}: {calc.chargeable_weight?.toFixed(2)} {weightUnit}</span>
                                    {packages.length > 1 && (
                                        <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={e => { e.stopPropagation(); removeBox(box.id); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {isEditing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                            </div>
                            {isEditing && (
                                <div className="border-t bg-white p-4 space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <Label>{t('shipments.wizard.weight')} ({weightUnit})</Label>
                                            <Input type="number" min="0.1" step="0.1" value={box.weight} onChange={e => updateBox(box.id, 'weight', parseFloat(e.target.value) || 0)} className="bg-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t('shipments.wizard.pieces')}</Label>
                                            <Input type="number" min="1" value={box.pieces} onChange={e => updateBox(box.id, 'pieces', parseInt(e.target.value) || 1)} className="bg-white" />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <Label>{t('forms.declared_value')} ({currency})</Label>
                                            <Input type="number" min="0" step="0.01" value={box.declared_value || ''} onChange={e => updateBox(box.id, 'declared_value', parseFloat(e.target.value) || 0)} className="bg-white w-full min-w-[160px]" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <Label>{t('forms.dimension_l')} ({dimUnit})</Label>
                                            <Input type="number" min="0" value={box.length} onChange={e => updateBox(box.id, 'length', parseFloat(e.target.value) || 0)} className="bg-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t('forms.dimension_w')} ({dimUnit})</Label>
                                            <Input type="number" min="0" value={box.width} onChange={e => updateBox(box.id, 'width', parseFloat(e.target.value) || 0)} className="bg-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t('forms.dimension_h')} ({dimUnit})</Label>
                                            <Input type="number" min="0" value={box.height} onChange={e => updateBox(box.id, 'height', parseFloat(e.target.value) || 0)} className="bg-white" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t('forms.description')}</Label>
                                        <Textarea value={box.content_description} onChange={e => updateBox(box.id, 'content_description', e.target.value)} placeholder="..." rows={2} className={`bg-white ${errors?.[`packages.${idx}.content_description`] ? 'border-red-500' : ''}`} data-field={`packages.${idx}.content_description`} />
                                        {errors?.[`packages.${idx}.content_description`] && (
                                            <p className="text-sm text-red-600 dark:text-red-400">{errors[`packages.${idx}.content_description`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <Label>{t('shipments.wizard.items_optional')}</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={() => addItem(box.id)}><Plus className="h-3 w-3 mr-1" /> {t('shipments.wizard.add_item')}</Button>
                                        </div>
                                        {(box.items?.length ?? 0) > 0 && (
                                            <div className="space-y-2 mt-2">
                                                {(box.items || []).map((item, i) => (
                                                    <div key={i} className="flex gap-2 items-center bg-white p-2 rounded border">
                                                        <Input placeholder={t('shipments.wizard.item_desc')} value={item.description} onChange={e => updateItem(box.id, i, 'description', e.target.value)} className="flex-1 bg-white" />
                                                        <Input type="number" min="1" placeholder="Qty" className="w-16 bg-white" value={item.quantity} onChange={e => updateItem(box.id, i, 'quantity', parseInt(e.target.value) || 1)} />
                                                        <Input type="number" min="0" step="0.01" placeholder="Unit" className="w-20 bg-white" value={item.unit_value || ''} onChange={e => updateItem(box.id, i, 'unit_value', parseFloat(e.target.value) || 0)} />
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(box.id, i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 h-fit">
                <h4 className="font-semibold text-gray-900 mb-4">{t('shipments.wizard.summary')}</h4>
                <div className="space-y-3 text-sm">
                    {/* Configuración */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">{t('shipments.wizard.configuration') || 'Configuration'}</p>
                        <div className="space-y-1 text-xs">
                            <p className="text-gray-600"><span className="font-medium">{t('shipments.wizard.divisor_used')}:</span> {divisor} {t('shipments.wizard.divisor_formula') || '(L × W × H) / divisor'}</p>
                            <p className="text-gray-600"><span className="font-medium">{t('shipments.wizard.units')}:</span> {weightUnit === 'kg' ? 'Kilogramos (kg)' : weightUnit === 'lb' ? 'Libras (lb)' : weightUnit} / {dimUnit === 'cm' ? 'Centímetros (cm)' : dimUnit === 'in' ? 'Pulgadas (in)' : dimUnit}</p>
                            {eff?.base_surcharge && (
                                <p className="text-gray-600"><span className="font-medium">{t('shipments.wizard.base_surcharge')}:</span> {currency} {eff.base_surcharge.toFixed(2)}</p>
                            )}
                            {eff?.fuel_surcharge_percent && (
                                <p className="text-gray-600"><span className="font-medium">{t('shipments.wizard.fuel_surcharge')}:</span> {eff.fuel_surcharge_percent}%</p>
                            )}
                            {eff?.insurance_percent && (
                                <p className="text-gray-600"><span className="font-medium">{t('shipments.wizard.insurance')}:</span> {eff.insurance_percent}%</p>
                            )}
                            <p className="text-gray-600"><span className="font-medium">{t('shipments.wizard.tax_rate')}:</span> {eff?.tax_rate ?? 0}%</p>
                        </div>
                    </div>

                    <hr />

                    {/* Cálculo de peso */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">{t('shipments.wizard.weight_calculation') || 'Weight Calculation'}</p>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">{t('shipments.wizard.physical_weight') || 'Physical Weight'}:</span>
                                <span className="font-medium">{physicalTotals.totalWeight.toFixed(2)} {weightUnit}</span>
                            </div>
                            {packages.map((box, idx) => {
                                const calc = calcPackagePhysical(box, eff);
                                const volumetric = (box.length * box.width * box.height) / divisor;
                                return (
                                    <div key={box.id} className="text-xs bg-blue-50 rounded p-2 space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{t('shipments.wizard.box')} {idx + 1} {t('shipments.wizard.volumetric') || 'Volumetric'}:</span>
                                            <span className="font-mono">({box.length}×{box.width}×{box.height}) / {divisor} = {volumetric.toFixed(2)} {weightUnit}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{t('shipments.wizard.max_weight') || 'Max (Physical vs Volumetric)'}:</span>
                                            <span className="font-medium">{calc.chargeable_weight.toFixed(2)} {weightUnit}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="flex justify-between pt-1 border-t">
                                <span className="text-gray-700 font-medium">{t('shipments.wizard.chargeable')}:</span>
                                <span className="font-bold text-blue-600">{physicalTotals.totalChargeable.toFixed(2)} {weightUnit}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">{t('shipments.wizard.pieces')}:</span>
                        <span className="font-medium">{physicalTotals.totalPieces}</span>
                    </div>

                    <hr />

                    {noRatesError && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
                            {noRatesError}
                        </div>
                    )}
                    {/* Botón principal: Solo calcular, no avanza */}
                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={fetchEstimate} disabled={estimateLoading || !hasOriginDest}>
                        {estimateLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        {estimateLoading ? t('shipments.wizard.processing') : (t('shipments.wizard.calculate') || 'Calcular')}
                    </Button>
                    {calculationStale && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                            {t('shipments.wizard.calculation_stale')}
                        </div>
                    )}
                    {calculationDone && !calculationStale && estimate && (
                        <div className="pt-2 border-t space-y-2">
                            <div className="flex justify-between font-bold text-lg">
                                <span>{t('shipments.wizard.estimate_label')}</span>
                                <span className="text-blue-600">{estimate.currency} {estimate.total_price}</span>
                            </div>
                            {estimate.breakdown && (
                                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2 text-sm border border-blue-100 dark:border-blue-900/50">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('shipments.wizard.price_breakdown') || 'Desglose de Precio'}:</p>
                                    
                                    {/* Componentes base */}
                                    {estimate.breakdown.base !== undefined && Number(estimate.breakdown.base) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.base_price') || 'Precio Base'}:</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.base).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {estimate.breakdown.weight_charge !== undefined && Number(estimate.breakdown.weight_charge) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.weight_charge') || 'Cargo por Peso'}:</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.weight_charge).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {estimate.breakdown.handling_fee !== undefined && Number(estimate.breakdown.handling_fee) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.handling_fee')}:</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.handling_fee).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {/* Subtotal */}
                                    {estimate.breakdown.subtotal !== undefined && (
                                        <div className="flex justify-between text-sm font-medium border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                                            <span>{t('shipments.wizard.subtotal')}:</span>
                                            <span>{currency} {Number(estimate.breakdown.subtotal).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {/* Recargos y fees */}
                                    {estimate.breakdown.base_surcharge !== undefined && Number(estimate.breakdown.base_surcharge) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.base_surcharge')}:</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.base_surcharge).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {estimate.breakdown.fuel !== undefined && Number(estimate.breakdown.fuel) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.fuel_surcharge')} ({eff?.fuel_surcharge_percent || estimate.breakdown.fuel_percent || 0}%):</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.fuel).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {estimate.breakdown.insurance !== undefined && Number(estimate.breakdown.insurance) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.insurance')} ({eff?.insurance_percent || estimate.breakdown.insurance_percent || 0}%):</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.insurance).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {estimate.breakdown.tax !== undefined && Number(estimate.breakdown.tax) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.tax')} ({eff?.tax_rate || 0}%):</span>
                                            <span className="font-medium">{currency} {Number(estimate.breakdown.tax).toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {/* Total final */}
                                    <div className="flex justify-between text-base font-bold border-t border-blue-200 dark:border-blue-800 pt-2 mt-2 text-blue-600 dark:text-blue-400">
                                        <span>{t('shipments.wizard.total')}:</span>
                                        <span>{currency} {estimate.total_price}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                        {t('shipments.wizard.estimate_preliminary_note')}
                    </p>
                </div>
            </div>
        </div>
    );
}
