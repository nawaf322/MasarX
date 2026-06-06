import { useState } from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    PaginationState,
    OnChangeFn,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/UI/table"
import { Button } from "@/Components/UI/button"
import { Input } from "@/Components/UI/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu"
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import { AppPagination } from "@/Components/Shared/AppPagination"
import { useTranslation } from '@/hooks/useTranslation'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    emptyText?: string
    meta?: any // Optional Server-Side pagination meta
    onPageChange?: (page: number) => void
    pagination?: PaginationState
    onPaginationChange?: OnChangeFn<PaginationState>
    rowSelection?: any
    onRowSelectionChange?: OnChangeFn<any>
}

export function ProTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    meta,
    onPageChange,
    pagination: controlledPagination,
    onPaginationChange: setControlledPagination,
    rowSelection: controlledRowSelection,
    onRowSelectionChange: setControlledRowSelection,
}: DataTableProps<TData, TValue>) {
    const { t } = useTranslation()
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [internalRowSelection, setInternalRowSelection] = useState({})

    const [internalPagination, setInternalPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    })

    // Server-side: show all rows for current page (no client slice). One source of truth.
    const pagination = meta
        ? { pageIndex: 0, pageSize: Math.max(1, Number(meta.per_page) || 15) }
        : (controlledPagination || internalPagination)
    const onPaginationChange = meta ? undefined : (setControlledPagination || setInternalPagination)

    // Controlled Selection Logic
    const rowSelection = controlledRowSelection || internalRowSelection;
    const onRowSelectionChange = setControlledRowSelection || setInternalRowSelection;

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: onRowSelectionChange,
        onPaginationChange: onPaginationChange ?? (() => {}),
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
        manualPagination: !!meta, // Important: tell Table we handle pagination manually if meta is present
        pageCount: meta ? meta.last_page : undefined, // undefined lets table calculate it for client-side
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    {searchKey && (
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn(searchKey)?.setFilterValue(event.target.value)
                                }
                                className="pl-9 h-9 bg-white"
                            />
                        </div>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            {t('common.view_columns') || 'View'}
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="font-semibold text-gray-700">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-gray-50/50 text-xs"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-gray-500"
                                >
                                    {emptyText}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* UNIFIED PAGINATION */}
            <div className="py-2">
                {meta ? (
                    <AppPagination variant="server" meta={meta} />
                ) : (
                    <AppPagination variant="table" table={table} />
                )}
            </div>
        </div>
    )
}
