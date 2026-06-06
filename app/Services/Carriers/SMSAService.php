<?php
namespace App\Services\Carriers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SMSAService implements CarrierInterface
{
    private string $passKey;
    private string $senderCode;
    private string $baseUrl;

    public function __construct()
    {
        $this->passKey    = config('services.smsa.pass_key', '');
        $this->senderCode = config('services.smsa.sender_code', '');
        $this->baseUrl    = config('services.smsa.test_mode', true)
            ? 'https://track.smsaexpress.com/SECOM/SMSAwebService.asmx'
            : 'https://track.smsaexpress.com/SECOM/SMSAwebService.asmx';
    }

    public function name(): string { return 'smsa'; }

    public function getRates(array $s): array
    {
        // SMSA rates via SOAP — simplified stub returning configured flat rate
        $rate = (float) config('services.smsa.flat_rate', 25.0);
        return [[
            'carrier'        => 'SMSA',
            'service'        => 'سمسا إكسبرس — تسليم يوم العمل التالي',
            'price'          => $rate,
            'currency'       => 'SAR',
            'estimated_days' => 1,
            'label'          => 'سمسا',
        ]];
    }

    public function createShipment(array $s): array
    {
        // SMSA SOAP addShipment call
        $soapBody = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:web="http://smsaexpress.com/SECOM">
  <soap:Body>
    <web:addShipment>
      <web:passKey>{$this->passKey}</web:passKey>
      <web:refNo>{$s['reference']}</web:refNo>
      <web:sentDate>{$this->today()}</web:sentDate>
      <web:itemsCount>{$s['pieces']}</web:itemsCount>
      <web:weight>{$s['weight']}</web:weight>
      <web:cnsName>{$s['receiver_name']}</web:cnsName>
      <web:cnsPhone>{$s['receiver_phone']}</web:cnsPhone>
      <web:cnsCity>{$s['receiver_city']}</web:cnsCity>
      <web:cnsAddr>{$s['receiver_address']}</web:cnsAddr>
      <web:senderName>{$s['sender_name']}</web:senderName>
      <web:senderPhone>{$s['sender_phone']}</web:senderPhone>
      <web:codAmt>{$s['cod']}</web:codAmt>
      <web:senderCode>{$this->senderCode}</web:senderCode>
      <web:custCode></web:custCode>
    </web:addShipment>
  </soap:Body>
</soap:Envelope>
XML;
        try {
            $response = Http::withHeaders([
                'Content-Type' => 'text/xml; charset=utf-8',
                'SOAPAction'   => '"http://smsaexpress.com/SECOM/addShipment"',
            ])->timeout(20)->send('POST', $this->baseUrl, ['body' => $soapBody]);

            if ($response->successful()) {
                preg_match('/<addShipmentResult>(.*?)<\/addShipmentResult>/s', $response->body(), $m);
                $awb = $m[1] ?? '';
                if ($awb && $awb !== 'Failed') {
                    return ['tracking_number' => $awb, 'label_url' => '', 'carrier_reference' => $awb];
                }
            }
        } catch (\Throwable $e) {
            Log::error('SMSA createShipment: ' . $e->getMessage());
        }

        throw new \RuntimeException('فشل إنشاء شحنة سمسا');
    }

    public function cancelShipment(string $carrierReference): bool
    {
        $soapBody = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:web="http://smsaexpress.com/SECOM">
  <soap:Body>
    <web:cancelShipment>
      <web:passKey>{$this->passKey}</web:passKey>
      <web:awbNo>{$carrierReference}</web:awbNo>
      <web:senderCode>{$this->senderCode}</web:senderCode>
    </web:cancelShipment>
  </soap:Body>
</soap:Envelope>
XML;
        try {
            $response = Http::withHeaders(['Content-Type' => 'text/xml; charset=utf-8'])
                ->timeout(10)
                ->send('POST', $this->baseUrl, ['body' => $soapBody]);
            return str_contains($response->body(), 'True');
        } catch (\Throwable $e) {
            Log::warning('SMSA cancelShipment: ' . $e->getMessage());
            return false;
        }
    }

    public function track(string $trackingNumber): array
    {
        $soapBody = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:web="http://smsaexpress.com/SECOM">
  <soap:Body>
    <web:getTracking>
      <web:passKey>{$this->passKey}</web:passKey>
      <web:awbNo>{$trackingNumber}</web:awbNo>
    </web:getTracking>
  </soap:Body>
</soap:Envelope>
XML;
        try {
            $response = Http::withHeaders(['Content-Type' => 'text/xml; charset=utf-8'])
                ->timeout(15)
                ->send('POST', $this->baseUrl, ['body' => $soapBody]);
            // Parse XML response — simplified; real implementation would use SimpleXML
            return [[
                'status'      => 'تم الاستعلام',
                'description' => $response->body(),
                'timestamp'   => now()->toIso8601String(),
                'location'    => '',
            ]];
        } catch (\Throwable $e) {
            Log::warning('SMSA track: ' . $e->getMessage());
            return [];
        }
    }

    private function today(): string { return now()->format('d/m/Y'); }
}
