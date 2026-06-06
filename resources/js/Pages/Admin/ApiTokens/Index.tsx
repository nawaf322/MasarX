import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Plus, MoreHorizontal, Shield, Clock, ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/Components/UI/badge";
import { ProTable } from "@/Components/ProTable";
import { ColumnDef } from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Input } from "@/Components/UI/input";
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from 'react-i18next';

interface Token {
    id: number;
    name: string;
    last_used_at: string;
    created_at: string;
    expires_at?: string | null;
    status: 'Active' | 'Revoked';
    scopes: string[];
}

interface PageProps {
    tokens: { data: Token[]; meta: any };
    stats?: { total_requests_24h: number; error_rate_24h: number };
    filters: { search?: string };
    flash?: { token?: string; message?: string; success?: string; error?: string };
}

export default function Index({ tokens, stats, filters }: { tokens: { data: Token[], meta: any }, stats?: { total_requests_24h: number, error_rate_24h: number }, filters: { search?: string } }) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const { props } = usePage<any>();
    const flash = props.flash ?? {};
    const flashHandled = useRef(false);

    // Mostrar SweetAlert al volver del create con token
    useEffect(() => {
        if (flashHandled.current || !flash.token) return;
        flashHandled.current = true;
        const token = flash.token;
        const message = flash.message || t('api_tokens.token_created_message');
        const copyLabel = t('api_tokens.copy');
        const copiedLabel = t('api_tokens.copied');
        const closeLabel = t('api_tokens.close');
        Swal.fire({
            title: t('api_tokens.token_created_title'),
            html: `
                <p class="text-gray-600 mb-3">${message}</p>
                <div class="flex gap-2 items-center">
                    <input type="text" readonly id="swal-token-value" value="${String(token).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm bg-gray-50 w-full" />
                    <button type="button" id="swal-copy-btn" class="rounded bg-blue-600 text-white px-3 py-2 text-sm whitespace-nowrap">${copyLabel}</button>
                </div>
            `,
            icon: 'success',
            confirmButtonColor: '#3b82f6',
            showConfirmButton: true,
            confirmButtonText: closeLabel,
            didOpen: () => {
                const input = document.getElementById('swal-token-value') as HTMLInputElement;
                const btn = document.getElementById('swal-copy-btn');
                if (input && btn) {
                    btn.addEventListener('click', () => {
                        input.select();
                        navigator.clipboard.writeText(token);
                        btn.textContent = copiedLabel;
                        setTimeout(() => { btn.textContent = copyLabel; }, 2000);
                    });
                }
            },
        });
    }, [flash.token, flash.message, t]);

    const revokeToken = (tokenRow: Token) => {
        alert.confirm(
            t('api_tokens.revoke_confirm_title'),
            t('api_tokens.revoke_confirm_message', { name: tokenRow.name }),
            t('api_tokens.revoke_confirm_btn')
        ).then((confirmed) => {
            if (confirmed) {
                router.delete(route('api-tokens.destroy', tokenRow.id), {
                    preserveScroll: true,
                    onSuccess: () => alert.toast(t('api_tokens.revoked_toast'), 'success'),
                });
            }
        });
    };

    const showViewDetails = (tokenRow: Token) => {
        const scopes = Array.isArray(tokenRow.scopes) ? tokenRow.scopes : (tokenRow as any).abilities ?? [];
        const scopesText = scopes.length ? scopes.join(', ') : '—';
        const expires = tokenRow.expires_at || t('api_tokens.never');
        const safeName = String(tokenRow.name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const copyPermLabel = t('api_tokens.copy_permissions');
        const copiedLabel = t('api_tokens.copied');
        Swal.fire({
            title: t('api_tokens.details_title'),
            html: `
                <div class="text-left space-y-3">
                    <p><strong>${t('api_tokens.details_name')}:</strong> ${safeName}</p>
                    <p><strong>${t('api_tokens.details_status')}:</strong> ${tokenRow.status}</p>
                    <p><strong>${t('api_tokens.details_created')}:</strong> ${tokenRow.created_at}</p>
                    <p><strong>${t('api_tokens.details_last_used')}:</strong> ${tokenRow.last_used_at}</p>
                    <p><strong>${t('api_tokens.details_expires')}:</strong> ${expires}</p>
                    <p><strong>${t('api_tokens.details_permissions')}:</strong></p>
                    <div class="flex gap-2 items-start">
                        <textarea readonly id="swal-details-scopes" rows="3" class="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm bg-gray-50 w-full font-mono">${scopesText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                        <button type="button" id="swal-details-copy" class="rounded bg-blue-600 text-white px-3 py-2 text-sm whitespace-nowrap">${copyPermLabel}</button>
                    </div>
                    <p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                        ${t('api_tokens.token_value_disclaimer')}
                    </p>
                </div>
            `,
            icon: 'info',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: t('api_tokens.close'),
            width: '480px',
            didOpen: () => {
                const copyBtn = document.getElementById('swal-details-copy');
                const textarea = document.getElementById('swal-details-scopes') as HTMLTextAreaElement;
                if (copyBtn && textarea) {
                    copyBtn.addEventListener('click', () => {
                        textarea.select();
                        navigator.clipboard.writeText(textarea.value);
                        copyBtn.textContent = copiedLabel;
                        setTimeout(() => { copyBtn.textContent = copyPermLabel; }, 2000);
                    });
                }
            },
        });
    };

    const columns: ColumnDef<Token>[] = [
        {
            accessorKey: "name",
            header: t('api_tokens.token_name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div className="font-medium text-gray-900">{row.original.name}</div>
                </div>
            )
        },
        {
            accessorKey: "status",
            header: t('common.status'),
            cell: ({ row }) => (
                <Badge
                    variant={row.original.status === 'Active' ? 'success' : 'destructive'}
                    className={row.original.status === 'Active'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-0'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 shadow-none border-0'}
                >
                    {row.original.status}
                </Badge>
            )
        },
        {
            accessorKey: "last_used_at",
            header: t('api_tokens.last_used'),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {row.original.last_used_at}
                </div>
            )
        },
        {
            accessorKey: "created_at",
            header: t('api_tokens.created'),
            cell: ({ row }) => (
                <span className="text-gray-500">{row.original.created_at}</span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const token = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => showViewDetails(token)}>
                                    {t('api_tokens.view_details')}
                                </DropdownMenuItem>
                                {token.status === 'Active' && (
                                    <DropdownMenuItem
                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                        onClick={() => revokeToken(token)}
                                    >
                                        {t('api_tokens.revoke_token')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        }
    ];

    const [search, setSearch] = useState(filters.search || '');

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get(
                    route('api-tokens.index'),
                    { search: search },
                    { preserveState: true, replace: true }
                );
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    return (
        <AuthenticatedLayout>
            <Head title="API Tokens" />

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Link */}
                <div className="mb-6">
                    <Link href={route('settings.api.index')} className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        {t('api_tokens.back_to_api')}
                    </Link>
                </div>

                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('api_tokens.total_requests_24h')}</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_requests_24h}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{t('api_tokens.errors_24h')}</h3>
                            <p className="text-3xl font-bold text-red-600 mt-2">{stats.error_rate_24h}</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('api_tokens.title')}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{t('api_tokens.subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder={t('api_tokens.search_placeholder')}
                                value={search}
                                onChange={handleSearch}
                                className="pl-9 h-10 w-64 bg-white"
                            />
                        </div>
                        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2 shadow-sm h-10">
                            <Link href={route('api-tokens.create')}>
                                <Plus className="h-4 w-4" />
                                {t('api_tokens.create_new_token')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-1">
                    <ProTable
                        columns={columns}
                        data={tokens.data}
                        meta={tokens.meta}
                        searchPlaceholder={t('api_tokens.search_placeholder')}
                    // We handle search externally, so we don't pass searchKey
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
