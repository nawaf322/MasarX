import{a as l,j as e,H as o}from"./app-qZz1dTLe.js";import{r as n}from"./vendor-i18n-CRXc3HNV.js";/* empty css            */import"./vendor-recharts-DYP2vlyo.js";const d={draft:"Draft",active:"Active",expired:"Expired",cancelled:"Cancelled"};function t(a){return a?new Date(a).toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"}):"—"}function x(){const{contract:a,org:i}=l().props;n.useEffect(()=>{const r=setTimeout(()=>window.print(),700);return()=>clearTimeout(r)},[]);const s=d[a.status]??a.status;return e.jsxs(e.Fragment,{children:[e.jsx(o,{title:`${a.contract_number}`}),e.jsx("style",{children:`
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
            `}),!a.signed_at&&e.jsx("div",{className:"watermark",children:"Draft"}),e.jsxs("div",{className:"page",children:[e.jsxs("div",{className:"header",children:[e.jsxs("div",{className:"org-side",children:[i.logo_url&&e.jsx("img",{src:i.logo_url,alt:i.name,className:"org-logo"}),e.jsx("div",{className:"org-name",children:i.legal_name}),i.legal_name!==i.name&&e.jsx("div",{className:"org-legal",children:i.name}),e.jsxs("div",{className:"org-contact",children:[[i.phone,i.email].filter(Boolean).join("  ·  "),i.address&&e.jsxs(e.Fragment,{children:[e.jsx("br",{}),i.address]})]})]}),e.jsxs("div",{className:"doc-side",children:[e.jsx("div",{className:"doc-label",children:"Contract"}),e.jsx("div",{className:"doc-number",children:a.contract_number}),e.jsx("div",{className:"doc-subtitle",children:a.title}),e.jsx("div",{className:"status-pill",children:s})]})]}),e.jsx("div",{className:"section-title",children:"Parties"}),e.jsxs("div",{className:"parties-grid",children:[e.jsxs("div",{className:"party-box",children:[e.jsx("div",{className:"party-role",children:"Service Provider"}),e.jsx("div",{className:"party-name",children:i.legal_name}),e.jsx("div",{className:"party-email",children:i.email})]}),e.jsxs("div",{className:"party-box",children:[e.jsx("div",{className:"party-role",children:"Customer"}),e.jsx("div",{className:"party-name",children:a.customer.name}),e.jsx("div",{className:"party-email",children:a.customer.email})]})]}),e.jsx("div",{className:"section-title",children:"Contract Details"}),e.jsxs("div",{className:"details-grid",children:[e.jsxs("div",{className:"detail-cell",children:[e.jsx("div",{className:"detail-label",children:"Contract #"}),e.jsx("div",{className:"detail-value mono",children:a.contract_number})]}),e.jsxs("div",{className:"detail-cell",children:[e.jsx("div",{className:"detail-label",children:"Rate Card"}),e.jsx("div",{className:"detail-value",children:a.rate_card?.name??"—"})]}),e.jsxs("div",{className:"detail-cell",children:[e.jsx("div",{className:"detail-label",children:"Start Date"}),e.jsx("div",{className:"detail-value",children:t(a.start_date)})]}),e.jsxs("div",{className:"detail-cell",children:[e.jsx("div",{className:"detail-label",children:"End Date"}),e.jsx("div",{className:"detail-value",children:t(a.end_date)})]}),e.jsxs("div",{className:"detail-cell",children:[e.jsx("div",{className:"detail-label",children:"Created"}),e.jsx("div",{className:"detail-value",children:t(a.created_at)})]}),a.signed_at&&e.jsxs("div",{className:"detail-cell",children:[e.jsx("div",{className:"detail-label",children:"Signed"}),e.jsx("div",{className:"detail-value",children:t(a.signed_at)})]})]}),a.terms&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"section-title",children:"Terms & Conditions"}),e.jsx("div",{className:"terms-box",children:a.terms})]}),e.jsx("div",{className:"section-title",children:"Signatures"}),e.jsxs("div",{className:"sig-row",children:[e.jsxs("div",{className:"sig-block",children:[a.signature_path?e.jsx("div",{className:"sig-image-box",children:e.jsx("img",{src:`/storage/${a.signature_path}`,alt:"Authorized Signature"})}):e.jsx("div",{className:"sig-blank"}),e.jsx("div",{className:"sig-label",children:"Authorized Signature"}),a.signed_by&&e.jsx("div",{className:"sig-name",children:a.signed_by.name}),a.signed_at&&e.jsx("div",{className:"sig-date",children:t(a.signed_at)})]}),e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{className:"sig-blank"}),e.jsx("div",{className:"sig-label",children:"Customer Signature"}),e.jsx("div",{className:"sig-name",children:a.customer.name}),e.jsx("div",{className:"sig-date",children:" "})]})]}),e.jsxs("div",{className:"footer",children:[e.jsx("span",{children:"This document is a legally binding contract."}),e.jsxs("span",{children:[a.contract_number," · ",i.legal_name]})]})]})]})}export{x as default};
