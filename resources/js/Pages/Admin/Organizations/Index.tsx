import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Badge } from '@/Components/UI/badge';
import { Card, CardContent } from '@/Components/UI/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/Components/UI/dropdown-menu';
import {
    Building2, Plus, Search, MoreHorizontal, ToggleLeft, ToggleRight,
    Eye, Edit, Users, Package, CheckCircle2, XCircle, CalendarPlus,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface Organization {
    id: number;
    name: string;
    slug: string;
    email?: string;
    logo_url?: string;
    primary_color?: string;
    is_active: boolean;
    created_at?: string;
    users_count?: number;
    shipments_count?: number;
}

interface Paginator {
    data: Organization[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

/** Avatar con inicial y color — no usa img para evitar imágenes rotas en tabla */
function OrgAvatar({ org }: { org: Organization }) {
    const bg = org.primary_color || '#6366f1';
    return (
        <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none"
            style={{ backgroundColor: bg }}
        >
            {org.name.charAt(0).toUpperCase()}
        </div>
    );
}

export default function Index({ organizations, stats, filters }: {
    organizations: Paginator;
    stats: { total: number; active: number; inactive: number; created_this_month: number };
    filters: { search?: string; status?: string };
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.organizations.index'), { ...filters, ...overrides, page: '1' }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const goToPage = (page: number) => {
        router.get(route('admin.organizations.index'), { ...filters, page: String(page) }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const clearFilters = () => {
        setSearch('');
        applyFilters({ search: '', status: 'all' });
    };

    const toggleStatus = (org: Organization) => {
        const confirmKey = org.is_active ? 'organizations.confirm_deactivate' : 'organizations.confirm_activate';
        alert.confirm(t('organizations.toggle_status'), t(confirmKey)).then((confirmed) => {
            if (confirmed) {
                router.post(route('admin.organizations.toggle-status', org.id), {}, { preserveScroll: true });
            }
        });
    };

    const impersonate = (org: Organization) => {
        router.get(route('admin.organizations.impersonate', org.id));
    };

    const hasActiveFilters = !!(filters.search || (filters.status && filters.status !== 'all'));

    const { current_page, last_page, from, to, total } = organizations;

    // Genera rango de páginas con elipsis
    const buildPageRange = (): (number | '…')[] => {
        if (last_page <= 1) return [];
        const pages: (number | '…')[] = [];
        const delta = 2;
        let prev = 0;
        for (let i = 1; i <= last_page; i++) {
            if (i === 1 || i === last_page || (i >= current_page - delta && i <= current_page + delta)) {
                if (prev && i - prev > 1) pages.push('…');
                pages.push(i);
                prev = i;
            }
        }
        return pages;
    };
    const pageRange = buildPageRange();

    const statCards = [
        {
            label: t('organizations.total'),
            value: stats.total,
            icon: Building2,
            textColor: 'text-foreground',
            iconBg: 'bg-muted/60',
            iconColor: 'text-muted-foreground',
        },
        {
            label: t('organizations.active_count'),
            value: stats.active,
            icon: CheckCircle2,
            textColor: 'text-green-700 dark:text-green-400',
            iconBg: 'bg-green-50 dark:bg-green-950/30',
            iconColor: 'text-green-600',
            border: 'border-green-100 dark:border-green-900/50',
        },
        {
            label: t('organizations.inactive_count'),
            value: stats.inactive,
            icon: XCircle,
            textColor: 'text-red-600 dark:text-red-400',
            iconBg: 'bg-red-50 dark:bg-red-950/30',
            iconColor: 'text-red-500',
            border: 'border-red-100 dark:border-red-900/50',
        },
        {
            label: t('organizations.created_this_month'),
            value: stats.created_this_month,
            icon: CalendarPlus,
            textColor: 'text-blue-700 dark:text-blue-400',
            iconBg: 'bg-blue-50 dark:bg-blue-950/30',
            iconColor: 'text-blue-600',
            border: 'border-blue-100 dark:border-blue-900/50',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={t('organizations.title')} />
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-primary" />
                            {t('organizations.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('organizations.subtitle')}</p>
                    </div>
                    <Link href={route('admin.organizations.create')}>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('organizations.create')}
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map(({ label, value, icon: Icon, textColor, iconBg, iconColor, border }) => (
                        <Card key={label} className={border ? `border ${border}` : ''}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                                        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                                        <Icon className={`h-5 w-5 ${iconColor}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('common.search')}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="outline">{t('common.search')}</Button>
                        {hasActiveFilters && (
                            <Button type="button" variant="ghost" onClick={clearFilters}>
                                {t('common.clear')}
                            </Button>
                        )}
                    </form>
                    <Select value={filters.status || 'all'} onValueChange={(v) => applyFilters({ status: v })}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder={t('common.all')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('common.all')}</SelectItem>
                            <SelectItem value="active">{t('organizations.active')}</SelectItem>
                            <SelectItem value="inactive">{t('organizations.inactive')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[35%]">{t('organizations.name')}</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('organizations.email')}</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell w-24">{t('organizations.users_count')}</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell w-24">{t('organizations.shipments_count')}</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell w-36">{t('organizations.created_at')}</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-28">{t('organizations.status')}</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {organizations.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-muted-foreground">{t('common.no_results')}</p>
                                    </td>
                                </tr>
                            ) : (
                                organizations.data?.map((org) => (
                                    <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                                        {/* Name + avatar */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <OrgAvatar org={org} />
                                                <div className="min-w-0">
                                                    <Link
                                                        href={route('admin.organizations.show', org.id)}
                                                        className="font-semibold text-foreground hover:text-primary transition-colors block truncate"
                                                    >
                                                        {org.name}
                                                    </Link>
                                                    <span className="text-xs text-muted-foreground font-mono truncate block">{org.slug}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">
                                            {org.email || '—'}
                                        </td>

                                        {/* Users */}
                                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                <Users className="h-3.5 w-3.5" />
                                                <span className="font-medium tabular-nums">{org.users_count ?? 0}</span>
                                            </span>
                                        </td>

                                        {/* Shipments */}
                                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                <Package className="h-3.5 w-3.5" />
                                                <span className="font-medium tabular-nums">{org.shipments_count ?? 0}</span>
                                            </span>
                                        </td>

                                        {/* Created */}
                                        <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                                            {org.created_at
                                                ? new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                : '—'}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3 text-center">
                                            <Badge
                                                className={`text-xs border whitespace-nowrap ${
                                                    org.is_active
                                                        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}
                                            >
                                                {org.is_active
                                                    ? <><CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" />{t('organizations.active')}</>
                                                    : <><XCircle className="h-2.5 w-2.5 mr-1 inline" />{t('organizations.inactive')}</>
                                                }
                                            </Badge>
                                        </td>

                                        {/* Actions — siempre visible */}
                                        <td className="px-4 py-3 text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('admin.organizations.show', org.id)} className="flex items-center gap-2 cursor-pointer">
                                                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {t('common.view')}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('admin.organizations.edit', org.id)} className="flex items-center gap-2 cursor-pointer">
                                                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {t('common.edit')}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {org.is_active && (
                                                        <DropdownMenuItem onClick={() => impersonate(org)} className="cursor-pointer">
                                                            <ToggleRight className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                                            {t('organizations.impersonate')}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => toggleStatus(org)}
                                                        className={`cursor-pointer ${org.is_active ? 'text-red-600 focus:text-red-600' : 'text-green-600 focus:text-green-600'}`}
                                                    >
                                                        {org.is_active
                                                            ? <><ToggleLeft className="h-3.5 w-3.5 mr-2" />{t('organizations.deactivate')}</>
                                                            : <><ToggleRight className="h-3.5 w-3.5 mr-2" />{t('organizations.activate')}</>
                                                        }
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Footer de paginación — siempre visible */}
                    <div className="px-4 py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">

                        {/* Izquierda: showing + rows per page */}
                        <div className="flex items-center gap-4">
                            <span>
                                {t('pagination.showing', {
                                    from: String(from ?? 0),
                                    to: String(to ?? 0),
                                    total: String(total),
                                })}
                            </span>
                            <span className="hidden sm:inline text-border">|</span>
                            <span className="hidden sm:flex items-center gap-2">
                                {t('pagination.rows_per_page')}:
                                <span className="font-medium text-foreground">{organizations.per_page}</span>
                            </span>
                        </div>

                        {/* Derecha: page X of Y + prev/next */}
                        <div className="flex items-center gap-2">
                            <span className="tabular-nums">
                                {t('pagination.page_of', {
                                    current: String(current_page),
                                    total: String(last_page),
                                })}
                            </span>

                            <div className="flex items-center gap-1 ml-2">
                                <Button variant="outline" size="icon" className="h-8 w-8"
                                    onClick={() => goToPage(current_page - 1)}
                                    disabled={current_page === 1}
                                    title={t('pagination.prev_page')}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                {pageRange.map((item, idx) =>
                                    item === '…' ? (
                                        <span key={`dots-${idx}`} className="px-1 select-none">…</span>
                                    ) : (
                                        <Button key={item}
                                            variant={item === current_page ? 'default' : 'outline'}
                                            className="h-8 w-8 p-0 text-sm"
                                            onClick={() => goToPage(item as number)}>
                                            {item}
                                        </Button>
                                    )
                                )}

                                <Button variant="outline" size="icon" className="h-8 w-8"
                                    onClick={() => goToPage(current_page + 1)}
                                    disabled={current_page === last_page}
                                    title={t('pagination.next_page')}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
