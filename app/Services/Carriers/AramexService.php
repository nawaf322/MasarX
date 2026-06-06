<?php
namespace App\Services\Carriers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AramexService implements CarrierInterface
{
    private string $username;
    private string $password;
    private string $version;
    private string $pin;
    private string $accountNumber;
    private string $accountPin;
    private string $accountEntity;
    private string $accountCountryCode;
    private bool $testMode;

    public function __construct()
    {
        $this->username           = config('services.aramex.username', '');
        $this->password           = config('services.aramex.password', '');
        $this->version            = config('services.aramex.version', 'v1.0');
        $this->pin                = config('services.aramex.pin', '');
        $this->accountNumber      = config('services.aramex.account_number', '');
        $this->accountPin         = config('services.aramex.account_pin', '');
        $this->accountEntity      = config('services.aramex.account_entity', 'DXB');
        $this->accountCountryCode = config('services.aramex.account_country_code', 'SA');
        $this->testMode           = (bool) config('services.aramex.test_mode', true);
    }

    public function name(): string { return 'aramex'; }

    private function clientInfo(): array
    {
        return [
            'UserName'           => $this->username,
            'Password'           => $this->password,
            'Version'            => $this->version,
            'AccountNumber'      => $this->accountNumber,
            'AccountPin'         => $this->accountPin,
            'AccountEntity'      => $this->accountEntity,
            'AccountCountryCode' => $this->accountCountryCode,
            'Source'             => 31,
        ];
    }

    public function getRates(array $s): array
    {
        $baseUrl = $this->testMode
            ? 'https://ws.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc/json/CalculateRate'
            : 'https://ws.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc/json/CalculateRate';

        $payload = [
            'ClientInfo'      => $this->clientInfo(),
            'Transaction'     => ['Reference1' => 'MasarX-' . time()],
            'OriginAddress'   => [
                'Line1'       => $s['sender_address'] ?? '',
                'City'        => $s['sender_city'] ?? 'Riyadh',
                'CountryCode' => $s['sender_country'] ?? 'SA',
                'PostCode'    => $s['sender_zip'] ?? '',
            ],
            'DestinationAddress' => [
                'Line1'       => $s['receiver_address'] ?? '',
                'City'        => $s['receiver_city'] ?? '',
                'CountryCode' => $s['receiver_country'] ?? 'SA',
                'PostCode'    => $s['receiver_zip'] ?? '',
            ],
            'ShipmentDetails' => [
                'Dimensions'          => null,
                'ActualWeight'        => ['Value' => (float)($s['weight'] ?? 1), 'Unit' => 'KG'],
                'ChargeableWeight'    => null,
                'DescriptionOfGoods'  => $s['description'] ?? 'Shipment',
                'GoodsOriginCountry'  => $s['sender_country'] ?? 'SA',
                'NumberOfPieces'      => (int)($s['pieces'] ?? 1),
                'ProductGroup'        => 'DOM',
                'ProductType'         => 'PPX',
                'PaymentType'         => 'P',
                'PaymentOptions'      => '',
                'Services'            => '',
                'CashOnDeliveryAmount'=> ['Value' => (float)($s['cod'] ?? 0), 'Currency' => 'SAR'],
            ],
        ];

        try {
            $response = Http::timeout(15)->post($baseUrl, $payload);
            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['TotalAmount']['Value'])) {
                    return [[
                        'carrier'        => 'Aramex',
                        'service'        => 'أرامكس — تسليم سريع',
                        'price'          => (float) $data['TotalAmount']['Value'],
                        'currency'       => $data['TotalAmount']['CurrencyCode'] ?? 'SAR',
                        'estimated_days' => 2,
                        'label'          => 'أرامكس',
                    ]];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Aramex getRates failed: ' . $e->getMessage());
        }

