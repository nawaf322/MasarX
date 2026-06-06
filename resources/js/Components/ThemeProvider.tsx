import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => {
            // STRICT ENFORCEMENT: If DB provides a specific theme (not system), use it.
            // Only fall back to localStorage if defaultTheme is 'system' or undefined.
            if (defaultTheme && defaultTheme !== 'system') {
                return defaultTheme;
            }
            return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
        }
    )

    // SYNC: Ensure DB setting overrides local storage when it changes (or on init if mandated)
    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        const effectiveTheme = (defaultTheme && defaultTheme !== "system")
            ? defaultTheme
            : theme;

        if (effectiveTheme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            root.classList.add(systemTheme)
            return
        }

        root.classList.add(effectiveTheme)
    }, [theme, defaultTheme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
