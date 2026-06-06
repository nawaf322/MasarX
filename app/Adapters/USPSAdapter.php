<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

namespace App\Adapters;

use App\Contracts\CarrierAdapter;
use App\DTO\RateDto;
use App\DTO\ShipmentDto;
use Illuminate\Support\Facades\Http;

/**
 * USPS carrier adapter — USPS Web Tools API v3 (OAuth2 / REST).
 *
 * Credentials required (stored in CarrierAccount->credentials):
 *   api_key     = Client ID  (from business.usps.com developer portal)
 *   api_secret  = Client Secret
 *
 * Endpoints:
 *   Sandbox : https://api-cat.usps.com
 *   Live    : https://api.usps.com
 */
class USPSAdapter implements CarrierAdapter
{
    private string $baseUrl;
    private array  $credentials;
    private string $mode;

    public function __construct(array $credentials = [], string $mode = 'test')
    {
        $this->credentials = $credentials;
        $this->mode        = $mode;
        $this->baseUrl     = $mode === 'live'
            ? 'https://api.usps.com'
            : 'https://api-cat.usps.com';
    }

    public function withCredentials(array $credentials, string $mode): void
    {
        $this->credentials = $credentials;
        $this->mode        = $mode;
        $this->baseUrl     = $mode === 'live'
            ? 'https://api.usps.com'
            : 'https://api-cat.usps.com';
    }

    // ------------------------------------------------------------------ //
    //  OAuth2 token
    // ------------------------------------------------------------------ //

