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

namespace App\Services\Carriers;

use App\Contracts\CarrierAdapter;
use App\DTO\RateDto;
use App\DTO\ShipmentDto;
use App\Models\Shipment;

/**
 * Bridges CarrierAdapter (DHL/FedEx) to CarrierStrategy.
 * Converts array payload <-> DTO for unified rate/label flow.
 */
class CarrierAdapterBridge implements CarrierStrategy
{
    public function __construct(
        private CarrierAdapter $adapter,
        private string $carrierCode,
        private array $credentials = [],  // Decrypted from CarrierAccount
        private string $mode = 'test'
    ) {}

    public function getCredentials(): array { return $this->credentials; }
    public function getMode(): string { return $this->mode; }

    public function getRates(array $payload): array
    {
        $shipmentDto = $this->payloadToShipmentDto($payload);
        // Pass credentials and mode to adapter if it supports it
        if (method_exists($this->adapter, 'withCredentials')) {
            $this->adapter->withCredentials($this->credentials, $this->mode);
        }
        $rateDtos = $this->adapter->getRates($shipmentDto);
        return $this->rateDtosToArray($rateDtos);
    }

    public function createLabel(Shipment $shipment): array
    {
        $dto = $this->shipmentToShipmentDto($shipment);
        if (method_exists($this->adapter, 'withCredentials')) {
            $this->adapter->withCredentials($this->credentials, $this->mode);
        }
        $result = $this->adapter->createLabel($dto);
        return [
            'tracking_number' => $result['tracking_number'] ?? null,
            'label_url' => $result['label_url'] ?? null,
            'carrier_ref' => $result['tracking_number'] ?? ('CARRIER-' . $shipment->id),
            'cost' => $result['cost'] ?? null,
            'is_stub' => false,
        ];
    }

    public function track(string $trackingNumber): array
    {
        return ['status' => 'unknown', 'events' => []];
    }

    private function payloadToShipmentDto(array $payload): ShipmentDto
    {
        $sender = $payload['sender_details'] ?? [];
        $receiver = $payload['receiver_details'] ?? [];
        $pkg = $payload['package_details'] ?? [];
        $packages = isset($pkg['packages']) ? $pkg['packages'] : [[
            'weight' => $pkg['weight'] ?? 1,
            'length' => $pkg['length'] ?? 10,
            'width' => $pkg['width'] ?? 10,
            'height' => $pkg['height'] ?? 10,
            'declared_value' => $pkg['declared_value'] ?? 0,
        ]];
        return new ShipmentDto(
            sender: $sender,
            receiver: $receiver,
            packages: $packages,
            serviceDate: now()->format('Y-m-d')
        );
    }

    private function shipmentToShipmentDto(Shipment $shipment): ShipmentDto
    {
        $pd = $shipment->package_details_normalized;
        $pkg = \App\Services\PackageDetailsNormalizer::toRatePayload($pd);
        $packages = [['weight' => $pkg['weight'], 'length' => $pkg['length'], 'width' => $pkg['width'], 'height' => $pkg['height'], 'declared_value' => $pkg['declared_value']]];
        return new ShipmentDto(
            sender: $shipment->sender_details ?? [],
            receiver: $shipment->receiver_details ?? [],
            packages: $packages,
            serviceDate: ($shipment->ship_date?->format('Y-m-d')) ?? now()->format('Y-m-d')
        );
    }

    private function rateDtosToArray(array $dtos): array
    {
        $carrierName = $this->carrierDisplayName($this->carrierCode);
        $result = [];
        foreach ($dtos as $dto) {
            if (!$dto instanceof RateDto) {
                continue;
            }
            $result[] = [
                'service_code' => $dto->serviceCode,
                'service_name' => $dto->serviceName,
                'carrier_code' => strtolower($this->carrierCode),
                'carrier_name' => $carrierName,
                'is_stub' => false,
                'total_price' => number_format($dto->cost, 2, '.', ''),
                'currency' => $dto->currency,
                'estimated_days' => $dto->estimatedDeliveryDate ? (int) (now()->diffInDays(\Carbon\Carbon::parse($dto->estimatedDeliveryDate), false)) : 3,
                'rate_card_id' => null,
                'rate_rule_id' => null,
                'exchange_rate' => 1.0,
                'breakdown' => [
                    'subtotal' => $dto->cost,
                    'base' => $dto->cost,
                    'weight_charge' => 0,
                    'fuel' => 0,
                    'insurance' => 0,
                    'tax' => 0,
                    'base_surcharge' => 0,
                ],
            ];
        }
        return $result;
    }

    private function carrierDisplayName(string $code): string
    {
        $names = ['DHL' => 'DHL', 'FEDEX' => 'FedEx', 'UPS' => 'UPS', 'USPS' => 'USPS'];
        return $names[strtoupper($code)] ?? $code;
    }
}
