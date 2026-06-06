import { Button } from "@/Components/UI/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { router } from '@inertiajs/react'
import { Table } from "@tanstack/react-table"
import { useTranslation } from '@/hooks/useTranslation'

interface PaginationMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
}

// Helper to normalize meta from different Laravel responses
function normalizeMeta(meta: any): PaginationMeta | null {
    if (!meta) return null;

    // If it's a standard LengthAwarePaginator root object
    if (typeof meta.total === 'number' && typeof meta.current_page === 'number') {
        return {
            current_page: meta.current_page,
            last_page: meta.last_page,
            per_page: meta.per_page,
            total: meta.total,
            from: meta.from,
            to: meta.to,
        };
    }

    // If it's wrapped in a 'meta' key (JsonResource)
    if (meta.meta && typeof meta.meta.total === 'number') {
        return {
            current_page: meta.meta.current_page,
            last_page: meta.meta.last_page,
            per_page: meta.meta.per_page,
            total: meta.meta.total,
            from: meta.meta.from,
            to: meta.meta.to,
        };
    }

    return null;
}

type AppPaginationProps<TData> =
    | {
        variant: "table";
        table: Table<TData>;
        pageSizeOptions?: number[];
    }
    | {
        variant: "server";
        meta: any; // Can be Paginator object or { meta: ... }
        onPageChange?: (page: number) => void; // Optional override
        onPerPageChange?: (perPage: number) => void; // Optional override
        pageSizeOptions?: number[];
    };

export function AppPagination<TData>(props: AppPaginationProps<TData>) {
    const pageSizeOptions = props.pageSizeOptions || [10, 15, 25, 50, 100];

    // --- MODE: TABLE (Client-Side) ---
    if (props.variant === "table") {
        const { table } = props;
        const state = table.getState().pagination;

        // If no pagination state, don't render
        if (!state) return null;

        const { pageIndex, pageSize } = state;
        const pageCount = table.getPageCount();
        const totalRows = table.getFilteredRowModel().rows.length;
        const currentPage = pageIndex + 1;

        // Calculate "from" and "to" for client-side
        const from = totalRows === 0 ? 0 : (pageIndex * pageSize) + 1;
        const to = Math.min((pageIndex + 1) * pageSize, totalRows);

        return (
            <PaginationLayout
                currentPage={currentPage}
                lastPage={pageCount}
                perPage={pageSize}
                total={totalRows}
                from={from}
                to={to}
                pageSizeOptions={pageSizeOptions}
                onPageChange={(p) => table.setPageIndex(p - 1)}
                onPerPageChange={(s) => table.setPageSize(s)}
                canPrevious={table.getCanPreviousPage()}
                canNext={table.getCanNextPage()}
            />
        );
    }

    // --- MODE: SERVER (Inertia/Laravel) ---
    const meta = normalizeMeta(props.meta);
    if (!meta || meta.total === 0) return null;

    const handlePageChange = (page: number) => {
        if (props.onPageChange) {
            props.onPageChange(page);
            return;
        }

        // Default Inertia behavior: maintain query params, update 'page'
        const url = new URL(window.location.href);
        url.searchParams.set('page', page.toString());
        router.visit(url.toString(), {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    const handlePerPageChange = (size: number) => {
        if (props.onPerPageChange) {
            props.onPerPageChange(size);
            return;
        }

        // Default: update 'per_page' (or 'perPage'), reset to page 1
        const url = new URL(window.location.href);
        // Check if existing param uses snake_case or camelCase, default to per_page
        if (url.searchParams.has('perPage')) {
            url.searchParams.set('perPage', size.toString());
        } else {
            url.searchParams.set('per_page', size.toString());
        }
        url.searchParams.set('page', '1');

        router.visit(url.toString(), {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    return (
        <PaginationLayout
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            perPage={meta.per_page}
            total={meta.total}
            from={meta.from || 0}
            to={meta.to || 0}
            pageSizeOptions={pageSizeOptions}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            canPrevious={meta.current_page > 1}
            canNext={meta.current_page < meta.last_page}
        />
    );
}

// --- SHARED UI LAYOUT (The "Green" Design) ---
interface PaginationLayoutProps {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
    from: number
    to: number
    pageSizeOptions: number[]
    onPageChange: (page: number) => void
    onPerPageChange: (size: number) => void
    canPrevious: boolean
    canNext: boolean
}

function PaginationLayout({
    currentPage,
    lastPage,
    perPage,
    total,
    from,
    to,
    pageSizeOptions,
    onPageChange,
    onPerPageChange,
    canPrevious,
    canNext
}: PaginationLayoutProps) {
    const { t } = useTranslation();
    const showingText = t('pagination.showing')
        ?.replace('{{from}}', String(from))
        ?.replace('{{to}}', String(to))
        ?.replace('{{total}}', String(total))
        || `Showing ${from} to ${to} of ${total} entries`;
    const pageOfText = t('pagination.page_of')
        ?.replace('{{current}}', String(currentPage))
        ?.replace('{{total}}', String(lastPage))
        || `Page ${currentPage} of ${lastPage}`;

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-4 border-t border-gray-100">
            <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                {showingText}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-700 hidden sm:block">{t('pagination.rows_per_page') || 'Rows per page'}</p>
                    <Select
                        value={`${perPage}`}
                        onValueChange={(value) => onPerPageChange(Number(value))}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={perPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={`${size}`}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-center text-sm font-medium text-gray-700 whitespace-nowrap">
                    {pageOfText}
                </div>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(1)}
                        disabled={!canPrevious}
                    >
                        <span className="sr-only">{t('pagination.first_page') || 'Go to first page'}</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canPrevious}
                    >
                        <span className="sr-only">{t('pagination.prev_page') || 'Go to previous page'}</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canNext}
                    >
                        <span className="sr-only">{t('pagination.next_page') || 'Go to next page'}</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(lastPage)}
                        disabled={!canNext}
                    >
                        <span className="sr-only">{t('pagination.last_page') || 'Go to last page'}</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
