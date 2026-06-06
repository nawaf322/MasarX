<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['title'] }}</title>
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
            margin-bottom: 16px;
        }
        .header-left  { display: table-cell; vertical-align: middle; width: 60%; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }

        .org-logo  { max-height: 42px; max-width: 140px; }
        .org-name  { font-size: 18px; font-weight: 700; color: #16a34a; }
        .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px; }

        .meta-row   { font-size: 10px; color: #64748b; margin-top: 2px; }
        .meta-label { font-weight: 600; color: #475569; }

        /* ── Summary bar ─────────────────────────── */
        .summary-bar {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 5px;
            padding: 8px 12px;
            margin-bottom: 18px;
            display: table;
            width: 100%;
        }
        .summary-item { display: table-cell; text-align: center; }
        .summary-num  { font-size: 20px; font-weight: 700; color: #16a34a; display: block; }
        .summary-lbl  { font-size: 9px; color: #166534; text-transform: uppercase; letter-spacing: 0.04em; }

        /* ── Table ───────────────────────────────── */
        .bill-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .bill-table thead tr { background: #f0fdf4; border-bottom: 1px solid #bbf7d0; }
        .bill-table th {
            padding: 7px 10px;
            text-align: left;
            font-weight: 600;
            color: #166534;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.04em;
        }
        .bill-table td { padding: 7px 10px; border-bottom: 1px solid #f8fafc; color: #374151; }
        .bill-table tr:last-child td { border-bottom: none; }
        .bill-table tr:nth-child(even) td { background: #f9fffe; }

        .tracking { font-family: monospace; font-weight: 600; color: #1e293b; }

        .badge-paid      { display:inline-block; padding:2px 7px; border-radius:4px; background:#dcfce7; color:#166534; font-size:9px; font-weight:600; }
        .badge-unpaid    { display:inline-block; padding:2px 7px; border-radius:4px; background:#fef2f2; color:#b91c1c; font-size:9px; font-weight:600; }
        .badge-partial   { display:inline-block; padding:2px 7px; border-radius:4px; background:#fefce8; color:#854d0e; font-size:9px; font-weight:600; }
        .badge-refunded  { display:inline-block; padding:2px 7px; border-radius:4px; background:#f1f5f9; color:#475569; font-size:9px; font-weight:600; }

        .total-row td { font-weight: 700; background: #f0fdf4 !important; border-top: 2px solid #bbf7d0; }

        /* ── Footer ──────────────────────────────── */
        .footer {
            margin-top: 24px;
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
            <div class="doc-title">{{ $labels['title'] }}</div>
        </div>
        <div class="header-right">
            <div class="meta-row">
                <span class="meta-label">{{ $labels['generated'] }}:</span> {{ $generated_at }}
            </div>
            @if($from_date || $to_date)
            <div class="meta-row">
                <span class="meta-label">{{ $labels['period'] }}:</span>
                {{ $from_date ? \Carbon\Carbon::parse($from_date)->format('d/m/Y') : '—' }}
                {{ $labels['period_to'] }}
                {{ $to_date   ? \Carbon\Carbon::parse($to_date)->format('d/m/Y') : $labels['period_today'] }}
            </div>
            @endif
        </div>
    </div>

    {{-- ── Summary ── --}}
    <div class="summary-bar">
        <div class="summary-item">
            <span class="summary-num">{{ $items->count() }}</span>
            <span class="summary-lbl">{{ $labels['pdf_count'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ number_format($grand_total, 2) }}</span>
            <span class="summary-lbl">{{ $labels['pdf_total'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ $items->where('payment_status', 'paid')->count() }}</span>
            <span class="summary-lbl">{{ $labels['filter_paid'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ $items->whereIn('payment_status', ['unpaid', null])->count() }}</span>
            <span class="summary-lbl">{{ $labels['filter_unpaid'] }}</span>
        </div>
    </div>

    {{-- ── Table ── --}}
    @if($items->isEmpty())
        <div style="text-align:center; padding:40px; color:#9ca3af;">
            {{ $labels['no_results'] }}
        </div>
    @else
        <table class="bill-table">
            <thead>
                <tr>
                    <th style="width:24px;">#</th>
                    <th>{{ $labels['col_invoice'] }}</th>
                    <th>{{ $labels['col_customer'] }}</th>
                    <th>{{ $labels['col_date'] }}</th>
                    <th style="text-align:right;">{{ $labels['col_amount'] }}</th>
                    <th>{{ $labels['col_status'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $i => $item)
                @php
                    $senderName = $item->sender_details['name'] ?? '—';
                    $status = $item->payment_status ?? 'unpaid';
                    $statusLabel = match($status) {
                        'paid'     => $labels['filter_paid'],
                        'partial'  => $labels['filter_partial'],
                        'refunded' => $labels['filter_refunded'],
                        default    => $labels['filter_unpaid'],
                    };
                    $badgeClass = match($status) {
                        'paid'     => 'badge-paid',
                        'partial'  => 'badge-partial',
                        'refunded' => 'badge-refunded',
                        default    => 'badge-unpaid',
                    };
                @endphp
                <tr>
                    <td style="color:#9ca3af;">{{ $i + 1 }}</td>
                    <td class="tracking">{{ $item->tracking_number }}</td>
                    <td>{{ $senderName }}</td>
                    <td>{{ \Carbon\Carbon::parse($item->created_at)->format('d/m/Y') }}</td>
                    <td style="text-align:right; font-weight:600;">{{ number_format($item->total, 2) }} {{ $item->currency ?? '' }}</td>
                    <td><span class="{{ $badgeClass }}">{{ $statusLabel }}</span></td>
                </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="4" style="text-align:right; font-size:10px; letter-spacing:0.04em;">{{ strtoupper($labels['pdf_total']) }}</td>
                    <td style="text-align:right;">{{ number_format($grand_total, 2) }}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    @endif

    {{-- ── Footer ── --}}
    <div class="footer">
        {{ $org?->name ?? config('app.name') }} &mdash; {{ $labels['footer'] }} {{ $generated_at }}
    </div>

</body>
</html>
