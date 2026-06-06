import{a as c,j as e,H as d}from"./app-D0yBn9Vk.js";import{r as p}from"./vendor-i18n-CRXc3HNV.js";import{Q as m}from"./index-DC8P8eIY.js";/* empty css            */import"./vendor-recharts-DYP2vlyo.js";const x={pending:"Pending",confirmed:"Confirmed",completed:"Completed",cancelled:"Cancelled"};function j(){const{pickup:s,org:i,pickupRef:a,trackingUrl:t}=c().props;p.useEffect(()=>{const l=setTimeout(()=>window.print(),600);return()=>clearTimeout(l)},[]);const o=x[s.status]??s.status,n=t||a;return e.jsxs(e.Fragment,{children:[e.jsx(d,{title:`Pickup Receipt — ${a}`}),e.jsx("style",{children:`
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
            `}),e.jsxs("div",{className:"print-page",children:[e.jsxs("div",{className:"header",children:[e.jsxs("div",{className:"org-info",children:[i.logo_url&&e.jsx("img",{src:i.logo_url,alt:i.name,className:"org-logo"}),e.jsx("p",{className:"org-name",children:i.legal_name}),i.legal_name!==i.name&&e.jsx("p",{className:"org-legal",children:i.name}),e.jsx("p",{className:"org-contact",children:[i.phone,i.email,i.address].filter(Boolean).join(" · ")})]}),e.jsxs("div",{className:"ref-block",children:[e.jsx("p",{className:"ref-label",children:"Pickup Receipt"}),e.jsx("p",{className:"ref-number",children:a}),e.jsx("p",{className:"doc-title",children:"Origin Pickup"})]})]}),e.jsxs("div",{className:"info-row info-row-4",children:[e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Reference"}),e.jsx("p",{className:"field-value mono",children:a})]}),e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Tracking #"}),e.jsx("p",{className:"field-value mono",children:s.shipment?.tracking_number??"—"})]}),e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Scheduled"}),e.jsx("p",{className:"field-value",children:new Date(s.scheduled_for).toLocaleDateString()}),e.jsx("p",{style:{fontSize:"8pt",color:"#666",marginTop:"1px"},children:new Date(s.scheduled_for).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})})]}),e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Status"}),e.jsx("span",{className:"status-badge",children:o})]})]}),e.jsxs("div",{className:"info-row info-row-2",children:[e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Contact Name"}),e.jsx("p",{className:"field-value large",children:s.contact_name})]}),e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Contact Phone"}),e.jsx("p",{className:"field-value large",children:s.contact_phone})]})]}),e.jsxs("div",{className:"content-qr-row",children:[e.jsxs("div",{className:"content-main",children:[e.jsxs("div",{className:"address-row",children:[e.jsx("p",{className:"field-label",children:"Pickup Address"}),e.jsx("p",{className:"field-value",children:s.pickup_address})]}),(s.confirmed_by||s.confirmed_at)&&e.jsxs("div",{className:"info-row info-row-2",style:{marginBottom:0},children:[s.confirmed_by&&e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Confirmed By"}),e.jsx("p",{className:"field-value",children:s.confirmed_by.name})]}),s.confirmed_at&&e.jsxs("div",{className:"field",children:[e.jsx("p",{className:"field-label",children:"Confirmed At"}),e.jsx("p",{className:"field-value",children:new Date(s.confirmed_at).toLocaleString()})]})]}),s.completed_at&&e.jsxs("div",{className:"field",style:{marginTop:"10px"},children:[e.jsx("p",{className:"field-label",children:"Completed At"}),e.jsx("p",{className:"field-value",children:new Date(s.completed_at).toLocaleString()})]})]}),e.jsxs("div",{className:"qr-block",children:[e.jsx(m,{value:n,size:100}),e.jsx("p",{className:"qr-label",children:"Track Shipment"})]})]}),s.special_instructions&&e.jsxs("div",{className:"instructions-block",children:[e.jsx("p",{className:"instructions-label",children:"Special Instructions"}),e.jsx("p",{className:"instructions-text",children:s.special_instructions})]}),s.photos&&s.photos.length>0&&e.jsxs("div",{className:"photos-section",children:[e.jsxs("p",{className:"photos-label",children:["Evidence Photos (",s.photos.length,")"]}),e.jsx("div",{className:"photos-grid",children:s.photos.slice(0,12).map((l,r)=>e.jsx("img",{src:`/storage/${l}`,alt:`Evidence ${r+1}`},r))})]}),e.jsx("hr",{className:"divider"}),e.jsxs("div",{className:"sig-row",children:[e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{style:{height:"40px"}}),e.jsx("div",{className:"sig-box",children:"Driver Signature"})]}),e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{style:{height:"40px"}}),e.jsx("div",{className:"sig-box",children:"Customer Signature"})]})]}),e.jsx("div",{className:"footer",children:e.jsxs("p",{children:["This document is an official pickup receipt. · ",i.legal_name," · ",a]})})]})]})}export{j as default};
