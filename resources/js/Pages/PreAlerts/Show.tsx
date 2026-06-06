import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
    ArrowLeft, Package, Inbox, DollarSign, FileText, Upload,
    CheckCircle, XCircle, Clock, Truck, ExternalLink, Download, Image as ImageIcon,
    Wand2, Loader2, ShoppingBag, Calendar, Hash, Tag, Scale,
} from 'lucide-react';

interface Customer  { id: number; name: string; email: string; phone: string | null }
interface Locker    { id: number; code: string; address: string | null }
interface Shipment  { id: number; tracking_number: string; status: string }

interface Attachment {
    id: number;
    type: 'purchase_invoice' | 'product_photo' | 'other';
    file_name: string;
    mime_type: string;
    file_size: number;
    url: string;
}

interface PreAlert {
    id: number;
    store_name: string;
    store_tracking_number: string;
    store_url: string | null;
    declared_value: number;
    declared_currency: string;
    declared_weight_kg: number | null;
    description: string | null;
    notes: string | null;
    invoice_data: Record<string, unknown> | null;
    status: 'pending' | 'received' | 'processing' | 'converted' | 'cancelled';
    customer: Customer | null;
    locker: Locker | null;
    shipment: Shipment | null;
    attachments: Attachment[];
    received_at: string | null;
    converted_at: string | null;
    created_at: string;
}

interface InvoiceData {
    store_detected?: string;
    order_number?: string;
    order_date?: string;
    currency?: string;
    subtotal?: number;
    shipping?: number;
    tax?: number;
    discount?: number;
    total?: number;
    seller_name?: string;
    items?: Array<{ qty: number; description: string; unit_price: number | null; total: number }>;
    parsed_at?: string;
    source?: string;
    raw_text_length?: number;
    error?: string;
}

interface Props {
    preAlert: PreAlert;
    canReceive:      boolean;
    canConvert:      boolean;
    canCancel:       boolean;
    canParseInvoice: boolean;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; labelKey: string }> = {
    pending:    { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock,        labelKey: 'status_pending' },
    received:   { color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Inbox,        labelKey: 'status_received' },
    processing: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Package,      labelKey: 'status_processing' },
    converted:  { color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle,  labelKey: 'status_converted' },
    cancelled:  { color: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle,      labelKey: 'status_cancelled' },
};

