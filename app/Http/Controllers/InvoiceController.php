<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\Commission;
use App\Models\Locker;
use App\Models\PreAlert;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use App\Services\NotificationService;

class InvoiceController extends Controller
{
    /**
     * Show the printable invoice for a shipment using Billing design (Modern Purple / Express Red).
     * Billing settings (theme, tax, footer) come from Settings > Billing.
     */
    public function index(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $perPage = min($request->integer('per_page', 15), 100);

        $query = Shipment::where('organization_id', $orgId)
            ->whereNotNull('total');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', '%' . $search . '%')
                  ->orWhere('invoice_number', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('status')) {
            $query->where('payment_status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $invoices = $query->with('returnRequest')->latest()->paginate($perPage)->withQueryString();

        // Commission payables — pending + approved commissions owed to agents/drivers
        $commissionPayables = Commission::where('organization_id', $orgId)
            ->whereIn('status', ['pending', 'approved'])
            ->with(['user:id,name,email', 'shipment:id,tracking_number'])
            ->latest()
            ->get(['id', 'user_id', 'shipment_id', 'commission_amount', 'currency', 'status', 'created_at', 'notes']);

        $commissionSummary = [
            'pending_amount'  => (float) Commission::where('organization_id', $orgId)->where('status', 'pending')->sum('commission_amount'),
            'approved_amount' => (float) Commission::where('organization_id', $orgId)->where('status', 'approved')->sum('commission_amount'),
            'total_payable'   => (float) Commission::where('organization_id', $orgId)->whereIn('status', ['pending', 'approved'])->sum('commission_amount'),
            'count'           => Commission::where('organization_id', $orgId)->whereIn('status', ['pending', 'approved'])->count(),
        ];

        return Inertia::render('Billing/Index', [
            'invoices'            => $invoices,
            'filters'             => $request->only(['search', 'status', 'date_from', 'date_to', 'per_page']),
            'commission_payables' => $commissionPayables,
            'commission_summary'  => $commissionSummary,
        ]);
    }

    public function reconciliation(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $perPage = min($request->integer('per_page', 25), 100);

        $query = Shipment::where('organization_id', $orgId)
            ->whereNotNull('total');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Compute totals on the full filtered set (before pagination) so scorecards
        // always reflect the entire filtered period, not just the current page.
        $allFiltered = (clone $query)->get(['total', 'cost_price']);
        $totals = [
            'revenue' => $allFiltered->sum('total'),
            'cost'    => $allFiltered->sum('cost_price'),
        ];
        $totals['profit'] = $totals['revenue'] - $totals['cost'];

        $shipments = $query->latest()->paginate($perPage)->withQueryString();

        return Inertia::render('Billing/Reconciliation', [
            'shipments' => $shipments,
            'totals'    => $totals,
            'filters'   => $request->only(['date_from', 'date_to', 'per_page']),
        ]);
    }

    public function exportReconciliationPdf(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $org   = \App\Models\Organization::find($orgId);

        $query = Shipment::where('organization_id', $orgId)->whereNotNull('total');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $items = $query->latest()->get(['id', 'tracking_number', 'total', 'cost_price', 'currency', 'created_at', 'sender_details']);

        $locale       = app()->getLocale();
        $i18nPath     = resource_path("js/i18n/{$locale}.json");
        $i18nFallback = resource_path('js/i18n/es.json');
        $i18nRaw      = file_exists($i18nPath) ? file_get_contents($i18nPath) : file_get_contents($i18nFallback);
        $i18n         = json_decode($i18nRaw, true) ?? [];
        $b            = $i18n['billing'] ?? [];

        $grandRevenue = $items->sum('total');
        $grandCost    = $items->sum('cost_price');
        $grandProfit  = $grandRevenue - $grandCost;

        $labels = [
            'title'         => $b['recon_pdf_title']    ?? 'Reconciliación',
            'generated'     => $b['pdf_generated']      ?? 'Generado',
            'period'        => $b['pdf_period']         ?? 'Período',
            'period_to'     => $b['pdf_to']             ?? 'al',
            'period_today'  => $b['pdf_today']          ?? 'hoy',
            'no_results'    => $b['recon_pdf_no_results'] ?? 'Sin registros.',
            'footer'        => $b['recon_pdf_footer']   ?? 'Reconciliación — Generado el',
            'col_tracking'  => $b['col_tracking']       ?? '# Seguimiento',
            'col_customer'  => $b['col_customer']       ?? 'Cliente',
            'col_date'      => $b['col_date']           ?? 'Fecha',
            'col_revenue'   => $b['col_revenue']        ?? 'Ingresos',
            'col_cost'      => $b['col_cost']           ?? 'Costo',
            'col_profit'    => $b['col_profit']         ?? 'Ganancia',
            'recon_margin'  => $b['recon_margin']       ?? 'Margen',
            'total_revenue' => $b['total_revenue']      ?? 'Ingresos Totales',
            'total_cost'    => $b['total_cost']         ?? 'Costo Total',
            'net_profit'    => $b['net_profit']         ?? 'Ganancia Neta',
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.reconciliation', [
            'items'          => $items,
            'org'            => $org,
            'from_date'      => $request->date_from,
            'to_date'        => $request->date_to,
            'generated_at'   => now()->format('d/m/Y H:i'),
            'grand_revenue'  => $grandRevenue,
            'grand_cost'     => $grandCost,
            'grand_profit'   => $grandProfit,
            'labels'         => $labels,
        ])->setPaper('a4', 'portrait');

        return $pdf->download('reconciliacion-' . now()->format('Y-m-d') . '.pdf');
    }

    public function exportPdf(Request $request)
    {
        // Verification point #8 — distributed integrity check
        if (app(\App\Services\LicenseVerificationService::class)->getHash() === '') {
            return response()->json(['error' => 'Export unavailable'], 403);
        }

        $orgId = Auth::user()->organization_id;
        $org   = \App\Models\Organization::find($orgId);

        $query = Shipment::where('organization_id', $orgId)->whereNotNull('total');

        if ($request->filled('search')) {
            $query->where('tracking_number', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('status')) {
            $query->where('payment_status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $items = $query->latest()->get();

        $locale       = app()->getLocale();
        $i18nPath     = resource_path("js/i18n/{$locale}.json");
        $i18nFallback = resource_path('js/i18n/es.json');
        $i18nRaw      = file_exists($i18nPath) ? file_get_contents($i18nPath) : file_get_contents($i18nFallback);
        $i18n         = json_decode($i18nRaw, true) ?? [];
        $b            = $i18n['billing'] ?? [];
        $common       = $i18n['common']  ?? [];

        $labels = [
            'title'       => $b['pdf_title']      ?? 'Reporte de Facturación',
            'generated'   => $b['pdf_generated']  ?? 'Generado',
            'period'      => $b['pdf_period']      ?? 'Período',
            'period_to'   => $b['pdf_to']          ?? 'al',
            'period_today'=> $b['pdf_today']       ?? 'hoy',
            'no_results'  => $b['pdf_no_results']  ?? 'No se encontraron facturas.',
            'footer'      => $b['pdf_footer']      ?? 'Reporte de Facturación — Generado el',
            'col_invoice' => $b['col_invoice']     ?? 'Factura #',
            'col_customer'=> $b['col_customer']    ?? 'Cliente',
            'col_amount'  => $b['col_amount']      ?? 'Monto',
            'col_date'    => $b['col_date']        ?? 'Fecha',
            'col_status'  => $b['col_status']      ?? 'Estado',
            'col_tax'     => $b['col_tax']         ?? 'Impuesto',
            'filter_paid'     => $b['filter_paid']     ?? 'Pagado',
            'filter_unpaid'   => $b['filter_unpaid']   ?? 'No Pagado',
            'filter_partial'  => $b['filter_partial']  ?? 'Parcial',
            'filter_refunded' => $b['filter_refunded'] ?? 'Reembolsado',
            'pdf_total'   => $b['pdf_total']       ?? 'Total',
            'pdf_count'   => $b['pdf_count']       ?? 'Facturas',
        ];

        $grandTotal = $items->sum('total');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.billing', [
            'items'        => $items,
            'org'          => $org,
            'from_date'    => $request->date_from,
            'to_date'      => $request->date_to,
            'generated_at' => now()->format('d/m/Y H:i'),
            'grand_total'  => $grandTotal,
            'labels'       => $labels,
        ])->setPaper('a4', 'portrait');

        return $pdf->download('facturacion-' . now()->format('Y-m-d') . '.pdf');
    }

    /**
     * Show the printable invoice for a shipment (Pro A4 design from Settings > Billing).
     */
    public function show(Shipment $shipment)
    {
        $user = Auth::user();

        if ($shipment->organization_id !== $user->organization_id) {
            abort(403);
        }

        // Customers can only view invoices for shipments they own:
        // created by themselves, or linked via their locker, or via their pre-alert.
        if ($user->hasRole('customer')) {
            $ownedByCustomer =
                (int) $shipment->created_by === $user->id
                || ($shipment->locker_id && Locker::where('id', $shipment->locker_id)->where('customer_id', $user->id)->exists())
                || ($shipment->pre_alert_id && PreAlert::where('id', $shipment->pre_alert_id)->where('customer_id', $user->id)->exists());

            if (! $ownedByCustomer) {
                abort(403);
            }
        }

        $shipment->load(['organization', 'shipmentStatus', 'payments.creator', 'packages', 'rateCard', 'rateRule']);
        $orgId = Auth::user()->organization_id;

        ['name' => $serviceName, 'description' => $serviceDescription] = $this->resolveServiceName($shipment, $orgId);
        $invoiceSettings = $this->buildInvoiceSettings($orgId);
        $shipmentData = $this->buildShipmentData($shipment, $serviceName, $serviceDescription);

        $trackingUrl = url()->route('tracking.index', ['tracking_number' => $shipment->tracking_number]);
        $statusLabel = $shipment->shipmentStatus?->name ?? \Illuminate\Support\Str::title(str_replace('_', ' ', (string) $shipment->status));

        return Inertia::render('Billing/Invoice', [
            'shipment' => $shipmentData,
            'organization' => $shipment->organization,
            'billingSettings' => $invoiceSettings,
            'trackingUrl' => $trackingUrl,
            'statusLabel' => $statusLabel,
        ]);
    }

    /**
     * ZATCA-compliant Arabic (RTL) tax invoice — printable HTML / PDF.
     * Shows 15% VAT breakdown and a ZATCA Phase-1 QR code.
     */
    public function taxInvoice(Shipment $shipment)
    {
        $user = Auth::user();

        if ($shipment->organization_id !== $user->organization_id) {
            abort(403);
        }

        if ($user->hasRole('customer')) {
            $ownedByCustomer =
                (int) $shipment->created_by === $user->id
                || ($shipment->locker_id && Locker::where('id', $shipment->locker_id)->where('customer_id', $user->id)->exists())
                || ($shipment->pre_alert_id && PreAlert::where('id', $shipment->pre_alert_id)->where('customer_id', $user->id)->exists());
            if (! $ownedByCustomer) {
                abort(403);
            }
        }

        $shipment->load(['organization', 'packages']);
        $org = $shipment->organization;

        // Resolve the VAT-inclusive grand total. If the stored total already
        // includes tax, derive the net + VAT from it; otherwise add VAT on top.
        $vatEnabled = (bool) ($org->vat_enabled ?? true);
        $storedTotal = (float) ($shipment->total ?? $shipment->subtotal ?? 0);

        if ($vatEnabled) {
            // Treat the stored total as VAT-inclusive (most carriers quote gross).
            $grandTotal = round($storedTotal, 2);
            $net        = \App\Support\SaudiVat::netFromInclusive($grandTotal);
            $vatAmount  = \App\Support\SaudiVat::fromInclusive($grandTotal);
        } else {
            $net        = round($storedTotal, 2);
            $vatAmount  = 0.0;
            $grandTotal = $net;
        }

        $discount = (float) ($shipment->discount ?? 0);
        $currency = $shipment->currency ?: 'SAR';

        $sellerName = $org->legal_name ?: $org->name;
        $vatNumber  = $org->vat_number ?: ($org->tax_id ?: '');
        $timestamp  = ($shipment->created_at ?? now())->toIso8601String();

        // ZATCA Phase-1 TLV Base64 QR payload
        $zatcaPayload = app(\App\Services\ZatcaQrService::class)->generate(
            $sellerName,
            (string) $vatNumber,
            $timestamp,
            number_format($grandTotal, 2, '.', ''),
            number_format($vatAmount, 2, '.', ''),
        );

        return view('invoices.tax-invoice', [
            'shipment'     => $shipment,
            'org'          => $org,
            'sellerName'   => $sellerName,
            'vatNumber'    => $vatNumber,
            'crNumber'     => $org->commercial_registration,
            'net'          => $net,
            'discount'     => $discount,
            'vatAmount'    => $vatAmount,
            'grandTotal'   => $grandTotal,
            'vatEnabled'   => $vatEnabled,
            'currency'     => $currency,
            'zatcaPayload' => $zatcaPayload,
            'issuedAt'     => ($shipment->created_at ?? now()),
        ]);
    }

    /**
     * Send invoice by email using SMTP from Settings > Notifications.
     */
    public function sendEmail(Request $request, Shipment $shipment)
    {
        if ($shipment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $request->validate([
            'to' => 'required|email',
            'subject' => 'required|string|max:255',
            'body' => 'nullable|string|max:5000',
        ]);

        $invoiceUrl = route('invoices.show', $shipment->id);
        $body = $request->input('body', '');
        if ($body === '') {
            $body = __('shipments.show.invoice_email_default_body', ['tracking' => $shipment->tracking_number])
                . "

"
                . __('shipments.show.invoice_email_view_online', ['url' => $invoiceUrl]);
        } else {
            $body .= "

" . __('shipments.show.invoice_email_view_online', ['url' => $invoiceUrl]);
        }
        $bodyHtml = '<p>' . nl2br(e($body)) . '</p>';

        $shipment->load(['organization', 'shipmentStatus', 'payments.creator', 'packages', 'rateCard', 'rateRule']);
        $orgId = Auth::user()->organization_id;

        ['name' => $serviceName, 'description' => $serviceDescription] = $this->resolveServiceName($shipment, $orgId);
        $invoiceSettings = $this->buildInvoiceSettings($orgId);
        $shipmentData = $this->buildShipmentData($shipment, $serviceName, $serviceDescription);

        $statusLabel = $shipment->shipmentStatus?->name ?? \Illuminate\Support\Str::title(str_replace('_', ' ', (string) $shipment->status));
        $trackingUrl = url()->route('tracking.index', ['tracking_number' => $shipment->tracking_number]);

        // Renderizar la factura como HTML usando Inertia (sin layout)
        $invoiceHtml = view('invoices.email-attachment', [
            'shipment' => $shipmentData,
            'organization' => $shipment->organization,
            'settings' => $invoiceSettings,
            'trackingUrl' => $trackingUrl,
            'statusLabel' => $statusLabel,
        ])->render();

        // Guardar temporalmente el HTML
        $tempPath = storage_path('app/temp/invoice-' . $shipment->id . '-' . time() . '.html');
        \Illuminate\Support\Facades\File::ensureDirectoryExists(dirname($tempPath));
        file_put_contents($tempPath, $invoiceHtml);

        try {
            app(NotificationService::class)->sendMailFromSmtpChannel(
                Auth::user()->organization_id,
                $request->input('to'),
                $request->input('subject'),
                $bodyHtml,
                [
                    [
                        'path' => $tempPath,
                        'name' => 'Invoice-' . $shipment->tracking_number . '.html',
                        'mime' => 'text/html',
                    ]
                ]
            );
            
            // Limpiar archivo temporal
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            
            return response()->json(['success' => true, 'message' => __('shipments.show.invoice_email_sent_success')]);
        } catch (\Exception $e) {
            // Limpiar archivo temporal en caso de error
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            return response()->json(['success' => false, 'message' => $e->getMessage() ?: __('shipments.show.invoice_email_sent_error')], 422);
        }
    }

    /**
     * Send invoice link by WhatsApp via Twilio.
     */
    public function sendWhatsapp(Request $request, Shipment $shipment)
    {
        if ($shipment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $request->validate([
            'to' => 'required|string|max:20',
            'message' => 'nullable|string|max:1000',
        ]);

        $channel = \App\Models\NotificationChannel::where('organization_id', $shipment->organization_id)
            ->where('channel_type', 'twilio')
            ->first();

        if (!$channel || empty($channel->config)) {
            return response()->json(['success' => false, 'message' => __('Twilio is not configured. Please configure it in Settings > Notifications > Channels.')], 422);
        }

        $config = $channel->config;
        if (isset($config['token']) && is_string($config['token']) && strpos($config['token'], '*') === false) {
            try {
                $config['token'] = \Illuminate\Support\Facades\Crypt::decryptString($config['token']);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => __('Invalid Twilio token. Please re-enter it in Notifications.')], 422);
            }
        }

        $invoiceUrl = route('invoices.show', $shipment->id);
        $defaultMsg = "Your invoice for shipment {$shipment->tracking_number}. View/Print: {$invoiceUrl}";
        $message = $request->input('message') ?: $defaultMsg;

        try {
            app(NotificationService::class)->sendWhatsapp($config, $request->input('to'), $message);
            return response()->json(['success' => true, 'message' => __('WhatsApp message sent successfully.')]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Send invoice link by SMS via Twilio.
     */
    public function sendSms(Request $request, Shipment $shipment)
    {
        if ($shipment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $request->validate([
            'to' => 'required|string|max:20',
            'message' => 'nullable|string|max:500',
        ]);

        $channel = \App\Models\NotificationChannel::where('organization_id', $shipment->organization_id)
            ->where('channel_type', 'twilio')
            ->first();

        if (!$channel || empty($channel->config)) {
            return response()->json(['success' => false, 'message' => __('Twilio is not configured. Please configure it in Settings > Notifications > Channels.')], 422);
        }

        $config = $channel->config;
        if (isset($config['token']) && is_string($config['token']) && strpos($config['token'], '*') === false) {
            try {
                $config['token'] = \Illuminate\Support\Facades\Crypt::decryptString($config['token']);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => __('Invalid Twilio token. Please re-enter it in Notifications.')], 422);
            }
        }

        $invoiceUrl = route('invoices.show', $shipment->id);
        $defaultMsg = "Invoice for shipment {$shipment->tracking_number}: {$invoiceUrl}";
        $message = $request->input('message') ?: $defaultMsg;

        try {
            app(NotificationService::class)->sendSms($config, $request->input('to'), $message);
            return response()->json(['success' => true, 'message' => __('SMS sent successfully.')]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Resolve the human-readable service name and description for a shipment.
     * Priority: Service model → RateCard+RateRule → service_type slug → fallback '—'.
     *
     * @return array{name: string, description: string|null}
     */
    private function resolveServiceName(Shipment $shipment, int $orgId): array
    {
        $serviceType = (string) ($shipment->service_type ?? '');
        if ($serviceType !== '') {
            // Strip the 'svc_' prefix used internally by service-based rates to avoid
            // collision with RateRule service_type values in the rate engine.
            $serviceCode = preg_replace('/^svc_/', '', $serviceType);
            $service = \App\Models\Service::withoutGlobalScope('tenant')
                ->where('organization_id', $orgId)
                ->where('code', $serviceCode)
                ->first();
            if ($service) {
                return ['name' => $service->name, 'description' => $service->description ?: null];
            }
        }
        if ($shipment->rateCard && $shipment->rateRule) {
            return ['name' => trim($shipment->rateCard->name . ' – ' . $shipment->rateRule->service_type), 'description' => null];
        }
        if ($serviceType !== '') {
            // Strip prefix for display fallback so 'svc_air_express' renders as 'Air Express'
            $displayCode = preg_replace('/^svc_/', '', $serviceType);
            return ['name' => \Illuminate\Support\Str::title(str_replace('_', ' ', $displayCode)), 'description' => null];
        }
        return ['name' => '—', 'description' => null];
    }

    /**
     * Build the invoiceSettings array consumed by ProInvoiceTemplate.
     */
    private function buildInvoiceSettings(int $orgId): array
    {
        $settings = app(\App\Services\SettingsService::class)->forOrganization($orgId);
        $billingSettings = $settings->getGroup('billing');
        $effectiveSettings = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($orgId);
        $invoiceSequence = \App\Models\NumberingSequence::where('organization_id', $orgId)
            ->where('type', 'invoice')
            ->first();

        $invoiceSettings = [
            'tax_rate'        => $billingSettings['tax_rate'] ?? $effectiveSettings['tax_rate'] ?? 0,
            'tax_name'        => $billingSettings['tax_name'] ?? $effectiveSettings['tax_name'] ?? 'VAT',
            'invoice_terms'   => $billingSettings['invoice_terms'] ?? 'Payment is due upon receipt.',
            'footer_notes'    => $billingSettings['footer_notes'] ?? 'Thank you for your business.',
            'invoice_theme'   => $billingSettings['invoice_theme'] ?? 'fedex',
            'weight_unit'     => $effectiveSettings['weight_unit'] ?? $billingSettings['weight_unit'] ?? 'kg',
            'dimension_unit'  => $effectiveSettings['dimension_unit'] ?? $billingSettings['dimension_unit'] ?? 'cm',
            'stripe_enabled'  => (bool) ($billingSettings['stripe_enabled'] ?? false),
            'paypal_enabled'  => (bool) ($billingSettings['paypal_enabled'] ?? false),
            'sequence_prefix' => $invoiceSequence?->prefix ?? 'INV',
            'sequence_padding' => $invoiceSequence?->padding ?? 6,
            'signature_url'   => $billingSettings['signature_url'] ?? null,
            'tax_number'      => $billingSettings['tax_number'] ?? null,
        ];

        if (!empty($invoiceSettings['signature_url'])
            && !str_starts_with($invoiceSettings['signature_url'], 'http')
            && !str_starts_with($invoiceSettings['signature_url'], '/')) {
            $invoiceSettings['signature_url'] = \Illuminate\Support\Facades\Storage::url(
                ltrim($invoiceSettings['signature_url'], '/')
            );
        }

        return $invoiceSettings;
    }

    /**
     * Enrich the shipment array with invoice-specific fields derived from raw relations.
     */
    private function buildShipmentData(Shipment $shipment, string $serviceName, ?string $serviceDescription): array
    {
        $sender   = is_array($shipment->sender_details)   ? $shipment->sender_details   : [];
        $receiver = is_array($shipment->receiver_details) ? $shipment->receiver_details : [];

        $countryCode = static function (array $d): ?string {
            $code = $d['country_code'] ?? $d['country'] ?? '';
            if (empty($code)) return null;
            $s = strtoupper(trim((string) $code));
            if (strlen($s) === 2) return $s;
            $map = ['ESTADOS UNIDOS' => 'US', 'UNITED STATES' => 'US', 'USA' => 'US', 'COLOMBIA' => 'CO', 'MEXICO' => 'MX', 'MÉXICO' => 'MX'];
            return $map[$s] ?? substr($s, 0, 2);
        };

        $pkg             = is_array($shipment->package_details) ? $shipment->package_details : [];
        $packages        = $pkg['packages'] ?? (isset($pkg['weight']) ? [$pkg] : []);
        $summary         = $pkg['summary'] ?? [];
        $firstPkg        = $packages[0] ?? $pkg;
        $firstShipmentPkg = ($shipment->packages ?? collect())->first();
        $labelDeclared   = $summary['declared_value_total']
            ?? $firstPkg['declared_value']
            ?? $pkg['declared_value']
            ?? ($firstShipmentPkg ? (float) $firstShipmentPkg->declared_value : null)
            ?? null;

        // Count packages: prefer loaded relation, fall back to package_details summary, then 1.
        $packagesCount = $shipment->packages->count() ?: ((int) ($summary['total_pieces'] ?? 0) ?: 1);

        return array_merge($shipment->toArray(), [
            'origin_country_code'      => $countryCode($sender) ?? '—',
            'destination_country_code' => $countryCode($receiver) ?? '—',
            'service_name'             => $serviceName,
            'service_description'      => $serviceDescription,
            'packages_count'           => $packagesCount,
            'package_details'          => array_merge($pkg, [
                'label_declared_value' => $labelDeclared,
                'label_content'        => $firstPkg['content_description'] ?? $pkg['content_description'] ?? null,
            ]),
        ]);
    }
}
