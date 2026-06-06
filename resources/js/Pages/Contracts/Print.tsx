import { useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';

interface User     { id: number; name: string; email: string }
interface RateCard { id: number; name: string }
interface Contract {
    id: number;
    contract_number: string;
    title: string;
    terms: string | null;
    status: string;
    start_date: string;
    end_date: string | null;
    signed_at: string | null;
    created_at: string;
    customer: User;
    rate_card: RateCard | null;
    signed_by: User | null;
    signature_path: string | null;
    file_paths: string[] | null;
    file_path: string | null;
}
interface OrgData {
    name: string;
    legal_name: string;
    phone: string;
    email: string;
    address: string;
    logo_url: string | null;
}
interface Props { contract: Contract; org: OrgData }

const STATUS_LABELS: Record<string, string> = {
    draft:     'Draft',
    active:    'Active',
    expired:   'Expired',
    cancelled: 'Cancelled',
};

function fmt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ContractPrint() {
    const { contract, org } = usePage<{ props: Props }>().props as unknown as Props;

    useEffect(() => {
        const t = setTimeout(() => window.print(), 700);
        return () => clearTimeout(t);
    }, []);

    const statusLabel = STATUS_LABELS[contract.status] ?? contract.status;

    return (
        <>
            <Head title={`${contract.contract_number}`} />

            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Georgia', 'Times New Roman', serif;
                    font-size: 11pt;
                    color: #1a1a1a;
                    background: #fff;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 18mm 20mm 16mm;
                    position: relative;
                }

                /* ── Header ── */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 6mm;
                    padding-bottom: 5mm;
                    border-bottom: 2.5px solid #1a1a1a;
                }
                .org-side { flex: 1; }
                .org-logo { max-height: 52px; max-width: 150px; object-fit: contain; display: block; margin-bottom: 5px; }
                .org-name  { font-size: 13.5pt; font-weight: 700; letter-spacing: -0.01em; }
                .org-legal { font-size: 8.5pt; color: #555; margin-top: 1px; }
                .org-contact { font-size: 8pt; color: #666; margin-top: 4px; line-height: 1.5; }
                .doc-side { text-align: right; }
                .doc-label { font-size: 7.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.08em; }
                .doc-number { font-size: 20pt; font-weight: 700; font-family: 'Courier New', monospace; color: #1a1a1a; line-height: 1.1; margin-top: 2px; }
                .doc-subtitle { font-size: 8.5pt; color: #666; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
                .status-pill {
                    display: inline-block;
                    border: 1.5px solid #1a1a1a;
                    border-radius: 20px;
                    padding: 2px 10px;
                    font-size: 8pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin-top: 5px;
                }

                /* ── Section titles ── */
                .section-title {
                    font-size: 7.5pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #888;
                    border-bottom: 0.5px solid #ccc;
                    padding-bottom: 3px;
                    margin-bottom: 5mm;
                    margin-top: 6mm;
                }

                /* ── Details grid ── */
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4mm 8mm;
                    margin-bottom: 6mm;
                }
                .detail-cell {}
                .detail-label {
                    font-size: 7.5pt;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin-bottom: 1px;
                }
                .detail-value {
                    font-size: 10.5pt;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                .detail-value.mono {
                    font-family: 'Courier New', monospace;
                }

                /* ── Parties ── */
                .parties-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 5mm;
                    margin-bottom: 6mm;
                }
                .party-box {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 4mm 5mm;
                    background: #fafafa;
                }
                .party-role {
                    font-size: 7pt;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #999;
                    margin-bottom: 2px;
                }
                .party-name {
                    font-size: 12pt;
                    font-weight: 700;
                    color: #1a1a1a;
                }
                .party-email {
                    font-size: 8.5pt;
                    color: #666;
                    margin-top: 2px;
                }

                /* ── Terms ── */
                .terms-box {
                    border: 1px solid #e5e5e5;
                    border-radius: 4px;
                    padding: 5mm 6mm;
                    font-size: 10pt;
                    line-height: 1.65;
                    color: #333;
                    white-space: pre-wrap;
                    font-family: 'Georgia', serif;
                    background: #fdfdfb;
                    margin-bottom: 6mm;
                }

                /* ── Signatures ── */
                .sig-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12mm;
                    margin-top: 6mm;
                    page-break-inside: avoid;
                }
                .sig-block { }
                .sig-image-box {
                    height: 30mm;
                    border-bottom: 1.5px solid #1a1a1a;
                    display: flex;
                    align-items: flex-end;
                    padding-bottom: 2px;
                    margin-bottom: 3px;
                }
                .sig-image-box img {
                    max-height: 28mm;
                    max-width: 100%;
                    object-fit: contain;
                }
                .sig-blank {
                    height: 30mm;
                    border-bottom: 1.5px solid #1a1a1a;
                    margin-bottom: 3px;
                }
                .sig-label { font-size: 8.5pt; color: #555; }
                .sig-name  { font-size: 9.5pt; font-weight: 600; color: #1a1a1a; margin-top: 1px; }
                .sig-date  { font-size: 8pt; color: #888; margin-top: 1px; }

                /* ── Watermark for unsigned ── */
                .watermark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-35deg);
                    font-size: 72pt;
                    font-weight: 900;
                    color: rgba(0,0,0,0.04);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    pointer-events: none;
                    z-index: 0;
                    white-space: nowrap;
                    font-family: 'Georgia', serif;
                }

                /* ── Footer ── */
                .footer {
                    border-top: 0.5px solid #ccc;
                    padding-top: 4mm;
                    margin-top: 8mm;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 7.5pt;
                    color: #aaa;
                }

                @media screen {
                    body { background: #e5e7eb; padding: 20px; }
                    .page { background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.18); }
                }
                @media print {
                    html, body { margin: 0; padding: 0; background: #fff; }
                    .page { padding: 0; width: 100%; min-height: auto; box-shadow: none; }
                    @page { size: A4; margin: 18mm 20mm 16mm; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* Watermark if not signed */}
            {!contract.signed_at && (
                <div className="watermark">Draft</div>
            )}

            <div className="page">

                {/* ── HEADER ── */}
                <div className="header">
                    <div className="org-side">
                        {org.logo_url && <img src={org.logo_url} alt={org.name} className="org-logo" />}
                        <div className="org-name">{org.legal_name}</div>
                        {org.legal_name !== org.name && <div className="org-legal">{org.name}</div>}
                        <div className="org-contact">
                            {[org.phone, org.email].filter(Boolean).join('  ·  ')}
                            {org.address && <><br />{org.address}</>}
                        </div>
                    </div>
                    <div className="doc-side">
                        <div className="doc-label">Contract</div>
                        <div className="doc-number">{contract.contract_number}</div>
                        <div className="doc-subtitle">{contract.title}</div>
                        <div className="status-pill">{statusLabel}</div>
                    </div>
                </div>

                {/* ── PARTIES ── */}
                <div className="section-title">Parties</div>
                <div className="parties-grid">
                    <div className="party-box">
                        <div className="party-role">Service Provider</div>
                        <div className="party-name">{org.legal_name}</div>
                        <div className="party-email">{org.email}</div>
                    </div>
                    <div className="party-box">
                        <div className="party-role">Customer</div>
                        <div className="party-name">{contract.customer.name}</div>
                        <div className="party-email">{contract.customer.email}</div>
                    </div>
                </div>

                {/* ── DETAILS ── */}
                <div className="section-title">Contract Details</div>
                <div className="details-grid">
                    <div className="detail-cell">
                        <div className="detail-label">Contract #</div>
                        <div className="detail-value mono">{contract.contract_number}</div>
                    </div>
                    <div className="detail-cell">
                        <div className="detail-label">Rate Card</div>
                        <div className="detail-value">{contract.rate_card?.name ?? '—'}</div>
                    </div>
                    <div className="detail-cell">
                        <div className="detail-label">Start Date</div>
                        <div className="detail-value">{fmt(contract.start_date)}</div>
                    </div>
                    <div className="detail-cell">
                        <div className="detail-label">End Date</div>
                        <div className="detail-value">{fmt(contract.end_date)}</div>
                    </div>
                    <div className="detail-cell">
                        <div className="detail-label">Created</div>
                        <div className="detail-value">{fmt(contract.created_at)}</div>
                    </div>
                    {contract.signed_at && (
                        <div className="detail-cell">
                            <div className="detail-label">Signed</div>
                            <div className="detail-value">{fmt(contract.signed_at)}</div>
                        </div>
                    )}
                </div>

                {/* ── TERMS ── */}
                {contract.terms && (
                    <>
                        <div className="section-title">Terms & Conditions</div>
                        <div className="terms-box">{contract.terms}</div>
                    </>
                )}

                {/* ── SIGNATURES ── */}
                <div className="section-title">Signatures</div>
                <div className="sig-row">
                    {/* Provider side */}
                    <div className="sig-block">
                        {contract.signature_path ? (
                            <div className="sig-image-box">
                                <img src={`/storage/${contract.signature_path}`} alt="Authorized Signature" />
                            </div>
                        ) : (
                            <div className="sig-blank" />
                        )}
                        <div className="sig-label">Authorized Signature</div>
                        {contract.signed_by && (
                            <div className="sig-name">{contract.signed_by.name}</div>
                        )}
                        {contract.signed_at && (
                            <div className="sig-date">{fmt(contract.signed_at)}</div>
                        )}
                    </div>

                    {/* Customer side */}
                    <div className="sig-block">
                        <div className="sig-blank" />
                        <div className="sig-label">Customer Signature</div>
                        <div className="sig-name">{contract.customer.name}</div>
                        <div className="sig-date">&nbsp;</div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="footer">
                    <span>This document is a legally binding contract.</span>
                    <span>{contract.contract_number} · {org.legal_name}</span>
                </div>

            </div>
        </>
    );
}
