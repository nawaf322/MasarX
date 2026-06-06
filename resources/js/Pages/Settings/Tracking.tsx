import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { SettingsField } from './_components/SettingsField';
import { SettingsSaveBar } from './_components/SettingsSaveBar';
import { Switch } from "@/Components/UI/switch";
import { Label } from "@/Components/UI/label";
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from '@inertiajs/react';
import { Info, ExternalLink } from 'lucide-react';

const PREVIEW_TRACKING_SAMPLE = 'TRK00000001';

export default function Tracking({ sequences, label_config, default_structure, company_name, company_logo_url }: { sequences: any, label_config: any, default_structure: any, company_name?: string, company_logo_url?: string | null }) {
    const { t } = useTranslation();
    const alert = useSweetAlert();

    const [labelsData, setLabelsData] = useState({
        paper_size: label_config?.paper_size || '4x6',
        output_format: label_config?.output_format || 'pdf',
        barcode_type: label_config?.barcode_type || 'code128',
        theme: label_config?.theme || 'fedex',
        show_logo: label_config?.show_logo !== undefined ? label_config.show_logo : true,
        show_phone: label_config?.show_phone !== undefined ? label_config.show_phone : false,
        custom_css: label_config?.custom_css || '',
    });
    const [labelsProcessing, setLabelsProcessing] = useState(false);

    // Proxy to keep template refs unchanged
    const labelsForm = {
        data: labelsData,
        setData: (key: string, val: any) => setLabelsData(p => ({ ...p, [key]: val })),
        processing: labelsProcessing,
        isDirty: true,
    };

    const submitLabels = async (e: React.FormEvent) => {
        e.preventDefault();
        setLabelsProcessing(true);
        try {
            const { data } = await axios.post(route('settings.tracking.labels.update'), labelsData);
            alert.success(t('settings.tracking.label_settings_saved'));
        } catch (err: any) {
            alert.error(t('settings.tracking.label_update_failed'));
        } finally {
            setLabelsProcessing(false);
        }
    };

    const trackingNumber = PREVIEW_TRACKING_SAMPLE;
    const previewTheme = labelsForm.data.theme;
    const trackingUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/tracking?tracking_number=${encodeURIComponent(trackingNumber)}`
        : `/tracking?tracking_number=${trackingNumber}`;

    // Load barcode into preview SVG
    useEffect(() => {
        if (labelsForm.data.barcode_type === 'qr') return;
        import('jsbarcode').then((JsBarcode) => {
            try {
                JsBarcode.default("#barcode-preview", trackingNumber, {
                    format: labelsForm.data.barcode_type === 'code39' ? 'CODE39' : 'CODE128',
                    displayValue: false,
                    margin: 0,
                    height: 50,
                    width: 2,
                    lineColor: "#000"
                });
            } catch (e) {
                console.error(e);
            }
        });
    }, [trackingNumber, labelsForm.data.barcode_type]);

    const handlePrintTest = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const htmlContent = document.getElementById('label-preview-container')?.innerHTML;
            const style = document.getElementById('label-styles')?.innerHTML;
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Test Label - ${trackingNumber}</title>
                        <style>${style}</style>
                        <style>
                            body { margin: 0; background: white; display:flex; justify-content:center; align-items:center; height:100vh; }
                            .label { border: none !important; box-shadow: none !important; }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                        <script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <SettingsLayout title={t('settings.tracking.title')}>
            <SettingsShell
                description={t('settings.tracking.desc')}
            >
                {/* Info banner — link to Shipping Configuration for numbering */}
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                        {t('settings.tracking.numbering_managed_in_shipping')}{' '}
                        <Link href={route('settings.shipping-config')} className="font-semibold underline hover:text-blue-900 dark:hover:text-blue-100">
                            {t('settings.shipping_config.title')}
                        </Link>.
                        {' '}{t('settings.tracking.this_page_desc')}
                    </span>
                </div>

                {/* ── Live label preview ───────────────────────────────────── */}
                <div className="bg-muted/40 rounded-xl border border-border p-6 flex flex-col items-center gap-5">
                    <div className="flex w-full justify-between items-center max-w-[4in]">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('settings.tracking.preview_title')}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.tracking.preview_subtitle')}
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <Select value={labelsForm.data.theme} onValueChange={(val) => labelsForm.setData('theme', val)}>
                                <SelectTrigger className="h-8 text-xs w-[130px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fedex">FedEx Theme</SelectItem>
                                    <SelectItem value="ups">UPS Theme</SelectItem>
                                    <SelectItem value="dhl">DHL Theme</SelectItem>
                                    <SelectItem value="ml">MercadoLibre</SelectItem>
                                </SelectContent>
                            </Select>
                            <button
                                type="button"
                                onClick={handlePrintTest}
                                className="bg-foreground text-background text-xs px-3 py-1.5 rounded hover:opacity-80 transition"
                            >
                                {t('settings.tracking.print_test_label')}
                            </button>
                        </div>
                    </div>

                    {/* Label container (mirrors Shipments/Label.tsx structure & styles) */}
                    <div id="label-preview-container">
                        <style id="label-styles">{`
                            .label { width: 4in; height: 6in; background: #fff; color: #111; border: 1px solid #cfcfcf; position: relative; overflow: hidden; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1); display: flex; flex-direction: column; }
                            .label * { box-sizing: border-box; }
                            .label[data-theme="fedex"] { --brand: #4f46e5; --brand2:#22c55e; --bar:#0b1020; --soft:#f4f6ff; }
                            .label[data-theme="ups"]   { --brand: #5b3a12; --brand2:#f59e0b; --bar:#241407; --soft:#fff7ed; }
                            .label[data-theme="dhl"]   { --brand: #ef4444; --brand2:#f59e0b; --bar:#1b1b1b; --soft:#fff7ed; }
                            .label[data-theme="ml"]    { --brand: #f59e0b; --brand2:#111827; --bar:#0f172a; --soft:#fffbeb; }
                            .top { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px 12px 8px 12px; border-bottom: 2px solid #e5e7eb; background: linear-gradient(180deg, var(--soft), #fff); }
                            .brandbox { display: flex; align-items: center; gap: 10px; min-width: 0; }
                            .brandmark { width: 12px; height: 38px; background: var(--brand); border-radius: 4px; }
                            .brandname { font-weight: 800; font-size: 18px; line-height: 1.05; color: var(--brand); }
                            .brandlogo { height: 38px; width: auto; max-width: 140px; object-fit: contain; }
                            .meta { text-align: right; font-size: 11px; line-height: 1.4; color: #374151; white-space: nowrap; }
                            .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #fff; border: 1px solid #e5e7eb; font-weight: 700; color: var(--bar); }
                            .grid-lbl { padding: 10px 12px 0 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                            .card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
                            .card .hd { background: var(--bar); color: #fff; padding: 6px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
                            .card .bd { padding: 8px; font-size: 12px; line-height: 1.25; color: #111; min-height: 92px; }
                            .muted { color: #6b7280; font-size: 11px; }
                            .big { font-size: 13px; font-weight: 800; }
                            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                            .k { font-weight: 800; color: #111; }
                            .route { margin: 10px 12px 0 12px; border: 2px solid var(--bar); border-radius: 12px; overflow: hidden; display: grid; grid-template-columns: 1fr auto; }
                            .route .left { padding: 10px; background: #fff; }
                            .route .right { padding: 10px; background: var(--bar); color: #fff; text-align: center; min-width: 92px; display: grid; place-items: center; }
                            .route .code { font-size: 30px; font-weight: 900; letter-spacing: 2px; }
                            .route .svc { font-size: 12px; font-weight: 900; color: var(--brand); }
                            .route .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; font-size: 11px; color: #374151; }
                            .tracking-box { margin: 10px 12px 0 12px; border: 2px solid #111; border-radius: 12px; overflow: hidden; }
                            .tracking-box .toph { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #111; color: #fff; font-weight: 900; text-transform: uppercase; font-size: 11px; }
                            .tracking-box .num { font-size: 16px; font-weight: 900; letter-spacing: .6px; }
                            .tracking-box .body { padding: 8px 10px 10px 10px; display: grid; grid-template-columns: 1fr 86px; gap: 10px; align-items: center; }
                            .tracking-box svg { width: 100%; height: 66px; }
                            .qr-box { width: 86px; height: 86px; display: grid; place-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
                            .foot { position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 12px; border-top: 2px dashed #d1d5db; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; background: #fff; }
                            .small { font-size: 10px; color: #6b7280; line-height: 1.25; }
                            .stamp { font-size: 10px; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; text-align: right; }
                        `}</style>

                        <div className="label" data-theme={previewTheme}>
                            {/* Header */}
                            <header className="top">
                                <div className="brandbox">
                                    {labelsForm.data.show_logo && (
                                        <>
                                            {company_logo_url ? (
                                                <img src={company_logo_url} alt={company_name || ''} className="brandlogo" />
                                            ) : (
                                                <>
                                                    <div className="brandmark"></div>
                                                    <div className="brandname">{company_name || '—'}</div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="meta">
                                    <div className="pill">EXPRESS</div><br />
                                    <span className="muted">{t('shipments.label.date')}</span> <span className="mono">2026-02-01</span><br />
                                    <span className="muted">{t('shipments.label.weight')}</span> <span className="mono">2.30 kg</span><br />
                                    <span className="muted">{t('shipments.label.pieces')}</span> <span className="mono">1</span>
                                </div>
                            </header>

                            {/* Addresses */}
                            <div className="grid-lbl">
                                <div className="card">
                                    <div className="hd">
                                        <span>{t('shipments.label.sender')}</span>
                                        <span className="mono">MIA</span>
                                    </div>
                                    <div className="bd">
                                        <div className="big">TDU CARGO · Warehouse</div>
                                        <div>7801 NW 37th St, Doral, FL</div>
                                        {labelsForm.data.show_phone && <div className="muted">+1 (305) 000-0000</div>}
                                        <div className="muted mt-1.5">
                                            <span className="k">Ref:</span> <span className="mono">QA-10293</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="hd">
                                        <span>{t('shipments.label.recipient')}</span>
                                        <span className="mono">APO</span>
                                    </div>
                                    <div className="bd">
                                        <div className="big">Johan Osorio</div>
                                        <div>Calle 100 # 10-20, Apartadó</div>
                                        {labelsForm.data.show_phone && <div className="muted">+57 300 000 0000</div>}
                                        <div className="muted mt-1.5">
                                            <span className="k">Doc:</span> <span className="mono">CC 71399265</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Route */}
                            <div className="route">
                                <div className="left">
                                    <div className="svc">GLOBAL COURIER · PRIORITY</div>
                                    <div className="row">
                                        <div><span className="k">Org:</span> <span className="mono">MIA</span></div>
                                        <div><span className="k">Dest:</span> <span className="mono">APO</span></div>
                                        <div><span className="k">Zone:</span> <span className="mono">Z3</span></div>
                                        <div><span className="k">Route:</span> <span className="mono">MIA-BOG-APO</span></div>
                                    </div>
                                </div>
                                <div className="right">
                                    <div className="muted text-white opacity-90 font-extrabold">SORT</div>
                                    <div className="code">A7</div>
                                </div>
                            </div>

                            {/* Tracking */}
                            <div className="tracking-box">
                                <div className="toph">
                                    <div>{t('shipments.label.tracking')}</div>
                                    <div className="num mono">{trackingNumber}</div>
                                </div>
                                <div className="body">
                                    {labelsForm.data.barcode_type !== 'qr' ? (
                                        <svg id="barcode-preview"></svg>
                                    ) : (
                                        <div className="w-full h-[66px] flex items-center justify-center bg-gray-100 text-xs font-bold text-gray-400">
                                            {t('shipments.label.qr_selected')}
                                        </div>
                                    )}
                                    <div className="qr-box">
                                        <QRCodeSVG value={trackingUrl} size={70} level="M" />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <footer className="foot">
                                <div className="small">
                                    <div><b>{t('shipments.label.content')}</b> Merchandise</div>
                                    <div><b>{t('shipments.label.declared')}</b> <span className="mono">USD 120.00</span></div>
                                </div>
                                <div className="stamp">
                                    <div className="font-black">{t('shipments.label.received_delivered')}</div>
                                    <div className="muted">{t('shipments.label.signature')}</div>
                                    <div className="h-[18px]"></div>
                                    <div className="muted mono">{t('shipments.label.ref')} INV-000245</div>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>

                {/* ── Label configuration form ─────────────────────────── */}
                <form onSubmit={submitLabels} className="space-y-6">
                    <SettingsSection
                        title={t('settings.tracking.label_config_title')}
                        description={t('settings.tracking.label_config_desc')}
                    >
                        <SettingsField
                            label={t('settings.tracking.paper_size')}
                            id="paper_size"
                            help={t('settings.tracking.paper_size_help')}
                        >
                            <Select value={labelsForm.data.paper_size} onValueChange={(val) => labelsForm.setData('paper_size', val)}>
                                <SelectTrigger id="paper_size">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4x6">4" × 6" ({t('settings.tracking.thermal')})</SelectItem>
                                    <SelectItem value="a4">A4 ({t('settings.tracking.standard')})</SelectItem>
                                    <SelectItem value="10x15">10 × 15 cm</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        <SettingsField
                            label={t('settings.tracking.output_format')}
                            id="output_format"
                            help={t('settings.tracking.output_format_help')}
                        >
                            <Select value={labelsForm.data.output_format} onValueChange={(val) => labelsForm.setData('output_format', val)}>
                                <SelectTrigger id="output_format">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="zpl">ZPL ({t('settings.tracking.zebra')})</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        <SettingsField
                            label={t('settings.tracking.barcode_type')}
                            id="barcode_type"
                            help={t('settings.tracking.barcode_type_help')}
                        >
                            <Select value={labelsForm.data.barcode_type} onValueChange={(val) => labelsForm.setData('barcode_type', val)}>
                                <SelectTrigger id="barcode_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="code128">Code 128 ({t('settings.tracking.recommended')})</SelectItem>
                                    <SelectItem value="code39">Code 39</SelectItem>
                                    <SelectItem value="qr">QR Code</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        {/* Toggles */}
                        <div className="col-span-full space-y-4 pt-1">
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="show_logo"
                                    checked={labelsForm.data.show_logo}
                                    onCheckedChange={(v) => labelsForm.setData('show_logo', v)}
                                />
                                <Label htmlFor="show_logo" className="font-medium text-foreground">
                                    {t('settings.tracking.show_logo')}
                                </Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="show_phone"
                                    checked={labelsForm.data.show_phone}
                                    onCheckedChange={(v) => labelsForm.setData('show_phone', v)}
                                />
                                <Label htmlFor="show_phone" className="font-medium text-foreground">
                                    {t('settings.tracking.show_phone')}
                                </Label>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSaveBar processing={labelsForm.processing} isDirty={labelsForm.isDirty} />
                </form>

                {/* Connection info */}
                <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground text-sm">{t('settings.tracking.how_labels_work')}</p>
                    <ul className="list-disc list-inside space-y-1 leading-relaxed">
                        <li>{t('settings.tracking.info_1')}</li>
                        <li>{t('settings.tracking.info_2')}</li>
                        <li>{t('settings.tracking.info_3')}</li>
                        <li>{t('settings.tracking.info_4')}</li>
                    </ul>
                    <a
                        href="https://en.wikipedia.org/wiki/Barcode#Symbologies"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium mt-1"
                    >
                        {t('settings.tracking.barcode_reference')}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </SettingsShell>
        </SettingsLayout>
    );
}
