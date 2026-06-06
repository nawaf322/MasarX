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

namespace App\Services;

use App\Models\Shipment;

/**
 * Orchestrates payment initiation for shipments.
 * Real Stripe Checkout and PayPal Orders API integration.
 */
class PaymentOrchestrator
{
    public function getAvailableMethods(int $organizationId): array
    {
        $settings = app(SettingsService::class)->forOrganization($organizationId);
        $billing = $settings->getGroup('billing') ?? [];

        $methods = [];
        if (!empty($billing['stripe_enabled']) && !empty($billing['stripe_secret'])) {
            $stripeTestMode = filter_var($billing['stripe_test_mode'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $methods[] = [
                'id'        => 'stripe',
                'label'     => 'Stripe',
                'enabled'   => true,
                'test_mode' => $stripeTestMode,
            ];
        }
        if (!empty($billing['paypal_enabled']) && !empty($billing['paypal_client_id']) && !empty($billing['paypal_secret'])) {
            $paypalTestMode = filter_var($billing['paypal_test_mode'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $methods[] = [
                'id'        => 'paypal',
                'label'     => 'PayPal',
                'enabled'   => true,
                'test_mode' => $paypalTestMode,
            ];
        }
        if ($this->isTapConfigured($billing ?? [])) {
            $methods[] = [
                'id' => 'tap',
                'label' => 'Tap',
                'enabled' => true,
            ];
        }
        $methods[] = [
            'id' => 'manual',
            'label' => __('shipments.wizard.payment_manual'),
            'enabled' => true,
        ];

        return $methods;
    }

    /**
     * Initiate Stripe Checkout for a shipment. Returns redirect URL.
     */
    public function createStripeCheckout(Shipment $shipment): array
    {
        $settings = app(SettingsService::class)->forOrganization($shipment->organization_id);
        $billing = $settings->getGroup('billing') ?? [];

        $secret = $billing['stripe_secret'] ?? null;
        if (empty($secret)) {
            throw new \RuntimeException('Stripe is not configured. Add stripe_secret in Settings > Billing.');
        }

        $testMode = filter_var($billing['stripe_test_mode'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $isTestKey = str_starts_with($secret, 'sk_test_');
        if ($testMode && !$isTestKey) {
            throw new \RuntimeException('Stripe test mode is enabled but a live secret key was provided. Update your key or disable test mode in Settings > Billing.');
        }
        if (!$testMode && $isTestKey) {
            throw new \RuntimeException('Stripe is set to live mode but a test secret key was provided. Update your key or enable test mode in Settings > Billing.');
        }

        \Stripe\Stripe::setApiKey($secret);

        $amountCents = (int) round((float) $shipment->total * 100);
        $currency = strtolower($shipment->currency ?? 'usd');
        $successUrl = route('shipments.payment.success', ['shipment' => $shipment->id]);
        $cancelUrl = route('shipments.show', ['shipment' => $shipment->id]);

        $session = \Stripe\Checkout\Session::create([
            'mode' => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency' => $currency,
                    'product_data' => [
                        'name' => 'Shipment ' . $shipment->tracking_number,
                        'description' => 'Invoice for shipment ' . $shipment->tracking_number,
                    ],
                    'unit_amount' => max(50, $amountCents),
                ],
                'quantity' => 1,
            ]],
            'success_url' => $successUrl . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancelUrl,
            'metadata' => [
                'shipment_id' => (string) $shipment->id,
                'organization_id' => (string) $shipment->organization_id,
            ],
            'client_reference_id' => $shipment->tracking_number,
        ]);

        return [
            'redirect_url' => $session->url,
            'session_id' => $session->id,
        ];
    }

    /**
     * Create PayPal order and return approve URL.
     */
    public function createPayPalOrder(Shipment $shipment): array
    {
        $settings = app(SettingsService::class)->forOrganization($shipment->organization_id);
        $billing = $settings->getGroup('billing') ?? [];

        $clientId = $billing['paypal_client_id'] ?? null;
        $secret = $billing['paypal_secret'] ?? null;
        if (empty($clientId) || empty($secret)) {
            throw new \RuntimeException('PayPal is not configured. Add paypal_client_id and paypal_secret in Settings > Billing.');
        }

        $testMode = !empty($billing['paypal_test_mode']);
        $baseUrl = $testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

        $accessToken = $this->resolvePayPalAccessToken($clientId, $secret, $baseUrl);
        $amount = number_format((float) $shipment->total, 2, '.', '');
        $currency = strtoupper($shipment->currency ?? 'USD');

        $successUrl = route('shipments.payment.success', ['shipment' => $shipment->id]);
        $cancelUrl = route('shipments.show', ['shipment' => $shipment->id]);

        $org = \App\Models\Organization::find($shipment->organization_id);
        $brandName = !empty(trim((string)($org?->name ?? ''))) ? $org->name : 'MasarXPlus';

        $orderPayload = [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => $shipment->tracking_number,
                'description' => 'Shipment ' . $shipment->tracking_number,
                'amount' => [
                    'currency_code' => $currency,
                    'value' => $amount,
                ],
            ]],
            'application_context' => [
                'return_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'brand_name' => $brandName,
            ],
        ];

        $orderResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)
            ->post($baseUrl . '/v2/checkout/orders', $orderPayload);

        if (!$orderResponse->successful()) {
            throw new \RuntimeException('PayPal order failed: ' . ($orderResponse->json('message') ?? json_encode($orderResponse->json())));
        }

        $order = $orderResponse->json();
        $approveLink = collect($order['links'] ?? [])->firstWhere('rel', 'approve');
        $approveUrl = $approveLink['href'] ?? null;

        if (!$approveUrl) {
            throw new \RuntimeException('PayPal did not return approve URL.');
        }

        $orderId = $order['id'] ?? null;

        // SECURITY: Bind the PayPal order ID to this specific shipment so capturePayPalOrder()
        // can reject any attempt to reuse an order ID from a different payment flow.
        if ($orderId) {
            $shipment->update(['paypal_pending_order_id' => $orderId]);
        }

        return [
            'redirect_url' => $approveUrl,
            'order_id' => $orderId,
        ];
    }

