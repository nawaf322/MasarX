import { ReactNode } from 'react';
import { Button } from "@/Components/UI/button";
import { Plus } from "lucide-react";
import { ProTable } from "@/Components/ProTable";
import { ColumnDef } from "@tanstack/react-table";

interface SettingsTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    searchPlaceholder?: string;
    rowSelection?: any;
    onRowSelectionChange?: (selection: any) => void;
    /** Pass "" to disable table-internal search (e.g. when using server-side search). */
    searchKey?: string;
    /** Server-side pagination meta; when set, ProTable shows server pagination and does not slice data. */
    meta?: { current_page: number; last_page: number; per_page: number; total: number; from?: number; to?: number } | null;
}

export function SettingsTable<T extends { id: string | number }>({
    columns,
    data,
    title,
    description,
    actionLabel,
    onAction,
    searchPlaceholder = "Search...",
    searchKey = "name",
    rowSelection,
    onRowSelectionChange,
    meta,
}: SettingsTableProps<T>) {
    return (
        <div className="space-y-6">
            {/* Header Section */}
            {(title || actionLabel) && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        {title && <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>}
                        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                    </div>
                    {actionLabel && onAction && (
                        <Button onClick={onAction} className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm font-medium transition-all hover:shadow-md active:scale-95">
                            <ButtonContent label={actionLabel} />
                        </Button>
                    )}
                </div>
            )}

            {/* ProTable handles Toolbar (Search + View) and Pagination */}
            <ProTable
                columns={columns}
                data={data}
                searchKey={searchKey || undefined}
                searchPlaceholder={searchPlaceholder}
                rowSelection={rowSelection}
                onRowSelectionChange={onRowSelectionChange}
                meta={meta ?? undefined}
            />
        </div>
    );
}

function ButtonContent({ label }: { label: string }) {
    return (
        <>
            <Plus className="h-4 w-4 mr-2" />
            {label}
        </>
    )
}
