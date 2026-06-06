<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <title>Financial Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            background: #fff;
            padding: 28px 32px;
        }

        /* ── Header ──────────────────────────────── */
        .header {
            display: table;
            width: 100%;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }
        .header-left  { display: table-cell; vertical-align: middle; width: 60%; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }

        .org-logo  { max-height: 42px; max-width: 140px; }
        .org-name  { font-size: 18px; font-weight: 700; color: #16a34a; }
        .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px; }

        .meta-row   { font-size: 10px; color: #64748b; margin-top: 2px; }
        .meta-label { font-weight: 600; color: #475569; }

        /* ── KPI Cards Grid ──────────────────────── */
        .kpi-grid {
            display: table;
            width: 100%;
            margin-bottom: 24px;
            border-collapse: separate;
            border-spacing: 8px;
        }
        .kpi-row { display: table-row; }
        .kpi-card {
            display: table-cell;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 12px 14px;
            text-align: center;
            width: 25%;
        }
        .kpi-card.red   { background: #fef2f2; border-color: #fecaca; }
        .kpi-card.amber { background: #fefce8; border-color: #fde68a; }
        .kpi-card.blue  { background: #eff6ff; border-color: #bfdbfe; }
        .kpi-card.gray  { background: #f8fafc; border-color: #e2e8f0; }

        .kpi-num { font-size: 22px; font-weight: 700; color: #16a34a; display: block; }
        .kpi-num.red   { color: #b91c1c; }
        .kpi-num.amber { color: #92400e; }
        .kpi-num.blue  { color: #1d4ed8; }
        .kpi-num.gray  { color: #374151; }
        .kpi-lbl { font-size: 9px; color: #166534; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; display: block; }
        .kpi-lbl.red   { color: #991b1b; }
        .kpi-lbl.amber { color: #78350f; }
        .kpi-lbl.blue  { color: #1e40af; }
        .kpi-lbl.gray  { color: #4b5563; }

        /* ── Section divider ─────────────────────── */
        .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #bbf7d0;
            padding-bottom: 5px;
            margin-bottom: 12px;
            margin-top: 20px;
        }

        /* ── Summary table ───────────────────────── */
        .summary-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .summary-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #f1f5f9;
        }
        .summary-table tr:last-child td { border-bottom: none; }
        .summary-table .label-cell { color: #64748b; width: 55%; }
        .summary-table .value-cell { font-weight: 600; color: #1e293b; text-align: right; }
        .summary-table .total-row td { background: #f0fdf4; font-weight: 700; border-top: 2px solid #bbf7d0; }
        .summary-table .net-row td   { background: #dcfce7; font-weight: 700; font-size: 11px; }

        /* ── Footer ──────────────────────────────── */
        .footer {
            margin-top: 32px;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>

    {{-- ── Header ── --}}
    <div class="header">
        <div class="header-left">
            @if($org && $org->logo_url)
                <img src="{{ public_path('storage/' . $org->logo_url) }}" class="org-logo" alt="{{ $org->name }}">
            @else
                <div class="org-name">{{ $org?->name ?? config('app.name') }}</div>
            @endif
            <div class="doc-title">Financial Summary Report</div>
        </div>
        <div class="header-right">
            <div class="meta-row">
                <span class="meta-label">Generated:</span> {{ $generated_at }}
            </div>
            @if(!empty($filters['date_from']) || !empty($filters['date_to']))
            <div class="meta-row">
                <span class="meta-label">Period:</span>
                {{ !empty($filters['date_from']) ? \Carbon\Carbon::parse($filters['date_from'])->format('d/m/Y') : '—' }}
                to
                {{ !empty($filters['date_to']) ? \Carbon\Carbon::parse($filters['date_to'])->format('d/m/Y') : 'Today' }}
            </div>
            @endif
        </div>
    </div>

    {{-- ── KPI Cards ── --}}
    <div class="kpi-grid">
        <div class="kpi-row">
            <div class="kpi-card">
                <span class="kpi-num">{{ number_format($revenue, 2) }}</span>
                <span class="kpi-lbl">Total Revenue</span>
            </div>
            <div class="kpi-card blue">
                <span class="kpi-num blue">{{ number_format($total_paid, 2) }}</span>
                <span class="kpi-lbl blue">Paid</span>
            </div>
            <div class="kpi-card amber">
                <span class="kpi-num amber">{{ number_format($total_partial, 2) }}</span>
                <span class="kpi-lbl amber">Partial</span>
            </div>
            <div class="kpi-card red">
                <span class="kpi-num red">{{ number_format($total_unpaid, 2) }}</span>
                <span class="kpi-lbl red">Unpaid</span>
            </div>
        </div>
    </div>

    <div class="kpi-grid">
        <div class="kpi-row">
            <div class="kpi-card gray">
                <span class="kpi-num gray">{{ number_format($total) }}</span>
                <span class="kpi-lbl gray">Total Shipments</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-num">{{ number_format($delivered) }}</span>
                <span class="kpi-lbl">Delivered</span>
            </div>
            <div class="kpi-card red">
                <span class="kpi-num red">{{ number_format($returns_count) }}</span>
                <span class="kpi-lbl red">Returns</span>
            </div>
            <div class="kpi-card {{ $net_revenue >= 0 ? '' : 'red' }}">
                <span class="kpi-num {{ $net_revenue >= 0 ? '' : 'red' }}">{{ number_format($net_revenue, 2) }}</span>
                <span class="kpi-lbl {{ $net_revenue >= 0 ? '' : 'red' }}">Net Revenue</span>
            </div>
        </div>
    </div>

    {{-- ── Financial Breakdown ── --}}
    <div class="section-title">Financial Breakdown</div>

    <table class="summary-table">
        <tbody>
            <tr>
                <td class="label-cell">Total Revenue (Paid + Partial)</td>
                <td class="value-cell">{{ number_format($revenue, 2) }}</td>
            </tr>
            <tr>
                <td class="label-cell">&nbsp;&nbsp;&mdash; Paid in full</td>
                <td class="value-cell">{{ number_format($total_paid, 2) }}</td>
            </tr>
            <tr>
                <td class="label-cell">&nbsp;&nbsp;&mdash; Partial payment</td>
                <td class="value-cell">{{ number_format($total_partial, 2) }}</td>
            </tr>
            <tr>
                <td class="label-cell">Outstanding (Unpaid)</td>
                <td class="value-cell">{{ number_format($total_unpaid, 2) }}</td>
            </tr>
            <tr>
                <td class="label-cell">Total Refunds Issued</td>
                <td class="value-cell">{{ number_format($total_refunds, 2) }}</td>
            </tr>
            <tr class="net-row">
                <td class="label-cell">Net Revenue (Revenue − Refunds)</td>
                <td class="value-cell">{{ number_format($net_revenue, 2) }}</td>
            </tr>
        </tbody>
    </table>

    {{-- ── Operations Summary ── --}}
    <div class="section-title">Operations Summary</div>

    <table class="summary-table">
        <tbody>
            <tr>
                <td class="label-cell">Total Shipments</td>
                <td class="value-cell">{{ number_format($total) }}</td>
            </tr>
            <tr>
                <td class="label-cell">Delivered</td>
                <td class="value-cell">{{ number_format($delivered) }}</td>
            </tr>
            <tr>
                <td class="label-cell">Delivery Rate</td>
                <td class="value-cell">
                    @if($total > 0)
                        {{ number_format(($delivered / $total) * 100, 1) }}%
                    @else
                        0.0%
                    @endif
                </td>
            </tr>
            <tr>
                <td class="label-cell">Total Returns</td>
                <td class="value-cell">{{ number_format($returns_count) }}</td>
            </tr>
            <tr>
                <td class="label-cell">Refund Rate (vs Revenue)</td>
                <td class="value-cell">
                    @if($revenue > 0)
                        {{ number_format(($total_refunds / $revenue) * 100, 1) }}%
                    @else
                        0.0%
                    @endif
                </td>
            </tr>
        </tbody>
    </table>

    {{-- ── Footer ── --}}
    <div class="footer">
        {{ $org?->name ?? config('app.name') }} &mdash; Generated {{ $generated_at }}
    </div>

</body>
</html>
