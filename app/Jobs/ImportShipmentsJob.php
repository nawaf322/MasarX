<?php

namespace App\Jobs;

use App\Models\ImportJob;
use App\Models\Shipment;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Processes a CSV or XLSX shipment import file synchronously.
 * Does NOT implement ShouldQueue — runs in the HTTP request so no queue worker is needed.
 */
class ImportShipmentsJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected ImportJob $importJob,
        protected string $filePath
    ) {}

    public function handle(): void
    {
        $this->importJob->update(['status' => 'processing']);

        $errors      = [];
        $successRows = 0;
        $errorRows   = 0;
        $totalRows   = 0;

        try {
            $fullPath = Storage::disk('local')->path($this->filePath);

            if (!file_exists($fullPath)) {
                $this->importJob->update(['status' => 'failed', 'errors' => [['row' => 0, 'message' => 'Uploaded file not found on disk.']]]);
                return;
            }

            $ext  = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
            $rows = $ext === 'xlsx' ? $this->readXlsx($fullPath) : $this->readCsv($fullPath);

            if (empty($rows)) {
                $this->importJob->update(['status' => 'failed', 'errors' => [['row' => 0, 'message' => 'The file is empty or has no readable rows.']]]);
                return;
            }

            foreach ($rows as $data) {
                $totalRows++;

                try {
                    $senderDetails = [
                        'name'    => trim($data['sender_name']    ?? ''),
                        'phone'   => trim($data['sender_phone']   ?? ''),
                        'address' => trim($data['sender_address'] ?? ''),
                        'city'    => trim($data['sender_city']    ?? ''),
                        'country' => trim($data['sender_country'] ?? ''),
                    ];

                    $receiverDetails = [
                        'name'    => trim($data['receiver_name']    ?? ''),
                        'phone'   => trim($data['receiver_phone']   ?? ''),
                        'address' => trim($data['receiver_address'] ?? ''),
                        'city'    => trim($data['receiver_city']    ?? ''),
                        'country' => trim($data['receiver_country'] ?? ''),
                    ];

                    if (empty($senderDetails['name']) || empty($receiverDetails['name'])) {
                        throw new \Exception('Sender and receiver names are required.');
                    }

                    $shipment = Shipment::create([
                        'organization_id' => $this->importJob->organization_id,
                        'created_by'      => $this->importJob->created_by,
                        'uuid'            => \Illuminate\Support\Str::uuid()->toString(),
                        'tracking_number' => !empty($data['tracking_number']) ? trim($data['tracking_number']) : null,
                        'sender_details'  => $senderDetails,
                        'receiver_details'=> $receiverDetails,
                        'package_details' => [
                            'weight'              => $data['weight']              ?? 0,
                            'pieces'              => $data['pieces']              ?? 1,
                            'content_description' => $data['content_description'] ?? '',
                        ],
                        'service_type'    => !empty($data['service_type']) ? trim($data['service_type']) : null,
                        'total'           => $data['total']    ?? 0,
                        'currency'        => !empty($data['currency']) ? trim($data['currency']) : 'USD',
                        'ship_date'       => !empty($data['ship_date']) ? $data['ship_date'] : now(),
                        'status'          => 'pending',
                        'payment_status'  => 'unpaid',
                    ]);
                    event(new \App\Events\ShipmentCreated($shipment));

                    $successRows++;
                } catch (\Exception $e) {
                    $errorRows++;
                    $errors[] = ['row' => $totalRows, 'message' => $e->getMessage()];
                }

                // Update progress every 10 rows
                if ($totalRows % 10 === 0) {
                    $this->importJob->update([
                        'processed_rows' => $totalRows,
                        'success_rows'   => $successRows,
                        'error_rows'     => $errorRows,
                        'errors'         => $errors,
                    ]);
                }
            }

            Storage::disk('local')->delete($this->filePath);

            $this->importJob->update([
                'status'         => 'done',
                'total_rows'     => $totalRows,
                'processed_rows' => $totalRows,
                'success_rows'   => $successRows,
                'error_rows'     => $errorRows,
                'errors'         => $errors,
            ]);

        } catch (\Exception $e) {
            $this->importJob->update([
                'status' => 'failed',
                'errors' => [['row' => 0, 'message' => $e->getMessage()]],
            ]);
        }
    }

    // ── CSV reader ─────────────────────────────────────────────────────────────

    /**
     * @return array<int, array<string, string|null>>
     */
    private function readCsv(string $path): array
    {
        $rows   = [];
        $handle = fopen($path, 'r');

        // Strip UTF-8 BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return [];
        }

        $headers = array_map('trim', $headers);

        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) === 1 && trim($row[0]) === '') {
                continue; // skip blank lines
            }
            $rows[] = array_combine($headers, array_pad($row, count($headers), null));
        }

        fclose($handle);
        return $rows;
    }

    // ── XLSX reader ────────────────────────────────────────────────────────────

    /**
     * @return array<int, array<string, string|null>>
     */
    private function readXlsx(string $path): array
    {
        if (!class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
            throw new \RuntimeException('PhpSpreadsheet is not installed. Run: composer require phpoffice/phpspreadsheet');
        }

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        $sheet       = $spreadsheet->getActiveSheet();
        $data        = $sheet->toArray(null, true, true, false);

        if (empty($data)) {
            return [];
        }

        // First row = headers
        $headers = array_map('trim', array_shift($data));

        $rows = [];
        foreach ($data as $row) {
            // Skip completely empty rows
            if (empty(array_filter($row, fn($v) => $v !== null && $v !== ''))) {
                continue;
            }
            $rows[] = array_combine($headers, array_pad($row, count($headers), null));
        }

        return $rows;
    }
}
