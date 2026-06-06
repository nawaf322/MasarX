import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

interface ImportJobData {
    id: number;
    filename: string;
    type: string;
    status: string;
    total_rows: number;
    processed_rows: number;
    success_rows: number;
    error_rows: number;
    errors?: { row: number; message: string }[];
    created_at: string;
}

interface Props {
    importJob: ImportJobData;
}

export default function ImportShow({ importJob }: Props) {
    const { t } = useTranslation();
    const progress = importJob.total_rows > 0
        ? Math.round((importJob.processed_rows / importJob.total_rows) * 100)
        : 0;

    return (
        <AuthenticatedLayout>
            <Head title={t('import.job_details')} />
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.get(route('import.index'))}>
                        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
                    </Button>
                    <h1 className="text-xl font-semibold">{t('import.job_details')}</h1>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-muted-foreground">{t('import.filename')}:</span> <strong>{importJob.filename}</strong></div>
                        <div><span className="text-muted-foreground">{t('import.status')}:</span> <strong>{t(`import.status_${importJob.status}`)}</strong></div>
                        <div><span className="text-muted-foreground">{t('import.total_rows')}:</span> <strong>{importJob.total_rows}</strong></div>
                        <div><span className="text-muted-foreground">{t('import.success_rows')}:</span> <strong className="text-green-600">{importJob.success_rows}</strong></div>
                        <div><span className="text-muted-foreground">{t('import.error_rows')}:</span> <strong className="text-red-500">{importJob.error_rows}</strong></div>
                        <div><span className="text-muted-foreground">{t('import.date')}:</span> <strong>{new Date(importJob.created_at).toLocaleString()}</strong></div>
                    </div>

                    {importJob.status === 'processing' && (
                        <div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div
                                    className="h-2 bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{progress}% {t('import.processed')}</p>
                        </div>
                    )}

                    {importJob.errors && importJob.errors.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-medium text-red-600">{t('import.errors')} ({importJob.errors.length})</h3>
                            <div className="max-h-64 overflow-y-auto border rounded">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="text-left p-2">{t('import.row')}</th>
                                            <th className="text-left p-2">{t('import.error_message')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importJob.errors.map((err, i) => (
                                            <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                                                <td className="p-2">{err.row}</td>
                                                <td className="p-2 text-red-600">{err.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {(importJob.status === 'processing' || importJob.status === 'pending') && (
                        <Button variant="outline" onClick={() => router.reload()}>
                            <RefreshCw className="w-4 h-4 mr-1" />{t('common.refresh')}
                        </Button>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
