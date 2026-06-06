import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Badge } from "@/Components/UI/badge";
import { ArrowLeft, MapPin, Box, Truck, Clock, Printer, Mail, RefreshCw, MessageCircle, Smartphone, Send, DollarSign, Banknote, Receipt, FileText, Activity, Edit, CheckCircle2, Circle, AlertTriangle, Users, ChevronDown, ChevronUp, CreditCard, Package, Paperclip, Download, Image, CreditCard as CreditCardIcon, RotateCcw, Inbox } from "lucide-react";
import { Shipment, ShipmentStatus } from '@/types/enums';
import React, { useState } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/Components/UI/dialog";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Textarea } from "@/Components/UI/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/UI/select";
import { SearchableStatusSelect } from "@/Components/UI/searchable-status-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/Components/UI/tabs";
import { useTranslation } from '@/hooks/useTranslation';
import { router } from '@inertiajs/react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface ShipmentHistory {
    id: number;
    status: ShipmentStatus;
    description: string;
    location: string;
    created_at: string;
}

interface PaymentItem {
    id: number;
    amount: string;
    currency: string;
    method: string;
    receipt_path: string | null;
    original_filename: string | null;
    notes: string | null;
    created_at: string;
    creator?: { name: string } | null;
}

interface ActivityItem {
    id: number;
    action: string;
    description: string;
    created_at: string;
    user?: { name: string } | null;
}

interface ShipmentPackage {
    id: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    volumetric_weight?: number;
    chargeable_weight?: number;
    pieces?: number;
    declared_value?: number;
    subtotal?: number;
    surcharges_total?: number;
    tax?: number;
    total?: number;
    currency?: string;
    content_description?: string;
    items?: Array<{ id: number; description?: string; quantity?: number; unit_value?: number; total_value?: number; sku?: string }>;
}

interface AttachmentItem {
    id: number;
    type: 'photo' | 'payment_proof' | string;
    original_name: string | null;
    mime_type: string | null;
    created_at: string;
}

interface ReturnRequestData {
    id: number;
    return_number: string;
    status: string;
    reason: string;
    refund_amount: number;
    refund_method: string | null;
    created_at: string;
}

interface OriginPickupData {
    id: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    contact_name: string;
    scheduled_for: string | null;
}
interface ShipmentDetail extends Shipment {
    history: ShipmentHistory[];
    creator?: { name: string };
    payments?: PaymentItem[];
    activities?: ActivityItem[];
    packages?: ShipmentPackage[];
    attachments?: AttachmentItem[];
    returnRequest?: ReturnRequestData | null;
    originPickup?: OriginPickupData | null;
    origin_type?: 'direct' | 'locker' | null;
    pre_alert_id?: number | null;
    preAlert?: { id: number; store_name: string; store_tracking_number: string; locker?: { id: number; code: string } } | null;
}

interface RateBreakdown {
    card_name?: string | null;
    zone_name?: string | null;
    service_type?: string | null;
    min_weight?: number;
    max_weight?: number;
    price_per_kg?: number | null;
    price_per_lb?: number | null;
    flat_price?: number | null;
    min_charge?: number | null;
    fuel_surcharge_percent?: number;
    insurance_percent?: number;
    tax_percent?: number;
    handling_fee?: number;
    rounding_rule?: string;
    chargeable_weight_rule?: string | null;
    volumetric_divisor?: number | null;
}

interface NotificationsActive {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
}

interface StatusOption {
    id: number;
    code: string;
    name: string;
    color: string;
}

const DEFAULT_STATUS_COLOR = '#94a3b8';

