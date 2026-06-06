<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['title'] }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 28px 32px; }

        .header { display: table; width: 100%; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 16px; }
        .header-left  { display: table-cell; vertical-align: middle; width: 60%; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }
        .org-logo  { max-height: 42px; max-width: 140px; }
        .org-name  { font-size: 18px; font-weight: 700; color: #7c3aed; }
        .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px; }
        .meta-row  { font-size: 10px; color: #64748b; margin-top: 2px; }
        .meta-label { font-weight: 600; color: #475569; }

        .summary-bar { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 5px; padding: 8px 12px; margin-bottom: 18px; display: table; width: 100%; }
        .summary-item { display: table-cell; text-align: center; }
        .summary-num  { font-size: 18px; font-weight: 700; color: #7c3aed; display: block; }
        .summary-num-green { font-size: 18px; font-weight: 700; color: #16a34a; display: block; }
        .summary-num-red   { font-size: 18px; font-weight: 700; color: #dc2626; display: block; }
        .summary-lbl  { font-size: 9px; color: #5b21b6; text-transform: uppercase; letter-spacing: 0.04em; }

        .rec-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .rec-table thead tr { background: #f5f3ff; border-bottom: 1px solid #ddd6fe; }
        .rec-table th { padding: 7px 10px; text-align: left; font-weight: 600; color: #5b21b6; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
        .rec-table td { padding: 7px 10px; border-bottom: 1px solid #f8fafc; color: #374151; }
        .rec-table tr:last-child td { border-bottom: none; }
        .rec-table tr:nth-child(even) td { background: #faf9ff; }
        .tracking { font-family: monospace; font-weight: 600; color: #1e293b; }
        .profit-pos { color: #16a34a; font-weight: 700; }
        .profit-neg { color: #dc2626; font-weight: 700; }
        .total-row td { font-weight: 700; background: #f5f3ff !important; border-top: 2px solid #ddd6fe; }

        .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
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
            <div class="meta-row"><span class="meta-label">{{ $labels['generated'] }}:</span> {{ $generated_at }}</div>
            @if($from_date || $to_date)
            <div class="meta-row">
                <span class="meta-label">{{ $labels['period'] }}:</span>
                {{ $from_date ? \Carbon\Carbon::parse($from_date)->format('d/m/Y') : '—' }}
                {{ $labels['period_to'] }}
                {{ $to_date ? \Carbon\Carbon::parse($to_date)->format('d/m/Y') : $labels['period_today'] }}
            </div>
            @endif
        </div>
    </div>

    <div class="summary-bar">
        <div class="summary-item">
            <span class="summary-num">{{ $items->count() }}</span>
            <span class="summary-lbl">Envíos</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ number_format($grand_revenue, 2) }}</span>
            <span class="summary-lbl">{{ $labels['total_revenue'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ number_format($grand_cost, 2) }}</span>
            <span class="summary-lbl">{{ $labels['total_cost'] }}</span>
        </div>
        <div class="summary-item">
            @if($grand_profit >= 0)
                <span class="summary-num-green">{{ number_format($grand_profit, 2) }}</span>
            @else
                <span class="summary-num-red">{{ number_format($grand_profit, 2) }}</span>
            @endif
            <span class="summary-lbl">{{ $labels['net_profit'] }}</span>
        </div>
    </div>

    @if($items->isEmpty())
        <div style="text-align:center; padding:40px; color:#9ca3af;">{{ $labels['no_results'] }}</div>
    @else
        <table class="rec-table">
            <thead>
                <tr>
                    <th style="width:24px;">#</th>
                    <th>{{ $labels['col_tracking'] }}</th>
                    <th>{{ $labels['col_customer'] }}</th>
                    <th>{{ $labels['col_date'] }}</th>
                    <th style="text-align:right;">{{ $labels['col_revenue'] }}</th>
                    <th style="text-align:right;">{{ $labels['col_cost'] }}</th>
                    <th style="text-align:right;">{{ $labels['col_profit'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $i => $item)
                @php
                    $revenue = $item->total ?? 0;
                    $cost    = $item->cost_price ?? 0;
                    $profit  = $revenue - $cost;
                    $margin  = $revenue > 0 ? round(($profit / $revenue) * 100, 1) : 0;
                    $sender  = is_array($item->sender_details) ? ($item->sender_details['name'] ?? '—') : '—';
                @endphp
                <tr>
                    <td style="color:#9ca3af;">{{ $i + 1 }}</td>
                    <td class="tracking">{{ $item->tracking_number }}</td>
                    <td>{{ $sender }}</td>
                    <td>{{ \Carbon\Carbon::parse($item->created_at)->format('d/m/Y') }}</td>
                    <td style="text-align:right;">{{ number_format($revenue, 2) }} {{ $item->currency ?? '' }}</td>
                    <td style="text-align:right; color:#64748b;">{{ number_format($cost, 2) }}</td>
                    <td style="text-align:right;" class="{{ $profit >= 0 ? 'profit-pos' : 'profit-neg' }}">
                        {{ number_format($profit, 2) }}
                        <span style="font-size:8px; font-weight:400;">({{ $margin }}%)</span>
                    </td>
                </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="4" style="text-align:right; font-size:9px; letter-spacing:0.04em; text-transform:uppercase;">TOTAL</td>
                    <td style="text-align:right;">{{ number_format($grand_revenue, 2) }}</td>
                    <td style="text-align:right;">{{ number_format($grand_cost, 2) }}</td>
                    <td style="text-align:right;" class="{{ $grand_profit >= 0 ? 'profit-pos' : 'profit-neg' }}">{{ number_format($grand_profit, 2) }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    <div class="footer">
        {{ $org?->name ?? config('app.name') }} &mdash; {{ $labels['footer'] }} {{ $generated_at }}
    </div>
</body>
</html>