    /**
     * Initiate payment for a shipment. Returns redirect URL or null for manual.
     */
    public function initiatePayment(string $method, int $organizationId, float $amount, string $currency, string $description = '', ?Shipment $shipment = null): ?array
    {
        if ($method === 'manual') {
            return null;
        }
        if (!$shipment) {
            return null;
        }

        try {
            if ($method === 'stripe') {
                $result = $this->createStripeCheckout($shipment);
                $this->logPaymentRequest($shipment->organization_id, 'stripe', 'initiate', ['shipment_id' => $shipment->id], $result, 200);
                return $result;
            }
            if ($method === 'paypal') {
                $result = $this->createPayPalOrder($shipment);
                $this->logPaymentRequest($shipment->organization_id, 'paypal', 'initiate', ['shipment_id' => $shipment->id], $result, 200);
                return $result;
            }
            if ($method === 'tap') {
                $result = $this->createTapCheckout($shipment);
                $this->logPaymentRequest($shipment->organization_id, 'tap', 'initiate', ['shipment_id' => $shipment->id], $result, 200);
                return $result;
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PaymentOrchestrator: ' . $e->getMessage());
            $this->logPaymentRequest($organizationId, $method, 'initiate', ['error' => $e->getMessage()], null, 500);
            throw $e;
        }

        return null;
    }

    /**
     * Verify Stripe session and mark shipment as paid.
     */
    public function verifyStripeSession(string $sessionId, int $organizationId): ?Shipment
    {
        $settings = app(SettingsService::class)->forOrganization($organizationId);
        $billing = $settings->getGroup('billing') ?? [];
        $secret = $billing['stripe_secret'] ?? null;
        if (empty($secret)) {
            return null;
        }

        \Stripe\Stripe::setApiKey($secret);
        $session = \Stripe\Checkout\Session::retrieve($sessionId);

        if ($session->payment_status !== 'paid') {
            return null;
        }

        $shipmentId = $session->metadata->shipment_id ?? null;
        if (!$shipmentId) {
            return null;
        }

        $shipment = Shipment::find($shipmentId);
        if (!$shipment || $shipment->organization_id != $organizationId) {
            return null;
        }

        // SECURITY: Verify that the amount Stripe charged matches what we expected.
        // Prevents using a checkout session from a cheaper shipment to mark a more expensive one paid.
        $expectedCents = (int) round((float) $shipment->total * 100);
        $actualCents   = (int) ($session->amount_total ?? 0);
        if (abs($expectedCents - $actualCents) > 1) {
            \Illuminate\Support\Facades\Log::critical('PaymentOrchestrator: Stripe amount mismatch — REJECTED', [
                'shipment_id'    => $shipment->id,
                'expected_cents' => $expectedCents,
                'actual_cents'   => $actualCents,
                'session_id'     => $sessionId,
                'organization_id' => $organizationId,
            ]);
            return null;
        }

        $payment = \App\Models\Payment::create([
            'shipment_id' => $shipment->id,
            'organization_id' => $shipment->organization_id,
            'amount' => $shipment->total,
            'currency' => $shipment->currency ?? 'USD',
            'method' => \App\Models\Payment::METHOD_STRIPE,
            'external_id' => $sessionId,
            'created_by' => null,
        ]);
        $shipment->update(['payment_status' => \App\Enums\PaymentStatus::PAID]);
        $shipment->activities()->create([
            'user_id' => null,
            'action' => 'payment_registered',
            'description' => __('shipments.activity.payment_stripe'),
            'metadata' => ['payment_id' => $payment->id, 'method' => 'stripe'],
        ]);
        $this->logPaymentRequest($organizationId, 'stripe', 'capture', ['session_id' => $sessionId], ['status' => 'paid', 'payment_id' => $payment->id], 200);
        event(new \App\Events\PaymentReceived($shipment, $payment, 'stripe', (float) $shipment->total, $shipment->currency ?? 'USD'));
        return $shipment;
    }

    /**
     * Tap: stub seguro. Lanza excepción si no está configurado.
     * Habilitar solo si existen tap_* en billing (tap_secret_key, tap_publishable_key).
     */
    public function createTapCheckout(Shipment $shipment): array
    {
        $settings = app(SettingsService::class)->forOrganization($shipment->organization_id);
        $billing = $settings->getGroup('billing') ?? [];
        if (!$this->isTapConfigured($billing)) {
            throw new \RuntimeException('Tap is not configured. Add tap_secret_key (and tap_publishable_key) in Settings > Billing.');
        }
        // TODO: Integración real con Tap API cuando haya credenciales.
        throw new \RuntimeException('Tap integration is not yet implemented. Use Stripe or PayPal.');
    }

    private function isTapConfigured(array $billing): bool
    {
        return !empty($billing['tap_secret_key']);
    }

    /**
     * Obtain a PayPal access token via client-credentials grant.
     * Shared by createPayPalOrder() and capturePayPalOrder() to avoid duplication.
     *
     * @throws \RuntimeException on auth failure
     */
    private function resolvePayPalAccessToken(string $clientId, string $secret, string $baseUrl): string
    {
        $response = \Illuminate\Support\Facades\Http::withBasicAuth($clientId, $secret)
            ->asForm()
            ->post($baseUrl . '/v1/oauth2/token', ['grant_type' => 'client_credentials']);

        if (!$response->successful()) {
            throw new \RuntimeException('PayPal auth failed: ' . ($response->json('error_description') ?? 'Unknown error'));
        }

        return $response->json('access_token');
    }

    private function logPaymentRequest(int $orgId, string $gateway, string $action, array $request, ?array $response, int $statusCode): void
    {
        try {
            \Illuminate\Support\Facades\DB::table('integration_request_logs')->insert([
                'organization_id' => $orgId,
                'integration_type' => 'payment',
                'integration_id' => 0,
                'action' => "{$gateway}_{$action}",
                'request' => json_encode($this->maskSensitive($request)),
                'response' => $response !== null ? json_encode($this->maskSensitive($response)) : null,
                'status_code' => $statusCode,
                'duration_ms' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('PaymentOrchestrator: failed to log payment request: ' . $e->getMessage());
        }
    }

    private function maskSensitive(array $data): array
    {
        $masked = ['password', 'secret', 'token', 'key', 'api_key'];
        $out = [];
        foreach ($data as $k => $v) {
            $lower = strtolower((string) $k);
            $mask = false;
            foreach ($masked as $m) {
                if (str_contains($lower, $m)) {
                    $mask = true;
                    break;
                }
            }
            $out[$k] = $mask && is_string($v) ? '***' : $v;
        }
        return $out;
    }

    /**
     * Capture PayPal order and mark shipment as paid.
     */
    public function capturePayPalOrder(string $orderId, Shipment $shipment): bool
    {
        // SECURITY: Verify the orderId was created for THIS specific shipment.
        // This prevents an authenticated user from reusing an orderId from another payment
        // (order ID reuse attack) to mark a different shipment as paid without paying.
        $expectedOrderId = $shipment->paypal_pending_order_id;
        if (!$expectedOrderId || !hash_equals((string) $expectedOrderId, (string) $orderId)) {
            \Illuminate\Support\Facades\Log::warning('PaymentOrchestrator: PayPal orderId mismatch', [
                'shipment_id' => $shipment->id,
                'expected' => $expectedOrderId ? '[set]' : '[none]',
                'received' => $orderId ? '[set]' : '[empty]',
            ]);
            return false;
        }

        $settings = app(SettingsService::class)->forOrganization($shipment->organization_id);
        $billing = $settings->getGroup('billing') ?? [];
        $clientId = $billing['paypal_client_id'] ?? null;
        $secret = $billing['paypal_secret'] ?? null;
        if (empty($clientId) || empty($secret)) {
            return false;
        }

        $testMode = !empty($billing['paypal_test_mode']);
        $baseUrl = $testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

        try {
            $accessToken = $this->resolvePayPalAccessToken($clientId, $secret, $baseUrl);
        } catch (\RuntimeException) {
            return false;
        }

        $captureResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)
            ->post($baseUrl . '/v2/checkout/orders/' . $orderId . '/capture');

        if (!$captureResponse->successful()) {
            return false;
        }

        $captureData    = $captureResponse->json();
        $capturedAmount = (float) ($captureData['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? $shipment->total);

        // SECURITY: Verify captured amount matches expected total within tolerance (±$0.02).
        // Consistent with Stripe: divergence is NOT silently accepted as a full payment.
        $expectedTotal  = (float) $shipment->total;
        $amountDivergence = abs($capturedAmount - $expectedTotal);
        if ($amountDivergence > 0.02) {
            \Illuminate\Support\Facades\Log::critical('PaymentOrchestrator: PayPal captured amount diverges from expected — marking PARTIAL, manual review required', [
                'shipment_id'     => $shipment->id,
                'expected_total'  => $expectedTotal,
                'captured_amount' => $capturedAmount,
                'divergence'      => $amountDivergence,
                'order_id'        => $orderId,
                'organization_id' => $shipment->organization_id,
            ]);

            // Record the actual captured amount but set status to PARTIAL — not PAID.
            // Finance must manually review and reconcile before marking fully paid.
            $payment = \App\Models\Payment::create([
                'shipment_id'    => $shipment->id,
                'organization_id'=> $shipment->organization_id,
                'amount'         => $capturedAmount,
                'currency'       => $shipment->currency ?? 'USD',
                'method'         => \App\Models\Payment::METHOD_PAYPAL,
                'external_id'    => $orderId,
                'created_by'     => null,
            ]);
            $shipment->update([
                'payment_status'           => \App\Enums\PaymentStatus::PARTIAL,
                'paypal_pending_order_id'  => null,
            ]);
            $shipment->activities()->create([
                'user_id'     => null,
                'action'      => 'payment_partial',
                'description' => 'PayPal capture amount diverged from expected total — marked partial, review required.',
                'metadata'    => ['payment_id' => $payment->id, 'method' => 'paypal', 'expected' => $expectedTotal, 'captured' => $capturedAmount],
            ]);
            $this->logPaymentRequest($shipment->organization_id, 'paypal', 'capture', ['order_id' => $orderId], ['status' => 'partial', 'payment_id' => $payment->id, 'divergence' => $amountDivergence], 200);
            return false;
        }

        $payment = \App\Models\Payment::create([
            'shipment_id'    => $shipment->id,
            'organization_id'=> $shipment->organization_id,
            'amount'         => $capturedAmount,
            'currency'       => $shipment->currency ?? 'USD',
            'method'         => \App\Models\Payment::METHOD_PAYPAL,
            'external_id'    => $orderId,
            'created_by'     => null,
        ]);
        // Clear the pending order ID now that capture is complete (one-time use).
        $shipment->update([
            'payment_status'          => \App\Enums\PaymentStatus::PAID,
            'paypal_pending_order_id' => null,
        ]);
        $shipment->activities()->create([
            'user_id'     => null,
            'action'      => 'payment_registered',
            'description' => __('shipments.activity.payment_paypal'),
            'metadata'    => ['payment_id' => $payment->id, 'method' => 'paypal'],
        ]);
        $this->logPaymentRequest($shipment->organization_id, 'paypal', 'capture', ['order_id' => $orderId], ['status' => 'paid', 'payment_id' => $payment->id], 200);
        event(new \App\Events\PaymentReceived($shipment, $payment, 'paypal', $capturedAmount, $shipment->currency ?? 'USD'));
        return true;
    }
}
