import { useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';

interface User {
    id: number;
    name: string;
}

interface Shipment {
    id: number;
    tracking_number: string;
    status: string;
}

interface OriginPickup {
    id: number;
    shipment: Shipment | null;
    requested_by: User | null;
    confirmed_by: User | null;
    contact_name: string;
    contact_phone: string;
    pickup_address: string;
    special_instructions: string | null;
    notes: string | null;
    scheduled_for: string;
    confirmed_at: string | null;
    completed_at: string | null;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    photos: string[] | null;
}

interface OrgData {
    name: string;
    legal_name: string;
    phone: string;
    email: string;
    address: string;
    logo_url: string | null;
}

interface Props {
    pickup: OriginPickup;
    org: OrgData;
    pickupRef: string;
    trackingUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
    pending:   'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export default function PickupPrint() {
    const { pickup, org, pickupRef, trackingUrl } = usePage<{ props: Props }>().props as unknown as Props;

    useEffect(() => {
        const timer = setTimeout(() => window.print(), 600);
        return () => clearTimeout(timer);
    }, []);

    const statusLabel = STATUS_LABELS[pickup.status] ?? pickup.status;
    const qrValue = trackingUrl || pickupRef;

    return (
        <>
            <Head title={`Pickup Receipt — ${pickupRef}`} />

            <style>{`
                * { box-sizing: border-box; }
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    font-size: 11pt;
                    color: #111;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                }
                .print-page {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 15mm;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #111;
                    margin-bottom: 14px;
                }
                .org-info { flex: 1; }
                .org-logo {
                    max-height: 50px;
                    max-width: 140px;
                    object-fit: contain;
                    margin-bottom: 6px;
                    display: block;
                }
                .org-name { font-size: 14pt; font-weight: 700; margin: 0 0 2px; }
                .org-legal { font-size: 9pt; color: #444; margin: 0 0 4px; }
                .org-contact { font-size: 8.5pt; color: #555; }
                .ref-block { text-align: right; }
                .ref-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
                .ref-number { font-size: 22pt; font-weight: 900; font-family: 'Courier New', monospace; color: #111; line-height: 1.1; }
                .doc-title { font-size: 9pt; color: #555; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
                .info-row {
                    display: grid;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .info-row-2 { grid-template-columns: 1fr 1fr; }
                .info-row-3 { grid-template-columns: 1fr 1fr 1fr; }
                .info-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
                .field { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 7px 10px; }
                .field-label { font-size: 7.5pt; color: #777; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
                .field-value { font-size: 10.5pt; font-weight: 600; color: #111; }
                .field-value.mono { font-family: 'Courier New', monospace; }
                .field-value.large { font-size: 12pt; }
                .address-row {
                    background: #f8f8f8;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 7px 10px;
                    margin-bottom: 10px;
                }
                .content-qr-row {
                    display: flex;
                    gap: 14px;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }
                .content-main { flex: 1; }
                .qr-block {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    min-width: 110px;
                }
                .qr-label { font-size: 7.5pt; color: #777; text-align: center; text-transform: uppercase; letter-spacing: 0.04em; }
                .instructions-block {
                    border: 1px dashed #bbb;
                    border-radius: 4px;
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    background: #fffdf0;
                }
                .instructions-label { font-size: 7.5pt; color: #777; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
                .instructions-text { font-size: 10pt; color: #333; }
                .photos-section { margin-bottom: 12px; }
                .photos-label { font-size: 7.5pt; color: #777; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
                .photos-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .photos-grid img {
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                }
                .divider { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
                .sig-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 20px;
                }
                .sig-box {
                    border-top: 1.5px solid #333;
                    padding-top: 6px;
                    text-align: center;
                    font-size: 9pt;
                    color: #555;
                }
                .footer {
                    border-top: 1px solid #ccc;
                    margin-top: 20px;
                    padding-top: 8px;
                    text-align: center;
                    font-size: 8pt;
                    color: #888;
                }
                .status-badge {
                    display: inline-block;
                    padding: 2px 10px;
                    border: 1.5px solid #333;
                    border-radius: 20px;
                    font-size: 9pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                @media print {
                    html, body { margin: 0; padding: 0; }
                    .print-page { padding: 0; width: 100%; min-height: auto; }
                    @page { size: A4; margin: 15mm; }
                    .no-print { display: none !important; }
                }
                @media screen {
                    body { background: #e5e7eb; padding: 20px; }
                    .print-page { background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.15); }
                }
            `}</style>

            <div className="print-page">
                {/* Header */}
                <div className="header">
                    <div className="org-info">
                        {org.logo_url && (
                            <img src={org.logo_url} alt={org.name} className="org-logo" />
                        )}
                        <p className="org-name">{org.legal_name}</p>
                        {org.legal_name !== org.name && <p className="org-legal">{org.name}</p>}
                        <p className="org-contact">
                            {[org.phone, org.email, org.address].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="ref-block">
                        <p className="ref-label">Pickup Receipt</p>
                        <p className="ref-number">{pickupRef}</p>
                        <p className="doc-title">Origin Pickup</p>
                    </div>
                </div>

                {/* Row 1: Ref / Tracking / Date / Status */}
                <div className="info-row info-row-4">
                    <div className="field">
                        <p className="field-label">Reference</p>
                        <p className="field-value mono">{pickupRef}</p>
                    </div>
                    <div className="field">
                        <p className="field-label">Tracking #</p>
                        <p className="field-value mono">{pickup.shipment?.tracking_number ?? '—'}</p>
                    </div>
                    <div className="field">
                        <p className="field-label">Scheduled</p>
                        <p className="field-value">{new Date(pickup.scheduled_for).toLocaleDateString()}</p>
                        <p style={{ fontSize: '8pt', color: '#666', marginTop: '1px' }}>{new Date(pickup.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="field">
                        <p className="field-label">Status</p>
                        <span className="status-badge">{statusLabel}</span>
                    </div>
                </div>

                {/* Row 2: Contact / Phone */}
                <div className="info-row info-row-2">
                    <div className="field">
                        <p className="field-label">Contact Name</p>
                        <p className="field-value large">{pickup.contact_name}</p>
                    </div>
                    <div className="field">
                        <p className="field-label">Contact Phone</p>
                        <p className="field-value large">{pickup.contact_phone}</p>
                    </div>
                </div>

                {/* Row 3: Address + QR */}
                <div className="content-qr-row">
                    <div className="content-main">
                        <div className="address-row">
                            <p className="field-label">Pickup Address</p>
                            <p className="field-value">{pickup.pickup_address}</p>
                        </div>

                        {/* Confirmed / Completed info */}
                        {(pickup.confirmed_by || pickup.confirmed_at) && (
                            <div className="info-row info-row-2" style={{ marginBottom: 0 }}>
                                {pickup.confirmed_by && (
                                    <div className="field">
                                        <p className="field-label">Confirmed By</p>
                                        <p className="field-value">{pickup.confirmed_by.name}</p>
                                    </div>
                                )}
                                {pickup.confirmed_at && (
                                    <div className="field">
                                        <p className="field-label">Confirmed At</p>
                                        <p className="field-value">{new Date(pickup.confirmed_at).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {pickup.completed_at && (
                            <div className="field" style={{ marginTop: '10px' }}>
                                <p className="field-label">Completed At</p>
                                <p className="field-value">{new Date(pickup.completed_at).toLocaleString()}</p>
                            </div>
                        )}
                    </div>

                    {/* QR Code */}
                    <div className="qr-block">
                        <QRCodeSVG value={qrValue} size={100} />
                        <p className="qr-label">Track Shipment</p>
                    </div>
                </div>

                {/* Special Instructions */}
                {pickup.special_instructions && (
                    <div className="instructions-block">
                        <p className="instructions-label">Special Instructions</p>
                        <p className="instructions-text">{pickup.special_instructions}</p>
                    </div>
                )}

                {/* Evidence Photos (completed pickups) */}
                {pickup.photos && pickup.photos.length > 0 && (
                    <div className="photos-section">
                        <p className="photos-label">Evidence Photos ({pickup.photos.length})</p>
                        <div className="photos-grid">
                            {pickup.photos.slice(0, 12).map((photo, i) => (
                                <img key={i} src={`/storage/${photo}`} alt={`Evidence ${i + 1}`} />
                            ))}
                        </div>
                    </div>
                )}

                <hr className="divider" />

                {/* Signature boxes */}
                <div className="sig-row">
                    <div className="sig-block">
                        <div style={{ height: '40px' }}></div>
                        <div className="sig-box">Driver Signature</div>
                    </div>
                    <div className="sig-block">
                        <div style={{ height: '40px' }}></div>
                        <div className="sig-box">Customer Signature</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="footer">
                    <p>This document is an official pickup receipt. · {org.legal_name} · {pickupRef}</p>
                </div>
            </div>
        </>
    );
}
