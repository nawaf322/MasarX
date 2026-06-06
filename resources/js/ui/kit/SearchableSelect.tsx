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
import { ScrollArea } from "@/Components/UI/scroll-area"
import { useTranslation } from "@/hooks/useTranslation"

export interface SearchableSelectItem {
    value: string | number
    label: string
    meta?: any
}

interface SearchableSelectProps {
    value?: string | number
    onChange: (value: string) => void
    items: SearchableSelectItem[]
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    disabled?: boolean
    isLoading?: boolean
    className?: string
    /**
     * Optional: Triggered on search input change (debounced)
     * Use this for remote data fetching
     */
    onSearchChange?: (term: string) => void
    debounceMs?: number
}

export function SearchableSelect({
    value,
    onChange,
    items,
    placeholder = "Select item...",
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    disabled = false,
    isLoading = false,
    className,
    onSearchChange,
    debounceMs = 300,
}: SearchableSelectProps) {
    const { t } = useTranslation()
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    // Debounce search for remote fetching
    React.useEffect(() => {
        if (!onSearchChange) return

        const timer = setTimeout(() => {
            onSearchChange(search)
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [search, onSearchChange, debounceMs])

    // Find selected label
    const selectedLabel = React.useMemo(() => {
        if (!value) return ""
        const item = items.find((i) => String(i.value) === String(value))
        return item ? item.label : ""
    }, [value, items])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-white", className)}
                    disabled={disabled || isLoading}
                >
                    {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={!onSearchChange}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        onValueChange={setSearch}
                        value={search}
                    />
                    <CommandList>
                        <ScrollArea className="h-64">
                            {isLoading ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {t('select.loading')}
                                </div>
                            ) : (
                                <>
                                    <CommandEmpty>{emptyText}</CommandEmpty>
                                    <CommandGroup>
                                        {items.map((item) => (
                                            <CommandItem
                                                key={item.value}
                                                value={item.label} // Createable needs label match usually, or ID if custom filter
                                                onSelect={() => {
                                                    onChange(String(item.value))
                                                    setOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        String(value) === String(item.value)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {item.label}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
