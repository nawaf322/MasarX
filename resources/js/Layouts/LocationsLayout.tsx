import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    Map as MapIcon, Flag, Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { useTranslation } from '@/hooks/useTranslation';

export default function LocationsLayout({ children, title }: { children: React.ReactNode, title: string }) {
    const { url } = usePage();
    const { t } = useTranslation();

    const menuItems = [
        { name: t('locations.countries'), href: route('locations.countries.index'), icon: Flag, active: url.startsWith('/locations/countries') },
        { name: t('locations.states_provinces'), href: route('locations.states.index'), icon: MapIcon, active: url.startsWith('/locations/states') },
        { name: t('locations.cities'), href: route('locations.cities.index'), icon: Building, active: url.startsWith('/locations/cities') },
    ];

    const currentItem = menuItems.find(item => item.active) || menuItems[0];

    const handleMobileNavigate = (value: string) => {
        router.visit(value);
    };

    return (
        <AuthenticatedLayout>
            <Head title={title} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('locations.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('locations.subtitle')}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-64 shrink-0 space-y-4">

                        {/* Mobile Navigation (Select) */}
                        <div className="lg:hidden sticky top-4 z-20 bg-gray-50/95 backdrop-blur py-2">
                            <Select value={currentItem.href} onValueChange={handleMobileNavigate}>
                                <SelectTrigger className="w-full bg-white border-gray-200">
                                    <SelectValue placeholder={t('locations.select_location_section')}>
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

                        {/* Desktop Navigation */}
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
                                    {/* Active Bar Indicator */}
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

                    {/* Content Shell */}
                    <main className="flex-1 min-w-0">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[600px] animate-in fade-in-50 duration-500">
                            {/* Component content renders here */}
                            <div className="p-6 md:p-8">
                                <div className="max-w-4xl">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
