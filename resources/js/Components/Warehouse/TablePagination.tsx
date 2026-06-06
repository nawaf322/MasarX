import { Button } from "@/Components/UI/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';

interface TablePaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
}

interface TablePaginationProps {
    meta: TablePaginationMeta | undefined | null;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    pageSizeOptions?: number[];
}

export function TablePagination({
    meta,
    onPageChange,
    onPerPageChange,
    pageSizeOptions = [5, 10, 15, 25, 50],
}: TablePaginationProps) {
    const { t } = useTranslation();

    const m = meta && typeof meta.total === 'number'
        ? {
            current_page: meta.current_page ?? 1,
            last_page: Math.max(1, meta.last_page ?? 1),
            per_page: meta.per_page ?? 15,
            total: meta.total,
            from: meta.from ?? 0,
            to: meta.to ?? 0,
        }
        : null;

    if (!m) return null;

    const from = m.from ?? 0;
    const to = m.to ?? 0;
    const canPrevious = m.current_page > 1;
    const canNext = m.current_page < m.last_page;

    const showingText = (t('pagination.showing') || 'Showing {{from}} to {{to}} of {{total}} entries')
        .replace('{{from}}', String(from))
        .replace('{{to}}', String(to))
        .replace('{{total}}', String(m.total));

    const pageOfText = (t('pagination.page_of') || 'Page {{current}} of {{total}}')
        .replace('{{current}}', String(m.current_page))
        .replace('{{total}}', String(m.last_page));

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 bg-gray-50/50">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
                {showingText}
            </div>
            <div className="flex items-center gap-4 order-1 sm:order-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 hidden sm:inline">
                        {t('pagination.rows_per_page') || 'Rows per page'}
                    </span>
                    <Select
                        value={String(m.per_page)}
                        onValueChange={(v) => onPerPageChange(Number(v))}
                    >
                        <SelectTrigger className="h-9 w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700 w-20 text-center">
                        {pageOfText}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => onPageChange(1)}
                        disabled={!canPrevious}
                        title={t('pagination.first_page') || 'First'}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => onPageChange(m.current_page - 1)}
                        disabled={!canPrevious}
                        title={t('pagination.prev_page') || 'Previous'}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => onPageChange(m.current_page + 1)}
                        disabled={!canNext}
                        title={t('pagination.next_page') || 'Next'}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => onPageChange(m.last_page)}
                        disabled={!canNext}
                        title={t('pagination.last_page') || 'Last'}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
