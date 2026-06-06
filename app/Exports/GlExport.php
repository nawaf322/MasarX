<?php

namespace App\Exports;

use App\Models\Shipment;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * General Ledger export.
 * Each paid/partial shipment generates two journal lines:
 *   DR  Accounts Receivable (1200)   →  shipment total
 *   CR  Revenue – Freight (4100)     →  shipment total
 * Each shipment with cost_price generates two cost lines:
 *   DR  Cost of Services (5100)      →  cost_price
 *   CR  Accounts Payable (2100)      →  cost_price
 */
class GlExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize, WithTitle
{
    public function __construct(private int $orgId, private array $filters = []) {}

    public function title(): string
    {
        return 'GL Journal';
    }

    public function collection()
    {
        $q = Shipment::where('organization_id', $this->orgId)
            ->select('id', 'tracking_number', 'status', 'payment_status', 'total', 'cost_price', 'currency', 'created_at', 'sender_details');

        if (!empty($this->filters['date_from'])) {
            $q->whereDate('created_at', '>=', $this->filters['date_from']);
        }
        if (!empty($this->filters['date_to'])) {
            $q->whereDate('created_at', '<=', $this->filters['date_to']);
        }

        $rows = collect();

        $q->orderByDesc('created_at')->get()->each(function ($s) use (&$rows) {
            $date        = $s->created_at?->format('Y-m-d') ?? '';
            $currency    = $s->currency ?? 'USD';
            $tracking    = $s->tracking_number;
            $total       = (float) ($s->total ?? 0);
            $cost        = (float) ($s->cost_price ?? 0);
            $payStatus   = is_string($s->payment_status) ? $s->payment_status : ($s->payment_status?->value ?? '');

            $gl = config('gl.accounts');

            // Revenue lines — only for paid / partial shipments
            if (in_array($payStatus, ['paid', 'partial']) && $total > 0) {
                $rows->push([
                    'date'        => $date,
                    'journal_ref' => 'SHP-' . $s->id,
                    'tracking'    => $tracking,
                    'account_code'=> $gl['ar']['code'],
                    'account_name'=> $gl['ar']['name'],
                    'description' => 'Shipment revenue: ' . $tracking,
                    'debit'       => number_format($total, 2),
                    'credit'      => '0.00',
                    'currency'    => $currency,
                ]);
                $rows->push([
                    'date'        => $date,
                    'journal_ref' => 'SHP-' . $s->id,
                    'tracking'    => $tracking,
                    'account_code'=> $gl['revenue']['code'],
                    'account_name'=> $gl['revenue']['name'],
                    'description' => 'Shipment revenue: ' . $tracking,
                    'debit'       => '0.00',
                    'credit'      => number_format($total, 2),
                    'currency'    => $currency,
                ]);
            }

            // Cost lines
            if ($cost > 0) {
                $rows->push([
                    'date'        => $date,
                    'journal_ref' => 'SHP-' . $s->id,
                    'tracking'    => $tracking,
                    'account_code'=> $gl['cost']['code'],
                    'account_name'=> $gl['cost']['name'],
                    'description' => 'Shipment cost: ' . $tracking,
                    'debit'       => number_format($cost, 2),
                    'credit'      => '0.00',
                    'currency'    => $currency,
                ]);
                $rows->push([
                    'date'        => $date,
                    'journal_ref' => 'SHP-' . $s->id,
                    'tracking'    => $tracking,
                    'account_code'=> $gl['ap']['code'],
                    'account_name'=> $gl['ap']['name'],
                    'description' => 'Shipment cost: ' . $tracking,
                    'debit'       => '0.00',
                    'credit'      => number_format($cost, 2),
                    'currency'    => $currency,
                ]);
            }
        });

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Date',
            'Journal Ref',
            'Tracking #',
            'Account Code',
            'Account Name',
            'Description',
            'Debit',
            'Credit',
            'Currency',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true, 'size' => 11]]];
    }
}
