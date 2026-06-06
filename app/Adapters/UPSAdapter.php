<?php
namespace App\Adapters;

use App\Contracts\CarrierAdapter;
use App\DTO\RateDto;
use App\DTO\ShipmentDto;
use Illuminate\Support\Facades\Http;

class UPSAdapter implements CarrierAdapter
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
        return $this->mode === 'live' ? 'https://onlinetools.ups.com' : 'https://wwwcie.ups.com';
    }

    private function getAccessToken(): string
    {
        $clientId     = $this->credentials['api_key']    ?? '';
        $clientSecret = $this->credentials['api_secret'] ?? '';
        if (empty($clientId) || empty($clientSecret)) {
            throw new \RuntimeException('UPS credentials (api_key / api_secret) not configured.');
        }
        $response = Http::withBasicAuth($clientId, $clientSecret)->asForm()
            ->post($this->baseUrl() . '/security/v1/oauth/token', ['grant_type' => 'client_credentials']);
        if (!$response->successful()) {
            throw new \RuntimeException('UPS authentication failed: ' . $response->body());
        }
        return $response->json('access_token') ?? throw new \RuntimeException('UPS: no access_token in response.');
    }

    public function getRates(ShipmentDto $shipment): array
    {
        $token = $this->getAccessToken();
        $sender = $shipment->sender;
        $receiver = $shipment->receiver;
        $pkg = $shipment->packages[0] ?? [];

        $payload = [
            'RateRequest' => [
                'Request' => ['TransactionReference' => ['CustomerContext' => 'Rate']],
                'Shipment' => [
                    'Shipper' => ['Name' => $sender['name'] ?? 'Shipper', 'ShipperNumber' => $this->credentials['account_number'] ?? '', 'Address' => ['AddressLine' => [$sender['address'] ?? ''], 'City' => $sender['city'] ?? '', 'PostalCode' => $sender['postal_code'] ?? '00000', 'CountryCode' => strtoupper($sender['country'] ?? 'US')]],
                    'ShipTo' => ['Name' => $receiver['name'] ?? 'Recipient', 'Address' => ['AddressLine' => [$receiver['address'] ?? ''], 'City' => $receiver['city'] ?? '', 'PostalCode' => $receiver['postal_code'] ?? '00000', 'CountryCode' => strtoupper($receiver['country'] ?? 'US')]],
                    'ShipFrom' => ['Name' => $sender['name'] ?? 'Shipper', 'Address' => ['AddressLine' => [$sender['address'] ?? ''], 'City' => $sender['city'] ?? '', 'PostalCode' => $sender['postal_code'] ?? '00000', 'CountryCode' => strtoupper($sender['country'] ?? 'US')]],
                    'Service' => ['Code' => '03'],
                    'Package' => [[
                        'PackagingType' => ['Code' => '02'],
                        'Dimensions' => ['UnitOfMeasurement' => ['Code' => 'CM'], 'Length' => (string) ($pkg['length'] ?? 10), 'Width' => (string) ($pkg['width'] ?? 10), 'Height' => (string) ($pkg['height'] ?? 10)],
                        'PackageWeight' => ['UnitOfMeasurement' => ['Code' => 'KGS'], 'Weight' => (string) ($pkg['weight'] ?? 1)],
                    ]],
                    'ShipmentRatingOptions' => ['NegotiatedRatesIndicator' => ''],
                ],
            ],
        ];

        $response = Http::withToken($token)->post($this->baseUrl() . '/api/rating/v2409/rate', $payload);
        if (!$response->successful()) {
            throw new \RuntimeException('UPS rates failed: ' . $response->body());
        }

        $rates = [];
        $rateResponse = $response->json('RateResponse.RatedShipment') ?? [];
        if (isset($rateResponse['Service'])) {
            $rateResponse = [$rateResponse];
        }
        foreach ($rateResponse as $rated) {
            $serviceCode = $rated['Service']['Code'] ?? '03';
            $cost = (float) ($rated['NegotiatedRateCharges']['TotalCharge']['MonetaryValue'] ?? $rated['TotalCharges']['MonetaryValue'] ?? 0);
            $currency = $rated['TotalCharges']['CurrencyCode'] ?? 'USD';
            $days = (int) ($rated['GuaranteedDelivery']['BusinessDaysInTransit'] ?? 3);
            $rates[] = new RateDto(
                carrier: 'UPS',
                serviceName: $this->serviceCodeToName($serviceCode),
                serviceCode: $serviceCode,
                cost: $cost,
                currency: $currency,
                estimatedDeliveryDate: now()->addWeekdays($days)->format('Y-m-d'),
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
            'ShipmentRequest' => [
                'Shipment' => [
                    'Description' => $pkg['content_description'] ?? 'Package',
                    'Shipper' => ['Name' => $sender['name'] ?? 'Shipper', 'ShipperNumber' => $this->credentials['account_number'] ?? '', 'Phone' => ['Number' => $sender['phone'] ?? '0000000000'], 'Address' => ['AddressLine' => [$sender['address'] ?? ''], 'City' => $sender['city'] ?? '', 'PostalCode' => $sender['postal_code'] ?? '', 'CountryCode' => strtoupper($sender['country'] ?? 'US')]],
                    'ShipTo' => ['Name' => $receiver['name'] ?? 'Recipient', 'Phone' => ['Number' => $receiver['phone'] ?? '0000000000'], 'Address' => ['AddressLine' => [$receiver['address'] ?? ''], 'City' => $receiver['city'] ?? '', 'PostalCode' => $receiver['postal_code'] ?? '', 'CountryCode' => strtoupper($receiver['country'] ?? 'US')]],
                    'ShipFrom' => ['Name' => $sender['name'] ?? 'Shipper', 'Phone' => ['Number' => $sender['phone'] ?? '0000000000'], 'Address' => ['AddressLine' => [$sender['address'] ?? ''], 'City' => $sender['city'] ?? '', 'PostalCode' => $sender['postal_code'] ?? '', 'CountryCode' => strtoupper($sender['country'] ?? 'US')]],
                    'PaymentInformation' => ['ShipmentCharge' => [['Type' => '01', 'BillShipper' => ['AccountNumber' => $this->credentials['account_number'] ?? '']]]],
                    'Service' => ['Code' => '03'],
                    'Package' => [['Packaging' => ['Code' => '02'], 'PackageWeight' => ['UnitOfMeasurement' => ['Code' => 'KGS'], 'Weight' => (string) ($pkg['weight'] ?? 1)]]],
                ],
                'LabelSpecification' => ['LabelImageFormat' => ['Code' => 'PDF']],
            ],
        ];

        $response = Http::withToken($token)->post($this->baseUrl() . '/api/shipments/v2403/ship', $payload);
        if (!$response->successful()) {
            throw new \RuntimeException('UPS label failed: ' . $response->body());
        }
        $result = $response->json('ShipmentResponse.ShipmentResults') ?? [];
        $tracking = $result['PackageResults'][0]['TrackingNumber'] ?? ('UPS-' . strtoupper(uniqid()));
        $label = $result['PackageResults'][0]['ShippingLabel']['GraphicImage'] ?? null;
        return [
            'tracking_number' => $tracking,
            'label_url' => $label ? 'data:application/pdf;base64,' . $label : null,
            'cost' => (float) ($result['NegotiatedRateCharges']['TotalCharge']['MonetaryValue'] ?? $result['ShipmentCharges']['TotalCharges']['MonetaryValue'] ?? 0),
        ];
    }

    public function voidLabel(string $trackingNumber): bool
    {
        try {
            $token = $this->getAccessToken();
            return Http::withToken($token)->delete($this->baseUrl() . '/api/shipments/v2403/void/cancel/' . $trackingNumber)->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    private function serviceCodeToName(string $code): string
    {
        return match ($code) {
            '01' => 'UPS Next Day Air', '02' => 'UPS 2nd Day Air', '03' => 'UPS Ground',
            '07' => 'UPS Worldwide Express', '08' => 'UPS Worldwide Expedited',
            '11' => 'UPS Standard', '12' => 'UPS 3 Day Select',
            '13' => 'UPS Next Day Air Saver', '54' => 'UPS Worldwide Express Plus',
            '65' => 'UPS Worldwide Saver', default => 'UPS Service ' . $code,
        };
    }
}
