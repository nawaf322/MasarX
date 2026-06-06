<?php

namespace App\Exports;

use App\Models\Shipment;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class FinancialReportExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private int $orgId, private array $filters = []) {}

    public function collection()
    {
        $q = Shipment::where('organization_id', $this->orgId)
            ->select('tracking_number','status','payment_status','total','currency','created_at','sender_details');
        if (!empty($this->filters['date_from'])){ $q->whereDate('created_at', '>=', $this->filters['date_from']); }
        if (!empty($this->filters['date_to']))  { $q->whereDate('created_at', '<=', $this->filters['date_to']); }

        return $q->orderByDesc('created_at')->get()->map(function ($row) {
            $sender = is_array($row->sender_details) ? ($row->sender_details['name'] ?? '—') : '—';
            return [
                'tracking'       => $row->tracking_number,
                'sender'         => $sender,
                'status'         => is_string($row->status) ? $row->status : ($row->status?->value ?? ''),
                'payment_status' => is_string($row->payment_status) ? $row->payment_status : ($row->payment_status?->value ?? ''),
                'amount'         => number_format((float)$row->total, 2),
                'currency'       => $row->currency ?? 'USD',
                'date'           => $row->created_at?->format('Y-m-d'),
            ];
        });
    }

    public function headings(): array
    {
        return ['Tracking', 'Sender', 'Status', 'Payment Status', 'Amount', 'Currency', 'Date'];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true, 'size' => 11]]];
    }
}
