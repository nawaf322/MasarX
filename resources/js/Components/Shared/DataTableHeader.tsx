import { Button } from "@/Components/UI/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Printer, Download, MoreHorizontal, Eye, ChevronDown } from "lucide-react";

export interface DataTableHeaderAction {
    key: string;
    label: string;
    onClick?: () => void;
    href?: string;
}

export interface DataTableHeaderProps {
    title: string;
    /** Print button click (e.g. window.print) */
    onPrint?: () => void;
    /** Export options: label + onClick (e.g. CSV, PDF) */
    exportOptions?: { label: string; onClick: () => void }[];
    /** More options dropdown items */
    moreOptions?: DataTableHeaderAction[];
    /** Primary "View" button (e.g. link to create or view selected) */
    viewButton?: { label: string; onClick?: () => void; href?: string };
}

export function DataTableHeader({
    title,
    onPrint,
    exportOptions = [],
    moreOptions = [],
    viewButton,
}: DataTableHeaderProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
            </h1>
            <div className="flex items-center gap-2">
                {onPrint && (
                    <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
                        <Printer className="h-4 w-4" />
                        Print
                    </Button>
                )}
                {exportOptions.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Download className="h-4 w-4" />
                                Export
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {exportOptions.map((opt) => (
                                <DropdownMenuItem key={opt.label} onClick={opt.onClick}>
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {moreOptions.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {moreOptions.map((opt) => (
                                <DropdownMenuItem
                                    key={opt.key}
                                    onClick={opt.onClick}
                                    asChild={!!opt.href}
                                >
                                    {opt.href ? (
                                        <a href={opt.href}>{opt.label}</a>
                                    ) : (
                                        <span>{opt.label}</span>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                {viewButton && (
                    viewButton.href ? (
                        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <a href={viewButton.href}>{viewButton.label}</a>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={viewButton.onClick}
                        >
                            <Eye className="h-4 w-4" />
                            {viewButton.label}
                        </Button>
                    )
                )}
            </div>
        </div>
    );
}
