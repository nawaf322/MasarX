<?php

namespace App\Http\Controllers;

use App\Jobs\ImportShipmentsJob;
use App\Services\DeprixaProShipmentImporter;
use App\Models\ImportJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $perPage = min((int) $request->query('per_page', 15), 100);
        $jobs = ImportJob::where('organization_id', $orgId)
            ->with('creator')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Import/Index', [
            'importJobs' => $jobs,
        ]);
    }

    public function template(): StreamedResponse
    {
        $headers = [
            'tracking_number',
            'sender_name',
            'sender_phone',
            'sender_address',
            'sender_city',
            'sender_country',
            'receiver_name',
            'receiver_phone',
            'receiver_address',
            'receiver_city',
            'receiver_country',
            'weight',
            'pieces',
            'content_description',
            'service_type',
            'total',
            'currency',
            'ship_date',
        ];

        return response()->streamDownload(function () use ($headers) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);
            fclose($handle);
        }, 'shipments_import_template.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validate by extension only (MIME detection unreliable on MAMP/shared hosting)
        $file = $request->file('file');
        if (!$request->hasFile('file') || !$file) {
            return response()->json(['success' => false, 'message' => 'No file received. Please select a CSV or Excel file.'], 422);
        }

        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['csv', 'xlsx'], true)) {
            return response()->json(['success' => false, 'message' => 'Only CSV and XLSX files are supported.'], 422);
        }

        if ($file->getSize() > 20 * 1024 * 1024) {
            return response()->json(['success' => false, 'message' => 'File exceeds the 20 MB limit.'], 422);
        }

        $orgId    = Auth::user()->organization_id;
        $filename = $file->getClientOriginalName();
        $path     = $file->store("imports/{$orgId}", 'local');

        $importJob = ImportJob::create([
            'organization_id' => $orgId,
            'created_by'      => Auth::id(),
            'type'            => 'shipments',
            'status'          => 'pending',
            'filename'        => $filename,
        ]);

        try {
            set_time_limit(300);
            ImportShipmentsJob::dispatchSync($importJob, $path);
        } catch (\Throwable $e) {
            $importJob->update(['status' => 'failed', 'errors' => [['row' => 0, 'message' => $e->getMessage()]]]);
            return response()->json(['success' => false, 'message' => 'Import failed: ' . $e->getMessage()], 500);
        }

        $importJob->refresh();

        return response()->json([
            'success'      => true,
            'job_id'       => $importJob->id,
            'status'       => $importJob->status,
            'total_rows'   => $importJob->total_rows,
            'success_rows' => $importJob->success_rows,
            'error_rows'   => $importJob->error_rows,
            'redirect_url' => route('import.show', $importJob),
        ]);
    }

    public function show(ImportJob $importJob): Response
    {
        abort_if($importJob->organization_id !== Auth::user()->organization_id, 403);

        return Inertia::render('Import/Show', [
            'importJob' => $importJob,
        ]);
    }

    public function destroy(ImportJob $importJob): \Illuminate\Http\JsonResponse
    {
        abort_if($importJob->organization_id !== Auth::user()->organization_id, 403);
        $importJob->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Import shipments from Deprixa Pro SQL dumps.
     * POST /import/deprixa-pro
     *
     * Required files: cdb_add_order.sql
     * Recommended:    cdb_users.sql (auto-imports customers; optional if customers already exist)
     * Optional:       cdb_add_order_item.sql,
     *                 cdb_senders_addresses.sql, cdb_country.sql,
     *                 cdb_state.sql, cdb_city.sql
     */
    public function importDeprixaPro(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'files'   => 'required|array|min:1|max:8',
            'files.*' => 'required|file|mimes:sql,txt|max:30720',
        ]);

        $sqlContent = '';
        foreach ($request->file('files') as $file) {
            $sqlContent .= "\n" . file_get_contents($file->getRealPath());
        }

        if (empty(trim($sqlContent))) {
            return response()->json(['success' => false, 'message' => 'Los archivos SQL están vacíos.'], 422);
        }

        // Block dangerous SQL operations in uploaded files
        $dangerous = ['DROP ', 'TRUNCATE ', 'ALTER USER', 'ALTER DATABASE', 'GRANT ', 'REVOKE ', 'CREATE USER', 'DELETE FROM', 'UPDATE ', 'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE', 'BENCHMARK(', 'SLEEP('];
        $upperSql = strtoupper($sqlContent);
        foreach ($dangerous as $keyword) {
            if (str_contains($upperSql, $keyword)) {
                return response()->json([
                    'success' => false,
                    'message' => 'The SQL file contains forbidden operations (' . trim($keyword) . '). Only INSERT statements from phpMyAdmin exports are allowed.',
                ], 422);
            }
        }

        if (stripos($sqlContent, 'cdb_add_order') === false) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la tabla cdb_add_order. Asegúrate de subir el dump correcto.',
            ], 422);
        }

        // cdb_users.sql is now optional — the importer handles both cases:
        // - If included: builds old_id→email map and auto-imports new customers
        // - If not included: uses existing DB customers (throws if none exist)

        try {
            $importer = new DeprixaProShipmentImporter(
                $sqlContent,
                Auth::user()->organization_id,
                Auth::id()
            );
            $result = $importer->import(false);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el SQL: ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success'      => true,
            'imported'     => $result['imported'],
            'skipped'      => $result['skipped'],
            'skipped_rows' => $result['skippedRows'],
        ]);
    }
}
