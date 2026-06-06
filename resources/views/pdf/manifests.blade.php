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
            border-bottom: 2px solid #7c3aed;
            padding-bottom: 14px;
            margin-bottom: 16px;
        }
        .header-left  { display: table-cell; vertical-align: middle; width: 60%; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }

        .org-logo  { max-height: 42px; max-width: 140px; }
        .org-name  { font-size: 18px; font-weight: 700; color: #7c3aed; }
        .doc-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px; }

        .meta-row   { font-size: 10px; color: #64748b; margin-top: 2px; }
        .meta-label { font-weight: 600; color: #475569; }

        /* ── Summary bar ─────────────────────────── */
        .summary-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 8px 12px;
            margin-bottom: 18px;
            display: table;
            width: 100%;
        }
        .summary-item { display: table-cell; text-align: center; }
        .summary-num  { font-size: 18px; font-weight: 700; color: #7c3aed; display: block; }
        .summary-lbl  { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }

        /* ── Manifest block ──────────────────────── */
        .manifest-block {
            margin-bottom: 22px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            page-break-inside: avoid;
        }

        .manifest-header {
            background: #f5f3ff;
            padding: 9px 12px;
            display: table;
            width: 100%;
        }
        .mh-left  { display: table-cell; vertical-align: middle; width: 70%; }
        .mh-right { display: table-cell; vertical-align: middle; text-align: right; width: 30%; }

        .manifest-number {
            font-size: 13px;
            font-weight: 700;
            color: #5b21b6;
            letter-spacing: 0.05em;
        }
        .manifest-meta { font-size: 10px; color: #6b7280; margin-top: 2px; }
        .manifest-meta b { color: #374151; }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9.5px;
            font-weight: 600;
        }
        .badge-open       { background: #d1fae5; color: #065f46; }
        .badge-closed     { background: #f1f5f9; color: #475569; }
        .badge-dispatched { background: #dbeafe; color: #1e40af; }

        /* ── Shipments table ─────────────────────── */
        .ship-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .ship-table thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .ship-table th {
            padding: 6px 10px;
            text-align: left;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.04em;
        }
        .ship-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #374151; }
        .ship-table tr:last-child td { border-bottom: none; }
        .ship-table tr:nth-child(even) td { background: #fafafe; }

        .tracking  { font-family: monospace; font-weight: 600; color: #1e293b; }
        .no-ships  { padding: 10px; text-align: center; color: #9ca3af; font-style: italic; }

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
                {{ $to_date   ? \Carbon\Carbon::parse($to_date)->format('d/m/Y')   : $labels['period_today'] }}
            </div>
            @endif
            <div class="meta-row">
                <span class="meta-label">{{ $labels['driver'] }}:</span> {{ $driver_name }}
            </div>
        </div>
    </div>

    {{-- ── Summary bar ── --}}
    @php $totalShipments = $manifests->sum(fn($m) => $m->shipments->count()); @endphp
    <div class="summary-bar">
        <div class="summary-item">
            <span class="summary-num">{{ $manifests->count() }}</span>
            <span class="summary-lbl">{{ $labels['manifests_lbl'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ $totalShipments }}</span>
            <span class="summary-lbl">{{ $labels['total_shipments'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ $manifests->where('status','open')->count() }}</span>
            <span class="summary-lbl">{{ $labels['open_lbl'] }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-num">{{ $manifests->where('status','dispatched')->count() }}</span>
            <span class="summary-lbl">{{ $labels['dispatched_lbl'] }}</span>
        </div>
    </div>

    @forelse ($manifests as $manifest)
        @php
            $statusKey   = 'status_' . $manifest->status;
            $statusLabel = $labels[$statusKey] ?? ucfirst($manifest->status);
            $statusClass = 'badge-' . $manifest->status;
        @endphp
        <div class="manifest-block">
            {{-- Manifest header row --}}
            <div class="manifest-header">
                <div class="mh-left">
                    <div class="manifest-number">{{ $manifest->manifest_number }}</div>
                    <div class="manifest-meta">
                        <b>{{ $labels['driver'] }}:</b>
                        {{ $manifest->driver?->name ?? $labels['unassigned'] }}
                        &nbsp;&nbsp;
                        <b>{{ $labels['created'] }}:</b>
                        {{ $manifest->created_at->format('d/m/Y') }}
                        &nbsp;&nbsp;
                        <b>{{ $labels['shipments_count'] }}:</b>
                        {{ $manifest->shipments->count() }}
                    </div>
                </div>
                <div class="mh-right">
                    <span class="badge {{ $statusClass }}">{{ $statusLabel }}</span>
                </div>
            </div>

            {{-- Shipments --}}
            @if($manifest->shipments->isNotEmpty())
                <table class="ship-table">
                    <thead>
                        <tr>
                            <th style="width:28px;">#</th>
                            <th>{{ $labels['tracking_col'] }}</th>
                            <th>{{ $labels['recipient'] }}</th>
                            <th>{{ $labels['destination'] }}</th>
                            <th>{{ $labels['status_lbl'] }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($manifest->shipments as $i => $s)
                        @php
                            $dest = collect([
                                $s->receiver_details['city']    ?? null,
                                $s->receiver_details['country'] ?? null,
                            ])->filter()->implode(', ') ?: '—';
                            $recipient = $s->receiver_details['name'] ?? '—';
                        @endphp
                        <tr>
                            <td style="color:#9ca3af;">{{ $i + 1 }}</td>
                            <td class="tracking">{{ $s->tracking_number }}</td>
                            <td>{{ $recipient }}</td>
                            <td>{{ $dest }}</td>
                            <td style="text-transform:capitalize;">{{ str_replace('_', ' ', $s->status) }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <div class="no-ships">{{ $labels['no_shipments'] }}</div>
            @endif
        </div>
    @empty
        <div style="text-align:center; padding: 40px; color: #9ca3af;">
            {{ $labels['no_results'] }}
        </div>
    @endforelse

    {{-- ── Footer ── --}}
    <div class="footer">
        {{ $org?->name ?? config('app.name') }} &mdash; {{ $labels['footer'] }} {{ $generated_at }}
    </div>

</body>
</html>