export default function Show({
    shipment,
    notificationsActive = { email: false, whatsapp: false, sms: false },
    shipment_statuses = [],
    canEdit = true,
    canChangeStatus = true,
    rate_breakdown = null,
}: {
    shipment: ShipmentDetail;
    notificationsActive?: NotificationsActive;
    shipment_statuses?: StatusOption[];
    canEdit?: boolean;
    canChangeStatus?: boolean;
    rate_breakdown?: RateBreakdown | null;
}) {
    const { t } = useTranslation();
    const alert = useSweetAlert();

    const receiverEmail = (shipment?.receiver_details && typeof shipment.receiver_details === 'object' ? shipment.receiver_details.email : null) || '';
    const receiverPhone = (shipment?.receiver_details && typeof shipment.receiver_details === 'object' ? shipment.receiver_details.phone : null) || '';

    const [sendEmailOpen, setSendEmailOpen] = useState(false);
    const [sendEmailTo, setSendEmailTo] = useState(receiverEmail);
    const [sendEmailSubject, setSendEmailSubject] = useState(`Invoice - Shipment ${shipment?.tracking_number ?? ''}`);
    const [sendEmailBody, setSendEmailBody] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendEmailError, setSendEmailError] = useState<string | null>(null);

    const [sendWhatsappOpen, setSendWhatsappOpen] = useState(false);
    const [sendWhatsappTo, setSendWhatsappTo] = useState(receiverPhone);
    const [sendWhatsappMsg, setSendWhatsappMsg] = useState('');
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
    const [sendWhatsappError, setSendWhatsappError] = useState<string | null>(null);

    const [sendSmsOpen, setSendSmsOpen] = useState(false);
    const [sendSmsTo, setSendSmsTo] = useState(receiverPhone);
    const [sendSmsMsg, setSendSmsMsg] = useState('');
    const [sendingSms, setSendingSms] = useState(false);
    const [sendSmsError, setSendSmsError] = useState<string | null>(null);

    const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
    const [manualAmount, setManualAmount] = useState('');
    const [manualReceipt, setManualReceipt] = useState<File | null>(null);
    const [manualNotes, setManualNotes] = useState('');
    const [manualSubmitting, setManualSubmitting] = useState(false);
    const [manualError, setManualError] = useState<string | null>(null);

    const [changeStatusOpen, setChangeStatusOpen] = useState(false);
    const [changeStatusId, setChangeStatusId] = useState<string>(shipment.status_id?.toString() ?? '');
    const [exceptionReason, setExceptionReason] = useState<string>('');
    const [changeStatusNote, setChangeStatusNote] = useState<string>('');
    const [changeStatusSubmitting, setChangeStatusSubmitting] = useState(false);

    const [rateOpen, setRateOpen] = useState(false);

    const selectedStatus = shipment_statuses?.find(s => s.id === parseInt(changeStatusId, 10));
    const needsExceptionReason = selectedStatus && ['exception', 'on_hold', 'returned'].includes(selectedStatus?.code ?? '');
    const EXCEPTION_REASONS = [
        { value: 'Incorrect address', labelKey: 'dashboard.incorrect_address' },
        { value: 'Weather conditions', labelKey: 'dashboard.weather_conditions' },
        { value: 'Federal Holidays', labelKey: 'dashboard.federal_holidays' },
        { value: 'Damage during transit', labelKey: 'dashboard.damage_during_transit' },
    ] as const;

    const handleSendEmail = async () => {
        if (!sendEmailTo) return;
        setSendingEmail(true);
        setSendEmailError(null);
        try {
            await axios.post(route('invoices.send-email', shipment.id), {
                to: sendEmailTo,
                subject: sendEmailSubject,
                body: sendEmailBody,
            });
            setSendEmailOpen(false);
        } catch (e: any) {
            setSendEmailError(e.response?.data?.message || 'Failed to send email');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendWhatsapp = async () => {
        if (!sendWhatsappTo) return;
        setSendingWhatsapp(true);
        setSendWhatsappError(null);
        try {
            await axios.post(route('invoices.send-whatsapp', shipment.id), { to: sendWhatsappTo, message: sendWhatsappMsg || undefined });
            setSendWhatsappOpen(false);
        } catch (e: any) {
            setSendWhatsappError(e.response?.data?.message || 'Failed to send WhatsApp');
        } finally {
            setSendingWhatsapp(false);
        }
    };

    const handleSendSms = async () => {
        if (!sendSmsTo) return;
        setSendingSms(true);
        setSendSmsError(null);
        try {
            await axios.post(route('invoices.send-sms', shipment.id), { to: sendSmsTo, message: sendSmsMsg || undefined });
            setSendSmsOpen(false);
        } catch (e: any) {
            setSendSmsError(e.response?.data?.message || 'Failed to send SMS');
        } finally {
            setSendingSms(false);
        }
    };

    const getStatusVariant = (status: ShipmentStatus) => {
        switch (status) {
            case ShipmentStatus.DELIVERED: return 'success';
            case ShipmentStatus.CANCELLED: return 'destructive';
            case ShipmentStatus.PENDING: return 'secondary';
            default: return 'default';
        }
    };

    const getStatusDotColor = (statusCode: string) => {
        if (!statusCode) return DEFAULT_STATUS_COLOR;
        const found = shipment_statuses.find((s) => s.code === statusCode);
        return found?.color || DEFAULT_STATUS_COLOR;
    };

    const hasAnyNotifications = notificationsActive.email || notificationsActive.whatsapp || notificationsActive.sms;

    const hasCosts = shipment?.subtotal != null || shipment?.tax != null || shipment?.total != null;

    const subtotal = Number(shipment?.subtotal) || 0;
    const tax = Number(shipment?.tax) || 0;
    const discount = Number(shipment?.discount) || 0;
    const total = Number(shipment?.total) || 0;
    const surchargesDisplay = Math.max(0, total - subtotal - tax + discount);

    const pd = shipment?.package_details;
    const declaredValue = pd != null
        ? (Array.isArray(pd) ? pd[0]?.declared_value : (pd as Record<string, unknown>)?.declared_value)
        : undefined;

    const paymentStatusVal = shipment?.payment_status;
    const paymentStatusStr = typeof paymentStatusVal === 'string' ? paymentStatusVal : String((paymentStatusVal as unknown as { value?: string })?.value ?? '');
    const isUnpaid = ['unpaid', 'pending'].includes(paymentStatusStr.toLowerCase());

    const totalPaid = (shipment.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Math.max(0, total - totalPaid);
    const isPaidFull = total > 0 && balanceDue === 0;
    const isPartial = totalPaid > 0 && balanceDue > 0;

    const getPaymentStatusLabel = () => {
        if (isPaidFull) return t('shipments.show.payment_status_paid');
        if (isPartial) return t('shipments.show.payment_status_partial');
        if (['paid'].includes(paymentStatusStr.toLowerCase())) return t('shipments.show.payment_status_paid');
        if (['pending'].includes(paymentStatusStr.toLowerCase())) return t('shipments.show.payment_status_pending');
        return t('shipments.show.payment_status_unpaid');
    };
    const getPaymentStatusColor = () => {
        if (isPaidFull || ['paid'].includes(paymentStatusStr.toLowerCase())) return 'text-green-600 bg-green-50 border-green-200';
        if (isPartial) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    /* ── Delivery Progress: find ordered statuses and mark current ── */
    const currentStatusOrder = shipment_statuses?.find(s => s.code === shipment.status)?.id ?? 0;
    const passedStatusIds = new Set((shipment.history ?? []).map((h: any) => {
        const found = shipment_statuses?.find(s => s.code === h.status);
        return found?.id;
    }).filter(Boolean));
    passedStatusIds.add(currentStatusOrder);

    const openManualPaymentModal = () => {
        setManualAmount(String(shipment?.total ?? ''));
        setManualReceipt(null);
        setManualNotes('');
        setManualError(null);
        setManualPaymentOpen(true);
    };

    const handleManualPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shipment?.id) return;
        const amt = parseFloat(manualAmount);
        if (isNaN(amt) || amt <= 0) {
            setManualError(t('shipments.show.payment_amount') + ': ' + t('shipments.show.invalid_amount'));
            return;
        }
        if (!manualReceipt) {
            setManualError(t('shipments.show.payment_receipt_required'));
            return;
        }
        setManualSubmitting(true);
        setManualError(null);
        const formData = new FormData();
        formData.append('amount', String(amt));
        formData.append('receipt', manualReceipt);
        if (manualNotes.trim()) formData.append('notes', manualNotes.trim());
        router.post(route('shipments.mark-paid', shipment.id), formData, {
            preserveScroll: true,
            onSuccess: () => {
                setManualPaymentOpen(false);
                setManualSubmitting(false);
            },
            onError: (errors) => {
                setManualError(typeof errors?.receipt === 'string' ? errors.receipt : (errors?.amount ?? Object.values(errors || {}).flat().find(Boolean) ?? t('shipments.show.payment_register_error')));
                setManualSubmitting(false);
            },
            onFinish: () => setManualSubmitting(false),
        });
    };

    const handleChangeStatus = () => {
        if (!changeStatusId || !shipment?.id) return;
        setChangeStatusSubmitting(true);
        const payload: { status_id: number; exception_reason?: string; note?: string } = { status_id: parseInt(changeStatusId, 10) };
        if (needsExceptionReason && exceptionReason) payload.exception_reason = exceptionReason;
        if (changeStatusNote.trim()) payload.note = changeStatusNote.trim();
        router.put(route('shipments.change-status', shipment.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setChangeStatusOpen(false);
                setExceptionReason('');
                setChangeStatusNote('');
                setChangeStatusSubmitting(false);
            },
            onError: () => setChangeStatusSubmitting(false),
            onFinish: () => setChangeStatusSubmitting(false),
        });
    };

    if (!shipment) {
        return (
            <AuthenticatedLayout>
                <Head title={t('shipments.table.tracking')} />
                <div className="py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[40vh]">
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title={`${t('shipments.table.tracking')} ${shipment.tracking_number}`} />

            <div className="py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* ── Return Alert Banner ────────────────────────────────────────────── */}
                {shipment.returnRequest && (
                    <div className={`mb-6 rounded-xl border-2 p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                        shipment.returnRequest.status === 'completed'
                            ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-600'
                            : shipment.returnRequest.status === 'rejected'
                            ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-700'
                            : 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-600'
                    }`}>
                        <div className={`p-2.5 rounded-full shrink-0 ${
                            shipment.returnRequest.status === 'completed' ? 'bg-gray-100 dark:bg-gray-700'
                            : shipment.returnRequest.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40'
                            : 'bg-orange-100 dark:bg-orange-900/40'
                        }`}>
                            <RefreshCw className={`h-5 w-5 ${
                                shipment.returnRequest.status === 'completed' ? 'text-gray-500'
                                : shipment.returnRequest.status === 'rejected' ? 'text-red-500'
                                : 'text-orange-600'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${
                                shipment.returnRequest.status === 'completed' ? 'text-gray-700 dark:text-gray-300'
                                : shipment.returnRequest.status === 'rejected' ? 'text-red-700 dark:text-red-400'
                                : 'text-orange-800 dark:text-orange-300'
                            }`}>
                                {t('returns.title')}: {shipment.returnRequest.return_number}
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                    shipment.returnRequest.status === 'completed'  ? 'bg-gray-200 text-gray-600' :
                                    shipment.returnRequest.status === 'rejected'   ? 'bg-red-200 text-red-700' :
                                    shipment.returnRequest.status === 'approved'   ? 'bg-blue-100 text-blue-700' :
                                    shipment.returnRequest.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                                    'bg-orange-200 text-orange-800'
                                }`}>
                                    {t(`returns.status_${shipment.returnRequest.status}`)}
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t(`returns.reason_${shipment.returnRequest.reason}`)}
                                {Number(shipment.returnRequest.refund_amount) > 0 && (
                                    <span className="ml-2 font-semibold text-red-600">
                                        — {t('returns.refund_amount')}: ${Number(shipment.returnRequest.refund_amount).toFixed(2)}
                                        {shipment.returnRequest.refund_method && ` (${t(`returns.method_${shipment.returnRequest.refund_method}`)})`}
                                    </span>
                                )}
                            </p>
                        </div>
                        <Link
                            href={route('returns.show', shipment.returnRequest.id)}
                            className="shrink-0 text-xs font-semibold text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1 whitespace-nowrap"
                        >
                            {t('common.view')} →
                        </Link>
                    </div>
                )}

                {/* Header compacto y claro */}
                <div className="mb-6">
                    <Link
                        href={route('shipments.index')}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('shipments.show.back_to_shipments')}
                    </Link>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-semibold tracking-tight">{shipment.tracking_number}</h1>
                            <Badge variant={getStatusVariant(shipment.status as ShipmentStatus)} className="capitalize shrink-0">
                                {shipment_statuses?.find(s => s.code === shipment.status)?.name ?? String(shipment.status ?? '').replace(/_/g, ' ')}
                            </Badge>
                            {shipment.origin_type === 'locker' && shipment.preAlert && (
                                <Link
                                    href={route('pre-alerts.show', shipment.preAlert.id)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200 transition-colors shrink-0"
                                >
                                    <Inbox className="w-3 h-3" />
                                    {t('pre_alerts.origin_label')}
                                    {shipment.preAlert.locker && ` · ${shipment.preAlert.locker.code}`}
                                </Link>
                            )}
                        </div>

                        {/* Acciones agrupadas: Impresión + Estado + Envío (solo APIs activas) */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(route('shipments.label', shipment.id), '_blank')}
                                    className="gap-1.5"
                                >
                                    <Printer className="h-4 w-4" />
                                    {t('shipments.show.print_label')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(route('invoices.show', shipment.id), '_blank')}
                                    className="gap-1.5"
                                >
                                    <Printer className="h-4 w-4" />
                                    {t('shipments.show.print_invoice')}
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.visit(route('shipments.edit', shipment.id))}
                                className="gap-1.5"
                            >
                                <Edit className="h-4 w-4" />
                                {t('shipments.show.edit_shipment')}
                            </Button>
                            {isUnpaid && (
                                <Button variant="default" size="sm" onClick={openManualPaymentModal} className="gap-1.5">
                                    <Banknote className="h-4 w-4" />
                                    {t('shipments.show.mark_as_paid')}
                                </Button>
                            )}
                            {notificationsActive.email && !notificationsActive.whatsapp && !notificationsActive.sms && (
                                <Button variant="outline" size="sm" onClick={() => setSendEmailOpen(true)} className="gap-1.5">
                                    <Mail className="h-4 w-4" />
                                    {t('shipments.wizard.send_email')}
                                </Button>
                            )}
                            {notificationsActive.whatsapp && !notificationsActive.email && !notificationsActive.sms && (
                                <Button variant="outline" size="sm" onClick={() => setSendWhatsappOpen(true)} className="gap-1.5">
                                    <MessageCircle className="h-4 w-4" />
                                    {t('shipments.wizard.send_whatsapp')}
                                </Button>
                            )}
                            {notificationsActive.sms && !notificationsActive.email && !notificationsActive.whatsapp && (
                                <Button variant="outline" size="sm" onClick={() => setSendSmsOpen(true)} className="gap-1.5">
                                    <Smartphone className="h-4 w-4" />
                                    {t('shipments.wizard.send_sms')}
                                </Button>
                            )}
                            {hasAnyNotifications && (notificationsActive.email ? 1 : 0) + (notificationsActive.whatsapp ? 1 : 0) + (notificationsActive.sms ? 1 : 0) >= 2 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            <Send className="h-4 w-4" />
                                            {t('shipments.show.send_actions')}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {notificationsActive.email && (
                                            <DropdownMenuItem onClick={() => setSendEmailOpen(true)}>
                                                <Mail className="h-4 w-4 mr-2" />
                                                {t('shipments.wizard.send_email')}
                                            </DropdownMenuItem>
                                        )}
                                        {notificationsActive.whatsapp && (
                                            <DropdownMenuItem onClick={() => setSendWhatsappOpen(true)}>
                                                <MessageCircle className="h-4 w-4 mr-2" />
                                                {t('shipments.wizard.send_whatsapp')}
                                            </DropdownMenuItem>
                                        )}
                                        {notificationsActive.sms && (
                                            <DropdownMenuItem onClick={() => setSendSmsOpen(true)}>
                                                <Smartphone className="h-4 w-4 mr-2" />
                                                {t('shipments.wizard.send_sms')}
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="detalles" className="w-full">
                            <div className="overflow-x-auto border-b border-border/80 mb-4">
                                <TabsList className="h-auto p-0 bg-transparent border-0 w-max min-w-full rounded-none gap-0 inline-flex">
                                    <TabsTrigger
                                        value="detalles"
                                        className="rounded-none border-b-[3px] border-transparent px-5 py-3 -mb-px text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold"
                                    >
                                        {t('shipments.show.tab_details')}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="pagos"
                                        className="rounded-none border-b-[3px] border-transparent px-5 py-3 -mb-px text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold"
                                    >
                                        {t('shipments.show.tab_payments')}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="activity"
                                        className="rounded-none border-b-[3px] border-transparent px-5 py-3 -mb-px text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold"
                                    >
                                        {t('shipments.show.tab_activity')}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="attachments"
                                        className="rounded-none border-b-[3px] border-transparent px-5 py-3 -mb-px text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {t('shipments.show.tab_attachments')}
                                            {(shipment.attachments?.length ?? 0) > 0 && (
                                                <span className="h-4 min-w-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center px-1 font-bold">
                                                    {shipment.attachments!.length}
                                                </span>
                                            )}
                                        </span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="detalles" className="mt-0 space-y-6">
                        {/* Route Info */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b bg-muted/30">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-primary" />
                                    {t('shipments.show.route_details')}
                                </h2>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {t('shipments.show.origin')}
                                        </span>
                                    </div>
                                    <div className="space-y-1 pl-10">
                                        <p className="font-medium">{shipment.sender_details?.name ?? '—'}</p>
                                        {shipment.sender_details?.company && <p className="text-sm text-muted-foreground">{shipment.sender_details.company}</p>}
                                        <p className="text-sm text-muted-foreground">{shipment.sender_details?.address}</p>
                                        <p className="text-sm text-muted-foreground">{shipment.sender_details?.city}, {shipment.sender_details?.country}</p>
                                        {shipment.sender_details?.phone && <p className="text-sm text-muted-foreground mt-1">{shipment.sender_details.phone}</p>}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {t('shipments.show.destination')}
                                        </span>
                                    </div>
                                    <div className="space-y-1 pl-10">
                                        <p className="font-medium">{shipment.receiver_details?.name ?? '—'}</p>
                                        {shipment.receiver_details?.company && <p className="text-sm text-muted-foreground">{shipment.receiver_details.company}</p>}
                                        <p className="text-sm text-muted-foreground">{shipment.receiver_details?.address}</p>
                                        <p className="text-sm text-muted-foreground">{shipment.receiver_details?.city}, {shipment.receiver_details?.country}</p>
                                        {shipment.receiver_details?.phone && <p className="text-sm text-muted-foreground mt-1">{shipment.receiver_details.phone}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Package Details (legacy package_details) */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b bg-muted/30">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Box className="h-4 w-4 text-primary" />
                                    {t('shipments.show.package_info')}
                                </h2>
                            </div>
                            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-xs font-medium uppercase text-muted-foreground">{t('shipments.show.weight')}</p>
                                    <p className="font-medium">{shipment.package_details?.weight ?? (shipment.package_details?.summary as any)?.total_weight ?? '—'} kg</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-muted-foreground">{t('shipments.show.pieces')}</p>
                                    <p className="font-medium">{shipment.package_details?.pieces ?? (shipment.package_details?.summary as any)?.total_pieces ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-muted-foreground">{t('shipments.show.service')}</p>
                                    <p className="font-medium capitalize">
                                        {((shipment as any).rate_data?.service_name
                                            ?? (shipment.service_type ?? '').replace(/^svc_/, '').replace(/_/g, ' '))
                                            || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-muted-foreground">{t('shipments.show.payment')}</p>
                                    <p className="font-medium capitalize">{getPaymentStatusLabel()}</p>
                                </div>
                                <div className="col-span-2 md:col-span-4">
                                    <p className="text-xs font-medium uppercase text-muted-foreground">{t('shipments.show.content_description')}</p>
                                    <p className="font-medium">{shipment.package_details?.content_description ?? (shipment.package_details?.packages as any)?.[0]?.content_description ?? (shipment.packages?.[0] as any)?.content_description ?? '—'}</p>
                                </div>
                                {(declaredValue != null && Number(declaredValue) > 0) && (
                                    <div className="col-span-2 md:col-span-4">
                                        <p className="text-xs font-medium uppercase text-muted-foreground">{t('shipments.show.declared_value')}</p>
                                        <p className="font-medium">{(shipment.currency ?? '')} {Number(declaredValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Packages breakdown (shipment_packages + items) */}
                        {shipment.packages && shipment.packages.length > 0 && (
                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b bg-muted/30">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <Box className="h-4 w-4 text-primary" />
                                        {t('shipments.show.packages_breakdown')}
                                    </h2>
                                </div>
                                <div className="p-5 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="py-2 pr-4">{t('shipments.show.pkg')}</th>
                                                <th className="py-2 pr-4">{t('shipments.show.weight')}</th>
                                                <th className="py-2 pr-4">{t('shipments.show.dimensions')}</th>
                                                <th className="py-2 pr-4">{t('shipments.wizard.chargeable')}</th>
                                                <th className="py-2 pr-4">{t('shipments.show.pieces')}</th>
                                                <th className="py-2 pr-4">{t('shipments.show.declared_value')}</th>
                                                <th className="py-2 text-right">{t('shipments.show.total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(shipment.packages ?? []).map((pkg, idx) => (
                                                <React.Fragment key={pkg.id}>
                                                    <tr className="border-b">
                                                        <td className="py-3 pr-4 font-medium">{t('shipments.wizard.box')} {idx + 1}</td>
                                                        <td className="py-3 pr-4">{Number(pkg.weight ?? 0).toFixed(2)} kg</td>
                                                        <td className="py-3 pr-4">{pkg.length && pkg.width && pkg.height ? `${pkg.length}×${pkg.width}×${pkg.height} cm` : '—'}</td>
                                                        <td className="py-3 pr-4">{Number(pkg.chargeable_weight ?? 0).toFixed(2)} kg</td>
                                                        <td className="py-3 pr-4">{pkg.pieces ?? 1}</td>
                                                        <td className="py-3 pr-4">{(pkg.currency ?? shipment.currency ?? '')} {Number(pkg.declared_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="py-3 text-right font-medium">{(pkg.currency ?? shipment.currency ?? '')} {Number(pkg.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                    {pkg.items && pkg.items.length > 0 && (
                                                        <tr>
                                                            <td colSpan={7} className="py-2 pl-8 pr-4 bg-muted/30">
                                                                <p className="text-xs font-medium text-muted-foreground mb-2">{t('shipments.show.items_per_package')}</p>
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="text-muted-foreground">
                                                                            <th className="text-left py-1">{t('shipments.wizard.item_desc')}</th>
                                                                            <th className="py-1">SKU</th>
                                                                            <th className="py-1">{t('shipments.wizard.qty')}</th>
                                                                            <th className="py-1">{t('shipments.wizard.unit')}</th>
                                                                            <th className="text-right py-1">{t('shipments.show.total')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {pkg.items.map((item) => (
                                                                            <tr key={item.id}>
                                                                                <td className="py-1">{item.description || '—'}</td>
                                                                                <td className="py-1">{item.sku || '—'}</td>
                                                                                <td className="py-1">{item.quantity ?? 0}</td>
                                                                                <td className="py-1">{(shipment.currency ?? '')} {Number(item.unit_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                                <td className="text-right py-1">{(shipment.currency ?? '')} {Number(item.total_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Costos y Tarifas */}
                        {hasCosts && (
                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b bg-muted/30">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-primary" />
                                        {t('shipments.show.costs_title')}
                                    </h2>
                                </div>
                                <div className="p-5">
                                    <div className="space-y-2">
                                        {shipment.subtotal != null && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('shipments.show.subtotal')}</span>
                                                <span className="font-medium">{(shipment.currency ?? '')} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {surchargesDisplay > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('shipments.show.surcharges')}</span>
                                                <span className="font-medium">{(shipment.currency ?? '')} {surchargesDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {shipment.tax != null && Number(shipment.tax) !== 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('shipments.show.tax')}</span>
                                                <span className="font-medium">{(shipment.currency ?? '')} {tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {shipment.discount != null && Number(shipment.discount) !== 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('shipments.show.discount')}</span>
                                                <span className="font-medium text-green-600">-{(shipment.currency ?? '')} {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {shipment.total != null && (
                                            <div className="flex justify-between pt-2 border-t font-semibold">
                                                <span>{t('shipments.show.total')}</span>
                                                <span>{(shipment.currency ?? '')} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-3 italic">{t('shipments.show.tax_origin_note')}</p>

                                    {/* Rate Breakdown: show WHY the cost was applied */}
                                    {rate_breakdown && (
                                        <div className="mt-4 border rounded-lg overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setRateOpen(v => !v)}
                                                className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-sm"
                                            >
                                                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                    <Receipt className="h-3.5 w-3.5" />
                                                    {t('shipments.show.rate_applied')}
                                                    {rate_breakdown.card_name && (
                                                        <span className="text-foreground ml-1">· {rate_breakdown.card_name}</span>
                                                    )}
                                                    {rate_breakdown.zone_name && (
                                                        <span className="text-foreground">· {rate_breakdown.zone_name}</span>
                                                    )}
                                                </span>
                                                {rateOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                            </button>
                                            {rateOpen && (
                                                <div className="px-3 py-3 space-y-1.5 text-xs bg-background">
                                                    {rate_breakdown.service_type && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_service_type')}</span>
                                                            <span className="font-medium capitalize">{rate_breakdown.service_type}</span>
                                                        </div>
                                                    )}
                                                    {(rate_breakdown.min_weight != null && rate_breakdown.max_weight != null) && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_weight_range')}</span>
                                                            <span className="font-medium">{rate_breakdown.min_weight} – {rate_breakdown.max_weight} kg</span>
                                                        </div>
                                                    )}
                                                    {rate_breakdown.chargeable_weight_rule && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_chargeable_weight')}</span>
                                                            <span className="font-medium capitalize">{rate_breakdown.chargeable_weight_rule}
                                                                {rate_breakdown.chargeable_weight_rule !== 'actual' && rate_breakdown.volumetric_divisor
                                                                    ? ` (÷${rate_breakdown.volumetric_divisor})` : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {rate_breakdown.flat_price != null && rate_breakdown.flat_price > 0 ? (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_flat_rate')}</span>
                                                            <span className="font-medium">{shipment.currency ?? ''} {rate_breakdown.flat_price.toFixed(2)}</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {rate_breakdown.price_per_kg != null && rate_breakdown.price_per_kg > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">{t('shipments.show.rate_per_kg')}</span>
                                                                    <span className="font-medium">{shipment.currency ?? ''} {rate_breakdown.price_per_kg.toFixed(4)}</span>
                                                                </div>
                                                            )}
                                                            {rate_breakdown.price_per_lb != null && rate_breakdown.price_per_lb > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">{t('shipments.show.rate_per_lb')}</span>
                                                                    <span className="font-medium">{shipment.currency ?? ''} {rate_breakdown.price_per_lb.toFixed(4)}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {rate_breakdown.min_charge != null && rate_breakdown.min_charge > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_min_charge')}</span>
                                                            <span className="font-medium">{shipment.currency ?? ''} {rate_breakdown.min_charge.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {(rate_breakdown.fuel_surcharge_percent ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_fuel_surcharge')}</span>
                                                            <span className="font-medium">{rate_breakdown.fuel_surcharge_percent}%</span>
                                                        </div>
                                                    )}
                                                    {(rate_breakdown.insurance_percent ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_insurance')}</span>
                                                            <span className="font-medium">{rate_breakdown.insurance_percent}%</span>
                                                        </div>
                                                    )}
                                                    {(rate_breakdown.tax_percent ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_tax_rate')}</span>
                                                            <span className="font-medium">{rate_breakdown.tax_percent}%</span>
                                                        </div>
                                                    )}
                                                    {(rate_breakdown.handling_fee ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_handling_fee')}</span>
                                                            <span className="font-medium">{shipment.currency ?? ''} {(rate_breakdown.handling_fee ?? 0).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {rate_breakdown.rounding_rule && rate_breakdown.rounding_rule !== 'none' && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">{t('shipments.show.rate_rounding')}</span>
                                                            <span className="font-medium capitalize">{rate_breakdown.rounding_rule}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                            </TabsContent>

                            <TabsContent value="pagos" className="mt-0">
                                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Receipt className="h-4 w-4 text-primary" />
                                            {t('shipments.show.payments_list')}
                                        </h2>
                                        {hasCosts && (
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getPaymentStatusColor()}`}>
                                            {getPaymentStatusLabel()}
                                        </span>
                                        )}
                                    </div>
                                    {hasCosts && (
                                    <div className="px-5 py-3 bg-muted/20 border-b grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('shipments.show.total')}</p>
                                            <p className="font-semibold text-sm">{(shipment.currency ?? '')} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('shipments.show.amount_paid')}</p>
                                            <p className="font-semibold text-sm text-green-600">{(shipment.currency ?? '')} {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('shipments.show.balance_due')}</p>
                                            <p className={`font-semibold text-sm ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{(shipment.currency ?? '')} {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                    )}
                                    <div className="p-5">
                                        <p className="text-[11px] text-muted-foreground mb-4 italic">{t('shipments.show.payment_activity_note')}</p>
                                        {(!shipment.payments || shipment.payments.length === 0) ? (
                                            <p className="text-sm text-muted-foreground py-4">{t('shipments.show.payments_empty')}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {shipment.payments.map((p) => (
                                                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm py-3 px-4 rounded-lg bg-muted/50 border">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium capitalize">{p.method}</span>
                                                                <span className="text-muted-foreground">{(p.currency ?? '')} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {t('shipments.show.payment_registered_by')}: {p.creator?.name ?? '—'} · {new Date(p.created_at).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {p.receipt_path && (
                                                            <a href={route('payments.receipt', p.id)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:underline text-xs flex items-center gap-1">
                                                                <FileText className="h-3 w-3" />
                                                                {t('shipments.show.view_receipt')}
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="activity" className="mt-0">
                                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-primary" />
                                            {t('shipments.show.tab_activity')}
                                        </h2>
                                        {shipment.activities && shipment.activities.length > 0 && (
                                            <span className="text-xs text-muted-foreground">{shipment.activities.length} {t('shipments.show.tab_activity').toLowerCase()}</span>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        {(!shipment.activities || shipment.activities.length === 0) ? (
                                            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                                                <Activity className="h-8 w-8 opacity-20" />
                                                <p className="text-sm">{t('shipments.show.activity_empty')}</p>
                                            </div>
                                        ) : (
                                            <div className="relative pl-5 border-l-2 border-muted/60 space-y-0">
                                                {[...shipment.activities].reverse().map((a, idx) => {
                                                    const action = a.action?.toLowerCase() ?? '';
                                                    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
                                                        status_changed:    { icon: <RefreshCw className="h-3.5 w-3.5" />,    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
                                                        status_change:     { icon: <RefreshCw className="h-3.5 w-3.5" />,    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
                                                        payment:           { icon: <Banknote className="h-3.5 w-3.5" />,     color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' },
                                                        payment_registered:{ icon: <Banknote className="h-3.5 w-3.5" />,     color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' },
                                                        notification:      { icon: <Mail className="h-3.5 w-3.5" />,         color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
                                                        exception:         { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400' },
                                                        created:           { icon: <Package className="h-3.5 w-3.5" />,      color: 'bg-primary/10 text-primary' },
                                                        updated:           { icon: <Edit className="h-3.5 w-3.5" />,         color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
                                                        note:              { icon: <FileText className="h-3.5 w-3.5" />,     color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
                                                        return_requested:  { icon: <RotateCcw className="h-3.5 w-3.5" />,   color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
                                                        return_updated:    { icon: <RotateCcw className="h-3.5 w-3.5" />,   color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
                                                    };
                                                    const fallback = { icon: <Activity className="h-3.5 w-3.5" />, color: 'bg-muted text-muted-foreground' };
                                                    const { icon, color } = iconMap[action] ?? fallback;
                                                    const actionKey = `shipments.show.activity_${action}`;
                                                    const actionLabel = t(actionKey as any) !== actionKey ? t(actionKey as any) : action.replace(/_/g, ' ');
                                                    const isLast = idx === shipment.activities!.length - 1;
                                                    return (
                                                        <div key={a.id} className={`relative flex gap-4 pb-6 ${isLast ? 'pb-0' : ''}`}>
                                                            {/* Icon */}
                                                            <div className={`absolute -left-[26px] top-0 h-7 w-7 rounded-full flex items-center justify-center ring-2 ring-background shadow-sm ${color}`}>
                                                                {icon}
                                                            </div>
                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0 bg-muted/20 rounded-lg px-4 py-3 border border-border/40">
                                                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-foreground leading-snug">{a.description}</p>
                                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${color}`}>
                                                                                {actionLabel}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {a.user?.name
                                                                                    ? <><span className="font-medium text-foreground/70">{a.user.name}</span></>
                                                                                    : <span className="italic">{t('shipments.show.by_system')}</span>
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <time className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                                                                        {new Date(a.created_at).toLocaleString()}
                                                                    </time>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-0">
                                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b bg-muted/30">
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Paperclip className="h-4 w-4 text-primary" />
                                            {t('shipments.show.tab_attachments')}
                                        </h2>
                                    </div>
                                    <div className="p-5">
                                        {(!shipment.attachments || shipment.attachments.length === 0) ? (
                                            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                                                <Paperclip className="h-8 w-8 opacity-20" />
                                                <p className="text-sm">{t('shipments.show.attachments_empty')}</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {shipment.attachments.map((att) => {
                                                    const isImage = att.mime_type?.startsWith('image/') ?? false;
                                                    const typeLabel = att.type === 'photo'
                                                        ? t('shipments.show.attachment_type_photo')
                                                        : att.type === 'payment_proof'
                                                            ? t('shipments.show.attachment_type_payment_proof')
                                                            : att.type;
                                                    return (
                                                        <div key={att.id} className="flex items-center gap-3 p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group">
                                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isImage ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                {isImage ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{att.original_name ?? typeLabel}</p>
                                                                <p className="text-xs text-muted-foreground">{typeLabel} · {new Date(att.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <a
                                                                href={route('shipments.attachments.download', att.id)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                                title={t('shipments.show.download_attachment')}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">

                        {/* Financial Summary */}
                        {hasCosts && (
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b bg-muted/30">
                                <h2 className="font-semibold flex items-center gap-2 text-sm">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                    {t('shipments.show.financial_summary')}
                                </h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('shipments.show.total')}</span>
                                    <span className="font-semibold">{(shipment.currency ?? '')} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {totalPaid > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('shipments.show.amount_paid')}</span>
                                    <span className="font-medium text-green-600">{(shipment.currency ?? '')} {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t('shipments.show.balance_due')}</span>
                                    <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {(shipment.currency ?? '')} {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {/* Payment progress bar */}
                                {total > 0 && (
                                <div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${isPaidFull ? 'bg-green-500' : isPartial ? 'bg-amber-500' : 'bg-red-400'}`}
                                            style={{ width: `${Math.min(100, (totalPaid / total) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mt-1.5">
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${getPaymentStatusColor()}`}>
                                            {getPaymentStatusLabel()}
                                        </span>
                                        {total > 0 && <span className="text-xs text-muted-foreground">{Math.round((totalPaid / total) * 100)}%</span>}
                                    </div>
                                </div>
                                )}
                                {isUnpaid && (
                                <Button size="sm" className="w-full gap-1.5 mt-1" onClick={openManualPaymentModal}>
                                    <Banknote className="h-4 w-4" />
                                    {t('shipments.show.mark_as_paid')}
                                </Button>
                                )}
                            </div>
                        </div>
                        )}

                        {/* Delivery Progress Stepper */}
                        {shipment_statuses && shipment_statuses.length > 0 && (
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                                <h2 className="font-semibold flex items-center gap-2 text-sm">
                                    <Package className="h-4 w-4 text-primary" />
                                    {t('shipments.show.delivery_progress')}
                                </h2>
                                {canChangeStatus && (
                                <button
                                    onClick={() => setChangeStatusOpen(true)}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    {t('shipments.show.change_status')}
                                </button>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="space-y-2">
                                    {shipment_statuses.map((st) => {
                                        const isCurrent = st.code === shipment.status;
                                        const isPassed = passedStatusIds.has(st.id);
                                        return (
                                            <div key={st.id} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${isCurrent ? 'bg-primary/10' : ''}`}>
                                                <div className="flex-shrink-0">
                                                    {isCurrent ? (
                                                        <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: st.color || '#94a3b8' }}>
                                                            <div className="h-2 w-2 rounded-full bg-white" />
                                                        </div>
                                                    ) : isPassed ? (
                                                        <CheckCircle2 className="h-5 w-5" style={{ color: st.color || '#94a3b8' }} />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                                <span className={`text-xs ${isCurrent ? 'font-semibold text-foreground' : isPassed ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                                                    {st.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Timeline */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b bg-muted/30">
                                <h2 className="font-semibold flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    {t('shipments.show.shipment_graph')}
                                </h2>
                            </div>
                            <div className="p-5">
                                <div className="relative pl-4 border-l-2 border-muted space-y-6">
                                    {shipment.history && shipment.history.length > 0 ? (
                                        shipment.history.map((event) => {
                                            const dotColor = getStatusDotColor((event as { status?: string }).status ?? '');
                                            return (
                                                <div key={event.id} className="relative">
                                                    <div
                                                        className="absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-2 ring-background shrink-0"
                                                        style={{ backgroundColor: dotColor }}
                                                    />
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-medium capitalize">{event.description}</span>
                                                        {event.location && <span className="text-xs text-muted-foreground">{event.location}</span>}
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(event.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">{t('shipments.show.no_history')}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Origin Pickup Card ── */}
                        {shipment.originPickup && (
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                                <h2 className="font-semibold flex items-center gap-2 text-sm">
                                    <Truck className="h-4 w-4 text-primary" />
                                    {t('pickups.detail')}
                                </h2>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    shipment.originPickup.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    shipment.originPickup.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    shipment.originPickup.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {t(`pickups.status_${shipment.originPickup.status}`)}
                                </span>
                            </div>
                            <div className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('pickups.contact_name')}</span>
                                    <span className="font-medium">{shipment.originPickup.contact_name}</span>
                                </div>
                                {shipment.originPickup.scheduled_for && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('pickups.scheduled_for')}</span>
                                    <span className="font-medium">{new Date(shipment.originPickup.scheduled_for).toLocaleDateString()}</span>
                                </div>
                                )}
                                <Link
                                    href={route('pickups.show', shipment.originPickup.id)}
                                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    {t('pickups.view')} →
                                </Link>
                            </div>
                        </div>
                        )}

                    </div>
                </div>
            </div>

            <Dialog open={changeStatusOpen} onOpenChange={(open) => { setChangeStatusOpen(open); if (!open) { setExceptionReason(''); setChangeStatusNote(''); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('shipments.show.change_status_modal_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('shipments.show.change_status_select_label')}</Label>
                            <SearchableStatusSelect
                                statuses={shipment_statuses}
                                value={changeStatusId}
                                onChange={(id) => { setChangeStatusId(id); if (!['exception','on_hold','returned'].includes(shipment_statuses?.find(s => s.id.toString() === id)?.code ?? '')) setExceptionReason(''); }}
                                placeholder={t('shipments.edit_status_placeholder')}
                                searchPlaceholder={t('shipments.show.search_status_placeholder') || "Buscar estado..."}
                                disabled={changeStatusSubmitting}
                            />
                        </div>
                        {needsExceptionReason && (
                            <div className="space-y-2">
                                <Label>{t('shipments.show.exception_reason_label')}</Label>
                                <Select value={exceptionReason} onValueChange={setExceptionReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('shipments.show.exception_reason_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXCEPTION_REASONS.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="status-note" className="flex items-center gap-1.5">
                                {t('shipments.show.change_status_note_label')}
                                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {t('forms.optional')}
                                </span>
                            </Label>
                            <Textarea
                                id="status-note"
                                value={changeStatusNote}
                                onChange={e => setChangeStatusNote(e.target.value)}
                                placeholder={t('shipments.show.change_status_note_placeholder')}
                                rows={3}
                                maxLength={1000}
                                disabled={changeStatusSubmitting}
                                className="resize-none text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {t('shipments.show.change_status_note_optional')}
                                {changeStatusNote.length > 0 && (
                                    <span className="ml-1 text-muted-foreground/60">{changeStatusNote.length}/1000</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setChangeStatusOpen(false); setChangeStatusNote(''); }}>{t('common.cancel')}</Button>
                        <Button onClick={handleChangeStatus} disabled={changeStatusSubmitting || !changeStatusId}>
                            {changeStatusSubmitting ? t('shipments.wizard.processing') : t('shipments.show.change_status_save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('shipments.wizard.send_email')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {sendEmailError && <p className="text-sm text-destructive">{sendEmailError}</p>}
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.email_to')}</Label>
                            <Input type="email" value={sendEmailTo} onChange={e => setSendEmailTo(e.target.value)} placeholder="email@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.email_subject')}</Label>
                            <Input value={sendEmailSubject} onChange={e => setSendEmailSubject(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.email_body')} ({t('forms.optional')})</Label>
                            <Textarea value={sendEmailBody} onChange={e => setSendEmailBody(e.target.value)} rows={4} placeholder={t('shipments.wizard.email_body_placeholder')} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSendEmailOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSendEmail} disabled={sendingEmail || !sendEmailTo}>
                            {sendingEmail ? t('shipments.wizard.processing') : t('shipments.wizard.send')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={sendWhatsappOpen} onOpenChange={setSendWhatsappOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('shipments.wizard.send_whatsapp')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {sendWhatsappError && <p className="text-sm text-destructive">{sendWhatsappError}</p>}
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.phone_to')}</Label>
                            <Input value={sendWhatsappTo} onChange={e => setSendWhatsappTo(e.target.value.replace(/[^\d+]/g, ''))} placeholder="+1234567890" inputMode="numeric" pattern="[0-9+]*" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.message')} ({t('forms.optional')})</Label>
                            <Textarea value={sendWhatsappMsg} onChange={e => setSendWhatsappMsg(e.target.value)} rows={3} placeholder={t('shipments.wizard.whatsapp_placeholder')} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSendWhatsappOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSendWhatsapp} disabled={sendingWhatsapp || !sendWhatsappTo}>
                            {sendingWhatsapp ? t('shipments.wizard.processing') : t('shipments.wizard.send')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={sendSmsOpen} onOpenChange={setSendSmsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('shipments.wizard.send_sms')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {sendSmsError && <p className="text-sm text-destructive">{sendSmsError}</p>}
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.phone_to')}</Label>
                            <Input value={sendSmsTo} onChange={e => setSendSmsTo(e.target.value.replace(/[^\d+]/g, ''))} placeholder="+1234567890" inputMode="numeric" pattern="[0-9+]*" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('shipments.wizard.message')} ({t('forms.optional')})</Label>
                            <Textarea value={sendSmsMsg} onChange={e => setSendSmsMsg(e.target.value)} rows={3} placeholder={t('shipments.wizard.sms_placeholder')} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSendSmsOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSendSms} disabled={sendingSms || !sendSmsTo}>
                            {sendingSms ? t('shipments.wizard.processing') : t('shipments.wizard.send')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={manualPaymentOpen} onOpenChange={(v) => { setManualPaymentOpen(v); if (!v) setManualError(null); }}>
                <DialogContent className="max-w-md">
                    <form onSubmit={handleManualPaymentSubmit}>
                        <DialogHeader>
                            <DialogTitle>{t('shipments.show.manual_payment_modal')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {manualError && <p className="text-sm text-destructive">{manualError}</p>}
                            <div className="space-y-2">
                                <Label htmlFor="manual-amount">{t('shipments.show.payment_amount')}</Label>
                                <Input
                                    id="manual-amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={manualAmount}
                                    onChange={e => setManualAmount(e.target.value)}
                                    placeholder={(shipment?.currency ?? '') + ' 0.00'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="manual-receipt">{t('shipments.show.payment_receipt')} *</Label>
                                <Input
                                    id="manual-receipt"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                                    onChange={e => setManualReceipt(e.target.files?.[0] ?? null)}
                                />
                                <p className="text-xs text-muted-foreground">{t('shipments.show.payment_receipt_formats')}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="manual-notes">{t('shipments.show.payment_notes')}</Label>
                                <Textarea id="manual-notes" value={manualNotes} onChange={e => setManualNotes(e.target.value)} rows={2} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setManualPaymentOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={manualSubmitting}>
                                {manualSubmitting ? t('shipments.wizard.processing') : t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
