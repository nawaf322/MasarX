<?php
namespace App\Services\Carriers;

class CarrierManager
{
    /** @var CarrierInterface[] */
    private array $carriers;

    public function __construct()
    {
        $this->carriers = [
            'aramex' => new AramexService(),
            'smsa'   => new SMSAService(),
            'dhl'    => new DHLService(),
        ];
    }

    public function carrier(string $name): CarrierInterface
    {
        return $this->carriers[$name] ?? throw new \InvalidArgumentException("Carrier [{$name}] not registered.");
    }

    /** Get rates from ALL active carriers and return a merged sorted array. */
    public function allRates(array $shipmentData): array
    {
        $results = [];
        $enabled = array_filter(array_keys($this->carriers), fn($k) => config("services.{$k}.enabled", false));

        foreach ($enabled as $key) {
            $rates = $this->carriers[$key]->getRates($shipmentData);
            foreach ($rates as $rate) {
                $rate['carrier_key'] = $key;
                $results[] = $rate;
            }
        }

        usort($results, fn($a, $b) => $a['price'] <=> $b['price']);
        return $results;
    }

    public function available(): array
    {
        return array_keys($this->carriers);
    }
}
