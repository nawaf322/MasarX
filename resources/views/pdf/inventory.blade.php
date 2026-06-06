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

        /* ── Header ─────────────────────────────── */
        .header {
            display: table;
            width: 100%;
            border-bottom: 2px solid #ea580c;
            padding-bottom: 14px;
            margin-bottom: 16px;
        }
        .header-left  { display: table-cell; vertical-align: middle; width: 60%; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }

        .org-logo  { max-height: 42px; max-width: 140px; }
        .org-name  { font-size: 18px; font-weight: 700; color: #ea580c; }
        .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px; }

        .meta-row   { font-size: 10px; color: #64748b; margin-top: 2px; }
        .meta-label { font-weight: 600; color: #475569; }

        /* ── Summary bar ─────────────────────────── */
        .summary-bar {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            border-radius: 5px;
            padding: 8px 12px;
            margin-bottom: 18px;
            display: table;
            width: 100%;
        }
        .summary-item { display: table-cell; text-align: center; }
        .summary-num  { font-size: 20px; font-weight: 700; color: #ea580c; display: block; }
        .summary-lbl  { font-size: 9px; color: #9a3412; text-transform: uppercase; letter-spacing: 0.04em; }
        .summary-num-red { font-size: 20px; font-weight: 700; color: #dc2626; display: block; }

        /* ── Table ───────────────────────────────── */
        .inv-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .inv-table thead tr { background: #fff7ed; border-bottom: 1px solid #fed7aa; }
        .inv-table th {
            padding: 7px 10px;
            text-align: left;
            font-weight: 600;
            color: #9a3412;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.04em;
        }
        .inv-table td { padding: 7px 10px; border-bottom: 1px solid #f8fafc; color: #374151; }
        .inv-table tr:last-child td { border-bottom: none; }
        .inv-table tr:nth-child(even) td { background: #fffbf7; }

        .tracking { font-family: monospace; font-weight: 600; color: #1e293b; }

        .badge-ok      { display:inline-block; padding:2px 7px; border-radius:4px; background:#dcfce7; color:#166534; font-size:9px; font-weight:600; }
        .badge-aging   { display:inline-block; padding:2px 7px; border-radius:4px; background:#fef2f2; color:#b91c1c; font-size:9px; font-weight:600; }

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
            <span class="summary-lbl">{{ $labels['total'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num-red">{{ $aging_count }}</span>
            <span class="summary-lbl">{{ $labels['aging_count'] }}</span>
        </div>
    </div>

    {{-- ── Table ── --}}
    @if($items->isEmpty())
        <div style="text-align:center; padding:40px; color:#9ca3af;">
            {{ $labels['no_results'] }}
        </div>
    @else
        <table class="inv-table">
            <thead>
                <tr>
                    <th style="width:28px;">#</th>
                    <th>{{ $labels['tracking_col'] }}</th>
                    <th>{{ $labels['recipient'] }}</th>
                    <th>{{ $labels['destination'] }}</th>
                    <th>{{ $labels['received_at'] }}</th>
                    <th>{{ $labels['aging_lbl'] }}</th>
                    <th>{{ $labels['status_lbl'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $i => $s)
                @php
                    $receivedAt   = \Carbon\Carbon::parse($s->updated_at);
                    $diffHours    = (int) $receivedAt->diffInHours(now());
                    $isAging      = $diffHours > 24;
                    $dest         = collect([
                        $s->receiver_details['city']    ?? null,
                        $s->receiver_details['country'] ?? null,
                    ])->filter()->implode(', ') ?: '—';
                    $recipient    = $s->receiver_details['name'] ?? '—';
                @endphp
                <tr>
                    <td style="color:#9ca3af;">{{ $i + 1 }}</td>
                    <td class="tracking">{{ $s->tracking_number }}</td>
                    <td>{{ $recipient }}</td>
                    <td>{{ $dest }}</td>
                    <td>{{ $receivedAt->format('d/m/Y H:i') }}</td>
                    <td>
                        @if($isAging)
                            <span class="badge-aging">{{ $diffHours }}{{ $labels['hours_lbl'] }}</span>
                        @else
                            <span class="badge-ok">{{ $diffHours }}{{ $labels['hours_lbl'] }}</span>
                        @endif
                    </td>
                    <td>
                        <span class="badge-ok">{{ $labels['received_hub'] }}</span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- ── Footer ── --}}
    <div class="footer">
        {{ $org?->name ?? config('app.name') }} &mdash; {{ $labels['footer'] }} {{ $generated_at }}
    </div>

</body>
</html>
