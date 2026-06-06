import { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate, formatWeight, formatDimensions } from '@/utils/localeFormat';
import { useTranslation } from '@/hooks/useTranslation';

function formatAddress(d: { address?: string; address_line2?: string; city?: string; state?: string; zip_code?: string; country?: string } | null): string {
    if (!d) return '';
    const parts = [d.address, d.address_line2, d.city, d.state, d.zip_code, d.country].filter(Boolean);
    return parts.join(', ') || '';
}

/** Siglas PAÍS-CIUDAD (ej. US-LOS). Si el valor parece dirección completa, las calcula desde details. */
function getSiglas(val: string | undefined, details: { country_code?: string; country?: string; city?: string } | null): string {
    if (!val) return '—';
    if (val.includes(',') || val.length > 20) {
        if (!details) return '—';
        const cc = (details.country_code || details.country || '').toString().toUpperCase().slice(0, 2);
        const city = (details.city || '').toString().trim();
        const citySigla = city.includes(' ') ? city.split(/\s+/).map(w => w[0]).join('').slice(0, 3) : city.slice(0, 3);
        if (!cc && !citySigla) return '—';
        return `${cc || '—'}-${citySigla || '—'}`.replace(/^-|-$/g, '').trim() || '—';
    }
    return val.replace(/\s*-\s*/g, '-').trim() || '—';
}

