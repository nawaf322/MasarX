import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/UI/button';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowLeft, CheckCircle2, XCircle, Package, Truck } from 'lucide-react';
import React from 'react';

interface ReturnData {
    id: number;
    return_number: string;
    reason: string;
    reason_notes?: string;
    status: string;
    refund_amount: number;
    refund_method?: string;
    approved_at?: string;
    received_at?: string;
    completed_at?: string;
    created_at: string;
    original_shipment?: { id: number; tracking_number: string };
    created_by?: { name: string };
}

interface Props {
    return: ReturnData;
}

const statusColor: Record<string, string> = {
    requested: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    received: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

export default function ReturnsShow({ return: ret }: Props) {
    const { t } = useTranslation();

    const handleAction = (status: string) => {
        router.patch(route('returns.update', ret.id), { status });
    };

    const timeline = [
        { label: t('returns.status_requested'), date: ret.created_at, done: true },
        { label: t('returns.status_approved'), date: ret.approved_at, done: !!ret.approved_at },
        { label: t('returns.status_in_transit'), date: null, done: ret.status === 'in_transit' || !!ret.received_at },
        { label: t('returns.status_received'), date: ret.received_at, done: !!ret.received_at },
        { label: t('returns.status_completed'), date: ret.completed_at, done: !!ret.completed_at },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={ret.return_number} />
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.get(route('returns.index'))}>
                        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
                    </Button>
                    <h1 className="text-xl font-semibold">{ret.return_number}</h1>
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${statusColor[ret.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {t(`returns.status_${ret.status}`)}
                    </span>
                </div>

                {/* Details */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t('returns.reason')}:</span> <strong>{t(`returns.reason_${ret.reason}`)}</strong></div>
                    {ret.refund_method && <div><span className="text-muted-foreground">{t('returns.refund_method')}:</span> <strong>{t(`returns.method_${ret.refund_method}`)}</strong></div>}
                    <div><span className="text-muted-foreground">{t('returns.refund_amount')}:</span> <strong>{Number(ret.refund_amount).toFixed(2)}</strong></div>
                    {ret.created_by && <div><span className="text-muted-foreground">{t('common.created_by')}:</span> <strong>{ret.created_by.name}</strong></div>}
                    {ret.original_shipment && (
                        <div className="col-span-2">
                            <span className="text-muted-foreground">{t('returns.original_shipment')}:</span>{' '}
                            <button
                                className="text-blue-600 hover:underline font-medium"
                                onClick={() => router.get(route('shipments.show', ret.original_shipment!.id))}
                            >
                                {ret.original_shipment.tracking_number}
                            </button>
                        </div>
                    )}
                    {ret.reason_notes && <div className="col-span-2"><span className="text-muted-foreground">{t('returns.reason_notes')}:</span> {ret.reason_notes}</div>}
                </div>

                {/* Timeline */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="font-medium mb-4">{t('returns.timeline')}</h2>
                    <div className="space-y-3">
                        {timeline.map((step, i) => (
                            <div key={i} className="flex items-center gap-3">
                                {step.done
                                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    : <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                }
                                <div>
                                    <p className={`text-sm font-medium ${step.done ? '' : 'text-muted-foreground'}`}>{step.label}</p>
                                    {step.date && <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString()}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                    {ret.status === 'requested' && (
                        <>
                            <Button onClick={() => handleAction('approved')} className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle2 className="w-4 h-4 mr-1" />{t('returns.action_approve')}
                            </Button>
                            <Button variant="destructive" onClick={() => handleAction('rejected')}>
                                <XCircle className="w-4 h-4 mr-1" />{t('returns.action_reject')}
                            </Button>
                        </>
                    )}
                    {ret.status === 'approved' && (
                        <Button onClick={() => handleAction('in_transit')}>
                            <Truck className="w-4 h-4 mr-1" />{t('returns.action_in_transit')}
                        </Button>
                    )}
                    {ret.status === 'in_transit' && (
                        <Button onClick={() => handleAction('received')}>
                            <Package className="w-4 h-4 mr-1" />{t('returns.action_received')}
                        </Button>
                    )}
                    {ret.status === 'received' && (
                        <Button onClick={() => handleAction('completed')} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle2 className="w-4 h-4 mr-1" />{t('returns.action_complete')}
                        </Button>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
