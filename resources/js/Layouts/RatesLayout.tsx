import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { BarChart3, Map as MapIcon, CreditCard, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { useTranslation } from '@/hooks/useTranslation';

export default function RatesLayout({ children, title, wide }: { children: React.ReactNode; title: string; wide?: boolean }) {
    const { url } = usePage();
    const { t } = useTranslation();

    const menuItems = [
        { name: t('rates.overview'), href: route('rates.index'), icon: BarChart3, active: url === '/rates' },
        { name: t('rates.rate_cards'), href: route('rates.cards.index'), icon: CreditCard, active: url.startsWith('/rates/cards') },
        { name: t('rates.shipping_zones'), href: route('rates.zones.index'), icon: MapIcon, active: url.startsWith('/rates/zones') },
        { name: t('rates.calculator'), href: route('rates.calculator'), icon: Calculator, active: url.startsWith('/rates/calculator') },
    ];

    const currentItem = menuItems.find(item => item.active) || menuItems[0];

    const handleMobileNavigate = (value: string) => {
        router.visit(value);
    };

    return (
        <AuthenticatedLayout>
            <Head title={title} />
            <div className="py-6 md:py-8 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('rates.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('rates.subtitle')}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    <aside className="w-full lg:w-56 xl:w-64 shrink-0 space-y-4">
                        <div className="lg:hidden sticky top-4 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-2 rounded-lg">
                            <Select value={currentItem.href} onValueChange={handleMobileNavigate}>
                                <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <SelectValue placeholder={t('common.search')}>
                                        <div className="flex items-center gap-2">
                                            <currentItem.icon className="h-4 w-4 text-primary" />
                                            {currentItem.name}
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {menuItems.map((item) => (
                                        <SelectItem key={item.href} value={item.href}>
                                            <div className="flex items-center gap-2">
                                                <item.icon className="h-4 w-4 text-gray-500" />
                                                {item.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <nav className="hidden lg:flex flex-col space-y-1">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-r-lg transition-all relative overflow-hidden",
                                        item.active
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {item.active && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                    )}
                                    <item.icon className={cn(
                                        "h-4 w-4 transition-colors",
                                        item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )} />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-h-[400px] animate-in fade-in-50 duration-300 overflow-hidden">
                            <div className="p-4 sm:p-6 md:p-8 overflow-x-auto">
                                <div className={cn("w-full", wide ? "max-w-7xl" : "max-w-5xl")}>{children}</div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
