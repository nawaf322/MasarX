import { useState, Fragment, useMemo } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { Checkbox } from "@/Components/UI/checkbox";
import { Badge } from "@/Components/UI/badge";
import {
    Shield, ShieldCheck, Briefcase, Truck, User, Lock,
    Loader2, Search, ChevronDown, ChevronRight,
} from "lucide-react";
import { SettingsShell } from './_components/SettingsShell';
import { useTranslation } from '@/hooks/useTranslation';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

/* ─── helpers ─────────────────────────────────────────────────────────── */

function isSuperAdmin(role: { name: string }): boolean {
    return role.name.toLowerCase().replace(/\s+/g, '-') === 'super-admin';
}

function roleDisplayName(role: { name: string }, t: (k: string) => string): string {
    const key = `roles.${role.name.toLowerCase().replace(/\s+/g, '-')}`;
    const tr = t(key);
    return tr !== key ? tr : role.name;
}

const ROLE_PALETTE: Record<string, { bg: string; icon: string; badge: string; ring: string; bar: string }> = {
    'super-admin': { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 border-violet-200', ring: 'ring-violet-300', bar: 'bg-violet-500' },
    'admin':       { bg: 'bg-blue-50 dark:bg-blue-950/30',   icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   ring: 'ring-blue-300',   bar: 'bg-blue-500' },
    'employee':    { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', ring: 'ring-emerald-300', bar: 'bg-emerald-500' },
    'driver':      { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200', ring: 'ring-amber-300', bar: 'bg-amber-500' },
    'customer':    { bg: 'bg-rose-50 dark:bg-rose-950/30',   icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',   badge: 'bg-rose-100 text-rose-700 border-rose-200',   ring: 'ring-rose-300',   bar: 'bg-rose-500' },
};
const DEFAULT_PALETTE = { bg: 'bg-slate-50 dark:bg-slate-900/30', icon: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200', ring: 'ring-slate-300', bar: 'bg-slate-500' };

function rolePalette(role: { name: string }) {
    const key = role.name.toLowerCase().replace(/\s+/g, '-');
    return ROLE_PALETTE[key] ?? DEFAULT_PALETTE;
}

function getRoleIcon(role: { name: string }) {
    const n = role.name.toLowerCase().replace(/\s+/g, '-');
    if (n === 'super-admin') return Shield;
    if (n === 'admin')       return ShieldCheck;
    if (n === 'employee')    return Briefcase;
    if (n === 'driver')      return Truck;
    return User;
}

function getGroupLabel(group: string, t: (k: string) => string): string {
    const key = `roles.groups.${group.replace(/\s*-\s*/g, '_').replace(/\s*&\s*/g, '_').replace(/\s+/g, '_')}`;
    const tr = t(key);
    return tr !== key ? tr : group;
}

function getPermissionLabel(perm: { name: string }, t: (k: string) => string): string {
    const key = `permissions.${perm.name}`;
    const tr = t(key);
    return tr !== key ? tr : perm.name.replace(/\./g, ' ').replace(/_/g, ' ');
}

/* ─── component ───────────────────────────────────────────────────────── */

export default function Roles({
    roles,
    permissions,
    totalPermissions = 0,
}: {
    roles: any[];
    permissions: Record<string, any[]>;
    totalPermissions?: number;
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const { props } = usePage();
    const authRoles: string[] = (props as any).auth?.roles ?? [];
    const currentUserIsSuperAdmin = authRoles.includes('super-admin');
    const [processingRole, setProcessingRole] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const allPerms  = useMemo(() => Object.values(permissions).flat(), [permissions]);
    const totalCount = totalPermissions > 0 ? totalPermissions : allPerms.length;

    /* ── filter permissions by search ── */
    const filteredGroups = useMemo(() => {
        if (!search.trim()) return permissions;
        const q = search.toLowerCase();
        const result: Record<string, any[]> = {};
        for (const [group, perms] of Object.entries(permissions)) {
            const filtered = perms.filter(p =>
                getPermissionLabel(p, t).toLowerCase().includes(q) ||
                group.toLowerCase().includes(q)
            );
            if (filtered.length) result[group] = filtered;
        }
        return result;
    }, [permissions, search, t]);

    const toggleGroup = (group: string) =>
        setCollapsed(prev => ({ ...prev, [group]: !prev[group] }));

    const isRoleLocked = (role: any) =>
        isSuperAdmin(role) || (role.name === 'admin' && !currentUserIsSuperAdmin);

    const togglePermission = async (role: any, permId: number, has: boolean) => {
        if (isRoleLocked(role)) {
            alert.error(t('common.error_title'),
                isSuperAdmin(role) ? t('roles.super_admin_locked') : t('roles.admin_locked'));
            return;
        }
        setProcessingRole(role.id);
        const permName = allPerms.find((p: any) => p.id === permId)?.name;
        if (!permName) { setProcessingRole(null); return; }

        const current: string[] = role.permissions.map((p: any) => p.name);
        const next = has ? current.filter(p => p !== permName) : [...current, permName];

        try {
            const { data } = await axios.put(route('settings.roles.update', role.id), { permissions: next });
            alert.success(t('roles.update_success'));
            // Update local role permissions optimistically already toggled; reload to sync
            window.location.reload();
        } catch (err: any) {
            alert.error(t('common.error_title'), t('roles.update_failed'));
        } finally {
            setProcessingRole(null);
        }
    };

    return (
        <SettingsLayout title={t('settings.menu.roles')}>
            <SettingsShell
                title={t('settings.menu.roles')}
                description={t('roles.description')}
            >

                {/* ── Role cards ─────────────────────────────────────────── */}
                <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {roles.map(role => {
                        const count   = isSuperAdmin(role) ? totalCount : (role.permissions?.length ?? 0);
                        const pct     = totalCount ? Math.round((count / totalCount) * 100) : 0;
                        const pal     = rolePalette(role);
                        const Icon    = getRoleIcon(role);
                        const isSuper  = isSuperAdmin(role);
                        const isLocked = isRoleLocked(role);

                        return (
                            <div
                                key={role.id}
                                className={`relative flex flex-col items-center rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${pal.bg} ${isLocked ? `ring-2 ${pal.ring}` : 'border-border/60'}`}
                            >
                                {/* icon */}
                                <div className={`flex items-center justify-center w-12 h-12 rounded-2xl mb-3 ${pal.icon}`}>
                                    <Icon className="h-6 w-6" />
                                </div>

                                {/* name */}
                                <span className="font-semibold text-sm text-foreground truncate w-full text-center mb-1" title={role.name}>
                                    {roleDisplayName(role, t)}
                                </span>

                                {/* count */}
                                <span className="text-xs text-muted-foreground mb-3 tabular-nums">
                                    {isSuper ? t('roles.all_permissions') : `${count} / ${totalCount}`}
                                </span>

                                {/* progress bar */}
                                <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${pal.bar}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="mt-1 text-[10px] text-muted-foreground tabular-nums">{pct}%</span>

                                {isLocked && (
                                    <Lock className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                                )}
                            </div>
                        );
                    })}
                </section>

                {/* ── Search bar ─────────────────────────────────────────── */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('roles.search_permissions')}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </div>

                {/* ── Permissions matrix ─────────────────────────────────── */}
                <section className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">

                            {/* ── thead ── */}
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="sticky left-0 z-20 bg-muted/50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border w-64 min-w-[16rem]">
                                        {t('roles.feature')}
                                    </th>
                                    {roles.map(role => {
                                        const Icon  = getRoleIcon(role);
                                        const pal   = rolePalette(role);
                                        const count = isSuperAdmin(role) ? totalCount : (role.permissions?.length ?? 0);
                                        const pct   = totalCount ? Math.round((count / totalCount) * 100) : 0;
                                        return (
                                            <th key={role.id} className="px-4 py-4 text-center min-w-[120px]">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${pal.icon}`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-foreground">{roleDisplayName(role, t)}</span>
                                                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                                                        <div className={`h-full rounded-full ${pal.bar}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] tabular-nums text-muted-foreground">{count}/{totalCount}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            {/* ── tbody ── */}
                            <tbody>
                                {Object.keys(filteredGroups).length === 0 ? (
                                    <tr>
                                        <td colSpan={roles.length + 1} className="text-center py-12 text-muted-foreground text-sm">
                                            {t('roles.no_results') || 'No se encontraron permisos'}
                                        </td>
                                    </tr>
                                ) : (
                                    Object.entries(filteredGroups).map(([group, perms]) => {
                                        const isCollapsed = collapsed[group];
                                        return (
                                            <Fragment key={group}>
                                                {/* group header row */}
                                                <tr
                                                    className="bg-muted/30 border-y border-border cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                                    onClick={() => toggleGroup(group)}
                                                >
                                                    <td
                                                        colSpan={roles.length + 1}
                                                        className="sticky left-0 z-10 bg-muted/30 px-5 py-2.5"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isCollapsed
                                                                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            }
                                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                {getGroupLabel(group, t)}
                                                            </span>
                                                            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                                                                {perms.length}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* permission rows */}
                                                {!isCollapsed && perms.map((perm: any, idx: number) => (
                                                    <tr
                                                        key={perm.id}
                                                        className={`border-b border-border/50 transition-colors hover:bg-primary/5 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                                                    >
                                                        {/* permission name */}
                                                        <td className="sticky left-0 z-10 bg-inherit px-5 py-3 font-medium text-foreground border-r border-border/50 text-sm">
                                                            {getPermissionLabel(perm, t)}
                                                        </td>

                                                        {/* checkboxes */}
                                                        {roles.map(role => {
                                                            const has        = role.permissions.some((p: any) => p.id === perm.id) || isSuperAdmin(role);
                                                            const isLocked   = isRoleLocked(role);
                                                            const isProcessing = processingRole === role.id;
                                                            const pal        = rolePalette(role);

                                                            return (
                                                                <td key={role.id} className="px-4 py-3 text-center">
                                                                    <div className="flex justify-center items-center">
                                                                        {isProcessing ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                                        ) : isLocked ? (
                                                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${pal.icon}`}>
                                                                                <Lock className="h-3 w-3" />
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => togglePermission(role, perm.id, has)}
                                                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                                                                    has
                                                                                        ? `${pal.bar} border-transparent`
                                                                                        : 'border-border bg-background hover:border-primary/50'
                                                                                }`}
                                                                                aria-label={`${has ? 'Remove' : 'Add'} ${perm.name} for ${role.name}`}
                                                                            >
                                                                                {has && (
                                                                                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                                                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                                    </svg>
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </SettingsShell>
        </SettingsLayout>
    );
}
