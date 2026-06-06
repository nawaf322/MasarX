<?php

namespace App\Exports;

use App\Models\ReturnShipment;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReturnsReportExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    public function __construct(private int $orgId, private array $filters = []) {}

    public function query()
    {
        $q = ReturnShipment::where('organization_id', $this->orgId)
            ->with('originalShipment:id,tracking_number,total,currency');
        if (!empty($this->filters['status']))   { $q->where('status', $this->filters['status']); }
        if (!empty($this->filters['reason']))   { $q->where('reason', $this->filters['reason']); }
        if (!empty($this->filters['date_from'])){ $q->whereDate('created_at', '>=', $this->filters['date_from']); }
        if (!empty($this->filters['date_to']))  { $q->whereDate('created_at', '<=', $this->filters['date_to']); }
        return $q->orderByDesc('created_at');
    }

    public function headings(): array
    {
        return ['Return #', 'Original Tracking', 'Reason', 'Status', 'Refund Amount', 'Refund Method', 'Date'];
    }

    public function map($row): array
    {
        return [
            $row->return_number,
            $row->originalShipment?->tracking_number ?? '—',
            $row->reason,
            $row->status,
            number_format((float)$row->refund_amount, 2),
            $row->refund_method ?? '—',
            $row->created_at?->format('Y-m-d'),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true, 'size' => 11]]];
    }
}