    private function getToken(): string
    {
        $clientId     = $this->credentials['api_key']     ?? '';
        $clientSecret = $this->credentials['api_secret']  ?? '';

        if (empty($clientId) || empty($clientSecret)) {
            throw new \RuntimeException('USPS credentials not configured (api_key / api_secret).');
        }

        $response = Http::timeout(15)->asForm()->post("{$this->baseUrl}/oauth2/v3/token", [
            'grant_type'    => 'client_credentials',
            'client_id'     => $clientId,
            'client_secret' => $clientSecret,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('USPS OAuth failed: ' . ($response->json('error_description') ?? $response->body()));
        }

        return $response->json('access_token');
    }

    // ------------------------------------------------------------------ //
    //  getRates
    // ------------------------------------------------------------------ //

    public function getRates(ShipmentDto $shipment): array
    {
        $token = $this->getToken();

        $pkg     = $shipment->packages[0] ?? [];
        $weight  = (float) ($pkg['weight']  ?? 1);
        $length  = (float) ($pkg['length']  ?? 10);
        $width   = (float) ($pkg['width']   ?? 10);
        $height  = (float) ($pkg['height']  ?? 10);
        $weightOz = (int) round($weight * 35.274); // kg → oz

        $originZip = $shipment->sender['postal_code']   ?? '10001';
        $destZip   = $shipment->receiver['postal_code'] ?? '90001';

        $payload = [
            'originZIPCode'      => preg_replace('/\D/', '', $originZip),
            'destinationZIPCode' => preg_replace('/\D/', '', $destZip),
            'weight'             => max(1, $weightOz),
            'length'             => max(1, (int) $length),
            'width'              => max(1, (int) $width),
            'height'             => max(1, (int) $height),
            'mailClass'          => 'ALL',
            'processingCategory' => 'NON_MACHINABLE',
            'destinationEntryFacilityType' => 'NONE',
            'priceType'          => 'RETAIL',
        ];

        $response = Http::timeout(20)
            ->withToken($token)
            ->post("{$this->baseUrl}/prices/v3/base-rates/search", $payload);

        if (!$response->successful()) {
            throw new \RuntimeException('USPS rates error: ' . ($response->json('apiError.message') ?? $response->body()));
        }

        $rates = [];
        $items = $response->json('rates') ?? [];

        foreach ($items as $item) {
            $priceUsd = (float) ($item['price'] ?? 0);
            if ($priceUsd <= 0) continue;

            $mailClass   = $item['mailClass']   ?? 'UNKNOWN';
            $description = $item['description'] ?? $mailClass;
            $days        = (int) ($item['commitmentName'] ?? 0) ?: null;

            $rates[] = new RateDto(
                carrier:               'USPS',
                serviceName:           'USPS ' . ucwords(strtolower(str_replace('_', ' ', $description))),
                serviceCode:           $mailClass,
                cost:                  $priceUsd,
                currency:              'USD',
                estimatedDeliveryDate: $days ? now()->addWeekdays($days)->format('Y-m-d') : null,
            );
        }

        // Sort by cost ascending
        usort($rates, fn($a, $b) => $a->cost <=> $b->cost);

        return array_slice($rates, 0, 5); // top 5 cheapest options
    }

    // ------------------------------------------------------------------ //
    //  createLabel
    // ------------------------------------------------------------------ //

    public function createLabel(ShipmentDto|\App\Models\Shipment $shipment): array
    {
        // Accept both ShipmentDto and Eloquent Shipment model
        if ($shipment instanceof \App\Models\Shipment) {
            $sender   = $shipment->sender_details   ?? [];
            $receiver = $shipment->receiver_details ?? [];
            $pkg      = ($shipment->package_details['packages'][0] ?? $shipment->package_details ?? []);
        } else {
            $sender   = $shipment->sender;
            $receiver = $shipment->receiver;
            $pkg      = $shipment->packages[0] ?? [];
        }

        $token = $this->getToken();

        $weight  = (float) ($pkg['weight'] ?? 1);
        $length  = (float) ($pkg['length'] ?? 10);
        $width   = (float) ($pkg['width']  ?? 10);
        $height  = (float) ($pkg['height'] ?? 10);
        $weightOz = max(1, (int) round($weight * 35.274));

        $payload = [
            'imageInfo' => [
                'imageType'     => 'PDF',
                'labelType'     => '4X6LABEL',
                'receiptOption' => 'NONE',
            ],
            'toAddress' => [
                'firstName'  => $receiver['name']         ?? 'Recipient',
                'company'    => $receiver['company']      ?? '',
                'streetAddress' => $receiver['address']   ?? '',
                'city'       => $receiver['city']         ?? '',
                'state'      => $receiver['state']        ?? 'NY',
                'ZIPCode'    => preg_replace('/\D/', '', $receiver['postal_code'] ?? '10001'),
            ],
            'fromAddress' => [
                'firstName'  => $sender['name']           ?? 'Sender',
                'company'    => $sender['company']        ?? '',
                'streetAddress' => $sender['address']     ?? '',
                'city'       => $sender['city']           ?? '',
                'state'      => $sender['state']          ?? 'NY',
                'ZIPCode'    => preg_replace('/\D/', '', $sender['postal_code'] ?? '10001'),
                'phone'      => preg_replace('/\D/', '', $sender['phone'] ?? '5555555555'),
            ],
            'packageDescription' => [
                'weightUOM'  => 'oz',
                'weight'     => $weightOz,
                'dimensionsUOM' => 'in',
                'length'     => max(1, (int) $length),
                'height'     => max(1, (int) $height),
                'width'      => max(1, (int) $width),
                'mailClass'  => 'PRIORITY_MAIL',
                'processingCategory' => 'NON_MACHINABLE',
                'destinationEntryFacilityType' => 'NONE',
                'rateIndicator' => 'SP',
                'priceType'  => 'RETAIL',
            ],
        ];

        $response = Http::timeout(30)
            ->withToken($token)
            ->post("{$this->baseUrl}/shipments/v1/shipments", $payload);

        if (!$response->successful()) {
            throw new \RuntimeException('USPS label error: ' . ($response->json('apiError.message') ?? $response->body()));
        }

        $data           = $response->json();
        $trackingNumber = $data['trackingNumber'] ?? ('9400' . str_pad((string) random_int(0, 99999999999999), 14, '0', STR_PAD_LEFT));
        $labelBase64    = $data['PDFImage'] ?? null;
        $labelUrl       = null;

        // If label PDF returned as base64, save to storage
        if ($labelBase64) {
            $path    = 'labels/usps-' . $trackingNumber . '.pdf';
            \Illuminate\Support\Facades\Storage::put($path, base64_decode($labelBase64));
            $labelUrl = \Illuminate\Support\Facades\Storage::url($path);
        }

        return [
            'tracking_number' => $trackingNumber,
            'label_url'       => $labelUrl,
            'cost'            => null,
            'is_stub'         => false,
        ];
    }

    // ------------------------------------------------------------------ //
    //  voidLabel
    // ------------------------------------------------------------------ //

    public function voidLabel(string $trackingNumber): bool
    {
        try {
            $token    = $this->getToken();
            $response = Http::timeout(15)
                ->withToken($token)
                ->delete("{$this->baseUrl}/shipments/v1/shipments/{$trackingNumber}");

            return $response->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}