export default function Label({ shipment, label_config, tracking_url }: { shipment: any, label_config: any, tracking_url?: string }) {
    const { t } = useTranslation();
    const config = label_config || {};
    const theme = config.theme || 'fedex';
    const paperSize = config.paper_size || '4x6';
    const outputFormat = config.output_format || 'pdf';
    const senderAddress = formatAddress(shipment.sender_details) || shipment.sender_details?.address || '';
    const receiverAddress = formatAddress(shipment.receiver_details) || shipment.receiver_details?.address || '';
    const originSiglas = getSiglas(shipment.origin, shipment.sender_details);
    const destSiglas = getSiglas(shipment.destination, shipment.receiver_details);

    // Derived CSS classes for paper size
    const sizeClass = paperSize === 'a4' ? 'w-[210mm] h-[297mm]'
        : (paperSize === '10x15' ? 'w-[10cm] h-[15cm]' : 'w-[4in] h-[6in]');

    const downloadZpl = () => {
        const trk = shipment.tracking_number || '';
        const senderName = (shipment.sender_details?.name || shipment.sender_details?.company || '').substring(0, 30);
        const senderAddr = (shipment.sender_details?.address || '').substring(0, 40);
        const senderCity = [shipment.sender_details?.city, shipment.sender_details?.state, shipment.sender_details?.zip_code].filter(Boolean).join(', ').substring(0, 40);
        const receiverName = (shipment.receiver_details?.name || shipment.receiver_details?.company || '').substring(0, 30);
        const receiverAddr = (shipment.receiver_details?.address || '').substring(0, 40);
        const receiverCity = [shipment.receiver_details?.city, shipment.receiver_details?.state, shipment.receiver_details?.zip_code].filter(Boolean).join(', ').substring(0, 40);
        const weight = shipment.package_details?.label_weight ?? shipment.package_details?.summary?.total_weight ?? '';
        const zpl = [
            '^XA',
            '^CF0,30',
            `^FO30,20^FD${config.company_name || ''}^FS`,
            '^CF0,22',
            `^FO30,60^FDFrom: ${senderName}^FS`,
            `^FO30,85^FD${senderAddr}^FS`,
            `^FO30,110^FD${senderCity}^FS`,
            `^FO30,145^FDTo: ${receiverName}^FS`,
            `^FO30,170^FD${receiverAddr}^FS`,
            `^FO30,195^FD${receiverCity}^FS`,
            `^FO30,230^FDWeight: ${weight}^FS`,
            '^BY2,3,80',
            `^FO30,270^BCN,80,Y,N,N^FD${trk}^FS`,
            `^FO30,380^CF0,28^FD${trk}^FS`,
            '^XZ',
        ].join('\n');
        const blob = new Blob([zpl], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `label-${trk}.zpl`;
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        // ZPL format: do not auto-trigger browser print
        if (outputFormat === 'zpl') return;

        const triggerPrint = () => setTimeout(() => window.print(), 300);
        if (config.barcode_type === 'qr') {
            triggerPrint();
            return;
        }
        import('jsbarcode').then((JsBarcode) => {
            try {
                const el = document.getElementById('barcode');
                if (el) {
                    JsBarcode.default(el, shipment.tracking_number, {
                        format: config.barcode_type === 'code39' ? 'CODE39' : 'CODE128',
                        displayValue: false,
                        margin: 4,
                        height: 60,
                        width: 3,
                        lineColor: '#000000',
                        background: '#ffffff',
                    });
                    triggerPrint();
                }
            } catch (e) {
                console.error(e);
                triggerPrint();
            }
        });
    }, [shipment.tracking_number, config.barcode_type, outputFormat]);

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 print:bg-white print:m-0 print:p-0">
            <Head>
                <title>{`${shipment.tracking_number}`}</title>
            </Head>

            {/* Print Toolbar (Screen Only) */}
            <div className="fixed top-4 right-4 z-50 no-print flex gap-2">
                {outputFormat === 'zpl' ? (
                    <button
                        onClick={downloadZpl}
                        className="bg-gray-900 text-white px-4 py-2 rounded shadow-lg font-bold hover:bg-gray-700 flex items-center gap-2 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {t('shipments.label.download_zpl', { defaultValue: 'Download ZPL' })}
                    </button>
                ) : (
                    <button
                        onClick={() => window.print()}
                        className="bg-gray-900 text-white px-4 py-2 rounded shadow-lg font-bold hover:bg-gray-700 flex items-center gap-2 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        {t('shipments.label.print')}
                    </button>
                )}
                <button
                    onClick={() => window.close()}
                    className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow-lg font-bold hover:bg-gray-50 flex items-center gap-2 transition"
                >
                    {t('shipments.label.close')}
                </button>
            </div>

            <style>{`
                @page { size: ${paperSize === 'a4' ? 'A4' : (paperSize === '10x15' ? '10cm 15cm' : '4in 6in')}; margin: 0; }
                @media print { 
                    body { background: white; margin: 0; } 
                    .no-print { display: none !important; }
                    .label { overflow: visible; }
                    .tracking-box, .tracking-box .body, .tracking-box .barcode-wrap, .tracking-box .qr-box { 
                        -webkit-print-color-adjust: exact; print-color-adjust: exact; 
                        background: #fff !important; visibility: visible !important; opacity: 1 !important;
                    }
                    .tracking-box .barcode-wrap svg, .tracking-box .qr-box svg { 
                        visibility: visible !important; opacity: 1 !important;
                        -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    }
                }
                
                .label { 
                    width: ${paperSize === 'a4' ? '210mm' : (paperSize === '10x15' ? '100mm' : '4in')}; 
                    min-height: ${paperSize === 'a4' ? '297mm' : (paperSize === '10x15' ? '150mm' : '6in')}; 
                    background: #fff; color: #111; 
                    border: 1px solid #cfcfcf; 
                    position: relative; overflow: visible; 
                    font-family: Arial, Helvetica, sans-serif;
                    display: flex; flex-direction: column;
                }
                .label * { box-sizing: border-box; }
                
                /* Themes */
                .label[data-theme="fedex"] { --brand: #4f46e5; --brand2:#22c55e; --bar:#0b1020; --soft:#f4f6ff; }
                .label[data-theme="ups"] { --brand: #5b3a12; --brand2:#f59e0b; --bar:#241407; --soft:#fff7ed; }
                .label[data-theme="dhl"] { --brand: #ef4444; --brand2:#f59e0b; --bar:#1b1b1b; --soft:#fff7ed; }
                .label[data-theme="ml"] { --brand: #f59e0b; --brand2:#111827; --bar:#0f172a; --soft:#fffbeb; }

                .top { display: grid; grid-template-columns: 1fr auto; gap: 6px; padding: 8px 10px 6px 10px; border-bottom: 2px solid #e5e7eb; background: linear-gradient(180deg, var(--soft), #fff); }
                .brandbox { display: flex; align-items: center; gap: 8px; min-width: 0; }
                .brandmark { width: 10px; height: 28px; background: var(--brand); border-radius: 4px; }
                .brandname { font-weight: 800; font-size: 15px; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--brand); }
                .brandlogo { height: 28px; width: auto; max-width: 120px; object-fit: contain; }
                .meta { text-align: right; font-size: 11px; line-height: 1.25; color: #374151; white-space: nowrap; }
                .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #fff; border: 1px solid #e5e7eb; font-weight: 700; color: var(--bar); }

                .grid-lbl { padding: 4px 10px 0 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
                .card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
                .card .hd { background: var(--bar); color: #fff; padding: 4px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
                .card .bd { padding: 3px 6px; font-size: 10px; line-height: 1.2; color: #111; min-height: 44px; }
                .muted { color: #6b7280; font-size: 11px; }
                .big { font-size: 13px; font-weight: 800; }
                .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                .k { font-weight: 800; color:#111; }

                .route { margin: 4px 10px 0 10px; border: 2px solid var(--bar); border-radius: 8px; overflow: hidden; display: grid; grid-template-columns: 1fr auto; }
                .route .left { padding: 6px 8px; background: #fff; }
                .route .right { padding: 6px 8px; background: var(--bar); color: #fff; text-align: center; min-width: 72px; display: grid; place-items: center; }
                .route .code { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
                .route .svc { font-size: 10px; font-weight: 900; color: var(--brand); }
                .route .row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; font-size: 10px; color: #374151; }

                .tracking-box { margin: 4px 10px 6px 10px; border: 2px solid #111; border-radius: 10px; overflow: visible; flex-shrink: 0; }
                .tracking-box .toph { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: #111; color: #fff; font-weight: 900; text-transform: uppercase; font-size: 10px; }
                .tracking-box .num { font-size: 16px; font-weight: 900; letter-spacing: .6px; }
                .tracking-box .body { padding: 6px 8px 8px 8px; display: grid; grid-template-columns: 1fr 100px; gap: 8px; align-items: center; }
                .tracking-box .barcode-wrap { min-height: 60px; width: 100%; display: flex; align-items: center; justify-content: center; background: #fff; }
                .tracking-box .barcode-wrap svg { max-width: 100%; height: 60px; image-rendering: crisp-edges; image-rendering: pixelated; }
                .qr-box { width: 100px; height: 100px; min-width: 100px; min-height: 100px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
                .qr-box svg { image-rendering: crisp-edges; image-rendering: pixelated; }

                .foot { padding: 4px 8px 6px 8px; border-top: 2px dashed #d1d5db; display: flex; justify-content: space-between; align-items: flex-end; gap: 6px; background: #fff; margin-top: 4px; flex-shrink: 0; }
                .small { font-size: 9px; color: #6b7280; line-height: 1.2; }
                .stamp { font-size: 9px; padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; text-align: right; }
                ${config.custom_css || ''}
             `}</style>

            <div className="label bg-white shadow-lg print:shadow-none" data-theme={theme || 'fedex'}>
                {/* Header */}
                <header className="top">
                    <div className="brandbox">
                        {config.show_logo !== false && (
                            <>
                                {config.company_logo_url ? (
                                    <img src={config.company_logo_url} alt={config.company_name || ''} className="brandlogo" />
                                ) : (
                                    <>
                                        <div className="brandmark"></div>
                                        <div className="brandname">{config.company_name || '—'}</div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <div className="meta">
                        <div className="pill">
                            {((shipment as any).rate_data?.service_name
                                ?? (shipment.service_type ?? '').replace(/^svc_/, '').replace(/_/g, ' ').toUpperCase())
                                || '—'}
                        </div><br />
                        <span className="muted">{t('shipments.label.date')}</span> <span className="mono">{shipment.label_date ? formatDate(shipment.label_date) : formatDate(shipment.ship_date || shipment.created_at)}</span><br />
                        <span className="muted">{t('shipments.label.weight')}</span> <span className="mono">{formatWeight(shipment.package_details?.label_weight ?? shipment.package_details?.summary?.total_weight ?? shipment.package_details?.weight) || '—'}</span><br />
                        <span className="muted">{t('shipments.label.pieces')}</span> <span className="mono">{shipment.package_details?.label_pieces ?? shipment.package_details?.summary?.total_pieces ?? shipment.package_details?.pieces ?? '—'}</span>
                    </div>
                </header>

                {/* Addresses */}
                <div className="grid-lbl">
                    <div className="card">
                        <div className="hd">
                            <span>{t('shipments.label.sender')}</span>
                            <span className="mono">{originSiglas}</span>
                        </div>
                        <div className="bd">
                            <div className="big">{shipment.sender_details?.name}</div>
                            <div>{senderAddress}</div>
                            {config.show_phone !== false && shipment.sender_details?.phone && <div className="muted">{shipment.sender_details.phone}</div>}
                        </div>
                    </div>
                    <div className="card">
                        <div className="hd">
                            <span>{t('shipments.label.recipient')}</span>
                            <span className="mono">{destSiglas}</span>
                        </div>
                        <div className="bd">
                            <div className="big">{shipment.receiver_details?.name}</div>
                            <div>{receiverAddress}</div>
                            {config.show_phone !== false && shipment.receiver_details?.phone && <div className="muted">{shipment.receiver_details.phone}</div>}
                        </div>
                    </div>
                </div>

                {/* Route */}
                <div className="route">
                    <div className="left">
                        <div className="svc">
                            {((shipment as any).rate_data?.service_name
                                ?? (shipment.service_type ?? '').replace(/^svc_/, '').replace(/_/g, ' ').toUpperCase())
                                || '—'}
                        </div>
                        <div className="row">
                            <div><span className="k">Org:</span> <span className="mono">{originSiglas}</span><br /><span className="muted text-[10px]">{t('shipments.label.address')} {shipment.origin_address || senderAddress || '—'}</span></div>
                            <div><span className="k">Dest:</span> <span className="mono">{destSiglas}</span><br /><span className="muted text-[10px]">{t('shipments.label.address')} {shipment.destination_address || receiverAddress || '—'}</span></div>
                        </div>
                    </div>
                    <div className="right">
                        <div className="muted text-white opacity-90 font-extrabold">SORT</div>
                        <div className="code">{(shipment.receiver_details?.city ?? shipment.destination ?? 'X').toString().substring(0, 1).toUpperCase()}1</div>
                    </div>
                </div>

                {/* Tracking */}
                <div className="tracking-box">
                    <div className="toph">
                        <div>{t('shipments.label.tracking')}</div>
                        <div className="num mono">{shipment.tracking_number}</div>
                    </div>
                    <div className="body">
                        {config.barcode_type !== 'qr' ? (
                            <div className="barcode-wrap">
                                <svg id="barcode"></svg>
                            </div>
                        ) : (
                            <div className="w-full min-h-[60px] flex items-center justify-center bg-gray-100 text-xs font-bold text-gray-400">{t('shipments.label.qr_selected')}</div>
                        )}
                        <div className="qr-box">
                            <QRCodeSVG
                                value={tracking_url || (typeof window !== 'undefined' ? `${window.location.origin}/tracking?tracking_number=${encodeURIComponent(shipment.tracking_number)}` : '')}
                                size={90}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="foot">
                    <div className="small">
                        <div><b>{t('shipments.label.content')}</b> {(shipment.package_details?.label_content ?? shipment.package_details?.content_description ?? shipment.package_details?.packages?.[0]?.content_description) || '—'}</div>
                        <div><b>{t('shipments.label.declared')}</b> <span className="mono">{shipment.package_details?.label_declared_value != null && Number(shipment.package_details.label_declared_value) > 0 ? `${shipment.currency ?? 'USD'} ${Number(shipment.package_details.label_declared_value).toFixed(2)}` : (shipment.total != null ? `${shipment.currency ?? 'USD'} ${Number(shipment.total).toFixed(2)}` : '—')}</span></div>
                    </div>
                    <div className="stamp">
                        <div className="font-black">{t('shipments.label.received_delivered')}</div>
                        <div className="muted">{t('shipments.label.signature')}</div>
                        <div className="h-[14px]"></div>
                        <div className="muted mono">{t('shipments.label.ref')} {shipment.reference_number ?? shipment.reference ?? (shipment.uuid ? String(shipment.uuid).substring(0, 8) : '—')}</div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
