import { Input } from "@/Components/UI/input"
import { Search, X } from "lucide-react"
import { Button } from "@/Components/UI/button"
import { useState, useEffect } from "react"
import { useDebounce } from "@/hooks/useDebounce"

interface TableToolbarProps {
    search?: string
    onSearchChange: (value: string) => void
    placeholder?: string
    clearLabel?: string
    children?: React.ReactNode // For extra filters or actions
}

export function TableToolbar({
    search = "",
    onSearchChange,
    placeholder = "Filter...",
    clearLabel,
    children
}: TableToolbarProps) {
    const [value, setValue] = useState(search)

    // Sync internal state if prop changes remotely
    useEffect(() => {
        setValue(search)
    }, [search])

    // Debounce calls to parent
    useEffect(() => {
        const timer = setTimeout(() => {
            if (value !== search) {
                onSearchChange(value)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [value, search, onSearchChange])

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
            <div className="flex flex-1 items-center space-x-2 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={placeholder}
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className="pl-8 bg-white"
                        autoComplete="off"
                    />
                    {value && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => { setValue(""); onSearchChange(""); }}
                            className="absolute right-0 top-0 h-9 w-9 p-0"
                            title={clearLabel}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {/* Extra Filters passed as children */}
                {children}
            </div>
        </div>
    )
}
