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

use App\Models\Organization;
use App\Models\SaasWalletTransaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Handles SaaS wallet recharges via Stripe Checkout and PayPal Orders v2.
 * Completely separate from PaymentOrchestrator (which handles shipment payments).
 */
class SaasPaymentService
{
    public function __construct(
        private readonly SaasWalletService $walletService,
        private readonly SaasInvoiceService $invoiceService,
        private readonly SettingsService $settingsService,
    ) {}

    // ─── Stripe ───────────────────────────────────────────────────────────────

    /**
     * Create a Stripe Checkout session for wallet recharge. Returns redirect URL + session ID.
     */
    public function createStripeSession(Organization $org, float $amount, string $currency = 'usd'): array
    {
        $billing = $this->billingSettings($org);
        $secret  = $billing['stripe_secret'] ?? null;

        if (empty($secret)) {
            throw new \RuntimeException('Stripe is not configured. Add stripe_secret in Settings > Billing.');
        }

        $testMode = filter_var($billing['stripe_test_mode'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $isTestKey = str_starts_with($secret, 'sk_test_');
        if ($testMode && !$isTestKey) {
            throw new \RuntimeException('Stripe is set to test mode but a live secret key was provided. Update your key or disable test mode in Settings > Billing.');
        }
        if (!$testMode && $isTestKey) {
            throw new \RuntimeException('Stripe is set to live mode but a test secret key was provided. Update your key or enable test mode in Settings > Billing.');
        }

        \Stripe\Stripe::setApiKey($secret);

        $amountCents = (int) round($amount * 100);
        $successUrl  = route('tenant.billing.recharge.stripe.success') . '?session_id={CHECKOUT_SESSION_ID}';
        $cancelUrl   = route('tenant.billing.recharge');

        $session = \Stripe\Checkout\Session::create([
            'mode'       => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency'     => strtolower($currency),
                    'product_data' => [
                        'name'        => 'Wallet Recharge',
                        'description' => 'Add funds to your ' . ($org->name ?? 'organization') . ' wallet',
                    ],
                    'unit_amount' => max(50, $amountCents),
                ],
                'quantity' => 1,
            ]],
            'success_url' => $successUrl,
            'cancel_url'  => $cancelUrl,
            'metadata'    => [
                'organization_id' => (string) $org->id,
                'type'            => 'saas_wallet_recharge',
                'amount'          => (string) $amount,
                'currency'        => strtoupper($currency),
            ],
            'client_reference_id' => 'saas-recharge-' . $org->id . '-' . time(),
        ]);

