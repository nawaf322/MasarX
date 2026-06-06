<?php
namespace App\Services\Carriers;

interface CarrierInterface
{
    /** Return rate quotes. Each item: ['carrier'=>string,'service'=>string,'price'=>float,'currency'=>string,'estimated_days'=>int,'label'=>string] */
    public function getRates(array $shipmentData): array;

    /** Create a shipment and return ['tracking_number'=>string,'label_url'=>string,'carrier_reference'=>string] */
    public function createShipment(array $shipmentData): array;

    /** Cancel a previously created shipment. */
    public function cancelShipment(string $carrierReference): bool;

    /** Track a shipment. Return array of status events. */
    public function track(string $trackingNumber): array;

    /** Carrier name identifier. */
    public function name(): string;
}
