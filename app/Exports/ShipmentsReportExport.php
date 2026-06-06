<?php

namespace App\Exports;

use App\Models\Shipment;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ShipmentsReportExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    public function __construct(private int $orgId, private array $filters = []) {}

    public function query()
    {
        $q = Shipment::where('organization_id', $this->orgId)
            ->select('id','tracking_number','status','payment_status','total','currency','created_at','sender_details','receiver_details');
        if (!empty($this->filters['status']))        { $q->where('status', $this->filters['status']); }
        if (!empty($this->filters['payment_status'])){ $q->where('payment_status', $this->filters['payment_status']); }
        if (!empty($this->filters['date_from']))     { $q->whereDate('created_at', '>=', $this->filters['date_from']); }
        if (!empty($this->filters['date_to']))       { $q->whereDate('created_at', '<=', $this->filters['date_to']); }
        return $q->orderByDesc('created_at');
    }

    public function headings(): array
    {
        return ['#', 'Tracking Number', 'Sender', 'Receiver', 'Status', 'Payment', 'Amount', 'Currency', 'Date'];
    }

    public function map($row): array
    {
        $sender   = is_array($row->sender_details)   ? ($row->sender_details['name']   ?? '—') : '—';
        $receiver = is_array($row->receiver_details) ? ($row->receiver_details['name'] ?? '—') : '—';
        return [
            $row->id,
            $row->tracking_number,
            $sender,
            $receiver,
            is_string($row->status) ? $row->status : ($row->status?->value ?? ''),
            is_string($row->payment_status) ? $row->payment_status : ($row->payment_status?->value ?? ''),
            number_format((float)$row->total, 2),
            $row->currency ?? 'USD',
            $row->created_at?->format('Y-m-d'),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true, 'size' => 11]]];
    }
}
