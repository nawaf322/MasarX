import { LucideIcon, LayoutDashboard, Package, MapPin, Calculator, Warehouse, Truck, Users, CreditCard, Settings, BarChart2, DollarSign, Banknote, Upload, RotateCcw, ClipboardCheck, Inbox, BookUser } from "lucide-react";
// FileText, BadgeDollarSign removed — Contracts and Commissions are Premium features

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    activePattern: string;
    permission?: string;
    feature?: string;
}

export interface NavSection {
    title?: string;
    items: NavItem[];
}

export const navConfig: NavSection[] = [
    {
        title: "MAIN",
        items: [
            { title: 'Dashboard', href: 'dashboard', icon: LayoutDashboard, activePattern: '/dashboard', permission: 'view dashboard' },
            { title: 'Shipments', href: 'shipments.index', icon: Package, activePattern: '/shipments', permission: 'shipments.view' },
            { title: 'Tracking', href: 'tracking.index', icon: MapPin, activePattern: '/tracking', permission: 'tracking.view' },
            { title: 'Rates', href: 'rates.index', icon: Calculator, activePattern: '/rates', permission: 'settings.pricing.view' },
            { title: 'Locations', href: 'locations.countries.index', icon: MapPin, activePattern: '/locations', permission: 'locations.view' },
        ],
    },
    {
        title: "OPERATIONS",
        items: [
            { title: 'Warehouse', href: 'warehouse.index', icon: Warehouse, activePattern: '/warehouse', permission: 'warehouse.access' },
            { title: 'Dispatch', href: 'dispatch.index', icon: Truck, activePattern: '/dispatch', permission: 'dispatch.view' },
            { title: 'Pickups', href: 'pickups.index', icon: ClipboardCheck, activePattern: '/pickups', permission: 'pickups.view' },
            { title: 'Lockers', href: 'lockers.index', icon: Inbox, activePattern: '/lockers', permission: 'lockers.view' },
            { title: 'Pre-Alerts', href: 'pre-alerts.index', icon: Package, activePattern: '/pre-alerts', permission: 'pre-alerts.view' },
            { title: 'My-Locker', href: 'my-locker.index', icon: Inbox, activePattern: '/my-locker', permission: 'customer.portal' },
            { title: 'My-Contacts', href: 'my-contacts.index', icon: BookUser, activePattern: '/my-contacts', permission: 'customer.portal' },
            { title: 'Customers', href: 'customers.index', icon: Users, activePattern: '/customers', permission: 'customers.access' },
            // { title: 'Contracts', href: 'contracts.index', icon: FileText, activePattern: '/contracts', permission: 'contracts.view', feature: 'contracts' }, // PREMIUM — disabled in Envato edition
            { title: 'Billing', href: 'billing.index', icon: CreditCard, activePattern: '/billing', permission: 'settings.billing.view' },
            // { title: 'Commissions', href: 'commissions.index', icon: BadgeDollarSign, activePattern: '/commissions', permission: 'commissions.view', feature: 'commissions' }, // PREMIUM — disabled in Envato edition
            { title: 'Finance', href: 'finance.index', icon: DollarSign, activePattern: '/finance', permission: 'finance.view', feature: 'finance_dashboard' },
            { title: 'Reports', href: 'reports.financial', icon: BarChart2, activePattern: '/reports', permission: 'reports.financial.view' },
            { title: 'Returns', href: 'returns.index', icon: RotateCcw, activePattern: '/returns', permission: 'returns.view' },
            { title: 'COD', href: 'cod.index', icon: Banknote, activePattern: '/cod', permission: 'cod.view' },
            { title: 'Import', href: 'import.index', icon: Upload, activePattern: '/import', permission: 'shipments.import' },
        ],
    },
    {
        title: "OTHERS",
        items: [
            { title: 'Settings', href: 'settings.index', icon: Settings, activePattern: '/settings', permission: 'settings.company.view' },
        ]
    },
];
