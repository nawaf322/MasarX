import { useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { router, Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/Components/UI/badge';
import { Input } from '@/Components/UI/input';
import { Button } from '@/Components/UI/button';
import { Label } from '@/Components/UI/label';
import { ArrowLeft } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/UI/select';
import { SettingsTable } from '../_components/SettingsTable';
import { SettingsShell } from '../_components/SettingsShell';

interface Log {
    id: number;
    created_at: string;
    method: string;
    endpoint: string;
    status_code: number;
    duration_ms: number | null;
    ip_address: string | null;
    user_agent: string | null;
    error_message: string | null;
}

interface PaginatedLogs {
    data: Log[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

const METHOD_COLORS: Record<string, string> = {
    GET:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    POST:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    PUT:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    PATCH:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
    DELETE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
};

export default function ApiLogs({
    logs,
    filters = {},
}: {
    logs: PaginatedLogs;
    filters?: { endpoint?: string; status_group?: string; date_from?: string; date_to?: string };
}) {
    const { t } = useTranslation();
    const [endpoint, setEndpoint] = useState(filters?.endpoint ?? '');
    const [statusGroup, setStatusGroup] = useState(
        filters?.status_group && filters.status_group !== 'all' ? filters.status_group : 'all'
    );
    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters?.date_to ?? '');

    const applyFilters = () => {
        const params: Record<string, string> = { page: '1' };
        if (endpoint) params.endpoint = endpoint;
        if (statusGroup && statusGroup !== 'all') params.status_group = statusGroup;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        router.get(route('settings.api.logs.index'), params, { preserveState: true });
    };

    const statusBadge = (code: number) => {
        if (code >= 200 && code < 300)
            return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-0">2xx</Badge>;
        if (code >= 400 && code < 500)
            return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-0">4xx</Badge>;
        if (code >= 500)
            return <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-0">5xx</Badge>;
        return <Badge variant="outline">{code}</Badge>;
    };

    const columns: ColumnDef<Log>[] = [
        {
            accessorKey: 'created_at',
            header: t('common.date'),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(row.original.created_at).toLocaleString()}
                </span>
            ),
        },
        {
            accessorKey: 'method',
            header: t('settings.api.method'),
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className={`font-mono text-xs font-bold ${METHOD_COLORS[row.original.method] ?? ''}`}
                >
                    {row.original.method}
                </Badge>
            ),
        },
        {
            accessorKey: 'endpoint',
            header: t('settings.api.endpoint'),
            cell: ({ row }) => (
                <span className="text-sm font-mono text-foreground/80 truncate max-w-[220px] block" title={row.original.endpoint}>
                    {row.original.endpoint}
                </span>
            ),
        },
        {
            accessorKey: 'status_code',
            header: t('common.status'),
            cell: ({ row }) => statusBadge(row.original.status_code),
        },
        {
            accessorKey: 'duration_ms',
            header: t('settings.api.duration'),
            cell: ({ row }) => {
                const ms = row.original.duration_ms;
                const color = ms != null && ms > 1000
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground';
                return (
                    <span className={`text-sm font-mono ${color}`}>
                        {ms != null ? `${ms}ms` : '—'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'ip_address',
            header: t('settings.api.ip'),
            cell: ({ row }) => (
                <span className="text-xs font-mono text-muted-foreground">{row.original.ip_address ?? '—'}</span>
            ),
        },
        {
            accessorKey: 'error_message',
            header: t('settings.api.error'),
            cell: ({ row }) =>
                row.original.error_message ? (
                    <Badge variant="destructive" className="max-w-[140px] truncate text-xs" title={row.original.error_message}>
                        {row.original.error_message}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground/50 text-sm">—</span>
                ),
        },
    ];

    const data = logs?.data ?? [];
    const meta = logs
        ? {
              current_page: logs.current_page,
              last_page: logs.last_page,
              per_page: logs.per_page,
              total: logs.total,
              from: logs.from,
              to: logs.to,
          }
        : null;

    return (
        <SettingsLayout title={t('settings.api.request_logs')}>
            <SettingsShell
                title={t('settings.api.request_logs')}
                description={t('settings.api.request_logs_desc')}
            >
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <Link
                        href={route('settings.api.index')}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('settings.api.back_to_api')}
                    </Link>

                    {/* Filters */}
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">{t('settings.api.filters')}</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('settings.api.endpoint_contains')}</Label>
                                <Input
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder="/api/v1/..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('settings.api.status_group')}</Label>
                                <Select value={statusGroup} onValueChange={setStatusGroup}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('settings.api.status_all')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('settings.api.status_all')}</SelectItem>
                                        <SelectItem value="2xx">{t('settings.api.status_2xx')}</SelectItem>
                                        <SelectItem value="4xx">{t('settings.api.status_4xx')}</SelectItem>
                                        <SelectItem value="5xx">{t('settings.api.status_5xx')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('settings.api.date_from')}</Label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('settings.api.date_to')}</Label>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={applyFilters} className="w-full">{t('settings.api.apply')}</Button>
                            </div>
                        </div>
                    </div>

                    <SettingsTable
                        title={t('settings.api.request_logs')}
                        description={t('settings.api.logs_desc_table')}
                        columns={columns}
                        data={data}
                        searchKey=""
                        meta={meta}
                    />
                </div>
            </SettingsShell>
        </SettingsLayout>
    );
}
