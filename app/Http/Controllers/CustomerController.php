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

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Contract;
use App\Models\OriginPickup;
use App\Models\User;
use App\Models\Shipment;
use App\Models\Country;
use App\Models\State;
use App\Models\City;
use App\Exports\CustomersExport;
use App\Imports\CustomersImport;
use App\Mail\UserInvitationMail;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $orgId  = Auth::user()->organization_id;
        $baseQ  = User::role('customer')->where('organization_id', $orgId);

        // ── KPI stats ─────────────────────────────────────────────────────────
        $total      = (clone $baseQ)->count();
        $newMonth   = (clone $baseQ)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        // Aggregate shipment counts for ALL customers at once (avoids N+1)
        $customerNames = (clone $baseQ)->pluck('name');
        $sentTotal     = Shipment::where('organization_id', $orgId)
            ->whereIn('sender_name_search', $customerNames)
            ->count();
        $receivedTotal = Shipment::where('organization_id', $orgId)
            ->whereIn('receiver_name_search', $customerNames)
            ->count();

        $stats = [
            'total'          => $total,
            'new_month'      => $newMonth,
            'sent_total'     => $sentTotal,
            'received_total' => $receivedTotal,
        ];

        // ── Paginated list ────────────────────────────────────────────────────
        $query = User::role('customer')->where('organization_id', $orgId);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->latest()
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        // Pre-aggregate shipment counts for current page in 2 queries instead of 2×N
        $pageNames    = $customers->pluck('name');
        $sentCounts   = Shipment::where('organization_id', $orgId)
            ->whereIn('sender_name_search', $pageNames)
            ->selectRaw('sender_name_search as uname, COUNT(*) as cnt')
            ->groupBy('sender_name_search')
            ->pluck('cnt', 'uname');
        $receivedCounts = Shipment::where('organization_id', $orgId)
            ->whereIn('receiver_name_search', $pageNames)
            ->selectRaw('receiver_name_search as uname, COUNT(*) as cnt')
            ->groupBy('receiver_name_search')
            ->pluck('cnt', 'uname');

        $customers->through(function ($user) use ($sentCounts, $receivedCounts) {
            $sent     = $sentCounts[$user->name] ?? 0;
            $received = $receivedCounts[$user->name] ?? 0;
            return [
                'id'               => $user->id,
                'name'             => $user->name,
                'email'            => $user->email,
                'phone'            => $user->phone ?? 'N/A',
                'created_at'       => $user->created_at->format('d/m/Y'),
                'sent_count'       => $sent,
                'received_count'   => $received,
                'shipments_count'  => $sent + $received,
            ];
        });

        return Inertia::render('Customers/Index', [
            'customers'    => $customers,
            'stats'        => $stats,
            'filters'      => $request->only(['search']),
            'isSuperAdmin' => Auth::user()->hasRole('super-admin'),
        ]);
    }

    /**
     * Export customers as XLSX or CSV.
     * GET /customers/export?format=xlsx|csv
     */
    public function export(Request $request)
    {
        $format   = in_array($request->input('format'), ['csv', 'xlsx']) ? $request->input('format') : 'xlsx';
        $filename = 'clientes_' . now()->format('Y-m-d') . '.' . $format;

        return Excel::download(new CustomersExport(Auth::user()->organization_id), $filename);
    }

    /**
     * Download a blank import template (CSV).
     * GET /customers/import-template
     */
    public function importTemplate()
    {
        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="plantilla_clientes.csv"',
        ];

        $rows = [
            ['Nombre', 'Email', 'Teléfono', 'Tipo Documento', 'N° Documento', 'Género',
             'Fecha Nacimiento', 'Dirección', 'Dirección Línea 2', 'Ciudad',
             'Departamento/Estado', 'País', 'Código Postal'],
            // Sample row to guide the user
            ['Juan García', 'juan@ejemplo.com', '+57 300 000 0000', 'CC', '1234567890',
             'male', '1990-01-15', 'Calle 1 # 2-3', 'Apto 101', 'Medellín',
             'Antioquia', 'Colombia', '050001'],
        ];

        $callback = function () use ($rows) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel opens correctly
            fputs($out, "﻿");
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Process a CSV or XLSX file and bulk-create customers.
     * POST /customers/import
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:5120',
        ]);

        $import = new CustomersImport(Auth::user()->organization_id);

        try {
            Excel::import($import, $request->file('file'));
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return response()->json([
                'success'  => false,
                'message'  => 'Error de validación en el archivo.',
                'failures' => collect($e->failures())->map(fn($f) => [
                    'row'    => $f->row(),
                    'errors' => $f->errors(),
                ])->toArray(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo procesar el archivo: ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success'       => true,
            'imported'      => $import->importedCount,
            'skipped'       => $import->skippedCount,
            'skipped_rows'  => $import->skippedRows,
        ]);
    }

    /**
     * Import customers from a Deprixa Pro SQL dump (cdb_users + optional cdb_senders_addresses).
     * POST /customers/import-deprixa-pro
     */
    public function importDeprixaPro(Request $request)
    {
        $request->validate([
            'files'   => 'required|array|min:1|max:6',
            'files.*' => 'required|file|mimes:sql,txt|max:20480',
        ]);

        // Concatenate all uploaded SQL file contents
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

        // Quick sanity check — must contain cdb_users
        if (stripos($sqlContent, 'cdb_users') === false) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la tabla cdb_users en los archivos. Asegúrate de subir el dump correcto.',
            ], 422);
        }

        try {
            $importer = new \App\Services\DeprixaProImporter($sqlContent, Auth::user()->organization_id);
            $result   = $importer->import(false);
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

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $orgId = Auth::user()->organization_id;
        $countries = Country::where('is_active', true)
            ->where(function ($q) use ($orgId) {
                $q->whereNull('organization_id')->orWhere('organization_id', $orgId);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'iso2', 'phone_code']);
        return Inertia::render('Customers/Create', [
            'countries' => $countries,
        ]);
    }

    /**
     * API: Search customers for wizard autocomplete (JSON).
     * GET /api/customers/search?q=
     */
    public function searchApi(Request $request)
    {
        $q = $request->input('q', '');
        $orgId = Auth::user()->organization_id;

        $query = User::role('customer')
            ->where('organization_id', $orgId)
            ->where('is_active', true);

        if (strlen(trim($q)) >= 3) {
            $search = '%' . trim($q) . '%';
            $query->where(function ($qb) use ($search) {
                $qb->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search)
                    ->orWhere('phone', 'like', $search)
                    ->orWhere('document_id', 'like', $search);
            });
        }

        $customers = $query->orderBy('name')->limit(15)->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
                'address' => $user->address ?? '',
                'address_line2' => $user->address_line2 ?? '',
                'city' => $user->city ?? '',
                'country' => $user->country ?? '',
                'state' => \App\Models\State::find($user->state_id)?->name ?? '',
                'zip_code' => $user->zip_code ?? '',
                'country_id' => $user->country_id,
                'state_id' => $user->state_id,
                'city_id' => $user->city_id,
                'document_id' => $user->document_id ?? '',
                'sender_details' => $this->userToSenderDetails($user),
                'receiver_details' => $this->userToReceiverDetails($user),
            ];
        });

        return response()->json($customers);
    }

    /**
     * API: Quick create customer from wizard (JSON). Returns customer and payload for sender/receiver.
     * POST /api/customers/quick-create
     */
    public function quickCreateApi(Request $request)
    {
        $request->merge([
            'email' => strtolower(trim($request->email ?? '')),
            'phone' => trim($request->phone ?? ''),
        ]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'phone' => 'required|string|max:30',
            'address' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'zip_code' => 'nullable|string|max:20',
            'country_id' => 'required|integer|exists:countries,id',
            'state_id' => 'required|integer|exists:states,id',
            'city_id' => 'required|integer|exists:cities,id',
            'document_id' => 'nullable|string|max:50',
        ]);

        $orgId = Auth::user()->organization_id;

        if (User::where('email', $request->email)->where('organization_id', $orgId)->exists()) {
            return response()->json([
                'message' => __('The email has already been taken.'),
                'errors' => ['email' => __('The email has already been taken.')],
            ], 422);
        }

        $countryName = Country::find($request->country_id)?->name ?? $request->country;
        $stateName = State::find($request->state_id)?->name ?? '';
        $cityName = City::find($request->city_id)?->name ?? $request->city;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'address_line2' => $request->filled('address_line2') ? $request->address_line2 : null,
            'city' => $cityName,
            'country' => $countryName,
            'zip_code' => $request->filled('zip_code') ? $request->zip_code : null,
            'country_id' => (int) $request->country_id,
            'state_id' => (int) $request->state_id,
            'city_id' => (int) $request->city_id,
            'document_id' => $request->filled('document_id') ? $request->document_id : null,
            'password' => bcrypt($request->input('password', \Illuminate\Support\Str::random(16))),
            'organization_id' => $orgId,
        ]);

        $user->assignRole('customer');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'sender_details' => $this->userToSenderDetails($user),
            'receiver_details' => $this->userToReceiverDetails($user),
        ], 201);
    }

    /**
     * API: Partial update of customer from wizard (JSON).
     * PUT/PATCH /api/customers/{id}
     * Saves only provided fields (for filling missing data).
     */
    public function updateApi(Request $request, $id)
    {
        // Scope to organization BEFORE findOrFail to prevent user enumeration (IDOR).
        // Loading the user first and checking org afterwards exposes whether the ID exists globally.
        $user = User::where('organization_id', Auth::user()->organization_id)
            ->findOrFail($id);

        if (! $user->hasRole('customer')) {
            return response()->json(['message' => __('Invalid customer.')], 422);
        }

        $rules = [];
        if ($request->filled('name')) {
            $rules['name'] = 'string|max:255';
        }
        if ($request->filled('phone')) {
            $rules['phone'] = 'string|max:30';
        }
        if ($request->filled('address')) {
            $rules['address'] = 'string|max:255';
        }
        if ($request->filled('country_id') && $request->country_id) {
            $rules['country_id'] = 'integer|exists:countries,id';
        }
        if ($request->filled('state_id') && $request->state_id) {
            $rules['state_id'] = 'integer|exists:states,id';
        }
        if ($request->filled('city_id') && $request->city_id) {
            $rules['city_id'] = 'integer|exists:cities,id';
        }
        $request->validate($rules);

        $updates = [];
        if ($request->filled('name')) {
            $updates['name'] = $request->name;
        }
        if ($request->filled('phone')) {
            $updates['phone'] = trim($request->phone);
        }
        if ($request->filled('address')) {
            $updates['address'] = $request->address;
        }
        if ($request->filled('country_id') && $request->country_id) {
            $country = Country::find((int) $request->country_id);
            $updates['country_id'] = (int) $request->country_id;
            $updates['country'] = $country?->name ?? $request->country;
        }
        if ($request->filled('state_id') && $request->state_id) {
            $state = State::find((int) $request->state_id);
            $updates['state_id'] = (int) $request->state_id;
            $updates['state'] = $state?->name ?? ($request->state ?? '');
        }
        if ($request->filled('city_id') && $request->city_id) {
            $city = City::find((int) $request->city_id);
            $updates['city_id'] = (int) $request->city_id;
            $updates['city'] = $city?->name ?? ($request->city ?? '');
        }
        if ($request->filled('city') && ! isset($updates['city'])) {
            $updates['city'] = $request->city;
        }
        if ($request->filled('state') && ! isset($updates['state'])) {
            $updates['state'] = $request->state;
        }
        if ($request->filled('country') && ! isset($updates['country'])) {
            $updates['country'] = $request->country;
        }

        if (! empty($updates)) {
            $user->update($updates);
        }

        return response()->json([
            'id' => $user->id,
            'sender_details' => $this->userToSenderDetails($user->fresh()),
            'receiver_details' => $this->userToReceiverDetails($user->fresh()),
        ]);
    }

    private function userToSenderDetails(User $user): array
    {
        $country = $user->country_id ? Country::find($user->country_id) : null;
        return [
            'name' => $user->name,
            'phone' => $user->phone ?? '',
            'company' => '',
            'address' => $user->address ?? '',
            'address_line2' => $user->address_line2 ?? '',
            'city' => $user->city ?? '',
            'state' => State::find($user->state_id)?->name ?? '',
            'country' => $user->country ?? '',
            'country_code' => $country?->iso2 ?? '',
            'zip_code' => $user->zip_code ?? '',
            'email' => $user->email ?? '',
            'country_id' => $user->country_id,
            'state_id' => $user->state_id,
            'city_id' => $user->city_id,
            'tax_id' => $user->document_id ?? '',
        ];
    }

    private function userToReceiverDetails(User $user): array
    {
        $country = $user->country_id ? Country::find($user->country_id) : null;
        return [
            'name' => $user->name,
            'phone' => $user->phone ?? '',
            'company' => '',
            'address' => $user->address ?? '',
            'address_line2' => $user->address_line2 ?? '',
            'city' => $user->city ?? '',
            'state' => State::find($user->state_id)?->name ?? '',
            'country' => $user->country ?? '',
            'country_code' => $country?->iso2 ?? '',
            'zip_code' => $user->zip_code ?? '',
            'email' => $user->email ?? '',
            'country_id' => $user->country_id,
            'state_id' => $user->state_id,
            'city_id' => $user->city_id,
        ];
    }

    /**
     * API: states for a country (cascading location).
     */
    public function locationsStates(Request $request)
    {
        $request->validate(['country_id' => 'required|integer']);
        $orgId = Auth::user()->organization_id;
        $states = State::visibleToOrganization($orgId)
            ->where('country_id', $request->country_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);
        return response()->json($states);
    }

    /**
     * API: cities for a state (cascading location).
     */
    public function locationsCities(Request $request)
    {
        $request->validate(['state_id' => 'required|integer']);
        $orgId = Auth::user()->organization_id;
        $cities = City::visibleToOrganization($orgId)
            ->where('state_id', $request->state_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);
        return response()->json($cities);
    }

    /**
     * Store a newly created resource in storage.
     * Sends a portal invitation email so the customer can set their own password.
     */
    public function store(StoreCustomerRequest $request)
    {
        // Distributed verification point #6
        if (!app(\App\Services\LicenseVerificationService::class)->isActivated()) {
            return back()->with('error', 'Error creating record');
        }

        $orgId     = Auth::user()->organization_id;
        $invitedBy = Auth::user();

        // Email and phone uniqueness per org are enforced by StoreCustomerRequest.
        if ($request->filled('document_id') && User::where('organization_id', $orgId)->where('document_id', $request->document_id)->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'document_id' => [__('This document ID is already registered.')],
            ]);
        }

        $countryId      = (int) $request->country_id;
        $stateId        = (int) $request->state_id;
        $cityId         = (int) $request->city_id;
        $countryName    = Country::find($countryId)?->name;
        $cityName       = City::find($cityId)?->name;
        $hasPassword    = $request->filled('password');
        $token          = $hasPassword ? null : Str::random(64);

        try {
            $user = User::create([
                'name'                 => $request->name,
                'gender'               => $request->filled('gender') ? $request->gender : null,
                'document_type'        => $request->filled('document_type') ? $request->document_type : null,
                'document_id'          => $request->filled('document_id') ? $request->document_id : null,
                'date_of_birth'        => $request->filled('date_of_birth') ? $request->date_of_birth : null,
                'email'                => $request->email,
                'phone'                => $request->phone,
                'address'              => $request->address,
                'address_line2'        => $request->filled('address_line2') ? $request->address_line2 : null,
                'city'                 => $cityName,
                'country'              => $countryName,
                'zip_code'             => $request->filled('zip_code') ? $request->zip_code : null,
                'country_id'           => $countryId,
                'state_id'             => $stateId,
                'city_id'              => $cityId,
                'password'             => $hasPassword ? Hash::make($request->password) : Hash::make(Str::random(40)),
                'organization_id'      => $orgId,
                'is_active'            => $hasPassword,   // active immediately if password given
                'must_change_password' => false,
                'invitation_token'     => $token,
                'invitation_sent_at'   => $hasPassword ? null : now(),
            ]);

            $user->assignRole('customer');

            // Auto-create a locker for this customer using org-configured code format
            $lockerCode = app(\App\Services\LockerCodeService::class)->generate($orgId);
            \App\Models\Locker::create([
                'organization_id' => $orgId,
                'customer_id'     => $user->id,
                'code'            => $lockerCode,
                'status'          => 'active',
                'assigned_at'     => now(),
            ]);

            $user->load(['organization', 'roles']);

            // If admin set a password → customer can log in immediately, no invitation needed
            if ($hasPassword) {
                return redirect()->route('customers.show', $user->id)
                    ->with('success', __('Customer created successfully. They can log in immediately.'));
            }

            $invitationUrl = url(route('invitation.show', ['token' => $token], false));
            $emailSent     = false;
            try {
                Mail::to($user->email)->send(new UserInvitationMail($user, $token, $invitedBy));
                $emailSent = true;
            } catch (\Throwable $e) {
                report($e);
            }

            $flashData = ['success' => __('invitation.sent', ['email' => $user->email])];
            if (! $emailSent) {
                $flashData['invitation_url'] = $invitationUrl;
                $flashData['warning']        = __('invitation.email_failed_expose_link');
            }

            return redirect()->route('customers.show', $user->id)->with($flashData);

        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error creating customer: ' . $e->getMessage());
            throw \Illuminate\Validation\ValidationException::withMessages([
                'error' => [__('An error occurred while creating the customer.')],
            ]);
        }
    }

    /**
     * Regenerate invitation token and resend portal access email to the customer.
     * POST /customers/{customer}/resend-invitation
     */
    public function resendPortalInvitation(User $customer): RedirectResponse
    {
        if ($customer->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        if ($customer->invitation_accepted_at !== null) {
            return back()->with('error', __('invitation.already_accepted'));
        }

        $token = Str::random(64);
        $customer->update([
            'invitation_token'   => $token,
            'invitation_sent_at' => now(),
        ]);

        $customer->load(['organization', 'roles']);
        $invitationUrl = url(route('invitation.show', ['token' => $token], false));
        $emailSent     = false;
        try {
            Mail::to($customer->email)->send(new UserInvitationMail($customer, $token, Auth::user()));
            $emailSent = true;
        } catch (\Throwable $e) {
            report($e);
        }

        $flashData = ['success' => __('invitation.resent', ['email' => $customer->email])];
        if (! $emailSent) {
            $flashData['invitation_url'] = $invitationUrl;
            $flashData['warning']        = __('invitation.email_failed_expose_link');
        }

        return back()->with($flashData);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $customer, Request $request)
    {
        // Ensure same org
        if ($customer->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $orgId   = Auth::user()->organization_id;
        $perPage = 10;

        $sentQuery     = Shipment::where('organization_id', $orgId)->where('sender_name_search', $customer->name);
        $receivedQuery = Shipment::where('organization_id', $orgId)->where('receiver_name_search', $customer->name);

        $activeStatuses = [
            \App\Enums\ShipmentStatus::PENDING->value,
            \App\Enums\ShipmentStatus::PROCESSED->value,
            \App\Enums\ShipmentStatus::PICKED_UP->value,
            \App\Enums\ShipmentStatus::IN_TRANSIT->value,
            \App\Enums\ShipmentStatus::OUT_FOR_DELIVERY->value,
        ];

        $stats = [
            'sent_count'          => (clone $sentQuery)->count(),
            'received_count'      => (clone $receivedQuery)->count(),
            'active_shipments'    => (clone $sentQuery)->whereIn('status', $activeStatuses)->count(),
            'completed_shipments' => (clone $sentQuery)->where('status', \App\Enums\ShipmentStatus::DELIVERED->value)->count(),
            'total_spend'         => (clone $sentQuery)->sum('total'),
        ];

        // Paginated shipments (sent + received via single query with OR)
        $shipmentsPage = (int) $request->get('shipments_page', 1);
        $shipmentsPaginator = Shipment::where('organization_id', $orgId)
            ->where(function ($q) use ($customer) {
                $q->where('sender_name_search', $customer->name)
                  ->orWhere('receiver_name_search', $customer->name);
            })
            ->latest()
            ->paginate($perPage, ['*'], 'shipments_page', $shipmentsPage)
            ->withQueryString();

        $shipmentsData = $shipmentsPaginator->through(function ($s) use ($customer) {
            return [
                'id'              => $s->id,
                'tracking_number' => $s->tracking_number,
                'status'          => is_object($s->status) ? $s->status->value : (string) $s->status,
                'date'            => $s->created_at->format('d/m/Y'),
                'total'           => $s->total,
                'currency'        => $s->currency ?? 'USD',
                'role'            => $s->sender_name_search === $customer->name ? 'sender' : 'receiver',
            ];
        });

        // Paginated contracts
        $contractsPage = (int) $request->get('contracts_page', 1);
        $contractsPaginator = Contract::where('organization_id', $orgId)
            ->where('customer_id', $customer->id)
            ->latest()
            ->paginate($perPage, ['id', 'contract_number', 'title', 'status', 'start_date', 'end_date', 'signed_at'], 'contracts_page', $contractsPage)
            ->withQueryString();

        $contractsData = $contractsPaginator->through(fn($c) => [
            'id'              => $c->id,
            'contract_number' => $c->contract_number,
            'title'           => $c->title,
            'status'          => $c->status,
            'start_date'      => $c->start_date?->format('d/m/Y'),
            'end_date'        => $c->end_date?->format('d/m/Y'),
            'signed_at'       => $c->signed_at?->format('d/m/Y'),
        ]);

        // Paginated pickups
        $pickupsPage = (int) $request->get('pickups_page', 1);
        $customerShipmentIds = Shipment::where('organization_id', $orgId)
            ->where('sender_name_search', $customer->name)
            ->pluck('id');

        $pickupsPaginator = OriginPickup::whereIn('shipment_id', $customerShipmentIds)
            ->with('shipment:id,tracking_number')
            ->latest()
            ->paginate($perPage, ['*'], 'pickups_page', $pickupsPage)
            ->withQueryString();

        $pickupsData = $pickupsPaginator->through(fn($p) => [
            'id'              => $p->id,
            'tracking_number' => $p->shipment?->tracking_number ?? '—',
            'status'          => $p->status,
            'scheduled_for'   => $p->scheduled_for?->format('d/m/Y H:i'),
            'contact_name'    => $p->contact_name,
            'pickup_address'  => $p->pickup_address,
        ]);

        // Load customer's locker
        $locker = \App\Models\Locker::where('organization_id', $orgId)
            ->where('customer_id', $customer->id)
            ->first(['id', 'code', 'status', 'address', 'assigned_at']);

        return Inertia::render('Customers/Show', [
            'customer'         => array_merge($customer->toArray(), [
                'invitation_accepted_at' => $customer->invitation_accepted_at?->toIso8601String(),
                'invitation_token'       => $customer->invitation_token ? '••••' : null, // existence only
            ]),
            'locker'           => $locker,
            'stats'            => $stats,
            'recent_shipments' => $shipmentsData,
            'contracts'        => $contractsData,
            'pickups'          => $pickupsData,
            'active_tab'       => $request->get('tab', 'shipments'),
        ]);
    }
    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $customer)
    {
        if ($customer->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $orgId = Auth::user()->organization_id;
        $countries = Country::where('is_active', true)
            ->where(function ($q) use ($orgId) {
                $q->whereNull('organization_id')->orWhere('organization_id', $orgId);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'iso2', 'phone_code']);

        return Inertia::render('Customers/Edit', [
            'customer' => $customer,
            'countries' => $countries,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCustomerRequest $request, User $customer)
    {
        if ($customer->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $orgId = Auth::user()->organization_id;

        // document_id uniqueness (conditional — not in Form Request due to conditionality).
        if ($request->filled('document_id') && User::where('organization_id', $orgId)->where('document_id', $request->document_id)->where('id', '!=', $customer->id)->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'document_id' => [__('This document ID is already registered.')],
            ]);
        }

        $dateOfBirth = $request->filled('date_of_birth') ? $request->date_of_birth : null;
        $countryId = (int) $request->country_id;
        $stateId = (int) $request->state_id;
        $cityId = (int) $request->city_id;
        $countryName = Country::find($countryId)?->name;
        $stateName = State::find($stateId)?->name;
        $cityName = City::find($cityId)?->name;

        $updateData = [
            'name' => $request->name,
            'gender' => $request->filled('gender') ? $request->gender : null,
            'document_type' => $request->filled('document_type') ? $request->document_type : null,
            'document_id' => $request->filled('document_id') ? $request->document_id : null,
            'date_of_birth' => $dateOfBirth,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'address_line2' => $request->filled('address_line2') ? $request->address_line2 : null,
            'city' => $cityName,
            'country' => $countryName,
            'zip_code' => $request->filled('zip_code') ? $request->zip_code : null,
            'country_id' => $countryId,
            'state_id' => $stateId,
            'city_id' => $cityId,
        ];

        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->password);
            $updateData['must_change_password'] = false;
        }

        $customer->update($updateData);

        return redirect()->route('customers.index')->with('success', __('Customer updated successfully.'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function bulkDestroy(Request $request): \Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1|max:200',
            'ids.*' => 'required|integer',
        ]);

        $orgId = Auth::user()->organization_id;

        $customers = User::role('customer')
            ->whereIn('id', $request->ids)
            ->where('organization_id', $orgId)
            ->get();

        $blocked = $customers->filter(function ($customer) use ($orgId) {
            return Shipment::where('organization_id', $orgId)
                ->where(function ($q) use ($customer) {
                    $q->where('sender_name_search', $customer->name)
                      ->orWhere('receiver_name_search', $customer->name);
                })
                ->exists();
        });

        if ($blocked->isNotEmpty()) {
            return redirect()->back()->with(
                'error',
                __('customers.bulk_delete_blocked', ['count' => $blocked->count()])
            );
        }

        $deleted = 0;
        foreach ($customers as $customer) {
            $customer->delete();
            $deleted++;
        }

        return redirect()->route('customers.index')->with(
            'success',
            "{$deleted} cliente(s) eliminado(s) correctamente."
        );
    }

    public function destroy(User $customer)
    {
        if ($customer->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        // Check for active shipments
        $activeShipmentsCount = Shipment::where('organization_id', Auth::user()->organization_id)
            ->where(function ($q) use ($customer) {
                $q->where('sender_name_search', $customer->name)
                    ->orWhere('receiver_name_search', $customer->name);
            })
            ->whereIn('status', [
                \App\Enums\ShipmentStatus::PENDING,
                \App\Enums\ShipmentStatus::IN_TRANSIT,
                \App\Enums\ShipmentStatus::OUT_FOR_DELIVERY
            ])
            ->count();

        if ($activeShipmentsCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete customer with active shipments.');
        }

        $customer->delete();

        return redirect()->route('customers.index')->with('success', 'Customer deleted successfully.');
    }
}
