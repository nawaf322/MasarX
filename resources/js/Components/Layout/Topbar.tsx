import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Search, Sun, Moon, Settings, LogOut, User, Package, Users, FileText, X, Truck, CreditCard, DollarSign, CheckCheck, Database as Warehouse, ArrowUpCircle } from "lucide-react";
import { Input } from "@/Components/UI/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/Components/UI/avatar";
import { Button } from "@/Components/UI/button";
import { useTheme } from "@/Components/ThemeProvider";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from "@/Components/LanguageSwitcher";
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface SearchResult {
    type: 'shipment' | 'customer' | 'manifest' | 'driver' | 'carrier' | 'payment';
    id: number;
    label: string;
    sub?: string;
    status?: string;
    total?: string;
    url: string;
    created_at?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    shipment: <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />,
    customer: <Users className="h-3.5 w-3.5 text-green-500 shrink-0" />,
    manifest: <FileText className="h-3.5 w-3.5 text-purple-500 shrink-0" />,
    driver:   <Truck className="h-3.5 w-3.5 text-orange-500 shrink-0" />,
    carrier:  <Truck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />,
    payment:  <CreditCard className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
};

interface AppNotification {
    id: number;
    type: string;
    title: string;
    body?: string;
    icon: string;
    url?: string;
    read: boolean;
    created_at: string;
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
    package:   <Package className="h-4 w-4 text-blue-500" />,
    truck:     <Truck className="h-4 w-4 text-orange-500" />,
    warehouse: <Warehouse className="h-4 w-4 text-purple-500" />,
    dollar:    <DollarSign className="h-4 w-4 text-emerald-500" />,
    bell:      <Bell className="h-4 w-4 text-gray-400" />,
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

// Module-level timestamp — shared across re-mounts so rapid page navigation
// doesn't trigger a new fetch if one was made less than 20 seconds ago.
let _notifLastFetch = 0;

/** In-app notifications bell — polls every 60s, throttled on navigation re-mounts. */
function NotificationsBell({ t }: { t: (k: string) => string }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);

    const fetchNotifications = useCallback(() => {
        const now = Date.now();
        if (now - _notifLastFetch < 20_000) return; // skip if fetched < 20s ago
        _notifLastFetch = now;
        axios.get(route('inapp.index'))
            .then(r => {
                setNotifications(r.data.notifications ?? []);
                setUnread(r.data.unread ?? 0);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleOpen = (val: boolean) => {
        setOpen(val);
    };

    const markRead = (id: number) => {
        axios.post(route('inapp.read', id)).catch(() => {});
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
    };

    const markAllRead = () => {
        axios.post(route('inapp.read-all')).catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnread(0);
    };

    const handleClick = (n: AppNotification) => {
        if (!n.read) markRead(n.id);
        if (n.url) router.visit(n.url);
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={handleOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 text-[10px] text-white flex items-center justify-center font-bold">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                    <span className="sr-only">{t('topbar.notifications')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{t('topbar.notifications')}</span>
                    <div className="flex items-center gap-2">
                        {unread > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">{unread}</span>
                        )}
                        {unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 flex flex-col items-center gap-2 text-gray-400">
                            <Bell className="h-8 w-8 opacity-30" />
                            <span className="text-sm">{t('topbar.no_notifications')}</span>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <button
                                key={n.id}
                                onClick={() => handleClick(n)}
                                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-colors border-b border-gray-50 dark:border-gray-800/40 last:border-0 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            >
                                <span className="mt-0.5 shrink-0 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                                    {NOTIF_ICONS[n.icon] ?? NOTIF_ICONS.bell}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${!n.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {n.title}
                                    </p>
                                    {n.body && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{n.body}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function Topbar() {
    const { auth, update_available } = usePage().props as any;
    const user = auth?.user;
    const isCustomer = (auth?.roles ?? []).includes('customer');
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const doSearch = useCallback((q: string) => {
        if (q.length < 2) { setResults([]); setOpen(false); return; }
        setLoading(true);
        axios.get(route('api.search.global'), { params: { q } })
            .then(r => {
                setResults(r.data.results || []);
                setOpen(true);
            })
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 280);
    };

    const handleSelect = (url: string) => {
        setQuery('');
        setResults([]);
        setOpen(false);
        router.visit(url);
    };

    const clearSearch = () => { setQuery(''); setResults([]); setOpen(false); };

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSearch(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-20 w-full items-center gap-4 bg-white/80 px-4 md:px-8 backdrop-blur-xl border-b border-gray-100 dark:bg-gray-950/80 dark:border-gray-800 transition-colors duration-300">
            <div className="flex flex-1 items-center gap-4">
                <div ref={searchRef} className="hidden sm:block w-full max-w-[400px] relative">
                    <div className="relative">
                        {loading
                            ? <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        }
                        <Input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={handleChange}
                            onFocus={() => results.length > 0 && setOpen(true)}
                            placeholder={t('shipments.search_placeholder') || "Search tracking #, customer, manifest..."}
                            className="w-full bg-gray-50 pl-10 pr-8 h-10 border-gray-200 focus:bg-white transition-all duration-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:focus:bg-gray-800"
                            autoComplete="off"
                        />
                        {query && (
                            <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {open && results.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                            <ul>
                                {results.map((r, i) => (
                                    <li key={`${r.type}-${r.id}-${i}`}>
                                        <button
                                            className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                                            onClick={() => handleSelect(r.url)}
                                        >
                                            <span className="mt-0.5">{TYPE_ICONS[r.type]}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.label}</span>
                                                    {r.total && <span className="text-xs text-gray-400 shrink-0">{r.total}</span>}
                                                </div>
                                                {r.sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.sub}</p>}
                                            </div>
                                            {r.created_at && <span className="text-xs text-gray-400 shrink-0 mt-0.5">{r.created_at}</span>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 text-right">
                                {results.length} result{results.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}

                    {open && results.length === 0 && query.length >= 2 && !loading && (
                        <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 px-4 py-3 text-sm text-gray-500">
                            No results for "{query}"
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <LanguageSwitcher />

                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">{t('topbar.toggle_theme')}</span>
                </Button>

                <NotificationsBell t={t} />

                <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-blue-100 transition-all">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user?.avatar_url} alt={user?.name} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                        {user?.name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('profile.edit')} className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{t('topbar.profile')}</span>
                                </Link>
                            </DropdownMenuItem>
                            {!isCustomer && (
                            <DropdownMenuItem asChild>
                                <Link href={route('settings.index')} className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>{t('topbar.settings')}</span>
                                </Link>
                            </DropdownMenuItem>
                            )}
                            {update_available && (
                                <DropdownMenuItem asChild>
                                    <Link href={route('settings.updates')} className="cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-900/10">
                                        <ArrowUpCircle className="mr-2 h-4 w-4 animate-pulse" />
                                        <span>{t('topbar.update_available')}</span>
                                        <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" />
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10" asChild>
                                <Link href={route('logout')} method="post" as="button" className="w-full text-left cursor-pointer flex items-center">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{t('topbar.logout')}</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
