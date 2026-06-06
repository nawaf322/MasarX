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

namespace App\Jobs;

use App\Models\ApiWebhookDeliveryLog;
use App\Models\ApiWebhookSubscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DispatchWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public ApiWebhookSubscription $subscription,
        public string $event,
        public array $payload,
    ) {}

    public function handle(): void
    {
        if (! $this->subscription->is_active) {
            return;
        }

        $url = $this->subscription->callback_url;
        $payloadJson = json_encode($this->payload);
        $timestamp = (string) time();

        $headers = [
            'Content-Type' => 'application/json',
            'User-Agent' => 'Deprixa-Plus-Webhook/1.0',
            'X-Deprixa-Event' => $this->event,
            'X-Deprixa-Timestamp' => $timestamp,
        ];

        $secret = null;
        if ($this->subscription->secret) {
            try {
                $secret = Crypt::decryptString($this->subscription->secret);
            } catch (\Throwable $e) {
                Log::warning("Webhook subscription {$this->subscription->id}: cannot decrypt secret", ['error' => $e->getMessage()]);
                $this->logDelivery(0, null, false, 'Secret decrypt failed', 0);
                return;
            }
        }

        if ($secret) {
            $signaturePayload = $timestamp . '.' . $payloadJson;
            $signature = hash_hmac('sha256', $signaturePayload, $secret);
            $headers['X-Deprixa-Signature'] = 'sha256=' . $signature;
        }

        if (! empty($this->subscription->headers) && is_array($this->subscription->headers)) {
            $headers = array_merge($headers, $this->subscription->headers);
        }

        $start = microtime(true);
        try {
            $response = Http::timeout(30)
                ->withHeaders($headers)
                ->withBody($payloadJson, 'application/json')
                ->post($url);

            $durationMs = (int) round((microtime(true) - $start) * 1000);
            $success = $response->successful();
            $body = $response->body();
            if (strlen($body) > 2000) {
                $body = substr($body, 0, 2000) . '...';
            }

            $this->logDelivery(
                $response->status(),
                $body,
                $success,
                $success ? null : 'HTTP ' . $response->status(),
                $durationMs
            );

            if (! $success && $this->attempts() < $this->tries) {
                $this->release($this->backoff);
            }
        } catch (\Throwable $e) {
            $durationMs = (int) round((microtime(true) - $start) * 1000);
            Log::error("Webhook delivery failed: {$e->getMessage()}", [
                'subscription_id' => $this->subscription->id,
                'url' => $url,
                'event' => $this->event,
            ]);
            $this->logDelivery(0, null, false, $e->getMessage(), $durationMs);

            if ($this->attempts() < $this->tries) {
                $this->release($this->backoff);
            }
        }
    }

    private function logDelivery(?int $httpStatus, ?string $responseBody, bool $success, ?string $errorMessage, int $durationMs): void
    {
        ApiWebhookDeliveryLog::create([
            'api_webhook_subscription_id' => $this->subscription->id,
            'event' => $this->event,
            'callback_url' => $this->subscription->callback_url,
            'http_status' => $httpStatus,
            'attempt' => $this->attempts(),
            'success' => $success,
            'response_body' => $responseBody,
            'error_message' => $errorMessage,
            'duration_ms' => $durationMs,
        ]);
    }
}
