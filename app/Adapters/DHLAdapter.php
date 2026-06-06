<?php
namespace App\Adapters;

use App\Contracts\CarrierAdapter;
use App\DTO\RateDto;
use App\DTO\ShipmentDto;
use Illuminate\Support\Facades\Http;

class DHLAdapter implements CarrierAdapter
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
        // DHL Express MyDHL API - same endpoint, test mode uses test credentials
        return 'https://express.api.dhl.com/mydhlapi';
    }

    private function authHeader(): string
    {
        $siteId   = $this->credentials['api_key']    ?? '';
        $password = $this->credentials['api_secret'] ?? '';
        if (empty($siteId) || empty($password)) {
            throw new \RuntimeException('DHL credentials (api_key / api_secret) not configured.');
        }
        return 'Basic ' . base64_encode("{$siteId}:{$password}");
    }

    public function getRates(ShipmentDto $shipment): array
    {
        $auth = $this->authHeader();
        $sender = $shipment->sender;
        $receiver = $shipment->receiver;
        $pkg = $shipment->packages[0] ?? [];

        $params = [
            'accountNumber' => $this->credentials['account_number'] ?? '',
            'originCountryCode' => strtoupper($sender['country'] ?? 'US'),
            'originPostalCode' => $sender['postal_code'] ?? '00000',
            'destinationCountryCode' => strtoupper($receiver['country'] ?? 'US'),
            'destinationPostalCode' => $receiver['postal_code'] ?? '00000',
            'weight' => (float) ($pkg['weight'] ?? 1),
            'length' => (int) ($pkg['length'] ?? 10),
            'width' => (int) ($pkg['width'] ?? 10),
            'height' => (int) ($pkg['height'] ?? 10),
            'plannedShippingDateAndTime' => now()->addHours(2)->toIso8601String(),
            'isCustomsDeclarable' => 'false',
            'unitOfMeasurement' => 'metric',
        ];

        $response = Http::withHeaders(['Authorization' => $auth, 'Accept' => 'application/json'])
            ->get($this->baseUrl() . '/rates', $params);

        if (!$response->successful()) {
            throw new \RuntimeException('DHL rates failed: ' . $response->body());
        }

        $rates = [];
        foreach ($response->json('products') ?? [] as $product) {
            $serviceCode = $product['productCode'] ?? '';
            $price = (float) ($product['totalPrice'][0]['price'] ?? 0);
            $currency = $product['totalPrice'][0]['priceCurrency'] ?? 'USD';
            $delivDate = $product['deliveryCapabilities']['estimatedDeliveryDateAndTime'] ?? now()->addDays(3)->format('Y-m-d');
            $rates[] = new RateDto(
                carrier: 'DHL',
                serviceName: $product['productName'] ?? $serviceCode,
                serviceCode: $serviceCode,
                cost: $price,
                currency: $currency,
                estimatedDeliveryDate: substr($delivDate, 0, 10),
            );
        }
        return $rates;
    }

    public function createLabel(ShipmentDto $shipment): array
    {
        $auth = $this->authHeader();
        $sender = $shipment->sender;
        $receiver = $shipment->receiver;
        $pkg = $shipment->packages[0] ?? [];

        $payload = [
            'plannedShippingDateAndTime' => now()->addHours(2)->toIso8601String(),
            'pickup' => ['isRequested' => false],
            'productCode' => 'P',
            'accounts' => [['typeCode' => 'shipper', 'number' => $this->credentials['account_number'] ?? '']],
            'customerDetails' => [
                'shipperDetails' => [
                    'postalAddress' => ['addressLine1' => $sender['address'] ?? '', 'cityName' => $sender['city'] ?? '', 'postalCode' => $sender['postal_code'] ?? '', 'countryCode' => strtoupper($sender['country'] ?? 'US')],
                    'contactInformation' => ['fullName' => $sender['name'] ?? 'Sender', 'phone' => $sender['phone'] ?? '0000000000', 'email' => $sender['email'] ?? 'sender@example.com'],
                ],
                'receiverDetails' => [
                    'postalAddress' => ['addressLine1' => $receiver['address'] ?? '', 'cityName' => $receiver['city'] ?? '', 'postalCode' => $receiver['postal_code'] ?? '', 'countryCode' => strtoupper($receiver['country'] ?? 'US')],
                    'contactInformation' => ['fullName' => $receiver['name'] ?? 'Recipient', 'phone' => $receiver['phone'] ?? '0000000000', 'email' => $receiver['email'] ?? 'recipient@example.com'],
                ],
            ],
            'content' => [
                'packages' => [['weight' => (float) ($pkg['weight'] ?? 1), 'dimensions' => ['length' => (int) ($pkg['length'] ?? 10), 'width' => (int) ($pkg['width'] ?? 10), 'height' => (int) ($pkg['height'] ?? 10)]]],
                'isCustomsDeclarable' => false,
                'description' => $pkg['content_description'] ?? 'Package',
                'unitOfMeasurement' => 'metric',
            ],
            'outputImageProperties' => ['encodingFormat' => 'pdf', 'templateName' => 'ECOM26_84_001'],
        ];

        $response = Http::withHeaders(['Authorization' => $auth, 'Accept' => 'application/json'])
            ->post($this->baseUrl() . '/shipments', $payload);

        if (!$response->successful()) {
            throw new \RuntimeException('DHL label failed: ' . $response->body());
        }

        $data = $response->json() ?? [];
        $tracking = $data['shipmentTrackingNumber'] ?? ('DHL-' . strtoupper(uniqid()));
        $labelContent = $data['documents'][0]['content'] ?? null;

        return [
            'tracking_number' => $tracking,
            'label_url' => $labelContent ? 'data:application/pdf;base64,' . $labelContent : null,
            'cost' => (float) ($data['shipmentCharges'][0]['price'] ?? 0),
        ];
    }

    public function voidLabel(string $trackingNumber): bool
    {
        // DHL Express does not support API cancellation in all regions
        return false;
    }
}
