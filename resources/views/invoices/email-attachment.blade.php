<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('invoice.title') }} {{ $shipment['tracking_number'] ?? '' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #111; background: #fff; }
        .invoice-container { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; }
        .topbar { background: linear-gradient(90deg, #4f46e5, #0b1020); color: #fff; padding: 24px 32px; position: relative; }
        .topbar:after { content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 12px; background: repeating-linear-gradient(90deg, #22c55e 0px, #22c55e 20px, transparent 20px, transparent 36px); opacity: 0.9; }
        .brand-mark { width: 14px; height: 48px; border-radius: 4px; background: #22c55e; display: inline-block; vertical-align: middle; margin-right: 16px; }
        h1 { font-size: 20px; font-weight: bold; margin: 0; color: #fff; }
        .topbar-subtitle { font-size: 12px; opacity: 0.9; margin-top: 4px; }
        .invoice-box { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; min-width: 200px; text-align: right; }
        .invoice-label { font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.8; }
        .invoice-number { font-size: 18px; font-weight: 900; font-family: monospace; margin-top: 4px; }
        .invoice-info { font-size: 11px; opacity: 0.9; margin-top: 8px; }
        .invoice-info-row { display: flex; justify-between; gap: 16px; margin-top: 4px; }
        .invoice-info-row span:first-child { font-weight: normal; }
        .invoice-info-row span:last-child { font-family: monospace; font-weight: bold; }
        .status-badge { text-transform: uppercase; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .status-paid { background: #10b981; color: #fff; }
        .status-unpaid { background: #f59e0b; color: #fff; }
        .body-content { padding: 32px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .card-header { background: #f4f6ff; padding: 10px 16px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .card-header-code { font-family: monospace; opacity: 0.7; }
        .card-body { padding: 16px; font-size: 13px; }
        .card-body-name { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
        .card-body-email, .card-body-tel { color: #6b7280; margin-top: 8px; }
        .card-body-email span, .card-body-tel span { font-family: monospace; color: #000; }
        .grid-2-small { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .label-gray { color: #6b7280; }
        .value-bold { font-weight: bold; margin-left: 4px; }
        .value-mono { font-family: monospace; font-weight: bold; margin-left: 4px; }
        .customs-note { font-size: 10px; font-style: italic; color: #9ca3af; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
        thead { background: #111827; color: #fff; }
        th { padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        th.text-right { text-align: right; }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        tbody tr:nth-child(odd) { background: #f9fafb; }
        td { padding: 12px 16px; font-size: 13px; }
        td.text-right { text-align: right; }
        .desc-title { font-weight: bold; }
        .desc-subtitle { font-size: 12px; color: #6b7280; }
        .font-mono { font-family: monospace; }
        .totals-section { display: flex; gap: 24px; margin-bottom: 24px; }
        .notes-box { flex: 1; border: 1px dashed #d1d5db; border-radius: 12px; padding: 12px; background: #fff; }
        .notes-label { font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: bold; margin-bottom: 4px; }
        .notes-text { font-size: 11px; color: #4b5563; line-height: 1.6; white-space: pre-wrap; }
        .totals-box { width: 350px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
        .total-row.bg-gray { background: #f9fafb; }
        .total-row.total-due { background: linear-gradient(90deg, #4f46e5, #0b1020); color: #fff; font-size: 15px; font-weight: bold; padding: 12px 16px; }
        .footer-section { position: absolute; bottom: 0; left: 0; right: 0; padding: 32px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
        .payment-methods-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; width: 60%; }
        .payment-methods-title { font-weight: 900; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; }
        .payment-method-tag { display: inline-block; padding: 4px 8px; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 10px; font-weight: bold; color: #4b5563; margin-right: 8px; margin-bottom: 4px; }
        .footer-note { font-size: 10px; color: #9ca3af; margin-top: 8px; }
        .footer-note .mono { font-family: monospace; color: #000; font-weight: bold; }
        .qr-section { text-align: right; }
        .qr-label { font-size: 10px; font-weight: bold; color: #111; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="topbar">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div class="brand-mark"></div>
                    <div>
                        <h1>{{ $organization->name ?? 'MasarXPlus' }} · {{ __('invoice.title') }}</h1>
                        <div class="topbar-subtitle">{{ $organization->tagline ?? $organization->legal_name ?? __('invoice.brand_tagline') }}</div>
                    </div>
                </div>
                <div class="invoice-box">
                    <div class="invoice-label">{{ __('invoice.invoice_label') }}</div>
                    <div class="invoice-number">{{ $settings['sequence_prefix'] ?? 'INV' }}-{{ str_pad($shipment['id'] ?? 0, $settings['sequence_padding'] ?? 6, '0', STR_PAD_LEFT) }}</div>
                    <div class="invoice-info">
                        <div class="invoice-info-row">
                            <span>{{ __('invoice.date') }}:</span>
                            <span>{{ \Carbon\Carbon::parse($shipment['created_at'] ?? now())->format('d/m/Y') }}</span>
                        </div>
                        <div class="invoice-info-row">
                            <span>{{ __('invoice.tracking') }}:</span>
                            <span>{{ $shipment['tracking_number'] ?? '—' }}</span>
                        </div>
                        <div class="invoice-info-row">
                            <span>{{ __('invoice.payment') }}:</span>
                            <span class="status-badge {{ ($shipment['payment_status'] ?? 'unpaid') === 'paid' ? 'status-paid' : 'status-unpaid' }}">
                                {{ ($shipment['payment_status'] ?? 'unpaid') === 'paid' ? __('invoice.paid') : __('invoice.unpaid') }}
                            </span>
                        </div>
                        @if(!empty($statusLabel))
                        <div class="invoice-info-row">
                            <span>{{ __('invoice.shipment') }}:</span>
                            <span class="status-badge" style="background: rgba(255,255,255,0.2);">{{ $statusLabel }}</span>
                        </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Body -->
        <div class="body-content">
            <!-- Company & Customer -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <span>{{ __('invoice.company_carrier') }}</span>
                        <span class="card-header-code">{{ strtoupper(str_replace(' ', '', substr($organization->name ?? 'DPX-LOG', 0, 8))) }}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-body-name">{{ $organization->legal_name ?? $organization->name ?? '—' }}</div>
                        @if($organization->address)
                        <div>{{ $organization->address }}</div>
                        @endif
                        <div>{{ implode(', ', array_filter([$organization->city, $organization->state, $organization->zip_code, $organization->country])) }}</div>
                        @if($organization->email)
                        <div class="card-body-email">Email: <span>{{ $organization->email }}</span></div>
                        @endif
                        @if($organization->phone)
                        <div class="card-body-tel">Tel: <span>{{ $organization->phone }}</span></div>
                        @endif
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span>{{ __('invoice.customer_bill_to') }}</span>
                        <span class="card-header-code">{{ $shipment['tracking_number'] ?? ('CUST-' . ($shipment['sender_id'] ?? '')) }}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-body-name">{{ $shipment['sender_details']['name'] ?? '—' }}</div>
                        <div>{{ implode(', ', array_filter([
                            $shipment['sender_details']['address'] ?? null,
                            $shipment['sender_details']['address_line2'] ?? null,
                            $shipment['sender_details']['city'] ?? null,
                            $shipment['sender_details']['state'] ?? null,
                            $shipment['sender_details']['zip_code'] ?? null,
                            $shipment['sender_details']['country'] ?? null
                        ])) ?: '—' }}</div>
                        @if(!empty($shipment['sender_details']['email']))
                        <div class="card-body-email">Email: <span>{{ $shipment['sender_details']['email'] }}</span></div>
                        @endif
                        <div class="card-body-tel">Tel: <span>{{ $shipment['sender_details']['phone'] ?? '—' }}</span></div>
                    </div>
                </div>
            </div>

            <!-- Shipment Details & Reference -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <span>{{ __('invoice.shipment_details') }}</span>
                        <span class="card-header-code">{{ ($shipment['origin_country_code'] ?? '—') }} → {{ ($shipment['destination_country_code'] ?? '—') }}</span>
                    </div>
                    <div class="card-body">
                        <div class="grid-2-small">
                            <div><span class="label-gray">{{ __('invoice.service_label') }}:</span><span class="value-bold">{{ $shipment['service_type'] ?? '—' }}</span></div>
                            <div><span class="label-gray">{{ __('invoice.pieces') }}:</span><span class="value-mono">{{ $shipment['packages_count'] ?? '—' }}</span></div>
                            <div><span class="label-gray">{{ __('invoice.weight') }}:</span><span class="value-mono">{{ $shipment['package_details']['summary']['total_weight'] ?? ($shipment['package_details']['weight'] ?? 0) }} {{ $settings['weight_unit'] ?? 'kg' }}</span></div>
                            <div><span class="label-gray">{{ __('invoice.dimensions') }}:</span><span class="value-mono">{{ ($shipment['package_details']['summary']['max_dims']['length'] ?? $shipment['package_details']['dimensions']['length'] ?? 0) }}x{{ ($shipment['package_details']['summary']['max_dims']['width'] ?? $shipment['package_details']['dimensions']['width'] ?? 0) }}x{{ ($shipment['package_details']['summary']['max_dims']['height'] ?? $shipment['package_details']['dimensions']['height'] ?? 0) }} {{ $settings['dimension_unit'] ?? 'cm' }}</span></div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span>{{ __('invoice.reference_content') }}</span>
                        <span class="card-header-code">REF: {{ $shipment['external_order_id'] ?? $shipment['tracking_number'] ?? '—' }}</span>
                    </div>
                    <div class="card-body">
                        <div><span class="label-gray">{{ __('invoice.content') }}:</span> {{ $shipment['package_details']['label_content'] ?? ($shipment['package_details']['packages'][0]['content_description'] ?? ($shipment['package_details']['content_description'] ?? '—')) }}</div>
                        <div style="margin-top: 4px;"><span class="label-gray">{{ __('invoice.declared_value') }}:</span> <span class="value-mono">{{ number_format($shipment['package_details']['label_declared_value'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</span></div>
                        <div class="customs-note">{{ __('invoice.customs_note') }}</div>
                    </div>
                </div>
            </div>

            <!-- Table -->
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%;">{{ __('invoice.description') }}</th>
                        <th style="width: 20%;">{{ __('invoice.details') }}</th>
                        <th class="text-right" style="width: 10%;">{{ __('invoice.qty') }}</th>
                        <th class="text-right" style="width: 15%;">{{ __('invoice.unit_price') }}</th>
                        <th class="text-right" style="width: 15%;">{{ __('invoice.total') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div class="desc-title">{{ $shipment['service_name'] ?? $shipment['service_type'] ?? __('invoice.international_freight') }}</div>
                            @if(!empty($shipment['service_description']))
                            <div class="desc-subtitle">{{ $shipment['service_description'] }}</div>
                            @endif
                        </td>
                        <td class="font-mono" style="font-size: 12px;">{{ $shipment['service_type'] ?? '—' }}</td>
                        <td class="text-right font-mono">1</td>
                        <td class="text-right font-mono">{{ number_format($shipment['subtotal'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</td>
                        <td class="text-right font-mono" style="font-weight: bold;">{{ number_format($shipment['subtotal'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</td>
                    </tr>
                    <tr>
                        <td>
                            <div class="desc-title">{{ $settings['tax_name'] ?? __('invoice.tax') }}</div>
                            <div class="desc-subtitle">{{ __('invoice.statutory_tax', ['percent' => $settings['tax_rate'] ?? 0]) }}</div>
                        </td>
                        <td class="font-mono" style="font-size: 12px;">{{ $settings['tax_rate'] ?? 0 }}% on {{ number_format($shipment['subtotal'] ?? 0, 2) }}</td>
                        <td class="text-right font-mono">-</td>
                        <td class="text-right font-mono">-</td>
                        <td class="text-right font-mono">{{ number_format($shipment['tax'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Totals & Notes -->
            <div class="totals-section">
                <div class="notes-box">
                    <div class="notes-label">{{ __('invoice.notes_terms') }}</div>
                    <div class="notes-text">{{ $settings['invoice_terms'] ?? $settings['footer_notes'] ?? __('invoice.delivery_default_terms') }}</div>
                </div>
                <div class="totals-box">
                    <div class="total-row">
                        <span>{{ __('invoice.subtotal') }}</span>
                        <span class="font-mono" style="font-weight: bold;">{{ number_format($shipment['subtotal'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</span>
                    </div>
                    @php
                        $surcharges = max(0, ($shipment['total'] ?? 0) - ($shipment['subtotal'] ?? 0) - ($shipment['tax'] ?? 0) + ($shipment['discount'] ?? 0));
                    @endphp
                    @if($surcharges > 0)
                    <div class="total-row">
                        <span>{{ __('invoice.surcharges') }}</span>
                        <span class="font-mono">{{ number_format($surcharges, 2) }} {{ $shipment['currency'] ?? 'USD' }}</span>
                    </div>
                    @endif
                    <div class="total-row bg-gray">
                        <span>{{ __('invoice.tax_label', ['name' => $settings['tax_name'] ?? 'VAT']) }}</span>
                        <span class="font-mono">{{ number_format($shipment['tax'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</span>
                    </div>
                    <div class="total-row total-due">
                        <span>{{ __('invoice.total_due') }}</span>
                        <span class="font-mono">{{ number_format($shipment['total'] ?? 0, 2) }} {{ $shipment['currency'] ?? 'USD' }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer-section">
            <div class="payment-methods-box">
                <div class="payment-methods-title">{{ __('invoice.payment_methods') }}</div>
                <div>
                    @if($settings['stripe_enabled'] ?? false)
                    <span class="payment-method-tag">{{ __('invoice.credit_card_stripe') }}</span>
                    @endif
                    @if($settings['paypal_enabled'] ?? false)
                    <span class="payment-method-tag">{{ __('invoice.paypal_pro') }}</span>
                    @endif
                    @if(!($settings['stripe_enabled'] ?? false) && !($settings['paypal_enabled'] ?? false))
                    <span class="payment-method-tag">{{ __('invoice.bank_transfer_cash') }}</span>
                    @endif
                </div>
                <div class="footer-note">
                    @if(!empty($settings['footer_notes']))
                    <div style="color: #4b5563; margin-bottom: 4px;">{{ $settings['footer_notes'] }}</div>
                    @endif
                    {{ __('invoice.payment_reference') }}: <span class="mono">{{ $settings['sequence_prefix'] ?? 'INV' }}-{{ str_pad($shipment['id'] ?? 0, $settings['sequence_padding'] ?? 6, '0', STR_PAD_LEFT) }}</span>
                </div>
            </div>
            <div class="qr-section">
                @if(!empty($trackingUrl))
                <div style="width: 80px; height: 80px; background: #f3f4f6; border: 1px solid #e5e7eb; display: inline-block;"></div>
                <div class="qr-label">{{ __('invoice.scan_to_track') }}</div>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