        return [];
    }

    public function createShipment(array $s): array
    {
        $baseUrl = 'https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments';

        $payload = [
            'ClientInfo'   => $this->clientInfo(),
            'Transaction'  => ['Reference1' => 'MasarX-' . time()],
            'Shipments'    => [[
                'Shipper' => [
                    'Reference1'    => $s['reference'] ?? '',
                    'AccountNumber' => $this->accountNumber,
                    'PartyAddress'  => [
                        'Line1'       => $s['sender_address'] ?? '',
                        'City'        => $s['sender_city'] ?? 'Riyadh',
                        'CountryCode' => $s['sender_country'] ?? 'SA',
                        'PostCode'    => $s['sender_zip'] ?? '',
                    ],
                    'Contact' => [
                        'PersonName'   => $s['sender_name'] ?? '',
                        'PhoneNumber1' => $s['sender_phone'] ?? '',
                        'EmailAddress' => $s['sender_email'] ?? '',
                    ],
                ],
                'Consignee' => [
                    'Reference1'   => '',
                    'PartyAddress' => [
                        'Line1'       => $s['receiver_address'] ?? '',
                        'City'        => $s['receiver_city'] ?? '',
                        'CountryCode' => $s['receiver_country'] ?? 'SA',
                        'PostCode'    => $s['receiver_zip'] ?? '',
                    ],
                    'Contact' => [
                        'PersonName'   => $s['receiver_name'] ?? '',
                        'PhoneNumber1' => $s['receiver_phone'] ?? '',
                        'EmailAddress' => $s['receiver_email'] ?? '',
                    ],
                ],
                'ShippingDateTime'       => now()->toIso8601String(),
                'DueDate'                => now()->addDays(3)->toIso8601String(),
                'Comments'               => $s['notes'] ?? '',
                'PickupLocation'         => 'RECEPTION',
                'OperationsInstructions' => '',
                'AccountingInstrcutions' => '',
                'Details' => [
                    'Dimensions'          => null,
                    'ActualWeight'        => ['Value' => (float)($s['weight'] ?? 1), 'Unit' => 'KG'],
                    'DescriptionOfGoods'  => $s['description'] ?? 'Shipment',
                    'GoodsOriginCountry'  => $s['sender_country'] ?? 'SA',
                    'NumberOfPieces'      => (int)($s['pieces'] ?? 1),
                    'ProductGroup'        => 'DOM',
                    'ProductType'         => 'PPX',
                    'PaymentType'         => 'P',
                    'PaymentOptions'      => '',
                    'Services'            => '',
                    'CashOnDeliveryAmount'          => ['Value' => (float)($s['cod'] ?? 0), 'Currency' => 'SAR'],
                    'CollectAmount'                 => ['Value' => 0, 'Currency' => 'SAR'],
                    'InsuranceAmount'               => ['Value' => 0, 'Currency' => 'SAR'],
                    'CashAdditionalAmount'          => ['Value' => 0, 'Currency' => 'SAR'],
                    'CashAdditionalAmountDescription' => '',
                    'CustomsValueAmount'            => ['Value' => 0, 'Currency' => 'SAR'],
                    'Items'                         => [],
                ],
            ]],
            'LabelInfo' => [
                'ReportID'   => 9729,
                'ReportType' => 'URL',
            ],
        ];

        try {
            $response = Http::timeout(20)->post($baseUrl, $payload);
            if ($response->successful()) {
                $data     = $response->json();
                $shipment = $data['Shipments'][0] ?? null;
                if ($shipment && empty($shipment['HasErrors'])) {
                    return [
                        'tracking_number'   => $shipment['ID'] ?? '',
                        'label_url'         => $shipment['ShipmentLabel']['LabelURL'] ?? '',
                        'carrier_reference' => $shipment['ID'] ?? '',
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::error('Aramex createShipment failed: ' . $e->getMessage());
        }

        throw new \RuntimeException('فشل إنشاء شحنة أرامكس');
    }

    public function cancelShipment(string $carrierReference): bool
    {
        // Aramex does not expose a REST cancel endpoint; requires manual portal action
        Log::info("Aramex cancelShipment requested for: $carrierReference (manual action required)");
        return false;
    }

    public function track(string $trackingNumber): array
    {
        $url     = 'https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments';
        $payload = [
            'ClientInfo'                => $this->clientInfo(),
            'Transaction'               => ['Reference1' => 'track-' . time()],
            'Shipments'                 => [$trackingNumber],
            'GetLastTrackingUpdateOnly' => false,
        ];

        try {
            $response = Http::timeout(15)->post($url, $payload);
            if ($response->successful()) {
                $updates = $response->json()['TrackingResults'][0]['Value'] ?? [];
                return array_map(fn($u) => [
                    'status'      => $u['UpdateDescription'] ?? '',
                    'location'    => ($u['UpdateLocation']['City'] ?? '') . ', ' . ($u['UpdateLocation']['CountryCode'] ?? ''),
                    'timestamp'   => $u['UpdateDateTime'] ?? '',
                    'description' => $u['UpdateDescription'] ?? '',
                ], $updates);
            }
        } catch (\Throwable $e) {
            Log::warning('Aramex track failed: ' . $e->getMessage());
        }

        return [];
    }
}
