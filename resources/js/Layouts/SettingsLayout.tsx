import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    Building2, Paintbrush, Globe, Users, Shield,
    Hash, Receipt, Bell, Lock, Plug,
    FileClock, Database, MapPin, Building, Tag, Package, Truck, ArrowUpCircle, BookOpen, Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";

export default function SettingsLayout({ children, title }: { children: React.ReactNode, title: string }) {
    const { t } = useTranslation();
    const { url, props } = usePage();
    const permissions = (props.auth as any).permissions || [];
    const authRoles: string[] = (props.auth as any).roles ?? [];
    const isSuperAdmin = authRoles.includes('super-admin');

    const hasPermission = (permission: string) => {
        return permissions.includes(permission) || isSuperAdmin || permissions.includes('settings.maintenance.manage');
    };

    const getTranslatedMenuName = (key: string) => {
        const translated = t(key);
        return translated !== key ? translated : key;
    };

    const menuItems = [
        { name: getTranslatedMenuName('settings.menu.profile'), href: route('settings.company'), icon: Building2, active: url.startsWith('/settings/company'), permission: 'settings.company.view' },
        { name: getTranslatedMenuName('settings.menu.branding'), href: route('settings.branding'), icon: Paintbrush, active: url.startsWith('/settings/branding'), permission: 'settings.branding.view' },
        { name: getTranslatedMenuName('settings.menu.locale'), href: route('settings.locale'), icon: Globe, active: url.startsWith('/settings/locale'), permission: 'settings.locale.view' },
        { name: getTranslatedMenuName('settings.menu.branches'), href: route('settings.branches'), icon: MapPin, active: url.startsWith('/settings/branches'), permission: 'settings.company.view' },
        { name: getTranslatedMenuName('settings.menu.departments'), href: route('settings.departments'), icon: Building, active: url.startsWith('/settings/departments'), permission: 'settings.company.view' },
        { name: getTranslatedMenuName('settings.menu.shipment_statuses'), href: route('settings.shipment-statuses'), icon: Tag, active: url.startsWith('/settings/shipment-statuses'), permission: 'settings.company.view' },
        { name: getTranslatedMenuName('settings.menu.services'), href: route('settings.services'), icon: Truck, active: url.startsWith('/settings/services'), permission: 'settings.company.view' },
        { name: getTranslatedMenuName('settings.menu.users'), href: route('settings.users'), icon: Users, active: url.startsWith('/settings/users'), permission: 'settings.users.list' },
        { name: getTranslatedMenuName('settings.menu.roles'), href: route('settings.roles'), icon: Shield, active: url.startsWith('/settings/roles'), permission: 'settings.roles.list' },
        { name: getTranslatedMenuName('settings.menu.notifications'), href: route('settings.notifications'), icon: Bell, active: url.startsWith('/settings/notifications'), permission: 'settings.notifications.view' },
        { name: getTranslatedMenuName('settings.menu.security'), href: route('settings.security'), icon: Lock, active: url.startsWith('/settings/security'), permission: 'settings.security.view' },
        { name: getTranslatedMenuName('settings.menu.integrations'), href: route('settings.integrations'), icon: Plug, active: url.startsWith('/settings/integrations'), permission: 'settings.integrations.view' },
        { name: getTranslatedMenuName('settings.menu.hs_codes') !== 'settings.menu.hs_codes' ? getTranslatedMenuName('settings.menu.hs_codes') : 'HS Codes', href: route('settings.hs-codes.index'), icon: BookOpen, active: url.startsWith('/settings/hs-codes'), permission: 'settings.hs-codes.view' },
        { name: getTranslatedMenuName('settings.menu.shipping_config'), href: route('settings.shipping-config'), icon: Package, active: url.startsWith('/settings/shipping-config'), permission: 'settings.shipping-config.view' },
        { name: getTranslatedMenuName('settings.menu.lockers'), href: route('settings.lockers'), icon: Inbox, active: url.startsWith('/settings/lockers'), permission: 'settings.company.view' },
        { name: getTranslatedMenuName('settings.menu.tracking'), href: route('settings.tracking'), icon: Hash, active: url.startsWith('/settings/tracking'), permission: 'settings.tracking.view' },
        { name: getTranslatedMenuName('settings.menu.billing'), href: route('settings.billing'), icon: Receipt, active: url.startsWith('/settings/billing'), permission: 'settings.billing.view' },
        { name: getTranslatedMenuName('settings.menu.audit'), href: route('settings.audit'), icon: FileClock, active: url.startsWith('/settings/audit'), permission: 'settings.audit.view' },
        { name: getTranslatedMenuName('settings.menu.maintenance'), href: route('settings.maintenance'), icon: Database, active: url.startsWith('/settings/maintenance'), permission: 'settings.maintenance.view' },
        { name: getTranslatedMenuName('settings.menu.updates') !== 'settings.menu.updates' ? getTranslatedMenuName('settings.menu.updates') : 'Updates', href: route('settings.updates'), icon: ArrowUpCircle, active: url.startsWith('/settings/updates'), permission: '__all__' },
    ].filter(item => {
        if (item.permission === '__all__') return true;   // visible to every authenticated user
        return hasPermission(item.permission);
    });

    const currentItem = menuItems.find(item => item.active) || menuItems[0] || { name: '', href: '#', icon: Building2 };

    const handleMobileNavigate = (value: string) => {
        router.visit(value);
    };

    return (
        <AuthenticatedLayout>
            <Head title={title} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{getTranslatedMenuName('topbar.settings')}</h1>
                    <p className="text-gray-500 mt-1">{getTranslatedMenuName('settings.desc') !== 'settings.desc' ? getTranslatedMenuName('settings.desc') : "Manage your organization preferences and system configuration."}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-64 shrink-0 space-y-4">

                        {/* Mobile Navigation (Select) */}
                        <div className="lg:hidden sticky top-4 z-20 bg-gray-50/95 backdrop-blur py-2">
                            <Select value={currentItem.href} onValueChange={handleMobileNavigate}>
                                <SelectTrigger className="w-full bg-white border-gray-200">
                                    <SelectValue placeholder={t('forms.select')}>
                                        <div className="flex items-center gap-2">
                                            {(() => { const Icon = currentItem.icon; return Icon ? <Icon className="h-4 w-4 text-primary" /> : null; })()}
                                            {currentItem.name}
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {menuItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <SelectItem key={item.href} value={item.href}>
                                                <div className="flex items-center gap-2">
                                                    {ItemIcon ? <ItemIcon className="h-4 w-4 text-gray-500" /> : null}
                                                    {item.name}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex flex-col space-y-1">
                            {menuItems.map((item) => {
                                const NavIcon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-r-lg transition-all relative overflow-hidden",
                                            item.active
                                                ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {item.active && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand-primary)]" />
                                        )}
                                        {NavIcon ? <NavIcon className={cn(
                                            "h-4 w-4 transition-colors",
                                            item.active ? "text-[var(--brand-primary)]" : "text-muted-foreground group-hover:text-foreground"
                                        )} /> : null}
                                        {item.name}
                                    </Link>
                                );
                            })}
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
