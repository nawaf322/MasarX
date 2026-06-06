<?php
namespace App\Services\Carriers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DHLService implements CarrierInterface
{
    private string $apiKey;
    private string $apiSecret;
    private string $accountNumber;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey        = config('services.dhl.api_key', '');
        $this->apiSecret     = config('services.dhl.api_secret', '');
        $this->accountNumber = config('services.dhl.account_number', '');
        $this->baseUrl       = config('services.dhl.test_mode', true)
            ? 'https://express.api.dhl.com/mydhlapi/test'
            : 'https://express.api.dhl.com/mydhlapi';
    }

    public function name(): string { return 'dhl'; }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withBasicAuth($this->apiKey, $this->apiSecret)
            ->accept('application/json')
            ->timeout(20);
    }

    public function getRates(array $s): array
    {
        $params = [
            'accountNumber'          => $this->accountNumber,
            'originCountryCode'      => $s['sender_country'] ?? 'SA',
            'originCityName'         => $s['sender_city'] ?? 'Riyadh',
            'destinationCountryCode' => $s['receiver_country'] ?? 'SA',
            'destinationCityName'    => $s['receiver_city'] ?? '',
            'weight'                 => $s['weight'] ?? 1,
            'length'                 => $s['length'] ?? 10,
            'width'                  => $s['width'] ?? 10,
            'height'                 => $s['height'] ?? 10,
            'plannedShippingDate'    => now()->addDay()->format('Y-m-d'),
            'isCustomsDeclarable'    => 'false',
            'unitOfMeasurement'      => 'metric',
        ];

        try {
            $response = $this->http()->get("{$this->baseUrl}/rates", $params);
            if ($response->successful()) {
                $products = $response->json('products') ?? [];
                return array_map(fn($p) => [
                    'carrier'        => 'DHL',
                    'service'        => 'DHL ' . ($p['productName'] ?? ''),
                    'price'          => (float) ($p['totalPrice'][0]['price'] ?? 0),
                    'currency'       => $p['totalPrice'][0]['priceCurrency'] ?? 'SAR',
                    'estimated_days' => (int) ($p['deliveryCapabilities']['estimatedDeliveryDateAndTime'] ? 3 : 3),
                    'label'          => 'DHL ' . ($p['productCode'] ?? ''),
                ], $products);
            }
        } catch (\Throwable $e) {
            Log::warning('DHL getRates: ' . $e->getMessage());
        }

        return [];
    }

    public function createShipment(array $s): array
    {
        $payload = [
            'plannedShippingDateAndTime' => now()->addHour()->format('Y-m-d\TH:i:s') . ' GMT+03:00',
            'pickup'                     => ['isRequested' => false],
            'productCode'                => 'P',
            'accounts'                   => [['typeCode' => 'shipper', 'number' => $this->accountNumber]],
            'shipper' => [
                'name'        => $s['sender_name'] ?? '',
                'phone'       => $s['sender_phone'] ?? '',
                'email'       => $s['sender_email'] ?? '',
                'companyName' => $s['sender_name'] ?? '',
                'address'     => [
                    'streetLines' => [$s['sender_address'] ?? ''],
                    'cityName'    => $s['sender_city'] ?? 'Riyadh',
                    'countryCode' => $s['sender_country'] ?? 'SA',
                    'postalCode'  => $s['sender_zip'] ?? '',
                ],
            ],
            'recipient' => [
                'name'        => $s['receiver_name'] ?? '',
                'phone'       => $s['receiver_phone'] ?? '',
                'email'       => $s['receiver_email'] ?? '',
                'companyName' => $s['receiver_name'] ?? '',
                'address'     => [
                    'streetLines' => [$s['receiver_address'] ?? ''],
                    'cityName'    => $s['receiver_city'] ?? '',
                    'countryCode' => $s['receiver_country'] ?? 'SA',
                    'postalCode'  => $s['receiver_zip'] ?? '',
                ],
            ],
            'packages' => [[
                'weight'     => (float)($s['weight'] ?? 1),
                'dimensions' => [
                    'length' => (float)($s['length'] ?? 10),
                    'width'  => (float)($s['width'] ?? 10),
                    'height' => (float)($s['height'] ?? 10),
                ],
            ]],
            'content' => [
                'unitOfMeasurement'   => 'metric',
                'isCustomsDeclarable' => false,
                'description'         => $s['description'] ?? 'Shipment',
                'incoterm'            => 'DAP',
                'packages'            => [[
                    'customerReferences' => [['value' => $s['reference'] ?? '', 'typeCode' => 'CU']],
                    'description'        => $s['description'] ?? 'Shipment',
                    'weight'             => (float)($s['weight'] ?? 1),
                    'dimensions'         => [
                        'length' => (float)($s['length'] ?? 10),
                        'width'  => (float)($s['width'] ?? 10),
                        'height' => (float)($s['height'] ?? 10),
                    ],
                ]],
            ],
            'outputImageProperties' => [
                'printerDPI'       => 300,
                'customerBarcodes' => [['content' => $s['reference'] ?? '', 'textBelowBarcode' => $s['reference'] ?? '', 'symbologyCode' => '93']],
                'encodingFormat'   => 'pdf',
                'imageOptions'     => [[
                    'typeCode'      => 'label',
                    'templateName'  => 'ECOM26_84_001',
                    'isRequested'   => true,
                    'invoiceType'   => 'commercial',
                    'languageCode'  => 'ara',
                    'encodingFormat'=> 'pdf',
                ]],
            ],
        ];

        try {
            $response = $this->http()->post("{$this->baseUrl}/shipments", $payload);
            if ($response->successful()) {
                $data  = $response->json();
                $awb   = $data['shipmentTrackingNumber'] ?? '';
                $label = $data['documents'][0]['content'] ?? '';
                return [
                    'tracking_number'   => $awb,
                    'label_url'         => $label ? 'data:application/pdf;base64,' . $label : '',
                    'carrier_reference' => $data['dispatchConfirmationNumber'] ?? $awb,
                ];
            }
            Log::error('DHL createShipment error: ' . $response->body());
        } catch (\Throwable $e) {
            Log::error('DHL createShipment: ' . $e->getMessage());
        }

        throw new \RuntimeException('فشل إنشاء شحنة DHL');
    }

    public function cancelShipment(string $carrierReference): bool
    {
        try {
            $response = $this->http()->delete("{$this->baseUrl}/shipments/{$carrierReference}");
            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('DHL cancelShipment: ' . $e->getMessage());
            return false;
        }
    }

    public function track(string $trackingNumber): array
    {
        try {
            $response = $this->http()->get("{$this->baseUrl}/tracking", ['shipmentTrackingNumber' => $trackingNumber]);
            if ($response->successful()) {
                $events = $response->json('shipments.0.events') ?? [];
                return array_map(fn($e) => [
                    'status'      => $e['description'] ?? '',
                    'location'    => ($e['location']['address']['addressLocality'] ?? '') . ', ' . ($e['location']['address']['countryCode'] ?? ''),
                    'timestamp'   => $e['timestamp'] ?? '',
                    'description' => $e['description'] ?? '',
                ], $events);
            }
        } catch (\Throwable $e) {
            Log::warning('DHL track: ' . $e->getMessage());
        }
        return [];
    }
}
