import { useState, useEffect } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { router, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/Components/UI/button';
import { Badge } from '@/Components/UI/badge';
import { Input } from '@/Components/UI/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/UI/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/UI/dropdown-menu';
import { Trash2, Edit2, MoreHorizontal, Copy, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsTable } from '../_components/SettingsTable';
import { Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';

interface Client {
    id: number;
    name: string;
    client_id: string;
    type: string;
    status: string;
    is_active: boolean;
    rate_limit_per_minute: number;
    created_at: string;
}

interface PaginatedClients {
    data: Client[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export default function ApiClients({
    clients,
    scopeOptions = [],
    filters = {},
}: {
    clients: PaginatedClients;
    scopeOptions: string[];
    filters?: { search?: string };
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const { props } = usePage();
    const flash = (props as { flash?: { show_secret_once?: boolean; client_id?: string; client_secret?: string; message?: string } }).flash;

    const [showSecretModal, setShowSecretModal] = useState(false);
    const [secretData, setSecretData] = useState<{ client_id?: string; client_secret?: string } | null>(null);

    useEffect(() => {
        if (flash?.show_secret_once && flash.client_id && flash.client_secret) {
            setSecretData({ client_id: flash.client_id, client_secret: flash.client_secret });
            setShowSecretModal(true);
        }
    }, [flash]);

    const closeSecretModal = () => {
        setShowSecretModal(false);
        setSecretData(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert.success(t('settings.api.copied'));
    };

    const deleteClient = (client: Client) => {
        alert.confirm(
            t('settings.api.delete_client_title'),
            t('settings.api.delete_client_msg', { name: client.name }),
            t('settings.api.confirm_delete_btn')
        ).then((ok) => {
            if (ok) {
                router.delete(route('settings.api.clients.destroy', client.id), {
                    onSuccess: () => alert.success(t('settings.api.client_deleted')),
                    onError: () => alert.error(t('settings.api.could_not_delete_client')),
                });
            }
        });
    };

    const rotateSecret = (client: Client) => {
        alert.confirm(
            t('settings.api.rotate_secret_title'),
            t('settings.api.rotate_secret_msg', { name: client.name }),
            t('settings.api.rotate_btn')
        ).then((ok) => {
            if (ok) {
                router.post(route('settings.api.clients.rotate-secret', client.id), {}, {
                    onSuccess: () => { /* flash modal will show */ },
                    onError: () => alert.error(t('settings.api.could_not_rotate_secret')),
                });
            }
        });
    };

    const columns: ColumnDef<Client>[] = [
        {
            accessorKey: 'name',
            header: t('settings.api.col_name'),
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold text-foreground">{row.original.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                        {row.original.client_id}
                    </p>
                </div>
            ),
        },
        {
            accessorKey: 'type',
            header: t('settings.api.col_type'),
            cell: ({ row }) => (
                <Badge variant="outline" className="capitalize">
                    {row.original.type}
                </Badge>
            ),
        },
        {
            accessorKey: 'status',
            header: t('settings.api.col_status'),
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? t('settings.api.status_active') : t('settings.api.status_inactive')}
                </Badge>
            ),
        },
        {
            accessorKey: 'rate_limit_per_minute',
            header: t('settings.api.col_rate_limit'),
            cell: ({ row }) => (
                <span className="text-sm font-mono text-muted-foreground">
                    {row.original.rate_limit_per_minute}/min
                </span>
            ),
        },
        {
            id: 'actions',
            header: t('settings.api.col_actions'),
            cell: ({ row }) => {
                const c = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={route('settings.api.clients.edit', c.id)} className="cursor-pointer">
                                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                                        {t('common.edit')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => rotateSecret(c)} className="cursor-pointer">
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                    {t('settings.api.rotate_secret_action')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => deleteClient(c)}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {t('common.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    const data = clients?.data ?? [];
    const meta = clients
        ? {
              current_page: clients.current_page,
              last_page: clients.last_page,
              per_page: clients.per_page,
              total: clients.total,
              from: clients.from,
              to: clients.to,
          }
        : null;

    const [searchValue, setSearchValue] = useState(filters?.search ?? '');
    const handleSearch = () => {
        router.get(route('settings.api.clients.index'), { search: searchValue || undefined, page: 1 }, { preserveState: true });
    };

    return (
        <SettingsLayout title={t('settings.api.api_clients')}>
            <div className="space-y-4 mb-6">
                <Link
                    href={route('settings.api.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('settings.api.back_to_api')}
                </Link>
                <div className="flex gap-2">
                    <Input
                        placeholder={t('settings.api.search_by_name')}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="max-w-xs"
                    />
                    <Button variant="secondary" onClick={handleSearch}>{t('common.search')}</Button>
                </div>
            </div>

            <SettingsTable
                title={t('settings.api.api_clients')}
                description={t('settings.api.api_clients_desc')}
                actionLabel={t('settings.api.add_client')}
                onAction={() => router.visit(route('settings.api.clients.create'))}
                columns={columns}
                data={data}
                searchKey=""
                searchPlaceholder={t('settings.api.search_by_name')}
                meta={meta}
            />

            {/* Secret modal — shown once after create/rotate */}
            <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            {t('settings.api.save_credentials_title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('settings.api.save_credentials_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {[
                            { label: t('settings.api.client_id'), value: secretData?.client_id ?? '', type: 'text' },
                            { label: t('settings.api.client_secret'), value: secretData?.client_secret ?? '', type: 'password' },
                        ].map((field) => (
                            <div key={field.label}>
                                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                                <div className="mt-1 flex gap-2">
                                    <Input
                                        readOnly
                                        type={field.type}
                                        value={field.value}
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(field.value)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={closeSecretModal}>{t('settings.api.saved_credentials')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SettingsLayout>
    );
}
