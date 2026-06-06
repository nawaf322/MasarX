import { useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/Components/UI/button";
import { Badge } from "@/Components/UI/badge";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/UI/dialog";
import { SearchableSelect } from "@/Components/UI/searchable-select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Trash2, Edit2, MoreHorizontal, ShieldAlert, ShieldCheck, Shield, Users as UsersIcon, Send, Copy, Check, Eye, EyeOff, RefreshCw, Mail, KeyRound } from "lucide-react";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsTable } from './_components/SettingsTable';

function isSuperAdmin(user: { roles?: { name?: string }[] } | null | undefined): boolean {
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some((r) => String(r?.name ?? '').toLowerCase().replace(/\s+/g, '-') === 'super-admin');
}

const emptyUserForm = () => ({
    name: '',
    email: '',
    document_id: '',
    role: '',
    branch_id: '',
    department_id: '',
    password_mode: 'invite' as 'invite' | 'manual',
    password: '',
    password_confirmation: '',
});

function getPasswordStrength(pw: string): { score: number; labelKey: string; color: string } {
    if (!pw) return { score: 0, labelKey: '', color: '' };
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { score, labelKey: 'settings.users.password_strength_weak',       color: 'bg-red-500' };
    if (score === 3) return { score, labelKey: 'settings.users.password_strength_fair',       color: 'bg-orange-400' };
    if (score === 4) return { score, labelKey: 'settings.users.password_strength_good',       color: 'bg-yellow-400' };
    if (score === 5) return { score, labelKey: 'settings.users.password_strength_strong',     color: 'bg-emerald-400' };
    return              { score, labelKey: 'settings.users.password_strength_very_strong', color: 'bg-emerald-600' };
}

function generateSecurePassword(): string {
    const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower  = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const syms   = '!@#$%&*?';
    const all    = upper + lower + digits + syms;
    const arr = crypto.getRandomValues(new Uint8Array(16));
    let pw = upper[arr[0] % upper.length] + lower[arr[1] % lower.length]
           + digits[arr[2] % digits.length] + syms[arr[3] % syms.length];
    for (let i = 4; i < 16; i++) pw += all[arr[i] % all.length];
    return pw.split('').sort(() => Math.random() - 0.5).join('');
}

const emptyPasswordForm = () => ({ password: '', password_confirmation: '' });

export default function Users({
    users = [],
    roles = [],
    branches = [],
    departments = [],
    meta = { current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0 },
}: {
    users?: any[];
    roles?: any[];
    branches?: any[];
    departments?: any[];
    meta?: { current_page: number; last_page: number; per_page: number; total: number; from?: number; to?: number };
}) {
    const userList = Array.isArray(users) ? users : [];
    const roleList = Array.isArray(roles) ? roles : [];
    const branchList = Array.isArray(branches) ? branches : [];
    const departmentList = Array.isArray(departments) ? departments : [];
    const pageProps = usePage().props as any;
    const authUserId = pageProps?.auth?.user?.id ?? null;
    const authRoles: string[] = (pageProps?.auth?.roles ?? []).map((r: any) => String(r ?? '').toLowerCase());
    const authIsSuperAdmin = authRoles.includes('super-admin');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [resetUser, setResetUser] = useState<any>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [invitationUrl, setInvitationUrl] = useState<string | undefined>(undefined);
    const [invitationWarning, setInvitationWarning] = useState<string | undefined>(undefined);

    const [formData, setFormData] = useState(emptyUserForm());
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formLoading, setFormLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedPw, setCopiedPw] = useState(false);

    const [passwordData, setPasswordData] = useState(emptyPasswordForm());
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const swal = useSweetAlert();
    const { t } = useTranslation();

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData(emptyUserForm());
        setFormErrors({});
        setShowPassword(false);
        setCopiedPw(false);
        setIsModalOpen(true);
    };

    const handleGeneratePassword = () => {
        const pw = generateSecurePassword();
        setFormData(p => ({ ...p, password: pw, password_confirmation: pw }));
        setShowPassword(true);
        navigator.clipboard.writeText(pw).then(() => {
            setCopiedPw(true);
            setTimeout(() => setCopiedPw(false), 2000);
        });
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormErrors({});
        const r = user?.roles;
        const roleName = Array.isArray(r) && r[0]?.name ? r[0].name : '';
        setFormData({
            name: user?.name ?? '',
            email: user?.email ?? '',
            document_id: user?.document_id ?? '',
            role: roleName,
            branch_id: user?.branch_id != null ? String(user.branch_id) : '',
            department_id: user?.department_id != null ? String(user.department_id) : '',
        });
        setIsModalOpen(true);
    };

    const resendInvitation = async (user: any) => {
        if (!user?.id) return;
        setActionLoading(p => ({ ...p, ['resend_' + user.id]: true }));
        try {
            const { data } = await axios.post(route('settings.users.resend-invitation', user.id));
            swal.toast(t('settings.users.invitation_resent'), 'success');
            if (data?.invitation_url) {
                setInvitationUrl(data.invitation_url);
                setInvitationWarning(data.warning);
            }
            router.reload({ only: ['users'] });
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || t('settings.users.could_not_resend');
            swal.toast(msg, 'error');
        } finally {
            setActionLoading(p => ({ ...p, ['resend_' + user.id]: false }));
        }
    };

    const copyInvitationUrl = () => {
        if (invitationUrl) {
            navigator.clipboard.writeText(invitationUrl).then(() => {
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
            });
        }
    };

    const openResetModal = (user: any) => {
        setResetUser(user);
        setPasswordData(emptyPasswordForm());
        setPasswordErrors({});
        setIsResetModalOpen(true);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});
        setFormLoading(true);
        try {
            let data;
            if (editingUser) {
                const { password_mode, password, password_confirmation, ...editPayload } = formData;
                data = (await axios.patch(route('settings.users.update', editingUser.id), editPayload)).data;
                swal.toast(t('settings.users.user_updated'), 'success');
            } else {
                const payload: Record<string, any> = {
                    name: formData.name,
                    email: formData.email,
                    document_id: formData.document_id,
                    role: formData.role,
                    branch_id: formData.branch_id,
                    department_id: formData.department_id,
                };
                if (formData.password_mode === 'manual') {
                    payload.password = formData.password;
                    payload.password_confirmation = formData.password_confirmation;
                }
                data = (await axios.post(route('settings.users.store'), payload)).data;
                swal.toast(t('settings.users.user_invited'), 'success');
                if (data?.invitation_url) {
                    setInvitationUrl(data.invitation_url);
                    setInvitationWarning(data.warning);
                }
            }
            setIsModalOpen(false);
            setFormData(emptyUserForm());
            router.reload({ only: ['users', 'meta'] });
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setFormErrors(mapped);
            }
        } finally {
            setFormLoading(false);
        }
    };

    const submitReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetUser?.id) return;
        setPasswordErrors({});
        setPasswordLoading(true);
        try {
            const { data } = await axios.put(route('settings.users.password.reset', resetUser.id), passwordData);
            setIsResetModalOpen(false);
            setResetUser(null);
            swal.toast(t('settings.users.password_updated'), 'success');
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setPasswordErrors(mapped);
            }
            const msg = errs
                ? Object.values(errs).flat().join(' ')
                : err?.response?.data?.error || err?.response?.data?.message || t('settings.users.could_not_reset_password');
            swal.toast(msg, 'error');
        } finally {
            setPasswordLoading(false);
        }
    };

    const deleteUser = (user: any) => {
        if (!user?.id) return;
        swal.confirm(
            t('settings.users.delete_user_confirm'),
            t('settings.users.delete_user_msg', { name: user.name ?? 'this user' }),
            t('settings.users.confirm_delete_btn')
        ).then(async (ok) => {
            if (!ok) return;
            setActionLoading(p => ({ ...p, ['delete_' + user.id]: true }));
            try {
                const { data } = await axios.delete(route('settings.users.destroy', user.id));
                swal.toast(t('settings.users.user_deleted'), 'success');
                router.reload({ only: ['users', 'meta'] });
            } catch (err: any) {
                const msg = err?.response?.data?.error || err?.response?.data?.message || t('settings.users.could_not_delete_user');
                swal.toast(msg, 'error');
            } finally {
                setActionLoading(p => ({ ...p, ['delete_' + user.id]: false }));
            }
        });
    };

    const getTranslatedHeader = (key: string) => {
        const translated = t(key);
        return translated !== key ? translated : key;
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: getTranslatedHeader('common.users'),
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div>
                        <p className="font-medium text-gray-900">{user.name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{user.email ?? '—'}</p>
                    </div>
                );
            }
        },
        {
            accessorKey: "roles",
            header: getTranslatedHeader('settings.users.role'),
            cell: ({ row }) => {
                const user = row.original;
                const roleName = (user.roles && user.roles[0]?.name) ? user.roles[0].name : '—';
                return <span className="text-sm text-gray-600">{roleName}</span>;
            }
        },
        {
            accessorKey: "two_factor",
            header: "2FA",
            cell: ({ row }) => {
                const user = row.original;
                const isEnabled = !!(user.two_factor_confirmed_at || user.two_factor_secret);
                return isEnabled ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                    <Shield className="h-4 w-4 text-gray-300" />
                );
            }
        },
        {
            accessorKey: "is_active",
            header: getTranslatedHeader('common.status'),
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "branch",
            header: getTranslatedHeader('settings.users.branch'),
            cell: ({ row }) => {
                const user = row.original;
                return <span className="text-sm text-gray-500">{user.branch?.name ?? user.city ?? 'HQ'}</span>;
            }
        },
        ...(departmentList.length > 0 ? [{
            accessorKey: "department",
            header: getTranslatedHeader('settings.users.department'),
            cell: ({ row }: any) => {
                const user = row.original;
                return <span className="text-sm text-gray-500">{user.department?.name ?? '—'}</span>;
            }
        }] : []),
        {
            accessorKey: "last_login_at",
            header: getTranslatedHeader('settings.users.last_login'),
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <span className="text-sm text-gray-500">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : t('settings.users.never')}
                    </span>
                );
            }
        },
        {
            id: "actions",
            header: getTranslatedHeader('common.actions'),
            cell: ({ row }) => {
                const user = row.original;
                const isSelf = user.id === authUserId;
                const targetIsSuperAdmin = isSuperAdmin(user);
                const canDelete = !isSelf && !targetIsSuperAdmin;

                const isPending = !user.invitation_accepted_at && !!user.invitation_token;

                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 rounded-full">
                                    <span className="sr-only">{t('settings.branches.open_menu')}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px]">
                                <DropdownMenuItem onClick={() => openEditModal(user)} className="cursor-pointer">
                                    <Edit2 className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                    {t('settings.users.edit_details')}
                                </DropdownMenuItem>
                                {isPending ? (
                                    <DropdownMenuItem onClick={() => resendInvitation(user)} className="cursor-pointer">
                                        <Send className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                                        {t('settings.users.resend_invitation')}
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => openResetModal(user)} className="cursor-pointer">
                                        <ShieldAlert className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                        {t('settings.users.reset_password')}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => canDelete && deleteUser(user)}
                                    disabled={!canDelete}
                                    className={!canDelete ? 'opacity-50 cursor-not-allowed' : 'text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer'}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {t('settings.users.delete_user_action')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        }
    ];

    const getTranslated = (key: string) => {
        const translated = t(key);
        return translated !== key ? translated : key;
    };

    return (
        <SettingsLayout title={getTranslated('settings.users.title')}>
            {/* Invitation URL banner — shown when SMTP is not configured */}
            {invitationUrl && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                        {invitationWarning ?? t('settings.users.invitation_url_copy_hint')}
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={invitationUrl}
                            className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-gray-700 font-mono truncate"
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={copyInvitationUrl}
                            className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                            {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            )}

            <SettingsTable
                title={getTranslated('settings.users.table_title')}
                description={getTranslated('settings.users.table_description')}
                actionLabel={getTranslated('settings.users.invite_user')}
                onAction={openCreateModal}
                columns={columns}
                data={userList}
                searchKey="name"
                searchPlaceholder={getTranslated('settings.users.search_placeholder')}
                meta={meta}
            />

            <Dialog open={isModalOpen} onOpenChange={(open) => setIsModalOpen(open)}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{editingUser ? t('settings.users.edit_user') : t('settings.users.invite_user')}</DialogTitle>
                        <DialogDescription>
                            {editingUser ? t('settings.users.edit_subtitle') : t('settings.users.invite_subtitle')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('settings.users.full_name')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('settings.users.full_name')}
                                className={formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('settings.users.email_address')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                placeholder="john@example.com"
                                className={formErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="document_id">{t('settings.users.document_id')}</Label>
                            <Input
                                id="document_id"
                                value={formData.document_id || ''}
                                onChange={(e) => setFormData(p => ({ ...p, document_id: e.target.value }))}
                                placeholder={t('settings.users.document_id_placeholder')}
                                className={formErrors.document_id ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {formErrors.document_id && <p className="text-red-500 text-xs">{formErrors.document_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branch_id">{t('settings.users.branch')}</Label>
                            <SearchableSelect
                                value={formData.branch_id || ''}
                                onChange={(val) => setFormData(p => ({ ...p, branch_id: val }))}
                                placeholder={t('settings.users.select_branch')}
                                searchPlaceholder={t('common.search') + ' ' + t('settings.users.branch').toLowerCase() + '...'}
                                options={[
                                    { value: '', label: '—' },
                                    ...branchList.map((b: any) => ({ value: String(b.id), label: b.name })),
                                ]}
                            />
                        </div>
                        {departmentList.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="department_id">{t('settings.users.department')}</Label>
                            <SearchableSelect
                                value={formData.department_id || ''}
                                onChange={(val) => setFormData(p => ({ ...p, department_id: val }))}
                                placeholder={t('settings.users.select_department')}
                                searchPlaceholder={t('common.search') + ' ' + t('settings.users.department').toLowerCase() + '...'}
                                options={[
                                    { value: '', label: '—' },
                                    ...departmentList.map((d: any) => ({ value: String(d.id), label: d.name })),
                                ]}
                            />
                        </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="role">{t('settings.users.role')} <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                                value={formData.role || ''}
                                onChange={(val) => setFormData(p => ({ ...p, role: val }))}
                                placeholder={t('settings.users.select_role')}
                                searchPlaceholder={t('common.search') + ' ' + t('settings.users.role').toLowerCase() + '...'}
                                className={formErrors.role ? 'border-red-500 ring-red-500' : ''}
                                options={roleList.map((r: any) => ({ value: r.name, label: r.name }))}
                            />
                            {formErrors.role && <p className="text-red-500 text-xs">{formErrors.role}</p>}
                        </div>
                        {!editingUser && (
                            <div className="space-y-3">
                                {/* Mode toggle */}
                                <div className="grid grid-cols-2 gap-2">
                                    {(['invite', 'manual'] as const).map((mode) => {
                                        const isActive = formData.password_mode === mode;
                                        const Icon = mode === 'invite' ? Mail : KeyRound;
                                        return (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, password_mode: mode, password: '', password_confirmation: '' }))}
                                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                                    isActive
                                                        ? 'border-primary bg-primary/5 text-primary font-medium'
                                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                {t(mode === 'invite' ? 'settings.users.password_mode_invite' : 'settings.users.password_mode_manual')}
                                            </button>
                                        );
                                    })}
                                </div>

                                {formData.password_mode === 'invite' ? (
                                    <p className="text-xs text-gray-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                        {t('settings.users.invite_email_hint')}
                                    </p>
                                ) : (
                                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        {/* Generate button */}
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm">{t('settings.users.new_password')}</Label>
                                            <button
                                                type="button"
                                                onClick={handleGeneratePassword}
                                                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                                            >
                                                {copiedPw
                                                    ? <><Check className="h-3 w-3" /> {t('settings.users.password_copied')}</>
                                                    : <><RefreshCw className="h-3 w-3" /> {t('settings.users.generate_password')}</>
                                                }
                                            </button>
                                        </div>

                                        {/* Password field */}
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password}
                                                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                                placeholder="••••••••"
                                                className={`pr-10 font-mono ${formErrors.password ? 'border-red-500' : ''}`}
                                                required={formData.password_mode === 'manual'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {formErrors.password && <p className="text-red-500 text-xs">{formErrors.password}</p>}

                                        {/* Strength bar */}
                                        {formData.password && (() => {
                                            const { score, labelKey, color } = getPasswordStrength(formData.password);
                                            return (
                                                <div className="space-y-1">
                                                    <div className="flex gap-1">
                                                        {[1,2,3,4,5,6].map(i => (
                                                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? color : 'bg-gray-200'}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-500">{t(labelKey)}</p>
                                                </div>
                                            );
                                        })()}

                                        {/* Confirm */}
                                        <div className="space-y-1">
                                            <Label className="text-sm">{t('settings.users.confirm_password_reset')}</Label>
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password_confirmation}
                                                onChange={(e) => setFormData(p => ({ ...p, password_confirmation: e.target.value }))}
                                                placeholder="••••••••"
                                                className={`font-mono ${formData.password && formData.password_confirmation && formData.password !== formData.password_confirmation ? 'border-red-400' : ''}`}
                                                required={formData.password_mode === 'manual'}
                                            />
                                            {formData.password && formData.password_confirmation && formData.password !== formData.password_confirmation && (
                                                <p className="text-red-500 text-xs">Passwords do not match</p>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-400">{t('settings.users.manual_password_hint')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        </div>{/* end scrollable body */}
                        <DialogFooter className="pt-3 shrink-0 border-t mt-2">
                            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setFormErrors({}); }}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={formLoading} className="bg-primary hover:bg-primary/90">
                                {formLoading
                                    ? t('settings.users.saving')
                                    : editingUser
                                        ? t('settings.users.save_changes')
                                        : formData.password_mode === 'manual'
                                            ? t('settings.users.create_user')
                                            : t('settings.users.send_invite')
                                }
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{t('settings.users.reset_password')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.users.reset_subtitle', { name: resetUser?.name ?? 'user' })}
                            <br /><span className="text-red-500 text-xs">{t('settings.users.reset_warning')}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReset} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">{t('settings.users.new_password')}</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={passwordData.password}
                                onChange={(e) => setPasswordData(p => ({ ...p, password: e.target.value }))}
                                placeholder="••••••••"
                                required
                            />
                            {passwordErrors.password && <p className="text-red-500 text-xs">{passwordErrors.password}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-new-password">{t('settings.users.confirm_password_reset')}</Label>
                            <Input
                                id="confirm-new-password"
                                type="password"
                                value={passwordData.password_confirmation}
                                onChange={(e) => setPasswordData(p => ({ ...p, password_confirmation: e.target.value }))}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsResetModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={passwordLoading} className="bg-destructive hover:bg-destructive/90 text-white">
                                {passwordLoading ? t('settings.users.resetting') : t('settings.users.reset_password')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SettingsLayout>
    );
}
