import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { ArrowLeft, Save, MapPin, Box, DollarSign, RefreshCw, Search, Loader2, Circle, FileText, Clock, Truck, CheckCircle, CheckCircle2, XCircle, AlertTriangle, PauseCircle, RotateCcw, Package, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { SearchableStatusSelect } from "@/Components/UI/searchable-status-select";
import { useState, useEffect, useRef } from "react";

const ICON_MAP: Record<string, LucideIcon> = {
    Circle, Loader2, MapPin, FileText, Clock, Truck, CheckCircle, CheckCircle2,
    XCircle, AlertTriangle, PauseCircle, RotateCcw, Package, RefreshCw,
};
import axios from "axios";

const DEBOUNCE_MS = 250;
const MIN_SEARCH_LENGTH = 2;

function formatMonetaryInput(val: number | string | null | undefined): string {
    if (val === null || val === undefined || val === "") return "";
    const n = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(n) ? "" : n.toFixed(2);
}

interface ShipmentStatusOption {
    id: number;
    code: string;
    name: string;
    icon: string;
    color: string;
}

interface EditProps {
    shipment: {
        id: number;
        tracking_number: string;
        sender_details: Record<string, string>;
        receiver_details: Record<string, string>;
        package_details: Record<string, unknown>;
        status_id: number | null;
        subtotal?: number | null;
        tax?: number | null;
        discount?: number | null;
        total?: number | null;
        cost_price?: number | null;
        currency?: string | null;
        service_type?: string;
        shipment_status?: ShipmentStatusOption | null;
        estimated_delivery_date?: string | null;
        ship_date?: string | null;
        notes_internal?: string | null;
        external_order_id?: string | null;
    };
    shipment_statuses: ShipmentStatusOption[];
    canManagePricing?: boolean;
    effectiveSettings?: {
        currency?: string;
        weight_unit?: string;
        dimension_unit?: string;
        tax_rate?: number;
    };
}

const defaultSender = {
    name: "", phone: "", email: "", company: "", address: "", city: "", country: "USA", tax_id: "",
};
const defaultReceiver = {
    name: "", phone: "", email: "", company: "", address: "", city: "", country: "USA",
};
const defaultPackage = {
    weight: 1,
    dimensions: { length: 10, width: 10, height: 10 },
    pieces: 1,
    content_description: "",
    declared_value: 0,
};

/** Extrae declared_value de package_details (summary, packages[0] o flat). */
function getDeclaredValue(pd: Record<string, unknown> | null | undefined): number {
    if (!pd) return 0;
    const s = pd.summary as { declared_value_total?: number } | undefined;
    const pkgs = pd.packages as Array<{ declared_value?: number }> | undefined;
    const first = Array.isArray(pkgs) && pkgs[0] ? pkgs[0].declared_value : undefined;
    return Number(s?.declared_value_total ?? first ?? pd.declared_value ?? 0) || 0;
}

/** Convierte valores internos (kg, cm) a unidades de display de la org. Redondea para evitar decimales largos que impiden guardar. */
function toDisplayUnits(
    pd: Record<string, unknown>,
    weightUnit: string,
    dimUnit: string
): { weight: number; length: number; width: number; height: number } {
    const s = pd.summary as { total_weight?: number; max_dims?: { length?: number; width?: number; height?: number } } | undefined;
    const pkgs = pd.packages as Array<{ weight?: number; length?: number; width?: number; height?: number }> | undefined;
    const p0 = Array.isArray(pkgs) && pkgs[0] ? pkgs[0] : null;
    const dims = pd.dimensions as { length?: number; width?: number; height?: number } | undefined;
    const maxDims = s?.max_dims ?? dims;

    const weightKg = Number(pd.weight ?? p0?.weight ?? s?.total_weight ?? 1) || 1;
    const lengthCm = Number(maxDims?.length ?? p0?.length ?? dims?.length ?? 10) || 10;
    const widthCm = Number(maxDims?.width ?? p0?.width ?? dims?.width ?? 10) || 10;
    const heightCm = Number(maxDims?.height ?? p0?.height ?? dims?.height ?? 10) || 10;

    const weight = Math.round((weightUnit === "lb" ? weightKg / 0.453592 : weightKg) * 10000) / 10000;
    const length = Math.round((dimUnit === "in" ? lengthCm / 2.54 : lengthCm) * 100) / 100;
    const width = Math.round((dimUnit === "in" ? widthCm / 2.54 : widthCm) * 100) / 100;
    const height = Math.round((dimUnit === "in" ? heightCm / 2.54 : heightCm) * 100) / 100;
    return { weight, length, width, height };
}

function getIconComponent(iconName: string) {
    return ICON_MAP[iconName] ?? Circle;
}

export default function EditShipment({ shipment, shipment_statuses, canManagePricing = false, effectiveSettings = {} }: EditProps) {
    const { t } = useTranslation();
    const currency = effectiveSettings?.currency || shipment.currency || "USD";
    const weightUnit = effectiveSettings?.weight_unit || "kg";
    const dimUnit = effectiveSettings?.dimension_unit || "cm";

    const initPd = (() => {
        const pd = (shipment.package_details || {}) as Record<string, unknown>;
        const pkg0 = Array.isArray(pd.packages) && (pd.packages as any[])[0] ? (pd.packages as any[])[0] : pd;
        const display = toDisplayUnits(pd, weightUnit, dimUnit);
        const declaredVal = Number(pd.declared_value ?? (pd.summary as any)?.declared_value_total ?? pkg0?.declared_value ?? 0) || 0;
        return {
            ...defaultPackage,
            weight: display.weight,
            dimensions: { length: display.length, width: display.width, height: display.height },
            pieces: Number(pd.pieces ?? (pd.summary as any)?.total_pieces ?? pkg0?.pieces ?? 1) || 1,
            content_description: String(pd.content_description ?? pkg0?.content_description ?? "").trim(),
            declared_value: Math.round(declaredVal * 100) / 100,
            packages: pd.packages as Array<Record<string, string | number | boolean | null | undefined>> | undefined,
            summary: pd.summary as Record<string, string | number | boolean | null | undefined> | undefined,
        };
    })();
    const { data, setData, put, processing, errors } = useForm({
        status_id: shipment.status_id ?? undefined as number | undefined,
        sender_details: { ...defaultSender, ...(shipment.sender_details || {}) },
        receiver_details: { ...defaultReceiver, ...(shipment.receiver_details || {}) },
        package_details: initPd,
        subtotal: shipment.subtotal ?? undefined as number | undefined,
        tax: shipment.tax ?? undefined as number | undefined,
        discount: shipment.discount ?? undefined as number | undefined,
        total: shipment.total ?? undefined as number | undefined,
        cost_price: shipment.cost_price ?? undefined as number | undefined,
        currency: shipment.currency ?? currency,
        estimated_delivery_date: shipment.estimated_delivery_date ?? "",
        ship_date: shipment.ship_date ?? "",
    });

    const [recalculating, setRecalculating] = useState(false);
    const [packageModified, setPackageModified] = useState(false);
    const [recalcError, setRecalcError] = useState<string | null>(null);
    const [senderSearch, setSenderSearch] = useState("");
    const [receiverSearch, setReceiverSearch] = useState("");
    const [senderResults, setSenderResults] = useState<any[]>([]);
    const [receiverResults, setReceiverResults] = useState<any[]>([]);
    const [senderOpen, setSenderOpen] = useState(false);
    const [receiverOpen, setReceiverOpen] = useState(false);
    const [loadingSender, setLoadingSender] = useState(false);
    const [loadingReceiver, setLoadingReceiver] = useState(false);
    const senderBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const receiverBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (senderSearch.length < MIN_SEARCH_LENGTH) {
            setSenderResults([]);
            return;
        }
        const tid = setTimeout(() => {
            setLoadingSender(true);
            axios.get(route("api.customers.search"), { params: { q: senderSearch } })
                .then((res) => setSenderResults(res.data))
                .finally(() => setLoadingSender(false));
        }, DEBOUNCE_MS);
        return () => clearTimeout(tid);
    }, [senderSearch]);

    useEffect(() => {
        if (receiverSearch.length < MIN_SEARCH_LENGTH) {
            setReceiverResults([]);
            return;
        }
        const tid = setTimeout(() => {
            setLoadingReceiver(true);
            axios.get(route("api.customers.search"), { params: { q: receiverSearch } })
                .then((res) => setReceiverResults(res.data))
                .finally(() => setLoadingReceiver(false));
        }, DEBOUNCE_MS);
        return () => clearTimeout(tid);
    }, [receiverSearch]);

    const applyCustomer = (section: "sender_details" | "receiver_details", customer: any) => {
        const details = section === "sender_details" ? customer.sender_details : customer.receiver_details;
        if (details) {
            setData(section, { ...(data[section] as object), ...details });
        }
        setSenderOpen(false);
        setReceiverOpen(false);
        setSenderResults([]);
        setReceiverResults([]);
        setSenderSearch("");
        setReceiverSearch("");
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (packageModified) {
            return;
        }
        put(route("shipments.update", shipment.id));
    };

    const roundWeight = (v: number) => Math.round(v * 10000) / 10000;
    const roundDim = (v: number) => Math.round(v * 100) / 100;

    const updateNested = (
        section: "sender_details" | "receiver_details" | "package_details",
        field: string,
        value: string | number | object
    ) => {
        const current = data[section] as Record<string, unknown>;
        if (section === "package_details" && ["weight", "pieces", "dimensions"].includes(field)) {
            setPackageModified(true);
        }
        if (section === "package_details" && field === "content_description") {
            setData(section, { ...current, content_description: String(value ?? "").trim() } as any);
            return;
        }
        let finalValue = value;
        if (section === "package_details" && field === "weight" && typeof value === "number") {
            finalValue = roundWeight(value);
        } else if (section === "package_details" && field === "dimensions" && typeof value === "object") {
            const d = value as { length?: number; width?: number; height?: number };
            finalValue = {
                length: roundDim(Number(d?.length ?? 0) || 0),
                width: roundDim(Number(d?.width ?? 0) || 0),
                height: roundDim(Number(d?.height ?? 0) || 0),
            };
        }
        if (field === "dimensions" && typeof finalValue === "object") {
            setData(section, { ...current, dimensions: finalValue } as any);
        } else {
            setData(section, { ...current, [field]: finalValue } as any);
        }
    };

    const handleRecalculateRates = async () => {
        setRecalculating(true);
        setRecalcError(null);
        try {
            const pd = data.package_details as Record<string, unknown>;
            const dims = pd.dimensions as { length?: number; width?: number; height?: number } | undefined;
            const origPd = shipment.package_details as Record<string, unknown> | undefined;
            const declaredVal = getDeclaredValue(pd) || getDeclaredValue(origPd);
            const payload = {
                sender_details: data.sender_details,
                receiver_details: data.receiver_details,
                packages: [{
                    weight: pd.weight ?? 1,
                    length: dims?.length ?? 10,
                    width: dims?.width ?? 10,
                    height: dims?.height ?? 10,
                    pieces: pd.pieces ?? 1,
                    declared_value: declaredVal,
                    content_description: (pd.content_description ?? "") as string,
                }],
            };
            const res = await axios.post(route("shipments.rates"), payload);
            const rates: Record<string, unknown>[] = Array.isArray(res.data) ? res.data : res.data?.rates ?? [];

            if (rates.length === 0) {
                setRecalcError(t("shipments.edit.no_rates_found") || "No se encontraron tarifas disponibles para esta ruta y peso.");
                return;
            }

            // Try to match by rate_rule_id or service_type; fall back to first available rate
            const serviceType = (shipment as Record<string, unknown>).service_type as string | undefined;
            const rateRuleId = (shipment as Record<string, unknown>).rate_rule_id as number | null | undefined;
            const norm = (s: string) => String(s || "").toLowerCase().replace(/_/g, " ").trim();
            const r = rates.find((x) =>
                (rateRuleId != null && x.rate_rule_id === rateRuleId) ||
                (serviceType && (x.service_code === serviceType || norm(String(x.service_code ?? "")) === norm(serviceType)))
            ) ?? rates[0];

            const bd = (r.breakdown as Record<string, unknown>) ?? {};
            const newSubtotal = Number(bd.subtotal ?? r.subtotal ?? 0);
            const newTax = Number(bd.tax ?? r.tax ?? 0);
            const newTotal = typeof r.total_price === "string"
                ? parseFloat(r.total_price as string)
                : Number(r.total ?? r.total_price ?? 0);

            // Single atomic setData call to avoid React batching issues with multiple calls
            setData({
                ...data,
                subtotal: newSubtotal,
                tax: newTax,
                total: newTotal,
            });
            setPackageModified(false);
        } catch (e) {
            console.error("Recalculate rates failed", e);
            setRecalcError(t("shipments.edit.recalc_error") || "Error al recalcular tarifas. Intente nuevamente.");
        } finally {
            setRecalculating(false);
        }
    };

    const subtotal = Number(data.subtotal) || 0;
    const tax = Number(data.tax) || 0;
    const discount = Number(data.discount) || 0;
    const total = Number(data.total) || subtotal + tax - discount;

    return (
        <AuthenticatedLayout>
            <Head title={t("shipments.edit_title")} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <Link
                            href={route("shipments.index")}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t("shipments.back")}
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">
                            {t("shipments.edit_title")} #{shipment.tracking_number}
                        </h1>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Estado - compacto */}
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <Label className="shrink-0">{t("common.status")}</Label>
                            <div className="w-full max-w-xs">
                                <SearchableStatusSelect
                                    statuses={shipment_statuses}
                                    value={data.status_id?.toString() ?? ""}
                                    onChange={(v) => setData("status_id", v ? parseInt(v, 10) : undefined)}
                                    placeholder={t("shipments.edit_status_placeholder")}
                                    searchPlaceholder={t("shipments.show.search_status_placeholder") || "Buscar estado..."}
                                    getIconComponent={getIconComponent}
                                    className={errors.status_id ? "border-destructive" : ""}
                                />
                                {errors.status_id && <p className="text-sm text-destructive mt-1">{errors.status_id}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Origen y Destino en fila */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-xl border bg-card p-5 space-y-3">
                            <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                {t("shipments.wizard.origin")}
                            </h2>
                            <div className="space-y-2">
                                <Label className="text-xs">{t("shipments.wizard.search_customer") || "Buscar cliente"}</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        value={senderSearch}
                                        onChange={(e) => setSenderSearch(e.target.value)}
                                        onFocus={() => { if (senderBlurTimerRef.current) clearTimeout(senderBlurTimerRef.current); setSenderOpen(true); }}
                                        onBlur={() => { senderBlurTimerRef.current = setTimeout(() => setSenderOpen(false), 200); }}
                                        placeholder={t("shipments.wizard.search_placeholder") || "Nombre, email o teléfono..."}
                                        className="h-9 pl-9"
                                        autoComplete="off"
                                    />
                                    {loadingSender && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                                    {senderOpen && (
                                        <ul className="absolute z-20 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-56 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
                                            {senderSearch.length < MIN_SEARCH_LENGTH ? (
                                                <li className="px-3 py-3 text-muted-foreground text-sm">{t("shipments.wizard.type_to_search") || "Escribe al menos 2 caracteres"}</li>
                                            ) : senderResults.length === 0 ? (
                                                <li className="px-3 py-3 text-muted-foreground text-sm">{t("shipments.wizard.no_customers_found") || "No se encontraron clientes"}</li>
                                            ) : (
                                                senderResults.map((c) => (
                                                    <li key={c.id} className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-0" onMouseDown={() => applyCustomer("sender_details", c)}>
                                                        <span className="font-medium">{c.name}</span>
                                                        <span className="text-muted-foreground text-sm block">{c.email} · {c.phone}</span>
                                                        {(c.country || c.city) && <span className="text-muted-foreground text-xs block">{[c.city, c.country].filter(Boolean).join(", ")}</span>}
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.name")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.sender_details.name} onChange={(e) => updateNested("sender_details", "name", e.target.value)} placeholder={t("forms.name")} className={`h-9 ${errors["sender_details.name"] ? "border-destructive" : ""}`} required />
                                    {errors["sender_details.name"] && <p className="text-xs text-destructive">{errors["sender_details.name"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.phone")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.sender_details.phone} onChange={(e) => updateNested("sender_details", "phone", e.target.value.replace(/[^\d+]/g, ""))} placeholder="+1..." inputMode="numeric" className={`h-9 ${errors["sender_details.phone"] ? "border-destructive" : ""}`} required />
                                    {errors["sender_details.phone"] && <p className="text-xs text-destructive">{errors["sender_details.phone"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.city")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.sender_details.city} onChange={(e) => updateNested("sender_details", "city", e.target.value)} placeholder={t("forms.city")} className={`h-9 ${errors["sender_details.city"] ? "border-destructive" : ""}`} required />
                                    {errors["sender_details.city"] && <p className="text-xs text-destructive">{errors["sender_details.city"]}</p>}
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.address")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.sender_details.address} onChange={(e) => updateNested("sender_details", "address", e.target.value)} placeholder={t("forms.address")} className={`h-9 ${errors["sender_details.address"] ? "border-destructive" : ""}`} required />
                                    {errors["sender_details.address"] && <p className="text-xs text-destructive">{errors["sender_details.address"]}</p>}
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.country")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.sender_details.country} onChange={(e) => updateNested("sender_details", "country", e.target.value)} placeholder={t("forms.country")} className={`h-9 ${errors["sender_details.country"] ? "border-destructive" : ""}`} required />
                                    {errors["sender_details.country"] && <p className="text-xs text-destructive">{errors["sender_details.country"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.company")}</Label>
                                    <Input value={data.sender_details.company ?? ""} onChange={(e) => updateNested("sender_details", "company", e.target.value)} placeholder={t("forms.company")} className={`h-9 ${errors["sender_details.company"] ? "border-destructive" : ""}`} />
                                    {errors["sender_details.company"] && <p className="text-xs text-destructive">{errors["sender_details.company"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.email")}</Label>
                                    <Input type="email" value={data.sender_details.email ?? ""} onChange={(e) => updateNested("sender_details", "email", e.target.value)} placeholder={t("forms.email")} className={`h-9 ${errors["sender_details.email"] ? "border-destructive" : ""}`} />
                                    {errors["sender_details.email"] && <p className="text-xs text-destructive">{errors["sender_details.email"]}</p>}
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.tax_id")}</Label>
                                    <Input value={data.sender_details.tax_id ?? ""} onChange={(e) => updateNested("sender_details", "tax_id", e.target.value)} placeholder={t("forms.tax_id")} className={`h-9 ${errors["sender_details.tax_id"] ? "border-destructive" : ""}`} />
                                    {errors["sender_details.tax_id"] && <p className="text-xs text-destructive">{errors["sender_details.tax_id"]}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card p-5 space-y-3">
                            <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                {t("shipments.wizard.destination")}
                            </h2>
                            <div className="space-y-2">
                                <Label className="text-xs">{t("shipments.wizard.search_customer") || "Buscar cliente"}</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        value={receiverSearch}
                                        onChange={(e) => setReceiverSearch(e.target.value)}
                                        onFocus={() => { if (receiverBlurTimerRef.current) clearTimeout(receiverBlurTimerRef.current); setReceiverOpen(true); }}
                                        onBlur={() => { receiverBlurTimerRef.current = setTimeout(() => setReceiverOpen(false), 200); }}
                                        placeholder={t("shipments.wizard.search_placeholder") || "Nombre, email o teléfono..."}
                                        className="h-9 pl-9"
                                        autoComplete="off"
                                    />
                                    {loadingReceiver && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                                    {receiverOpen && (
                                        <ul className="absolute z-20 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-56 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
                                            {receiverSearch.length < MIN_SEARCH_LENGTH ? (
                                                <li className="px-3 py-3 text-muted-foreground text-sm">{t("shipments.wizard.type_to_search") || "Escribe al menos 2 caracteres"}</li>
                                            ) : receiverResults.length === 0 ? (
                                                <li className="px-3 py-3 text-muted-foreground text-sm">{t("shipments.wizard.no_customers_found") || "No se encontraron clientes"}</li>
                                            ) : (
                                                receiverResults.map((c) => (
                                                    <li key={c.id} className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-0" onMouseDown={() => applyCustomer("receiver_details", c)}>
                                                        <span className="font-medium">{c.name}</span>
                                                        <span className="text-muted-foreground text-sm block">{c.email} · {c.phone}</span>
                                                        {(c.country || c.city) && <span className="text-muted-foreground text-xs block">{[c.city, c.country].filter(Boolean).join(", ")}</span>}
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.name")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.receiver_details.name} onChange={(e) => updateNested("receiver_details", "name", e.target.value)} placeholder={t("forms.name")} className={`h-9 ${errors["receiver_details.name"] ? "border-destructive" : ""}`} required />
                                    {errors["receiver_details.name"] && <p className="text-xs text-destructive">{errors["receiver_details.name"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.phone")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.receiver_details.phone} onChange={(e) => updateNested("receiver_details", "phone", e.target.value.replace(/[^\d+]/g, ""))} placeholder="+1..." inputMode="numeric" className={`h-9 ${errors["receiver_details.phone"] ? "border-destructive" : ""}`} required />
                                    {errors["receiver_details.phone"] && <p className="text-xs text-destructive">{errors["receiver_details.phone"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.city")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.receiver_details.city} onChange={(e) => updateNested("receiver_details", "city", e.target.value)} placeholder={t("forms.city")} className={`h-9 ${errors["receiver_details.city"] ? "border-destructive" : ""}`} required />
                                    {errors["receiver_details.city"] && <p className="text-xs text-destructive">{errors["receiver_details.city"]}</p>}
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.address")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.receiver_details.address} onChange={(e) => updateNested("receiver_details", "address", e.target.value)} placeholder={t("forms.address")} className={`h-9 ${errors["receiver_details.address"] ? "border-destructive" : ""}`} required />
                                    {errors["receiver_details.address"] && <p className="text-xs text-destructive">{errors["receiver_details.address"]}</p>}
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">{t("forms.country")} <span className="text-destructive">*</span></Label>
                                    <Input value={data.receiver_details.country} onChange={(e) => updateNested("receiver_details", "country", e.target.value)} placeholder={t("forms.country")} className={`h-9 ${errors["receiver_details.country"] ? "border-destructive" : ""}`} required />
                                    {errors["receiver_details.country"] && <p className="text-xs text-destructive">{errors["receiver_details.country"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.company")}</Label>
                                    <Input value={data.receiver_details.company ?? ""} onChange={(e) => updateNested("receiver_details", "company", e.target.value)} placeholder={t("forms.company")} className={`h-9 ${errors["receiver_details.company"] ? "border-destructive" : ""}`} />
                                    {errors["receiver_details.company"] && <p className="text-xs text-destructive">{errors["receiver_details.company"]}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("forms.email")}</Label>
                                    <Input type="email" value={data.receiver_details.email ?? ""} onChange={(e) => updateNested("receiver_details", "email", e.target.value)} placeholder={t("forms.email")} className={`h-9 ${errors["receiver_details.email"] ? "border-destructive" : ""}`} />
                                    {errors["receiver_details.email"] && <p className="text-xs text-destructive">{errors["receiver_details.email"]}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Paquete + Tarifas en fila */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
                                <Box className="h-4 w-4 text-primary" />
                                {t("shipments.wizard.step2")}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("shipments.wizard.weight")} ({weightUnit})</Label>
                                    <Input
                                        type="number"
                                        min="0.1"
                                        step={weightUnit === "lb" ? "0.01" : "0.1"}
                                        value={typeof data.package_details.weight === "number" ? Math.round(Number(data.package_details.weight) * 10000) / 10000 : data.package_details.weight ?? ""}
                                        onChange={(e) => updateNested("package_details", "weight", parseFloat(e.target.value) || 0.1)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t("shipments.wizard.pieces")}</Label>
                                    <Input type="number" min="1" value={data.package_details.pieces} onChange={(e) => updateNested("package_details", "pieces", parseInt(e.target.value, 10) || 1)} className="h-9" />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs">{t("shipments.show.content_description")}</Label>
                                    <Input value={(data.package_details.content_description as string) ?? ""} onChange={(e) => updateNested("package_details", "content_description", e.target.value)} placeholder="ACCESORIOS" className="h-9" />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs">{t("forms.declared_value")}</Label>
                                    <Input type="number" min="0" step="0.01" value={formatMonetaryInput(data.package_details.declared_value as number)} onChange={(e) => updateNested("package_details", "declared_value", e.target.value ? parseFloat(e.target.value) : 0)} className="h-9" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                                    <div className="space-y-1">
                                        <Label className="text-xs">L ({dimUnit})</Label>
                                        <Input type="number" min="1" value={(data.package_details.dimensions as { length?: number }).length ?? 0} onChange={(e) => updateNested("package_details", "dimensions", { ...(data.package_details.dimensions as object), length: parseInt(e.target.value, 10) || 0 })} className="h-9" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">W ({dimUnit})</Label>
                                        <Input type="number" min="1" value={(data.package_details.dimensions as { width?: number }).width ?? 0} onChange={(e) => updateNested("package_details", "dimensions", { ...(data.package_details.dimensions as object), width: parseInt(e.target.value, 10) || 0 })} className="h-9" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">H ({dimUnit})</Label>
                                        <Input type="number" min="1" value={(data.package_details.dimensions as { height?: number }).height ?? 0} onChange={(e) => updateNested("package_details", "dimensions", { ...(data.package_details.dimensions as object), height: parseInt(e.target.value, 10) || 0 })} className="h-9" />
                                    </div>
                                </div>
                        </div>

                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                {t("shipments.show.costs_title") || "Costos y Tarifas"}
                            </h2>
                            {shipment.service_type && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">{t("shipments.show.service") || "Servicio"}:</span>
                                    <span className="font-medium capitalize">
                                        {(shipment as any).rate_data?.service_name
                                            ?? (shipment.service_type ?? '').replace(/^svc_/, '').replace(/_/g, ' ')}
                                    </span>
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm gap-2">
                                    <Label className="text-muted-foreground font-normal shrink-0">{t("shipments.show.subtotal")}</Label>
                                    <div className="flex items-center gap-1 justify-end min-w-[7rem]">
                                        <Input type="number" min="0" step="0.01" value={formatMonetaryInput(data.subtotal)} onChange={(e) => setData("subtotal", e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 w-24 text-right" />
                                        <span className="text-muted-foreground text-xs w-8">{currency}</span>
                                    </div>
                                </div>
                                {errors.subtotal && <p className="text-xs text-destructive">{errors.subtotal}</p>}
                                <div className="flex justify-between items-center text-sm gap-2">
                                    <Label className="text-muted-foreground font-normal shrink-0">{t("shipments.show.surcharges") || "Surcharges"}</Label>
                                    <div className="flex items-center gap-1 justify-end min-w-[7rem]">
                                        <span className="h-9 w-24 flex items-center justify-end text-right font-medium tabular-nums">
                                            {(Math.max(0, Number(data.total ?? total) - Number(data.subtotal ?? 0) - Number(data.tax ?? 0) + Number(data.discount ?? 0))).toFixed(2)}
                                        </span>
                                        <span className="text-muted-foreground text-xs w-8">{currency}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm gap-2">
                                    <Label className="text-muted-foreground font-normal shrink-0">{t("shipments.show.tax")}</Label>
                                    <div className="flex items-center gap-1 justify-end min-w-[7rem]">
                                        <Input type="number" min="0" step="0.01" value={formatMonetaryInput(data.tax)} onChange={(e) => setData("tax", e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 w-24 text-right" />
                                        <span className="text-muted-foreground text-xs w-8">{currency}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm gap-2">
                                    <Label className="text-muted-foreground font-normal shrink-0">{t("shipments.show.discount")}</Label>
                                    <div className="flex items-center gap-1 justify-end min-w-[7rem]">
                                        <Input type="number" min="0" step="0.01" value={formatMonetaryInput(data.discount)} onChange={(e) => setData("discount", e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 w-24 text-right" />
                                        <span className="text-muted-foreground text-xs w-8">{currency}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t font-semibold gap-2">
                                    <Label className="shrink-0">{t("shipments.show.total")}</Label>
                                    <div className="flex items-center gap-1 justify-end min-w-[7rem]">
                                        <Input type="number" min="0" step="0.01" value={formatMonetaryInput(data.total ?? total)} onChange={(e) => setData("total", e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 w-24 text-right font-semibold" />
                                        <span className="text-muted-foreground text-xs w-8 font-medium">{currency}</span>
                                    </div>
                                </div>
                                {canManagePricing && (
                                    <div className="flex justify-between items-center text-sm pt-2 border-t gap-2">
                                        <div className="shrink-0">
                                            <Label className="text-muted-foreground font-normal">{t("shipments.show.cost_price")}</Label>
                                            <p className="text-xs text-muted-foreground">{t("shipments.show.cost_price_help")}</p>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end min-w-[7rem]">
                                            <Input type="number" min="0" step="0.01" value={formatMonetaryInput(data.cost_price ?? 0)} onChange={(e) => setData("cost_price", e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 w-24 text-right" />
                                            <span className="text-muted-foreground text-xs w-8">{currency}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {packageModified && (
                                <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                                    {t("shipments.edit.must_recalculate") || "Debe recalcular tarifas antes de guardar."}
                                </p>
                            )}
                            {recalcError && (
                                <p className="text-xs text-destructive font-medium">{recalcError}</p>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={handleRecalculateRates} disabled={recalculating} className="w-full gap-2">
                                <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
                                {recalculating ? t("shipments.wizard.processing") || "Calculando..." : t("shipments.edit.recalculate") || "Recalcular tarifas"}
                            </Button>
                        </div>
                    </div>

                    {/* Información adicional */}
                    <div className="rounded-xl border bg-card p-5 space-y-4">
                        <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            {t("shipments.edit.additional_info") || "Información adicional"}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs">{t("shipments.show.ship_date") || "Fecha de envío"}</Label>
                                <Input type="date" value={data.ship_date ?? ""} onChange={(e) => setData("ship_date", e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t("shipments.show.estimated_delivery") || "Entrega estimada"}</Label>
                                <Input type="date" value={data.estimated_delivery_date ?? ""} onChange={(e) => setData("estimated_delivery_date", e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t("rates.currency") || "Moneda"}</Label>
                                <Input value={data.currency ?? ""} onChange={(e) => setData("currency", e.target.value.toUpperCase())} placeholder="USD" className="h-9" maxLength={10} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route("shipments.show", shipment.id)}>{t("common.cancel")}</Link>
                        </Button>
                        <Button type="submit" disabled={processing || packageModified}>
                            <Save className="h-4 w-4 mr-2" />
                            {t("common.save")}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
