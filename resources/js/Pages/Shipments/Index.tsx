import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import { Button } from "@/Components/UI/button";
import { Checkbox } from "@/Components/UI/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/UI/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Avatar, AvatarFallback } from "@/Components/UI/avatar";
import { DataTableHeader } from "@/Components/Shared/DataTableHeader";
import { TableToolbar } from "@/Components/Shared/TableToolbar";
import { AppPagination } from "@/Components/Shared/AppPagination";
import {
    ArrowUpDown, MoreHorizontal, ExternalLink, Circle, Loader2, MapPin,
    FileText, Clock, Truck, CheckCircle, CheckCircle2, XCircle, AlertTriangle,
    PauseCircle, RotateCcw, Package, RefreshCw, DollarSign, ArrowRight, X, Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSweetAlert } from "@/hooks/useSweetAlert";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/Components/UI/dialog";
import { Label } from "@/Components/UI/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { SearchableStatusSelect } from "@/Components/UI/searchable-status-select";
import { formatCurrency } from "@/utils/localeFormat";

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
    Circle, Loader2, MapPin, FileText, Clock, Truck, CheckCircle, CheckCircle2,
    XCircle, AlertTriangle, PauseCircle, RotateCcw, Package, RefreshCw,
};
function getIconComponent(iconName: string): LucideIcon {
    return ICON_MAP[iconName] ?? Circle;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ShipmentRow {
    id: number;
    tracking_number: string;
    status_id?: number;
    sender_name: string;
    receiver_name: string;
    receiver_address: string;
    origin: string;
    destination: string;
    status: string;
    status_label: string;
    status_icon?: string;
    status_color?: string;
    payment_status?: string;
    has_return?: boolean;
    return_status?: string;
    created_at: string;
    created_at_time: string;
    total: number | string;
    currency: string;
}

interface StatsData {
    total_shipments: number;
    total_revenue: number;
    active_count: number;
    delivered_count: number;
}

interface StatusOption {
    id: number;
    code: string;
    name: string;
    icon?: string;
    color?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { value: "pending",          label: "Pending" },
    { value: "processed",        label: "Processed" },
    { value: "picked_up",        label: "Picked Up" },
    { value: "in_transit",       label: "In Transit" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered",        label: "Delivered" },
    { value: "cancelled",        label: "Cancelled" },
];

const PAYMENT_BADGE: Record<string, { cls: string; dot: string }> = {
    paid:     { cls: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500"  },
    partial:  { cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500"  },
    unpaid:   { cls: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500"    },
    refunded: { cls: "bg-gray-100 text-gray-600 border-gray-200",    dot: "bg-gray-400"   },
};

function getInitials(name: string): string {
    return (name || "")
        .split(/\s+/)
        .map((s) => s[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";
}

const EXCEPTION_REASONS = [
    { value: "Incorrect address",     labelKey: "dashboard.incorrect_address" },
    { value: "Weather conditions",    labelKey: "dashboard.weather_conditions" },
    { value: "Federal Holidays",      labelKey: "dashboard.federal_holidays" },
    { value: "Damage during transit", labelKey: "dashboard.damage_during_transit" },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────
export default function ShipmentIndex({
    shipments,
    shipment_statuses = [],
    stats,
    filters,
    canCreate = true,
    canDelete = false,
    canEdit = true,
    canExport = true,
    canChangeStatus = true,
    canViewFinancials = true,
    is_driver_view = false,
}: {
    shipments: { data: ShipmentRow[]; meta?: any };
    shipment_statuses?: StatusOption[];
    stats?: StatsData;
    filters: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        sort?: string;
        sort_dir?: string;
        per_page?: number;
        show_archived?: boolean;
    };
    canCreate?: boolean;
    canDelete?: boolean;
    canEdit?: boolean;
    canExport?: boolean;
    canChangeStatus?: boolean;
    canViewFinancials?: boolean;
    is_driver_view?: boolean;
}) {
    const { t } = useTranslation();
    const swal = useSweetAlert();

    const [search,               setSearch]               = useState(filters.search ?? "");
    const [status,               setStatus]               = useState(filters.status ?? "");
    const [dateFrom,             setDateFrom]             = useState(filters.date_from ?? "");
    const [dateTo,               setDateTo]               = useState(filters.date_to ?? "");
    const [showArchived,         setShowArchived]         = useState(!!filters.show_archived);
    const [changeStatusOpen,     setChangeStatusOpen]     = useState(false);
    const [changeStatusShipment, setChangeStatusShipment] = useState<ShipmentRow | null>(null);
    const [changeStatusId,       setChangeStatusId]       = useState<string>("");
    const [exceptionReason,      setExceptionReason]      = useState("");
    const [changeStatusNote,     setChangeStatusNote]     = useState("");
    const [changeStatusSubmitting, setChangeStatusSubmitting] = useState(false);
    const [totalAmountOpen,      setTotalAmountOpen]      = useState(false);
    const [selectedIds,          setSelectedIds]          = useState<Set<number>>(new Set());

    // ── Server-side search with debounce ─────────────────────────────────────
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            router.get(route('shipments.index'), {
                ...filters,
                search: value || undefined,
                status: status || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                show_archived: showArchived ? '1' : undefined,
            }, { preserveState: true, replace: true });
        }, 400);
    }, [filters, status, dateFrom, dateTo, showArchived]);

    const displayedRows = shipments.data ?? [];

    // ── Sum of all visible rows (for total modal) ─────────────────────────────
    const totalAmountSum = useMemo(
        () => displayedRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
        [displayedRows]
    );

    // ── Sum of selected rows ──────────────────────────────────────────────────
    const selectedSum = useMemo(
        () => displayedRows
            .filter((r) => selectedIds.has(r.id))
            .reduce((acc, r) => acc + (Number(r.total) || 0), 0),
        [displayedRows, selectedIds]
    );

    const selectedCurrency = useMemo(() => {
        const first = displayedRows.find((r) => selectedIds.has(r.id));
        return first?.currency ?? displayedRows[0]?.currency ?? "USD";
    }, [displayedRows, selectedIds]);

    // ── Server-side filters ───────────────────────────────────────────────────
    const applyFilters = useCallback(
        (overrides: Record<string, string | number | undefined> = {}) => {
            const params: Record<string, string | number | undefined> = {
                status:       status     || undefined,
                date_from:    dateFrom   || undefined,
                date_to:      dateTo     || undefined,
                sort:         filters.sort     ?? "created_at",
                sort_dir:     filters.sort_dir ?? "desc",
                per_page:     filters.per_page ?? 10,
                show_archived: showArchived ? 1 : undefined,
                ...overrides,
            };
            const clean = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v != null && v !== "")
            ) as Record<string, string | number>;
            router.get(route("shipments.index"), clean, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [status, dateFrom, dateTo, showArchived, filters.sort, filters.sort_dir, filters.per_page]
    );

    useEffect(() => {
        if (status !== (filters.status ?? "")) applyFilters({ status, page: 1 });
    }, [status]);

    useEffect(() => {
        if (dateFrom !== (filters.date_from ?? "") || dateTo !== (filters.date_to ?? "")) {
            applyFilters({ date_from: dateFrom || undefined, date_to: dateTo || undefined, page: 1 });
        }
    }, [dateFrom, dateTo]);

    useEffect(() => {
        if (showArchived !== !!filters.show_archived) {
            applyFilters({ show_archived: showArchived ? 1 : undefined, page: 1 });
        }
    }, [showArchived]);

    const handleSort = (column: string) => {
        const nextDir =
            filters.sort === column && filters.sort_dir === "asc" ? "desc" : "asc";
        applyFilters({ sort: column, sort_dir: nextDir, page: 1 });
    };

    const openChangeStatus = (row: ShipmentRow) => {
        setChangeStatusShipment(row);
        setChangeStatusId((row.status_id ?? "").toString());
        setExceptionReason("");
        setChangeStatusNote("");
        setChangeStatusOpen(true);
    };

    const selectedStatus = shipment_statuses?.find(
        (s) => s.id === parseInt(changeStatusId, 10)
    );
    const needsExceptionReason =
        selectedStatus &&
        ["exception", "on_hold", "returned"].includes(selectedStatus.code ?? "");

    const handleChangeStatusSubmit = () => {
        if (!changeStatusShipment || !changeStatusId) return;
        setChangeStatusSubmitting(true);
        const payload: { status_id: number; exception_reason?: string; note?: string } = {
            status_id: parseInt(changeStatusId, 10),
        };
        if (needsExceptionReason && exceptionReason) {
            payload.exception_reason = exceptionReason;
        }
        if (changeStatusNote.trim()) {
            payload.note = changeStatusNote.trim();
        }
        router.put(route("shipments.change-status", changeStatusShipment.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setChangeStatusOpen(false);
                setChangeStatusNote("");
                swal.toast(t("shipments.show.change_status_success") || "Estado actualizado.");
            },
            onError:  () => setChangeStatusSubmitting(false),
            onFinish: () => setChangeStatusSubmitting(false),
        });
    };

    const exportReport = (format: "csv" | "xls", selectedOnly: boolean) => {
        const params = new URLSearchParams();
        params.set("format", format);
        if (selectedOnly && selectedIds.size > 0) {
            Array.from(selectedIds).forEach((id) => params.append("ids[]", String(id)));
        } else {
            if (status)       params.set("status",       status);
            if (dateFrom)     params.set("date_from",    dateFrom);
            if (dateTo)       params.set("date_to",      dateTo);
            if (showArchived) params.set("show_archived","1");
        }
        window.open(route("shipments.export") + "?" + params.toString(), "_blank");
    };

    const handleArchive = (row: ShipmentRow) => {
        swal.confirm(
            t("shipments.index.archive_confirm_title"),
            t("shipments.index.archive_confirm_msg")
        ).then((ok) => {
            if (ok) {
                router.post(route("shipments.archive", row.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => swal.toast(t("shipments.index.archive_success") || "Archivado."),
                });
            }
        });
    };

    const handleUnarchive = (row: ShipmentRow) => {
        router.post(route("shipments.unarchive", row.id), {}, {
            preserveScroll: true,
            onSuccess: () => swal.toast(t("shipments.index.unarchive_success") || "Desarchivado."),
        });
    };

    const handleDelete = (row: ShipmentRow) => {
        if (row.status === "delivered") {
            swal.error(
                t("shipments.index.cannot_delete_delivered") ||
                "No se puede eliminar un envío entregado."
            );
            return;
        }
        swal.confirm(
            t("shipments.index.delete_confirm_title"),
            t("shipments.index.delete_confirm_msg")
        ).then((ok) => {
            if (ok) {
                router.delete(route("shipments.destroy", row.id), {
                    preserveScroll: true,
                    onSuccess: () => swal.toast(t("shipments.index.delete_success") || "Eliminado."),
                });
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        swal.confirm(
            t("shipments.index.bulk_delete_confirm_title"),
            t("shipments.index.bulk_delete_confirm_msg", { count: String(selectedIds.size) })
        ).then((ok) => {
            if (ok) {
                router.post(
                    route("shipments.bulk-destroy"),
                    { ids: Array.from(selectedIds) },
                    {
                        preserveScroll: false,
                        onSuccess: () => setSelectedIds(new Set()),
                    }
                );
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === (shipments.data?.length ?? 0)) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set((shipments.data ?? []).map((r) => r.id)));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── Table columns ─────────────────────────────────────────────────────────
    const allSelected =
        (shipments.data?.length ?? 0) > 0 &&
        selectedIds.size === (shipments.data?.length ?? 0);

    return (
        <AuthenticatedLayout>
            <Head title={t("shipments.title")} />

            <div className="py-8 px-4 sm:px-6 lg:px-8 w-full">
                {/* Header */}
                <div className="no-print">
                    <DataTableHeader
                        title={is_driver_view ? t("shipments.my_shipments") || "My Shipments" : t("shipments.title")}
                        onPrint={!is_driver_view ? () => window.print() : undefined}
                        exportOptions={canExport ? [
                            { label: t("shipments.index.export_selected_csv"), onClick: () => exportReport("csv", true)  },
                            { label: t("shipments.index.export_selected_xls"), onClick: () => exportReport("xls", true)  },
                            { label: t("shipments.index.export_all_csv"),      onClick: () => exportReport("csv", false) },
                            { label: t("shipments.index.export_all_xls"),      onClick: () => exportReport("xls", false) },
                        ] : undefined}
                        viewButton={canCreate ? { label: t("shipments.create_new"), href: route("shipments.create") } : undefined}
                    />
                </div>

                {/* KPI Cards */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 no-print">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    {t("shipments.kpi_total_shipments")}
                                </p>
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                    <Package className="h-4 w-4 text-blue-500" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Number(stats.total_shipments).toLocaleString()}
                            </p>
                        </div>

                        {canViewFinancials && stats.total_revenue != null && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    {t("shipments.kpi_revenue")}
                                </p>
                                <div className="p-1.5 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(Number(stats.total_revenue) || 0)}
                            </p>
                        </div>
                        )}

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    {t("shipments.kpi_active")}
                                </p>
                                <div className="p-1.5 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                    <Truck className="h-4 w-4 text-purple-500" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Number(stats.active_count).toLocaleString()}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    {t("shipments.kpi_delivered")}
                                </p>
                                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Number(stats.delivered_count).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="mt-6 no-print">
                    <TableToolbar
                        searchPlaceholder={t("shipments.search_placeholder")}
                        searchValue={search}
                        onSearchChange={handleSearchChange}
                        statusLabel={t("shipments.toolbar.status")}
                        statusOptions={STATUS_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t("shipments.status." + o.value) || o.label,
                        }))}
                        statusValue={status}
                        onStatusChange={setStatus}
                        dateRangeLabel={t("shipments.toolbar.date_range")}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onDateFromChange={setDateFrom}
                        onDateToChange={setDateTo}
                        totalLabel={canViewFinancials ? t("shipments.toolbar.total_amount") : undefined}
                        onTotalClick={canViewFinancials ? () => setTotalAmountOpen(true) : undefined}
                        showArchived={showArchived}
                        onShowArchivedChange={setShowArchived}
                        showArchivedLabel={t("shipments.index.show_archived")}
                    />
                </div>

                {/* Table */}
                <div className="mt-4 rounded-lg border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                                {/* Checkbox */}
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                        className="rounded"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-foreground">
                                    <Button variant="ghost" size="sm" className="-ml-3 h-8 font-semibold" onClick={() => handleSort("tracking_number")}>
                                        {t("shipments.table.order")}
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </TableHead>
                                <TableHead className="font-semibold text-foreground">
                                    {t("shipments.col_route")}
                                </TableHead>
                                {canViewFinancials && (
                                <TableHead className="font-semibold text-foreground">
                                    <Button variant="ghost" size="sm" className="-ml-3 h-8 font-semibold" onClick={() => handleSort("total")}>
                                        {t("shipments.table.total")}
                                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </TableHead>
                                )}
                                <TableHead className="font-semibold text-foreground">
                                    {t("shipments.table.order_status")}
                                </TableHead>
                                <TableHead className="font-semibold text-foreground">
                                    {t("shipments.table.address")}
                                </TableHead>
                                <TableHead className="font-semibold text-foreground">
                                    {t("shipments.table.actions")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="shipments-table-body">
                            {displayedRows.length > 0 ? (
                                displayedRows.map((row) => {
                                    const payStatus = row.payment_status ?? "unpaid";
                                    const payBadge  = PAYMENT_BADGE[payStatus] ?? PAYMENT_BADGE.unpaid;
                                    const payLabel  = t("shipments.show.payment_status_" + payStatus) || payStatus;
                                    const IconComp  = getIconComponent(row.status_icon ?? "Circle");
                                    const color     = row.status_color || "#6B7280";
                                    const statusLabel = row.status_label || t("shipments.status." + row.status) || row.status;

                                    return (
                                        <TableRow
                                            key={row.id}
                                            className={`hover:bg-muted/30 border-b transition-colors ${selectedIds.has(row.id) ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}
                                        >
                                            {/* Checkbox */}
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(row.id)}
                                                    onCheckedChange={() => toggleSelect(row.id)}
                                                    aria-label="Select row"
                                                    className="rounded"
                                                />
                                            </TableCell>

                                            {/* Tracking + date */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Link
                                                        href={route("shipments.show", row.id)}
                                                        className="font-mono font-semibold text-primary hover:underline text-sm"
                                                    >
                                                        #{row.tracking_number}
                                                    </Link>
                                                    {row.has_return && (
                                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                                            row.return_status === 'completed' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                                            row.return_status === 'approved'  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                            'bg-orange-100 text-orange-700 border-orange-200'
                                                        }`}>
                                                            ↩ {t('sidebar.returns') || 'Return'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{row.created_at}</div>
                                                <div className="text-xs text-muted-foreground/70">{row.created_at_time}</div>
                                            </TableCell>

                                            {/* Route: Sender → Receiver */}
                                            <TableCell>
                                                <div className="flex items-center gap-2 min-w-[180px]">
                                                    <Avatar className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs shrink-0">
                                                        <AvatarFallback>{getInitials(row.sender_name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm text-foreground truncate">{row.sender_name}</div>
                                                        <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                                            <span className="truncate">{row.receiver_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Total + payment status (admin/super-admin only) */}
                                            {canViewFinancials && (
                                            <TableCell>
                                                <span className="font-semibold text-foreground">
                                                    {formatCurrency(Number(row.total) || 0, row.currency ?? "USD")}
                                                </span>
                                                <div className="mt-1">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${payBadge.cls}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${payBadge.dot}`} />
                                                        {payLabel}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            )}

                                            {/* Status */}
                                            <TableCell>
                                                <div
                                                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
                                                    style={{
                                                        backgroundColor: `${color}20`,
                                                        color: color,
                                                        borderColor: `${color}40`,
                                                    }}
                                                >
                                                    <IconComp className="h-3.5 w-3.5" />
                                                    {statusLabel}
                                                </div>
                                            </TableCell>

                                            {/* Address */}
                                            <TableCell>
                                                <span className="text-muted-foreground text-sm max-w-[180px] truncate block">
                                                    {row.receiver_address || "—"}
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                                                        <Link href={route("shipments.show", row.id)}>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>{t("shipments.table.actions")}</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.tracking_number)}>
                                                                {t("shipments.table.copy")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => { window.location.href = route("shipments.show", row.id); }}>
                                                                {t("shipments.table.details")}
                                                            </DropdownMenuItem>
                                                            {canEdit && (
                                                                <DropdownMenuItem onSelect={() => { window.location.href = route("shipments.edit", row.id); }}>
                                                                    {t("shipments.table.edit")}
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => window.open(route("shipments.label", row.id), "_blank")}>
                                                                {t("shipments.table.print")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => window.open(route("invoices.show", row.id), "_blank")}>
                                                                {t("shipments.table.print_invoice")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => router.post(route("shipments.clone", row.id), {}, { preserveScroll: false })}>
                                                                {t("shipments.table.clone_invoice")}
                                                            </DropdownMenuItem>
                                                            {canChangeStatus && (
                                                                <DropdownMenuItem onSelect={() => openChangeStatus(row)}>
                                                                    {t("shipments.show.change_status")}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {showArchived ? (
                                                                <DropdownMenuItem onSelect={() => handleUnarchive(row)}>
                                                                    {t("shipments.index.unarchive")}
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onSelect={() => handleArchive(row)}>
                                                                    {t("shipments.index.archive")}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDelete && row.status !== "delivered" && (
                                                                <DropdownMenuItem
                                                                    onSelect={() => handleDelete(row)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    {t("shipments.index.delete_shipment")}
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        {search
                                            ? t("shipments.index.no_results_search")
                                            : t("dashboard.table.no_data")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <AppPagination variant="server" meta={shipments} />
                </div>
            </div>

            {/* Floating selection bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 no-print">
                    <span className="text-sm font-semibold tabular-nums">
                        {selectedIds.size} {t("shipments.selected_count")}
                    </span>
                    <span className="text-gray-500">·</span>
                    <span className="text-sm font-bold text-green-400">
                        {formatCurrency(selectedSum, selectedCurrency)}
                    </span>
                    {canDelete && (
                        <>
                            <span className="text-gray-600">|</span>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t("shipments.index.bulk_delete_btn")}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-1 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t("shipments.deselect_all")}
                    </button>
                </div>
            )}

            {/* Total amount modal */}
            <Dialog open={totalAmountOpen} onOpenChange={setTotalAmountOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t("shipments.toolbar.total_amount")}</DialogTitle>
                    </DialogHeader>
                    <p className="text-2xl font-bold text-primary">
                        {formatCurrency(totalAmountSum, displayedRows[0]?.currency ?? "USD")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t("shipments.index.total_amount_hint", { count: displayedRows.length })}
                    </p>
                </DialogContent>
            </Dialog>

            {/* Change status dialog */}
            <Dialog
                open={changeStatusOpen}
                onOpenChange={(open) => {
                    if (!open) { setChangeStatusOpen(false); setChangeStatusShipment(null); setChangeStatusNote(""); }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("shipments.show.change_status_modal_title")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {changeStatusShipment && (
                            <p className="text-sm text-muted-foreground">
                                #{changeStatusShipment.tracking_number} – {changeStatusShipment.receiver_name}
                            </p>
                        )}
                        <div className="space-y-2">
                            <Label>{t("shipments.show.change_status_select_label")}</Label>
                            <SearchableStatusSelect
                                statuses={shipment_statuses ?? []}
                                value={changeStatusId}
                                onChange={(id) => {
                                    setChangeStatusId(id);
                                    if (!["exception", "on_hold", "returned"].includes(
                                        shipment_statuses?.find((s) => s.id === parseInt(id, 10))?.code ?? ""
                                    )) {
                                        setExceptionReason("");
                                    }
                                }}
                                placeholder={t("shipments.edit_status_placeholder")}
                                searchPlaceholder={t("shipments.show.search_status_placeholder") || ""}
                                disabled={changeStatusSubmitting}
                            />
                        </div>
                        {needsExceptionReason && (
                            <div className="space-y-2">
                                <Label>{t("shipments.show.exception_reason_label")}</Label>
                                <Select value={exceptionReason} onValueChange={setExceptionReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("shipments.show.exception_reason_placeholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXCEPTION_REASONS.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {t(r.labelKey)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="change-status-note">
                                {t("shipments.show.change_note_label") || "Change note (Optional)"}
                            </Label>
                            <textarea
                                id="change-status-note"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                rows={3}
                                placeholder={t("shipments.show.change_note_placeholder") || "Optional — will be recorded in the shipment activity log"}
                                value={changeStatusNote}
                                onChange={(e) => setChangeStatusNote(e.target.value)}
                                disabled={changeStatusSubmitting}
                                maxLength={1000}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChangeStatusOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleChangeStatusSubmit}
                            disabled={changeStatusSubmitting || !changeStatusId}
                        >
                            {changeStatusSubmitting
                                ? t("shipments.wizard.processing")
                                : t("shipments.show.change_status_save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                @media print {
                    .no-print, nav, header, [data-slot="sidebar"], .flex.items-center.gap-2 { display: none !important; }
                    .shipments-table-body td, .shipments-table-body th { border: 1px solid #ddd; padding: 6px; }
                    body { background: #fff; }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
