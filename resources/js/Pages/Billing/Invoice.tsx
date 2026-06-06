import { Head, Link } from '@inertiajs/react';
import { Printer, X, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/Components/UI/button';
import ProInvoiceTemplate from '@/Components/Invoices/ProInvoiceTemplate';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/Components/UI/dialog';
import { Label } from '@/Components/UI/label';
import { Input } from '@/Components/UI/input';
import { Textarea } from '@/Components/UI/textarea';
import { useTranslation } from '@/hooks/useTranslation';

/** Normalize shipment for ProInvoiceTemplate (package_details + shipment.packages). */
function normalizeShipment(shipment: any): any {
    const pd = shipment.package_details;
    const packagesArr = (pd?.packages ?? (Array.isArray(pd) ? pd : pd ? [pd] : [])) as any[];
    const summary = pd?.summary ?? {};
    const firstPkg = packagesArr[0] ?? (typeof pd === 'object' && pd !== null && !Array.isArray(pd) ? pd : {});
    const shipmentPkgs = shipment.packages && Array.isArray(shipment.packages) ? shipment.packages : [];
    const firstShipmentPkg = shipmentPkgs[0];
    const declaredFromShipmentPkg = firstShipmentPkg ? Number(firstShipmentPkg.declared_value) : null;
    const packageDetails = packagesArr.length ? packagesArr : [firstPkg].filter(Boolean);
    const normalizedPackages = packageDetails.map((p: any) => ({
        ...p,
        weight: p.weight ?? summary?.total_weight ?? pd?.weight,
        length: p.length ?? pd?.length,
        width: p.width ?? pd?.width,
        height: p.height ?? pd?.height,
        content: p.content ?? p.content_description ?? pd?.content_description ?? '',
        content_description: p.content_description ?? p.content ?? pd?.content_description ?? '',
        declared_value: p.declared_value ?? summary?.declared_value_total ?? pd?.declared_value ?? declaredFromShipmentPkg,
    }));
    const mergedPackageDetails = {
        ...pd,
        packages: normalizedPackages,
        0: normalizedPackages[0],
        label_content: pd?.label_content ?? normalizedPackages[0]?.content_description ?? pd?.content_description ?? firstShipmentPkg?.content_description ?? null,
        label_declared_value: pd?.label_declared_value ?? summary?.declared_value_total ?? normalizedPackages[0]?.declared_value ?? pd?.declared_value ?? declaredFromShipmentPkg ?? null,
    };
    const originCode = shipment.sender_details?.country_code ?? (shipment.sender_details?.country ? String(shipment.sender_details.country).slice(0, 2).toUpperCase() : null);
    const destCode = shipment.receiver_details?.country_code ?? (shipment.receiver_details?.country ? String(shipment.receiver_details.country).slice(0, 2).toUpperCase() : null);
    return {
        ...shipment,
        sender_id: shipment.sender_id ?? shipment.id,
        packages_count: shipment.packages_count ?? (summary?.total_pieces ?? (packageDetails.length || 1)),
        package_details: mergedPackageDetails,
        origin_country_code: shipment.origin_country_code ?? originCode ?? '—',
        destination_country_code: shipment.destination_country_code ?? destCode ?? '—',
        external_order_id: shipment.external_order_id ?? null,
        subtotal: shipment.subtotal ?? shipment.total ?? 0,
        tax: shipment.tax ?? 0,
        total: shipment.total ?? shipment.subtotal ?? 0,
    };
}

export default function Invoice({
    shipment,
    organization,
    billingSettings,
    trackingUrl,
    statusLabel,
}: {
    shipment: any;
    organization: any;
    billingSettings: any;
    trackingUrl?: string;
    statusLabel?: string;
}) {
    const { t } = useTranslation();
    const [emailOpen, setEmailOpen] = useState(false);
    // Usar solo email, nunca teléfono. Priorizar sender email, luego receiver email
    const defaultEmail = shipment?.sender_details?.email || shipment?.receiver_details?.email || '';
    const [emailTo, setEmailTo] = useState(defaultEmail);
    const [emailSubject, setEmailSubject] = useState(`${t('invoice.send_email_subject_placeholder')} ${shipment?.tracking_number ?? ''}`);
    const [emailBody, setEmailBody] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

    const normalizedShipment = normalizeShipment(shipment || {});
    const theme = (billingSettings?.invoice_theme === 'dhl' ? 'dhl' : 'fedex') as 'fedex' | 'dhl';

    const handlePrint = () => window.print();

    // Auto-print when opened with ?print=1
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('print') === '1') {
            setTimeout(() => window.print(), 600);
        }
    }, []);
    const handleClose = () => {
        if (window.opener) window.close();
        else if (shipment?.id && typeof route !== 'undefined') {
            window.location.href = route('shipments.show', shipment.id);
        } else if (shipment?.id) {
            window.location.href = `/shipments/${shipment.id}`;
        }
    };

    const handleSendEmail = async () => {
        setEmailSending(true);
        setEmailResult(null);
        const url = typeof route !== 'undefined' ? route('invoices.send-email', shipment?.id) : `/invoices/${shipment?.id}/send-email`;
        const csrf = document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1];
        const token = csrf ? decodeURIComponent(csrf) : '';
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': token,
                },
                body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
                credentials: 'same-origin',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && (data.success === true)) {
                setEmailResult({ success: true, message: data.message ?? t('invoice.send_email_success') });
                setTimeout(() => { setEmailOpen(false); setEmailResult(null); }, 2000);
            } else {
                setEmailResult({ success: false, message: data.message ?? data.error ?? t('invoice.send_email_error') });
            }
        } catch (e) {
            setEmailResult({ success: false, message: (e as Error).message ?? 'Network error.' });
        } finally {
            setEmailSending(false);
        }
    };

    return (
        <>
            <Head title={`Invoice #${shipment?.tracking_number ?? ''}`} />

            {/* Toolbar: hidden in print */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">Invoice #{shipment?.tracking_number}</span>
                    <span className="text-xs text-gray-500">A4 · Billing design</span>
                </div>
                <div className="flex items-center gap-2">
                    {shipment?.id && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('shipments.show', shipment.id)} className="gap-1.5">
                                <ExternalLink className="h-4 w-4" />
                                {t('invoice.view_shipment_details')}
                            </Link>
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)} className="gap-1.5">
                        <Mail className="h-4 w-4" />
                        {t('invoice.send_by_email')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                        <Printer className="h-4 w-4" />
                        {t('invoice.print')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClose} className="gap-1.5">
                        <X className="h-4 w-4" />
                        {t('invoice.close')}
                    </Button>
                </div>
            </div>

            {/* Spacer so content is not under fixed toolbar */}
            <div className="no-print h-14" />

            {/* Invoice content (printable) */}
            <div className="bg-gray-100 min-h-screen py-8 flex justify-center">
                <div className="bg-white shadow-lg print:shadow-none w-[210mm] min-h-[297mm]">
                    <ProInvoiceTemplate
                        shipment={normalizedShipment}
                        settings={billingSettings ?? {}}
                        theme={theme}
                        organization={organization}
                        trackingUrl={trackingUrl}
                        statusLabel={statusLabel}
                    />
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff; margin: 0; }
                    @page { margin: 0; size: A4; }
                }
            `}</style>

            {/* Send by Email modal */}
            <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('invoice.send_email_modal_title')}</DialogTitle>
                        <DialogDescription>
                            {t('invoice.send_email_modal_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('invoice.send_email_to')}</Label>
                            <Input
                                type="email"
                                value={emailTo}
                                onChange={(e) => setEmailTo(e.target.value)}
                                placeholder={t('invoice.send_email_to_placeholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('invoice.send_email_subject')}</Label>
                            <Input
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder={t('invoice.send_email_subject_placeholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('invoice.send_email_message')}</Label>
                            <Textarea
                                rows={4}
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder={t('invoice.send_email_message_placeholder')}
                            />
                        </div>
                        {emailResult && (
                            <p className={`text-sm ${emailResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {emailResult.message}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailOpen(false)}>{t('invoice.send_email_cancel')}</Button>
                        <Button onClick={handleSendEmail} disabled={emailSending || !emailTo.trim()}>
                            {emailSending ? t('invoice.send_email_sending') : t('invoice.send_email_send')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
