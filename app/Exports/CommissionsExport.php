<?php

namespace App\Exports;

use App\Models\Commission;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CommissionsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(
        private int    $orgId,
        private array  $filters = [],
    ) {}

    public function collection()
    {
        $q = Commission::with([
                'shipment:id,tracking_number',
                'user:id,name',
                'rule:id,name',
            ])
            ->where('organization_id', $this->orgId);

        if (!empty($this->filters['status'])) {
            $q->where('status', $this->filters['status']);
        }
        if (!empty($this->filters['user_id'])) {
            $q->where('user_id', $this->filters['user_id']);
        }
        if (!empty($this->filters['from'])) {
            $q->whereDate('created_at', '>=', $this->filters['from']);
        }
        if (!empty($this->filters['to'])) {
            $q->whereDate('created_at', '<=', $this->filters['to']);
        }

        return $q->orderByDesc('created_at')->get()->map(fn($c) => [
            'id'             => $c->id,
            'agent'          => $c->user?->name          ?? '—',
            'shipment'       => $c->shipment?->tracking_number ?? '—',
            'rule'           => $c->rule?->name          ?? '—',
            'trigger'        => $c->trigger_event        ?? '—',
            'shipment_total' => number_format((float) $c->shipment_total,  2),
            'amount'         => number_format((float) $c->commission_amount, 2),
            'currency'       => $c->currency             ?? 'USD',
            'status'         => $c->status,
            'reversed_at'    => $c->reversed_at?->format('Y-m-d H:i') ?? '',
            'paid_at'        => $c->paid_at?->format('Y-m-d H:i')     ?? '',
            'created_at'     => $c->created_at?->format('Y-m-d H:i')  ?? '',
        ]);
    }

    public function headings(): array
    {
        return [
            'ID', 'Agent', 'Shipment', 'Rule', 'Trigger',
            'Shipment Total', 'Commission', 'Currency',
            'Status', 'Reversed At', 'Paid At', 'Created At',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true, 'size' => 11]]];
    }
}