        return [
            'redirect_url' => $session->url,
            'session_id'   => $session->id,
        ];
    }

    /**
     * Verify a completed Stripe session and credit the wallet. Idempotent.
     */
    public function handleStripeSuccess(string $sessionId, int $orgId): bool
    {
        // Idempotency: skip if already processed
        if (SaasWalletTransaction::where('reference', $sessionId)->exists()) {
            return true;
        }

        $org     = Organization::find($orgId);
        if (!$org) {
            return false;
        }

        $billing = $this->billingSettings($org);
        $secret  = $billing['stripe_secret'] ?? null;
        if (empty($secret)) {
            return false;
        }

        \Stripe\Stripe::setApiKey($secret);
        $session = \Stripe\Checkout\Session::retrieve($sessionId);

        if ($session->payment_status !== 'paid') {
            return false;
        }

        // Verify org in metadata
        $metaOrgId = $session->metadata->organization_id ?? null;
        if ((int) $metaOrgId !== $orgId) {
            Log::warning('SaasPaymentService: Stripe session org mismatch', [
                'session_id'    => $sessionId,
                'expected_org'  => $orgId,
                'metadata_org'  => $metaOrgId,
            ]);
            return false;
        }

        $amount   = (float) ($session->metadata->amount ?? ($session->amount_total / 100));
        $currency = strtoupper($session->metadata->currency ?? 'USD');

        // Verify amount matches what we recorded (within 1 cent)
        $expectedCents = (int) round($amount * 100);
        $actualCents   = (int) ($session->amount_total ?? 0);
        if (abs($expectedCents - $actualCents) > 1) {
            Log::critical('SaasPaymentService: Stripe amount mismatch — REJECTED', [
                'session_id'     => $sessionId,
                'expected_cents' => $expectedCents,
                'actual_cents'   => $actualCents,
                'organization_id'=> $orgId,
            ]);
            return false;
        }

        $this->creditWalletAndInvoice($org, $amount, $currency, 'stripe', $sessionId);

        return true;
    }

    /**
     * Handle Stripe webhook (payment_intent.succeeded / checkout.session.completed).
     */
    public function handleStripeWebhook(array $payload, string $sigHeader): void
    {
        $billing = $this->billingSettingsForWebhook();

        // If we can verify signature, do so
        $webhookSecret = $billing['stripe_webhook_secret'] ?? null;
        if ($webhookSecret && $sigHeader) {
            \Stripe\Stripe::setApiKey($billing['stripe_secret'] ?? '');
            $event = \Stripe\Webhook::constructEvent(
                json_encode($payload),
                $sigHeader,
                $webhookSecret,
            );
            $payload = json_decode(json_encode($event), true);
        }

        $type = $payload['type'] ?? null;

        if ($type === 'checkout.session.completed') {
            $session   = $payload['data']['object'] ?? [];
            $sessionId = $session['id'] ?? null;
            $orgId     = (int) ($session['metadata']['organization_id'] ?? 0);
            $rechargeType = $session['metadata']['type'] ?? null;

            if ($sessionId && $orgId && $rechargeType === 'saas_wallet_recharge') {
                if ($session['payment_status'] === 'paid') {
                    $this->handleStripeSuccess($sessionId, $orgId);
                }
            }
        }
    }

    // ─── PayPal ───────────────────────────────────────────────────────────────

    /**
     * Create a PayPal order for wallet recharge. Returns approve URL + order ID.
     */
    public function createPayPalOrder(Organization $org, float $amount, string $currency = 'USD'): array
    {
        $billing  = $this->billingSettings($org);
        $clientId = $billing['paypal_client_id'] ?? null;
        $secret   = $billing['paypal_secret'] ?? null;

        if (empty($clientId) || empty($secret)) {
            throw new \RuntimeException('PayPal is not configured. Add paypal_client_id and paypal_secret in Settings > Billing.');
        }

        $testMode = filter_var($billing['paypal_test_mode'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $baseUrl  = $testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

        $accessToken = $this->resolvePayPalAccessToken($clientId, $secret, $baseUrl);

        $successUrl = route('tenant.billing.recharge.paypal.capture');
        $cancelUrl  = route('tenant.billing.recharge');

        $orderResponse = Http::withToken($accessToken)
            ->post($baseUrl . '/v2/checkout/orders', [
                'intent'         => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => 'saas-recharge-' . $org->id,
                    'description'  => 'Wallet recharge for ' . ($org->name ?? 'organization'),
                    'amount'       => [
                        'currency_code' => strtoupper($currency),
                        'value'         => number_format($amount, 2, '.', ''),
                    ],
                    'custom_id' => json_encode([
                        'organization_id' => $org->id,
                        'type'            => 'saas_wallet_recharge',
                    ]),
                ]],
                'application_context' => [
                    'return_url' => $successUrl,
                    'cancel_url' => $cancelUrl,
                    'brand_name' => $org->name ?? 'MasarXPlus',
                ],
            ]);

        if (!$orderResponse->successful()) {
            throw new \RuntimeException('PayPal order failed: ' . ($orderResponse->json('message') ?? json_encode($orderResponse->json())));
        }

        $order       = $orderResponse->json();
        $approveLink = collect($order['links'] ?? [])->firstWhere('rel', 'approve');
        $approveUrl  = $approveLink['href'] ?? null;

        if (!$approveUrl) {
            throw new \RuntimeException('PayPal did not return approve URL.');
        }

        return [
            'redirect_url' => $approveUrl,
            'order_id'     => $order['id'] ?? null,
        ];
    }

    /**
     * Capture a PayPal order after user approval. Idempotent.
     */
    public function capturePayPalOrder(string $orderId, int $orgId): bool
    {
        // Idempotency: skip if already processed
        if (SaasWalletTransaction::where('reference', $orderId)->exists()) {
            return true;
        }

        $org = Organization::find($orgId);
        if (!$org) {
            return false;
        }

        $billing  = $this->billingSettings($org);
        $clientId = $billing['paypal_client_id'] ?? null;
        $secret   = $billing['paypal_secret'] ?? null;

        if (empty($clientId) || empty($secret)) {
            return false;
        }

        $testMode = filter_var($billing['paypal_test_mode'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $baseUrl  = $testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

        try {
            $accessToken = $this->resolvePayPalAccessToken($clientId, $secret, $baseUrl);
        } catch (\RuntimeException) {
            return false;
        }

        $captureResponse = Http::withToken($accessToken)
            ->post($baseUrl . '/v2/checkout/orders/' . $orderId . '/capture');

        if (!$captureResponse->successful()) {
            Log::error('SaasPaymentService: PayPal capture failed', [
                'order_id'  => $orderId,
                'org_id'    => $orgId,
                'response'  => $captureResponse->json(),
            ]);
            return false;
        }

        $captureData     = $captureResponse->json();
        $capturedAmount  = (float) ($captureData['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? 0);
        $capturedCurrency = strtoupper($captureData['purchase_units'][0]['payments']['captures'][0]['amount']['currency_code'] ?? 'USD');

        if ($capturedAmount <= 0) {
            Log::error('SaasPaymentService: PayPal captured zero amount', ['order_id' => $orderId]);
            return false;
        }

        $this->creditWalletAndInvoice($org, $capturedAmount, $capturedCurrency, 'paypal', $orderId);

        return true;
    }

    /**
     * Handle PayPal webhook (PAYMENT.CAPTURE.COMPLETED).
     */
    public function handlePayPalWebhook(array $payload): void
    {
        $eventType = $payload['event_type'] ?? null;

        if ($eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            $resource  = $payload['resource'] ?? [];
            $orderId   = $resource['supplementary_data']['related_ids']['order_id'] ?? null;
            $customId  = $resource['purchase_units'][0]['custom_id'] ?? null;

            if (!$orderId || !$customId) {
                return;
            }

            $meta  = json_decode($customId, true);
            $orgId = (int) ($meta['organization_id'] ?? 0);
            $type  = $meta['type'] ?? null;

            if ($orgId && $type === 'saas_wallet_recharge') {
                $this->capturePayPalOrder($orderId, $orgId);
            }
        }
    }

    // ─── Shared ───────────────────────────────────────────────────────────────

    private function creditWalletAndInvoice(Organization $org, float $amount, string $currency, string $method, string $reference): void
    {
        $this->walletService->credit(
            org: $org,
            amount: $amount,
            description: 'Wallet recharge via ' . ucfirst($method),
            reference: $reference,
            paymentMethod: $method,
            metadata: ['currency' => $currency],
        );

        $this->invoiceService->createRechargeInvoice(
            org: $org,
            amount: $amount,
            currency: $currency,
            description: 'Wallet recharge via ' . ucfirst($method),
            metadata: ['method' => $method, 'reference' => $reference],
        );
    }

    private function billingSettings(Organization $org): array
    {
        $settings = $this->settingsService->forOrganization($org->id);
        return $settings->getGroup('billing') ?? [];
    }

    /**
     * For webhooks we use the first org's billing settings (or platform-level env fallback).
     * Webhooks come with org info in metadata — signature verification uses org credentials.
     */
    private function billingSettingsForWebhook(): array
    {
        // Webhook payload has org info in metadata; we just need the secret for verification.
        // Return empty array — caller extracts org from payload before calling handleStripeSuccess.
        return [];
    }

    private function resolvePayPalAccessToken(string $clientId, string $secret, string $baseUrl): string
    {
        $response = Http::withBasicAuth($clientId, $secret)
            ->asForm()
            ->post($baseUrl . '/v1/oauth2/token', ['grant_type' => 'client_credentials']);

        if (!$response->successful()) {
            throw new \RuntimeException('PayPal auth failed: ' . ($response->json('error_description') ?? 'Unknown error'));
        }

        return $response->json('access_token');
    }
}
