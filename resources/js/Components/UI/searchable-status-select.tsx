import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/Components/UI/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/Components/UI/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/Components/UI/popover"
import { useTranslation } from "@/hooks/useTranslation"

interface StatusOption {
    id: number;
    code: string;
    name: string;
    icon?: string;
    color?: string;
}

interface SearchableStatusSelectProps {
    statuses: StatusOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
    getIconComponent?: (iconName: string) => React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export function SearchableStatusSelect({
    statuses,
    value,
    onChange,
    placeholder = "Select status...",
    searchPlaceholder = "Search status...",
    className,
    disabled = false,
    getIconComponent,
}: SearchableStatusSelectProps) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false)

    // Find selected status
    const selectedStatus = statuses.find((st) => st.id.toString() === value);

    // Render selected label with icon/color
    const renderSelectedLabel = () => {
        if (!selectedStatus) return <span className="text-gray-500 font-normal">{placeholder}</span>;
        
        const IconComponent = getIconComponent && selectedStatus.icon 
            ? getIconComponent(selectedStatus.icon) 
            : null;

        return (
            <span className="flex items-center gap-2">
                {selectedStatus.color && !IconComponent && (
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedStatus.color }} />
                )}
                {IconComponent && (
                    <IconComponent className="h-4 w-4 shrink-0" style={{ color: selectedStatus.color }} />
                )}
                {selectedStatus.name || selectedStatus.code}
            </span>
        );
    };

    return (
        <Popover open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between bg-white border-gray-200 hover:bg-gray-50", className)}
                >
                    {renderSelectedLabel()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 min-w-[var(--radix-popover-trigger-width)]" align="start">
                <Command shouldFilter={true}>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>{t("common.no_data") || "No se encontraron estados."}</CommandEmpty>
                        <CommandGroup>
                            {statuses.map((status) => {
                                const IconComponent = getIconComponent && status.icon 
                                    ? getIconComponent(status.icon) 
                                    : null;
                                
                                // Texto buscable: código, nombre
                                const searchableText = [
                                    status.code,
                                    status.name,
                                ].filter(Boolean).join(' ').toLowerCase();

                                return (
                                    <CommandItem
                                        key={status.id}
                                        value={searchableText}
                                        onSelect={() => {
                                            onChange(status.id.toString());
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                value === status.id.toString() ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="flex items-center gap-2">
                                            {status.color && !IconComponent && (
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                                            )}
                                            {IconComponent && (
                                                <IconComponent className="h-4 w-4 shrink-0" style={{ color: status.color }} />
                                            )}
                                            {status.name || status.code}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
