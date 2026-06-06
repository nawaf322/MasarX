import { Input } from "@/Components/UI/input";
import { Button } from "@/Components/UI/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { Search, MapPin, Calendar, DollarSign } from "lucide-react";

export interface TableToolbarFilterOption {
    value: string;
    label: string;
}

export interface TableToolbarProps {
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    /** Status filter (chip + dropdown) */
    statusLabel?: string;
    statusOptions: TableToolbarFilterOption[];
    statusValue: string;
    onStatusChange: (value: string) => void;
    /** Date range (chip + from/to inputs or single range) */
    dateRangeLabel?: string;
    dateFrom?: string;
    dateTo?: string;
    onDateFromChange?: (value: string) => void;
    onDateToChange?: (value: string) => void;
    /** Optional total/amount - if onTotalClick is set, the button is clickable */
    totalLabel?: string;
    onTotalClick?: () => void;
    showArchived?: boolean;
    onShowArchivedChange?: (v: boolean) => void;
    showArchivedLabel?: string;
}

export function TableToolbar({
    searchPlaceholder = "Search ID, Customer...",
    searchValue,
    onSearchChange,
    statusLabel = "Status",
    statusOptions,
    statusValue,
    onStatusChange,
    dateRangeLabel = "Order Date Range",
    dateFrom = "",
    dateTo = "",
    onDateFromChange,
    onDateToChange,
    totalLabel,
    onTotalClick,
    showArchived,
    onShowArchivedChange,
    showArchivedLabel = "Show archived",
}: TableToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-9 bg-background border border-input rounded-md"
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Select value={statusValue || "all"} onValueChange={(v) => onStatusChange(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9 w-[140px] gap-1.5 border border-input rounded-md">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder={statusLabel} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(onDateFromChange || onDateToChange) && (
                    <div className="flex items-center gap-1 rounded-md border border-input overflow-hidden h-9">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => onDateFromChange?.(e.target.value)}
                            className="h-full px-2 text-sm bg-transparent border-0 w-[120px] focus:outline-none"
                        />
                        <span className="text-muted-foreground text-sm">–</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => onDateToChange?.(e.target.value)}
                            className="h-full px-2 text-sm bg-transparent border-0 w-[120px] focus:outline-none"
                        />
                    </div>
                )}
                {totalLabel && (
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 gap-1.5 ${onTotalClick ? "" : "pointer-events-none opacity-70"}`}
                        onClick={onTotalClick}
                        title={onTotalClick ? undefined : totalLabel}
                    >
                        <DollarSign className="h-3.5 w-3.5" />
                        {totalLabel}
                    </Button>
                )}
                {onShowArchivedChange && (
                    <label className="flex items-center gap-2 h-9 px-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!showArchived}
                            onChange={(e) => onShowArchivedChange(e.target.checked)}
                            className="rounded border-input"
                        />
                        {showArchivedLabel}
                    </label>
                )}
            </div>
        </div>
    );
}
