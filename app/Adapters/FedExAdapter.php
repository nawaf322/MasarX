<?php
namespace App\Adapters;

use App\Contracts\CarrierAdapter;
use App\DTO\RateDto;
use App\DTO\ShipmentDto;
use Illuminate\Support\Facades\Http;

class FedExAdapter implements CarrierAdapter
{
    private array $credentials = [];
    private string $mode = 'test';

    public function withCredentials(array $credentials, string $mode): void
    {
        $this->credentials = $credentials;
        $this->mode = $mode;
    }

    private function baseUrl(): string
    {
        return $this->mode === 'live' ? 'https://apis.fedex.com' : 'https://apis-sandbox.fedex.com';
    }

    private function getAccessToken(): string
    {
        $clientId     = $this->credentials['api_key']    ?? '';
        $clientSecret = $this->credentials['api_secret'] ?? '';
        if (empty($clientId) || empty($clientSecret)) {
            throw new \RuntimeException('FedEx credentials (api_key / api_secret) not configured.');
        }
        $response = Http::asForm()->post($this->baseUrl() . '/oauth/token', [
            'grant_type' => 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
        ]);
        if (!$response->successful()) {
            throw new \RuntimeException('FedEx authentication failed: ' . $response->body());
        }
        return $response->json('access_token') ?? throw new \RuntimeException('FedEx: no access_token in response.');
    }

    public function getRates(ShipmentDto $shipment): array
    {
        $token = $this->getAccessToken();
        $sender = $shipment->sender;
        $receiver = $shipment->receiver;
        $pkg = $shipment->packages[0] ?? [];

        $payload = [
            'accountNumber' => ['value' => $this->credentials['account_number'] ?? ''],
            'requestedShipment' => [
                'shipper' => ['address' => ['postalCode' => $sender['postal_code'] ?? '00000', 'countryCode' => strtoupper($sender['country'] ?? 'US')]],
                'recipient' => ['address' => ['postalCode' => $receiver['postal_code'] ?? '00000', 'countryCode' => strtoupper($receiver['country'] ?? 'US'), 'residential' => false]],
                'pickupType' => 'DROPOFF_AT_FEDEX_LOCATION',
                'packagingType' => 'YOUR_PACKAGING',
                'requestedPackageLineItems' => [[
                    'weight' => ['units' => 'KG', 'value' => (float) ($pkg['weight'] ?? 1)],
                    'dimensions' => ['length' => (int) ($pkg['length'] ?? 10), 'width' => (int) ($pkg['width'] ?? 10), 'height' => (int) ($pkg['height'] ?? 10), 'units' => 'CM'],
                ]],
            ],
            'rateRequestType' => ['LIST', 'ACCOUNT'],
        ];

        $response = Http::withToken($token)->post($this->baseUrl() . '/rate/v1/rates/quotes', $payload);
        if (!$response->successful()) {
            throw new \RuntimeException('FedEx rates failed: ' . $response->body());
        }

        $rates = [];
        foreach ($response->json('output.rateReplyDetails') ?? [] as $detail) {
            $serviceCode = $detail['serviceType'] ?? '';
            $rateDetail = $detail['ratedShipmentDetails'][0] ?? [];
            $rates[] = new RateDto(
                carrier: 'FedEx',
                serviceName: $this->serviceCodeToName($serviceCode),
                serviceCode: $serviceCode,
                cost: (float) ($rateDetail['totalNetCharge'] ?? 0),
                currency: $rateDetail['currency'] ?? 'USD',
                estimatedDeliveryDate: substr($detail['commit']['dateDetail']['dayFormat'] ?? now()->addDays(3)->format('Y-m-d'), 0, 10),
            );
        }
        return $rates;
    }

    public function createLabel(ShipmentDto $shipment): array
    {
        $token = $this->getAccessToken();
        $sender = $shipment->sender;
        $receiver = $shipment->receiver;
        $pkg = $shipment->packages[0] ?? [];

        $payload = [
            'labelResponseOptions' => 'URL_ONLY',
            'accountNumber' => ['value' => $this->credentials['account_number'] ?? ''],
            'requestedShipment' => [
                'shipper' => ['contact' => ['personName' => $sender['name'] ?? 'Sender', 'phoneNumber' => $sender['phone'] ?? '0000000000'], 'address' => ['streetLines' => [$sender['address'] ?? ''], 'city' => $sender['city'] ?? '', 'postalCode' => $sender['postal_code'] ?? '', 'countryCode' => strtoupper($sender['country'] ?? 'US')]],
                'recipients' => [['contact' => ['personName' => $receiver['name'] ?? 'Recipient', 'phoneNumber' => $receiver['phone'] ?? '0000000000'], 'address' => ['streetLines' => [$receiver['address'] ?? ''], 'city' => $receiver['city'] ?? '', 'postalCode' => $receiver['postal_code'] ?? '', 'countryCode' => strtoupper($receiver['country'] ?? 'US')]]],
                'serviceType' => 'INTERNATIONAL_PRIORITY',
                'packagingType' => 'YOUR_PACKAGING',
                'pickupType' => 'DROPOFF_AT_FEDEX_LOCATION',
                'shippingChargesPayment' => ['paymentType' => 'SENDER', 'payor' => ['responsibleParty' => ['accountNumber' => ['value' => $this->credentials['account_number'] ?? '']]]],
                'labelSpecification' => ['imageType' => 'PDF', 'labelStockType' => 'PAPER_85X11_TOP_HALF_LABEL'],
                'requestedPackageLineItems' => [['weight' => ['units' => 'KG', 'value' => (float) ($pkg['weight'] ?? 1)]]],
            ],
        ];

        $response = Http::withToken($token)->post($this->baseUrl() . '/ship/v1/shipments', $payload);
        if (!$response->successful()) {
            throw new \RuntimeException('FedEx label failed: ' . $response->body());
        }
        $piece = $response->json('output.transactionShipments.0.pieceResponses.0') ?? [];
        return [
            'tracking_number' => $piece['trackingNumber'] ?? ('FEDEX-' . strtoupper(uniqid())),
            'label_url' => $piece['packageDocuments'][0]['url'] ?? null,
            'cost' => 0.0,
        ];
    }

    public function voidLabel(string $trackingNumber): bool
    {
        try {
            $token = $this->getAccessToken();
            return Http::withToken($token)->put($this->baseUrl() . '/ship/v1/shipments/cancel', [
                'accountNumber' => ['value' => $this->credentials['account_number'] ?? ''],
                'trackingNumber' => $trackingNumber,
                'deletionControl' => 'DELETE_ALL_PACKAGES',
            ])->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    private function serviceCodeToName(string $code): string
    {
        return match ($code) {
            'INTERNATIONAL_PRIORITY' => 'FedEx International Priority',
            'INTERNATIONAL_ECONOMY' => 'FedEx International Economy',
            'FEDEX_GROUND' => 'FedEx Ground',
            'FEDEX_2_DAY' => 'FedEx 2Day',
            'PRIORITY_OVERNIGHT' => 'FedEx Priority Overnight',
            'STANDARD_OVERNIGHT' => 'FedEx Standard Overnight',
            'INTERNATIONAL_FIRST' => 'FedEx International First',
            default => 'FedEx ' . str_replace('_', ' ', ucwords(strtolower($code), '_')),
        };
    }
}
