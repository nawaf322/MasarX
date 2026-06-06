import { Button } from "@/Components/UI/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
}

interface PaginationBarProps {
    meta: PaginationMeta
    onPageChange: (page: number) => void
    onPerPageChange: (perPage: number) => void
    className?: string
}

export function PaginationBar({
    meta,
    onPageChange,
    onPerPageChange,
    className
}: PaginationBarProps) {
    if (!meta || meta.total === 0) return null;

    return (
        <div className={`flex items-center justify-between px-2 ${className}`}>
            <div className="flex-1 text-sm text-muted-foreground">
                Showing {meta.from || 0} to {meta.to || 0} of {meta.total} entries
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${meta.per_page}`}
                        onValueChange={(value) => {
                            onPerPageChange(Number(value))
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={meta.per_page} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {meta.current_page} of {meta.last_page}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(1)}
                        disabled={meta.current_page === 1}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(meta.current_page - 1)}
                        disabled={meta.current_page === 1}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(meta.current_page + 1)}
                        disabled={meta.current_page === meta.last_page}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(meta.last_page)}
                        disabled={meta.current_page === meta.last_page}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
