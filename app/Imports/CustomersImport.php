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

namespace App\Imports;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;

class CustomersImport implements ToModel, WithHeadingRow, SkipsEmptyRows, SkipsOnError
{
    use SkipsErrors;

    protected int $organizationId;

    public int $importedCount = 0;
    public int $skippedCount  = 0;
    public array $skippedRows = [];

    public function __construct(int $organizationId)
    {
        $this->organizationId = $organizationId;
    }

    /**
     * Accept both Spanish and English column headers.
     * WithHeadingRow normalises headers: lowercase + spaces → underscores.
     * So "Nombre" → "nombre", "Email" → "email", "Teléfono" → "telefono", etc.
     */
    public function model(array $row): ?User
    {
        $name  = trim($row['nombre'] ?? $row['name'] ?? '');
        $email = strtolower(trim($row['email'] ?? ''));

        if (empty($name) || empty($email)) {
            $this->skippedCount++;
            $this->skippedRows[] = "Fila vacía (nombre o email faltante)";
            return null;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->skippedCount++;
            $this->skippedRows[] = "Email inválido: {$email}";
            return null;
        }

        // Skip if email already exists globally (emails must be unique in users table)
        if (User::where('email', $email)->exists()) {
            $this->skippedCount++;
            $this->skippedRows[] = "Email ya registrado: {$email}";
            return null;
        }

        $user = new User([
            'name'            => $name,
            'email'           => $email,
            'phone'           => $this->clean($row['telefono']    ?? $row['phone']           ?? ''),
            'document_type'   => strtoupper($this->clean($row['tipo_documento'] ?? $row['document_type'] ?? '')),
            'document_id'     => $this->clean($row['n_documento']  ?? $row['documento']       ?? $row['document_id']   ?? ''),
            'gender'          => $this->clean($row['genero']       ?? $row['gender']          ?? ''),
            'date_of_birth'   => $this->parseDate($row['fecha_nacimiento'] ?? $row['date_of_birth'] ?? ''),
            'address'         => $this->clean($row['direccion']    ?? $row['address']         ?? ''),
            'address_line2'   => $this->clean($row['direccion_linea_2'] ?? $row['address_line2'] ?? ''),
            'city'            => $this->clean($row['ciudad']       ?? $row['city']            ?? ''),
            'state'           => $this->clean($row['departamentoestado'] ?? $row['state']    ?? ''),
            'country'         => $this->clean($row['pais']         ?? $row['country']         ?? ''),
            'zip_code'        => $this->clean($row['codigo_postal'] ?? $row['zip_code']       ?? ''),
            'password'        => Hash::make(Str::random(20)),
            'organization_id' => $this->organizationId,
            'is_active'       => true,
        ]);

        $user->save();
        $user->assignRole('customer');

        $this->importedCount++;
        return $user;
    }

    private function clean(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function parseDate(mixed $value): ?string
    {
        $str = $this->clean($value);
        if (empty($str)) return null;
        try {
            return \Carbon\Carbon::parse($str)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
