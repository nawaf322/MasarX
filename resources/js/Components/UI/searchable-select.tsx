
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

export interface Option {
    value: string;
    label: string | React.ReactNode;
    /** Short label shown in the trigger button when this option is selected. Falls back to label. */
    triggerLabel?: string | React.ReactNode;
    /** Textos por los que filtrar (nombre, código, etc.). Si no se pasa, se usa value + label si es string */
    keywords?: string[];
}

interface SearchableSelectProps {
    options: Option[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    className,
    disabled = false
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false)

    // Find selected option — use triggerLabel in the button if provided, else full label
    const selectedOption = options.find((opt) => opt.value === value);
    const selectedLabel = selectedOption?.triggerLabel ?? selectedOption?.label;

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
                    {value ? selectedLabel : <span className="text-gray-500 font-normal">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 min-w-[200px]" align="start">
                <Command shouldFilter={true}>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                // cmdk filtra por el prop "value": debe incluir todo el texto por el que se quiere buscar
                                const searchableText = [
                                    option.value,
                                    typeof option.label === 'string' ? option.label : '',
                                    ...(option.keywords || []),
                                ].filter(Boolean).join(' ').toLowerCase();
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={searchableText}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option.label}
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
