<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MoyasarService
{
    private string $secretKey;
    private string $publishableKey;
    private string $baseUrl = 'https://api.moyasar.com/v1';

    public function __construct()
    {
        $this->secretKey      = config('services.moyasar.secret_key', '');
        $this->publishableKey = config('services.moyasar.publishable_key', '');
    }

    /**
     * Create an invoice (payment request) for wallet recharge or shipment payment.
     *
     * @param float  $amountSAR   Amount in Saudi Riyals (will be converted to halalas × 100)
     * @param string $description Arabic description shown to customer
     * @param string $callbackUrl URL Moyasar redirects to after payment
     * @param array  $metadata    Extra data stored with the invoice
     */
    public function createInvoice(
        float  $amountSAR,
        string $description,
        string $callbackUrl,
        array  $metadata = []
    ): array {
        $amountHalalas = (int) round($amountSAR * 100);

        $payload = [
            'amount'      => $amountHalalas,
            'currency'    => 'SAR',
            'description' => $description,
            'callback_url'=> $callbackUrl,
            'metadata'    => $metadata,
            'source'      => [
                'type'    => 'invoiceable',
            ],
        ];

        $response = Http::withBasicAuth($this->secretKey, '')
            ->timeout(15)
            ->post("{$this->baseUrl}/invoices", $payload);

        if (!$response->successful()) {
            Log::error('Moyasar createInvoice failed', ['body' => $response->body()]);
            throw new \RuntimeException('فشل إنشاء طلب الدفع عبر Moyasar: ' . ($response->json('message') ?? $response->body()));
        }

        return $response->json();
    }

    /**
     * Fetch a payment by its ID and verify its status.
     */
    public function fetchPayment(string $paymentId): array
    {
        $response = Http::withBasicAuth($this->secretKey, '')
            ->timeout(10)
            ->get("{$this->baseUrl}/payments/{$paymentId}");

        if (!$response->successful()) {
            throw new \RuntimeException('فشل التحقق من حالة الدفع');
        }

        return $response->json();
    }

    /**
     * Verify a callback and return the payment data if paid.
     * Returns null if not paid.
     */
    public function verifyCallback(array $queryParams): ?array
    {
        $paymentId = $queryParams['id'] ?? null;
        $status    = $queryParams['status'] ?? null;

        if (!$paymentId || $status !== 'paid') {
            return null;
        }

        $payment = $this->fetchPayment($paymentId);

        if (($payment['status'] ?? '') === 'paid') {
            return $payment;
        }

        return null;
    }

    /**
     * Refund a payment fully or partially.
     */
    public function refund(string $paymentId, float $amountSAR): array
    {
        $response = Http::withBasicAuth($this->secretKey, '')
            ->timeout(15)
            ->post("{$this->baseUrl}/payments/{$paymentId}/refund", [
                'amount' => (int) round($amountSAR * 100),
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('فشل الاسترداد: ' . $response->body());
        }

        return $response->json();
    }

    public function getPublishableKey(): string
    {
        return $this->publishableKey;
    }
}
