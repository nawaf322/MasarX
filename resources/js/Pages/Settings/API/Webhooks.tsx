import SettingsLayout from '@/Layouts/SettingsLayout';
import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/Components/UI/button';
import { Badge } from '@/Components/UI/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/UI/dropdown-menu';
import { Trash2, Edit2, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsTable } from '../_components/SettingsTable';
import { Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';

interface Webhook {
    id: number;
    provider: string;
    event: string;
    callback_url: string;
    is_active: boolean;
    created_at: string;
}

interface PaginatedWebhooks {
    data: Webhook[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export default function ApiWebhooks({ webhooks }: { webhooks: PaginatedWebhooks }) {
    const { t } = useTranslation();
    const alert = useSweetAlert();

    const deleteWebhook = (webhook: Webhook) => {
        alert.confirm(
            t('settings.api.delete_webhook_title'),
            t('settings.api.delete_webhook_msg', { provider: webhook.provider, event: webhook.event }),
            t('settings.api.confirm_delete_btn')
        ).then((ok) => {
            if (ok) {
                router.delete(route('settings.api.webhooks.destroy', webhook.id), {
                    onSuccess: () => alert.success(t('settings.api.webhook_deleted')),
                    onError: () => alert.error(t('settings.api.could_not_delete_webhook')),
                });
            }
        });
    };

    const columns: ColumnDef<Webhook>[] = [
        {
            accessorKey: 'provider',
            header: t('settings.api.col_provider'),
            cell: ({ row }) => (
                <span className="font-medium text-foreground">{row.original.provider}</span>
            ),
        },
        {
            accessorKey: 'event',
            header: t('settings.api.col_event'),
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-xs">
                    {row.original.event}
                </Badge>
            ),
        },
        {
            accessorKey: 'callback_url',
            header: t('settings.api.col_callback_url'),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground font-mono truncate max-w-[220px] block" title={row.original.callback_url}>
                    {row.original.callback_url}
                </span>
            ),
        },
        {
            accessorKey: 'is_active',
            header: t('settings.api.col_status'),
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? t('settings.api.status_active') : t('settings.api.status_inactive')}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: t('settings.api.col_actions'),
            cell: ({ row }) => {
                const w = row.original;
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
                                    <Link href={route('settings.api.webhooks.edit', w.id)} className="cursor-pointer">
                                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                                        {t('common.edit')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => deleteWebhook(w)}
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

    const data = webhooks?.data ?? [];
    const meta = webhooks
        ? {
              current_page: webhooks.current_page,
              last_page: webhooks.last_page,
              per_page: webhooks.per_page,
              total: webhooks.total,
              from: webhooks.from,
              to: webhooks.to,
          }
        : null;

    return (
        <SettingsLayout title={t('settings.api.webhooks')}>
            <div className="mb-6">
                <Link
                    href={route('settings.api.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('settings.api.back_to_api')}
                </Link>
            </div>
            <SettingsTable
                title={t('settings.api.webhooks')}
                description={t('settings.api.webhooks_desc')}
                actionLabel={t('settings.api.add_webhook')}
                onAction={() => router.visit(route('settings.api.webhooks.create'))}
                columns={columns}
                data={data}
                searchKey="provider"
                searchPlaceholder={t('settings.api.search_by_name')}
                meta={meta}
            />
        </SettingsLayout>
    );
}
