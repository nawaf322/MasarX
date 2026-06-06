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

namespace App\Exports;

use App\Models\User;
use App\Models\Shipment;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class CustomersExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle
{
    protected int $organizationId;

    public function __construct(int $organizationId)
    {
        $this->organizationId = $organizationId;
    }

    public function title(): string
    {
        return 'Clientes';
    }

    public function collection()
    {
        return User::role('customer')
            ->where('organization_id', $this->organizationId)
            ->latest()
            ->get();
    }

    public function headings(): array
    {
        return [
            'Nombre',
            'Email',
            'Teléfono',
            'Tipo Documento',
            'Nº Documento',
            'Género',
            'Fecha Nacimiento',
            'Dirección',
            'Dirección Línea 2',
            'Ciudad',
            'Departamento/Estado',
            'País',
            'Código Postal',
            'Fecha Registro',
        ];
    }

    public function map($user): array
    {
        return [
            $user->name,
            $user->email,
            $user->phone ?? '',
            $user->document_type ?? '',
            $user->document_id ?? '',
            $user->gender ?? '',
            $user->date_of_birth ? \Carbon\Carbon::parse($user->date_of_birth)->format('d/m/Y') : '',
            $user->address ?? '',
            $user->address_line2 ?? '',
            $user->city ?? '',
            $user->state ?? '',
            $user->country ?? '',
            $user->zip_code ?? '',
            $user->created_at->format('d/m/Y'),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            // Header row: dark background, white bold text, centered
            1 => [
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 11],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E3A5F']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }
}
