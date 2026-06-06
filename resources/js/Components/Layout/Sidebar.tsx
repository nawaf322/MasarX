import { Link, usePage } from '@inertiajs/react';
import { cn } from "@/lib/utils";
import { navConfig } from '@/Configs/nav.config';
import { LogOut, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/Components/UI/button";
import { Sheet, SheetContent, SheetTrigger } from "@/Components/UI/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/UI/tooltip";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEdition } from '@/hooks/useEdition';
import { EditionBadge } from '@/Components/EditionBadge';

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

interface SidebarContentProps {
    collapsed: boolean;
    toggleCollapse: () => void;
    setMobileOpen: (open: boolean) => void;
    url: string;
    branding: any;
    t: (key: string) => string;
    auth: any;
}

// Definido FUERA de Sidebar para que React no lo remonte en cada render
// (si estuviera adentro, cada re-render crea un tipo de componente nuevo → reset de scroll)
function SidebarContent({
    collapsed,
    toggleCollapse,
    setMobileOpen,
    url,
    branding,
    t,
    auth,
}: SidebarContentProps) {
    const isActiveLink = (pattern: string) => url.startsWith(pattern);
    const edition = useEdition();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={cn("flex items-center gap-3 mb-8 mt-6 px-4 transition-all duration-300", collapsed ? "justify-center px-0" : "")}>
                {(collapsed ? (branding.sublogo_url || branding.logo_url) : branding.logo_url) ? (
                    collapsed ? (
                        <img src={branding.sublogo_url || branding.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
                    ) : (
                        <img src={branding.logo_url} alt="Logo" className="h-16 w-auto object-contain max-w-[200px]" />
                    )
                ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg text-primary-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    </div>
                )}

                {!collapsed && (
                    <div className="flex items-center gap-2 ml-auto">
                        <EditionBadge />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleCollapse}
                            className="h-7 w-7 text-gray-400 hover:text-gray-600 hidden md:flex"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {collapsed && (
                <div className="flex justify-center mb-6 hidden md:flex">
                    <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8 text-gray-400">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex flex-col gap-6 w-full flex-1 overflow-y-auto custom-scrollbar px-3">
                {navConfig.map((section, index) => {
                    const permissions = (auth as any).permissions || [];
                    const userRole = (auth as any).user?.roles?.[0]?.name;
                    const isSuperAdmin = userRole === 'super-admin';

                    const hasPermission = (permission?: string) => {
                        if (!permission) return true;
                        return permissions.includes(permission) || isSuperAdmin || permissions.includes('settings.maintenance.manage');
                    };

                    const hasFeature = (feature?: string) => !feature || edition.has(feature);

                    const visibleItems = section.items.filter(item => hasPermission(item.permission) && hasFeature(item.feature));
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={index}>
                            {section.title && !collapsed && (
                                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {t(`sidebar.${section.title?.toLowerCase().replace(/\s+/g, '_')}`) || section.title}
                                </p>
                            )}
                            <nav className="flex flex-col gap-1">
                                {visibleItems.map((item) => {
                                    const isActive = isActiveLink(item.activePattern);
                                    const label = t(`sidebar.${item.title.toLowerCase().replace(/[\s-]+/g, '_')}`) || item.title;
                                    const linkEl = (
                                        <Link
                                            key={item.title}
                                            href={route(item.href) as unknown as string}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                                collapsed ? "justify-center px-2" : "",
                                                isActive
                                                    ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-md bg-[var(--brand-primary)]" />
                                            )}
                                            <item.icon
                                                className={cn(
                                                    "transition-colors shrink-0",
                                                    collapsed ? "h-6 w-6" : "h-5 w-5",
                                                    item.title === 'Settings'
                                                        ? "text-[var(--brand-primary)]"
                                                        : isActive
                                                            ? "text-[var(--brand-primary)]"
                                                            : "text-muted-foreground group-hover:text-foreground"
                                                )}
                                                style={item.title === 'Settings' && branding.primary_color ? { color: branding.primary_color } : undefined}
                                            />
                                            {!collapsed && <span className="truncate">{label}</span>}
                                        </Link>
                                    );
                                    if (collapsed) {
                                        return (
                                            <Tooltip key={item.title} delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    {linkEl}
                                                </TooltipTrigger>
                                                <TooltipContent side="right" sideOffset={8} className="font-medium">
                                                    {label}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    }
                                    return <React.Fragment key={item.title}>{linkEl}</React.Fragment>;
                                })}
                            </nav>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-auto px-3 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                {collapsed ? (
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                            >
                                <LogOut className="h-6 w-6 text-gray-400 group-hover:text-red-500" />
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="font-medium">
                            {t('common.logout')}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                    >
                        <LogOut className="h-5 w-5 text-gray-400 group-hover:text-red-500" />
                        <span>{t('common.logout')}</span>
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
    const { url, props } = usePage();
    const branding = (props as any).branding || {};
    const [mobileOpen, setMobileOpen] = useState(false);
    const { t } = useTranslation();

    return (
        <>
            {/* Mobile Sidebar (Drawer/Sheet) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-4 z-50">
                        <Menu className="h-6 w-6 text-gray-700" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                    <SidebarContent
                        collapsed={false}
                        toggleCollapse={toggleCollapse}
                        setMobileOpen={setMobileOpen}
                        url={url}
                        branding={branding}
                        t={t}
                        auth={props.auth}
                    />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <TooltipProvider delayDuration={300}>
                <aside
                    className={cn(
                        "hidden md:flex flex-col h-screen border-r bg-white transition-all duration-300 dark:bg-gray-900 dark:border-gray-800 sticky top-0",
                        isCollapsed ? "w-[4.5rem]" : "w-72"
                    )}
                >
                    <SidebarContent
                        collapsed={isCollapsed}
                        toggleCollapse={toggleCollapse}
                        setMobileOpen={setMobileOpen}
                        url={url}
                        branding={branding}
                        t={t}
                        auth={props.auth}
                    />
                </aside>
            </TooltipProvider>
        </>
    );
}