export default function PreAlertsShow({ preAlert, canReceive, canConvert, canCancel, canParseInvoice }: Props) {
    const { t } = useTranslation();
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = props.flash;
    const fileRef = useRef<HTMLInputElement>(null);
    const [parsing, setParsing] = useState(false);

    const cfg = statusConfig[preAlert.status] ?? statusConfig.pending;
    const StatusIcon = cfg.icon;

    function handleReceive() {
        Swal.fire({
            title: t('pre_alerts.confirm_receive'),
            text:  t('pre_alerts.confirm_receive_text'),
            icon:  'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonText:   t('common.cancel'),
            confirmButtonText:  t('pre_alerts.receive'),
        }).then(result => {
            if (result.isConfirmed) {
                router.post(route('pre-alerts.receive', preAlert.id));
            }
        });
    }


    function handleCancel() {
        Swal.fire({
            title: t('pre_alerts.confirm_cancel'),
            text:  t('pre_alerts.confirm_cancel_text'),
            icon:  'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonText:   t('common.back'),
            confirmButtonText:  t('pre_alerts.cancel_pre_alert'),
        }).then(result => {
            if (result.isConfirmed) {
                router.post(route('pre-alerts.cancel', preAlert.id));
            }
        });
    }

    function handleParseInvoice() {
        setParsing(true);
        router.post(route('pre-alerts.parse-invoice', preAlert.id), {}, {
            onFinish: () => setParsing(false),
        });
    }

    function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'product_photo');
        router.post(route('pre-alerts.attachments.upload', preAlert.id), fd as any, {
            forceFormData: true,
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`${t('pre_alerts.title')} · ${preAlert.store_name}`} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {flash.error}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                    <Link
                        href={route('pre-alerts.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-gray-900 truncate">{preAlert.store_name}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {t(`pre_alerts.${cfg.labelKey}`)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-mono mt-0.5">{preAlert.store_tracking_number}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {canReceive && (
                            <button
                                onClick={handleReceive}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Inbox className="w-4 h-4" />
                                {t('pre_alerts.receive')}
                            </button>
                        )}
                        {canConvert && (
                            <Link
                                href={route('pre-alerts.convert-form', preAlert.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Truck className="w-4 h-4" />
                                {t('pre_alerts.convert')}
                            </Link>
                        )}
                        {canParseInvoice && (
                            <button
                                onClick={handleParseInvoice}
                                disabled={parsing}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 disabled:opacity-60 transition-colors"
                            >
                                {parsing
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Wand2 className="w-4 h-4" />
                                }
                                {t('pre_alerts.parse_invoice')}
                            </button>
                        )}
                        {canCancel && (
                            <button
                                onClick={handleCancel}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                {t('pre_alerts.cancel_pre_alert')}
                            </button>
                        )}
                    </div>
                </div>

                {/* If converted → link to shipment */}
                {preAlert.shipment && (
                    <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-green-800">{t('pre_alerts.converted_to_shipment')}</p>
                            <p className="text-xs text-green-700 font-mono">{preAlert.shipment.tracking_number}</p>
                        </div>
                        <Link
                            href={route('shipments.show', preAlert.shipment.id)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900"
                        >
                            <ExternalLink className="w-4 h-4" />
                            {t('common.view')}
                        </Link>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: details */}
                    <div className="lg:col-span-1 space-y-5">

                        {/* Store info */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('pre_alerts.store_info')}</h3>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-gray-400">{t('pre_alerts.store')}</p>
                                    <p className="text-sm font-semibold text-gray-800">{preAlert.store_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">{t('pre_alerts.tracking_number')}</p>
                                    <p className="text-sm font-mono text-gray-700">{preAlert.store_tracking_number}</p>
                                </div>
                                {preAlert.store_url && (
                                    <div>
                                        <p className="text-xs text-gray-400">{t('pre_alerts.store_url')}</p>
                                        <a href={preAlert.store_url} target="_blank" rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" />
                                            {t('pre_alerts.open_store')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Declared value */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign className="w-3.5 h-3.5" />
                                {t('pre_alerts.declared_info')}
                            </h3>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">{t('pre_alerts.declared_value')}</p>
                                <p className="text-base font-bold text-gray-900">
                                    {preAlert.declared_currency} {Number(preAlert.declared_value).toFixed(2)}
                                </p>
                            </div>
                            {preAlert.declared_weight_kg && (
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500">{t('pre_alerts.declared_weight_kg')}</p>
                                    <p className="text-sm font-semibold text-gray-700">{preAlert.declared_weight_kg} kg</p>
                                </div>
                            )}
                            {preAlert.description && (
                                <div>
                                    <p className="text-xs text-gray-400">{t('pre_alerts.description')}</p>
                                    <p className="text-sm text-gray-600 mt-0.5">{preAlert.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Customer & Locker */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('pre_alerts.customer_locker')}</h3>
                            {preAlert.locker && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                        <Inbox className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">{t('pre_alerts.locker')}</p>
                                        <Link
                                            href={route('lockers.show', preAlert.locker.id)}
                                            className="text-sm font-mono font-semibold text-indigo-700 hover:underline"
                                        >
                                            {preAlert.locker.code}
                                        </Link>
                                    </div>
                                </div>
                            )}
                            {preAlert.customer && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">{t('pre_alerts.customer')}</p>
                                        <p className="text-sm font-semibold text-gray-800">{preAlert.customer.name}</p>
                                        <p className="text-xs text-gray-400">{preAlert.customer.email}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dates */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('pre_alerts.dates')}</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{t('pre_alerts.created_at')}</span>
                                <span className="text-gray-800">{new Date(preAlert.created_at).toLocaleString()}</span>
                            </div>
                            {preAlert.received_at && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t('pre_alerts.received_at')}</span>
                                    <span className="text-gray-800">{new Date(preAlert.received_at).toLocaleString()}</span>
                                </div>
                            )}
                            {preAlert.converted_at && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t('pre_alerts.converted_at')}</span>
                                    <span className="text-gray-800">{new Date(preAlert.converted_at).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: attachments */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Invoice data (structured display) */}
                        {preAlert.invoice_data && Object.keys(preAlert.invoice_data).length > 0 && (
                            <InvoiceDataCard data={preAlert.invoice_data as InvoiceData} t={t} />
                        )}

                        {/* Attachments */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-gray-400" />
                                    {t('pre_alerts.attachments')}
                                    <span className="ml-1 text-xs font-normal text-gray-400">({preAlert.attachments.length})</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    {t('pre_alerts.upload_attachment')}
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,image/*"
                                    className="hidden"
                                    onChange={handleUploadAttachment}
                                />
                            </div>

                            {preAlert.attachments.length === 0 ? (
                                <div className="px-6 py-12 text-center">
                                    <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">{t('pre_alerts.no_attachments')}</p>
                                </div>
                            ) : (
                                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {preAlert.attachments.map(att => (
                                        <div key={att.id} className="group relative bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            {att.mime_type.startsWith('image/') ? (
                                                <img
                                                    src={att.url}
                                                    alt={att.file_name}
                                                    className="w-full h-32 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-32 flex items-center justify-center bg-red-50">
                                                    <FileText className="w-10 h-10 text-red-300" />
                                                </div>
                                            )}
                                            <div className="p-2">
                                                <p className="text-xs text-gray-600 truncate">{att.file_name}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-xs text-gray-400">
                                                        {(att.file_size / 1024).toFixed(1)} KB
                                                    </span>
                                                    <a
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        {t('common.download')}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {preAlert.notes && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('pre_alerts.notes')}</h3>
                                <p className="text-sm text-gray-600">{preAlert.notes}</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// ── Invoice Data Structured Card ─────────────────────────────────────────────

function InvoiceDataCard({ data, t }: { data: InvoiceData; t: (k: string) => string }) {
    if (data.error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">{t('pre_alerts.invoice_data')}</p>
                <p className="text-sm text-red-700">{data.error}</p>
            </div>
        );
    }

    const fmt = (n?: number | null, currency?: string) =>
        n != null ? `${currency ?? ''} ${n.toFixed(2)}`.trim() : null;

    return (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-purple-800">{t('pre_alerts.invoice_data')}</h3>
                    {data.store_detected && data.store_detected !== 'Unknown' && (
                        <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            <ShoppingBag className="w-3 h-3" />
                            {data.store_detected}
                        </span>
                    )}
                </div>
                {data.parsed_at && (
                    <span className="text-xs text-purple-400">
                        {t('pre_alerts.parsed_at')} {new Date(data.parsed_at).toLocaleString()}
                    </span>
                )}
            </div>

            <div className="p-6 space-y-5">
                {/* Meta row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {data.order_number && (
                        <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400">{t('pre_alerts.order_number')}</p>
                                <p className="text-sm font-mono font-semibold text-gray-800">{data.order_number}</p>
                            </div>
                        </div>
                    )}
                    {data.order_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400">{t('pre_alerts.order_date')}</p>
                                <p className="text-sm font-semibold text-gray-800">{data.order_date}</p>
                            </div>
                        </div>
                    )}
                    {data.seller_name && (
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400">{t('pre_alerts.seller_name')}</p>
                                <p className="text-sm font-semibold text-gray-800">{data.seller_name}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items table */}
                {data.items && data.items.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('pre_alerts.invoice_items')}</p>
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('pre_alerts.description')}</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 text-xs text-gray-600">{item.qty}</td>
                                            <td className="px-3 py-2 text-xs text-gray-800">{item.description}</td>
                                            <td className="px-3 py-2 text-xs text-gray-700 text-right font-mono">
                                                {fmt(item.total, data.currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Totals breakdown */}
                <div className="space-y-1.5 border-t border-gray-100 pt-4">
                    {fmt(data.subtotal, data.currency) && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{t('pre_alerts.subtotal')}</span>
                            <span className="text-gray-700">{fmt(data.subtotal, data.currency)}</span>
                        </div>
                    )}
                    {fmt(data.shipping, data.currency) && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{t('pre_alerts.shipping_cost')}</span>
                            <span className="text-gray-700">{fmt(data.shipping, data.currency)}</span>
                        </div>
                    )}
                    {fmt(data.tax, data.currency) && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{t('pre_alerts.tax')}</span>
                            <span className="text-gray-700">{fmt(data.tax, data.currency)}</span>
                        </div>
                    )}
                    {fmt(data.discount, data.currency) && (
                        <div className="flex justify-between text-sm text-green-700">
                            <span>{t('pre_alerts.discount')}</span>
                            <span>- {fmt(data.discount, data.currency)}</span>
                        </div>
                    )}
                    {fmt(data.total, data.currency) && (
                        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                            <span className="text-gray-800">{t('pre_alerts.invoice_total')}</span>
                            <span className="text-gray-900">{fmt(data.total, data.currency)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
