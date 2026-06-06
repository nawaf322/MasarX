<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <title>Shipments Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            background: #fff;
            padding: 20px 24px;
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
            padding: 7px 8px;
            text-align: left;
            font-weight: 600;
            color: #166534;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.04em;
        }
        .bill-table td { padding: 6px 8px; border-bottom: 1px solid #f8fafc; color: #374151; }
        .bill-table tr:last-child td { border-bottom: none; }
        .bill-table tr:nth-child(even) td { background: #f9fffe; }

        .tracking { font-family: monospace; font-weight: 600; color: #1e293b; }

        .badge-paid      { display:inline-block; padding:2px 6px; border-radius:4px; background:#dcfce7; color:#166534; font-size:9px; font-weight:600; }
        .badge-unpaid    { display:inline-block; padding:2px 6px; border-radius:4px; background:#fef2f2; color:#b91c1c; font-size:9px; font-weight:600; }
        .badge-partial   { display:inline-block; padding:2px 6px; border-radius:4px; background:#fefce8; color:#854d0e; font-size:9px; font-weight:600; }
        .badge-delivered { display:inline-block; padding:2px 6px; border-radius:4px; background:#dcfce7; color:#166534; font-size:9px; font-weight:600; }
        .badge-pending   { display:inline-block; padding:2px 6px; border-radius:4px; background:#fef9c3; color:#713f12; font-size:9px; font-weight:600; }
        .badge-default   { display:inline-block; padding:2px 6px; border-radius:4px; background:#f1f5f9; color:#475569; font-size:9px; font-weight:600; }

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
            <div class="doc-title">Shipments Report</div>
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
            @if(!empty($filters['status']))
            <div class="meta-row">
                <span class="meta-label">Status filter:</span> {{ $filters['status'] }}
            </div>
            @endif
            @if(!empty($filters['payment_status']))
            <div class="meta-row">
                <span class="meta-label">Payment filter:</span> {{ $filters['payment_status'] }}
            </div>
            @endif
        </div>
    </div>

    {{-- ── Summary ── --}}
    @php
        $totalRevenue = $shipments->whereIn('payment_status', ['paid','partial'])->sum('total');
        $totalUnpaid  = $shipments->where('payment_status', 'unpaid')->sum('total');
        $delivered    = $shipments->where('status', 'delivered')->count();
    @endphp
    <div class="summary-bar">
        <div class="summary-item">
            <span class="summary-num">{{ $shipments->count() }}</span>
            <span class="summary-lbl">Total Records</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ number_format($totalRevenue, 2) }}</span>
            <span class="summary-lbl">Total Revenue</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ $delivered }}</span>
            <span class="summary-lbl">Delivered</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ number_format($totalUnpaid, 2) }}</span>
            <span class="summary-lbl">Unpaid Amount</span>
        </div>
    </div>

    {{-- ── Table ── --}}
    @if($shipments->isEmpty())
        <div style="text-align:center; padding:40px; color:#9ca3af;">
            No shipments found for the selected filters.
        </div>
    @else
        <table class="bill-table">
            <thead>
                <tr>
                    <th style="width:20px;">#</th>
                    <th>Tracking</th>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th style="text-align:right;">Amount</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                @foreach($shipments as $i => $shipment)
                @php
                    $sender   = is_array($shipment->sender_details)   ? ($shipment->sender_details['name']   ?? '—') : '—';
                    $receiver = is_array($shipment->receiver_details) ? ($shipment->receiver_details['name'] ?? '—') : '—';
                    $payBadge = match($shipment->payment_status ?? 'unpaid') {
                        'paid'    => 'badge-paid',
                        'partial' => 'badge-partial',
                        default   => 'badge-unpaid',
                    };
                    $statusBadge = match($shipment->status ?? '') {
                        'delivered' => 'badge-delivered',
                        'pending'   => 'badge-pending',
                        default     => 'badge-default',
                    };
                @endphp
                <tr>
                    <td style="color:#9ca3af;">{{ $i + 1 }}</td>
                    <td class="tracking">{{ $shipment->tracking_number }}</td>
                    <td>{{ $sender }}</td>
                    <td>{{ $receiver }}</td>
                    <td><span class="{{ $statusBadge }}">{{ $shipment->status }}</span></td>
                    <td><span class="{{ $payBadge }}">{{ $shipment->payment_status }}</span></td>
                    <td style="text-align:right; font-weight:600;">{{ number_format((float)$shipment->total, 2) }} {{ $shipment->currency ?? '' }}</td>
                    <td>{{ \Carbon\Carbon::parse($shipment->created_at)->format('d/m/Y') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- ── Footer ── --}}
    <div class="footer">
        {{ $org?->name ?? config('app.name') }} &mdash; Generated {{ $generated_at }}
    </div>

</body>
</html>
