<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\RateCard;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ContractController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $query = Contract::with(['customer', 'rateCard'])
            ->where('organization_id', $orgId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('contract_number', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%")
                  ->orWhereHas('customer', fn($q2) => $q2->where('name', 'like', "%{$s}%"));
            });
        }

        $perPage = (int) $request->get('per_page', 15);
        $contracts = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        $rateCards = RateCard::where('organization_id', $orgId)->where('active', true)->get(['id', 'name']);
        $customers = User::where('organization_id', $orgId)->role('customer')->get(['id', 'name', 'email']);

        $kpi = [
            'total'     => Contract::where('organization_id', $orgId)->count(),
            'active'    => Contract::where('organization_id', $orgId)->where('status', 'active')->count(),
            'draft'     => Contract::where('organization_id', $orgId)->where('status', 'draft')->count(),
            'expired'   => Contract::where('organization_id', $orgId)->where('status', 'expired')->count(),
            'cancelled' => Contract::where('organization_id', $orgId)->where('status', 'cancelled')->count(),
            'signed'    => Contract::where('organization_id', $orgId)->whereNotNull('signed_at')->count(),
        ];

        return Inertia::render('Contracts/Index', [
            'contracts' => $contracts,
            'rateCards' => $rateCards,
            'customers' => $customers,
            'filters'   => $request->only(['status', 'search']),
            'kpi'       => $kpi,
        ]);
    }

    public function create(): Response
    {
        $orgId = Auth::user()->organization_id;
        $rateCards = RateCard::where('organization_id', $orgId)->where('active', true)->get(['id', 'name']);
        $customers = User::where('organization_id', $orgId)->role('customer')->get(['id', 'name', 'email']);

        return Inertia::render('Contracts/Create', compact('rateCards', 'customers'));
    }

    public function store(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'customer_id'  => 'required|integer|exists:users,id',
            'rate_card_id' => 'nullable|integer|exists:rate_cards,id',
            'title'        => 'required|string|max:255',
            'terms'        => 'nullable|string',
            'start_date'   => 'required|date',
            'end_date'     => 'nullable|date|after_or_equal:start_date',
            'status'       => 'in:draft,active,cancelled',
            'files'        => 'nullable|array|max:10',
            'files.*'      => 'file|mimes:pdf|max:10240',
        ]);

        $filePaths = [];
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $filePaths[] = $file->store("contracts/{$orgId}", 'public');
            }
        }

        // Generate sequential contract number
        $count = Contract::where('organization_id', $orgId)->count() + 1;
        $contractNumber = 'CON-' . str_pad($count, 5, '0', STR_PAD_LEFT);

        Contract::create([
            'organization_id' => $orgId,
            'customer_id'     => $validated['customer_id'],
            'rate_card_id'    => $validated['rate_card_id'] ?? null,
            'contract_number' => $contractNumber,
            'title'           => $validated['title'],
            'terms'           => $validated['terms'] ?? null,
            'start_date'      => $validated['start_date'],
            'end_date'        => $validated['end_date'] ?? null,
            'status'          => $validated['status'] ?? 'draft',
            'file_path'       => $filePaths[0] ?? null,
            'file_paths'      => $filePaths ?: null,
        ]);

        return redirect()->route('contracts.index')
            ->with('success', __('contracts.created'));
    }

    public function show(Contract $contract): Response
    {
        abort_if($contract->organization_id !== Auth::user()->organization_id, 403);
        $contract->load(['customer', 'rateCard', 'signedBy']);

        return Inertia::render('Contracts/Show', compact('contract'));
    }

    public function printView(Contract $contract): Response
    {
        abort_if($contract->organization_id !== Auth::user()->organization_id, 403);
        $contract->load(['customer', 'rateCard', 'signedBy']);

        $org = Auth::user()->organization;
        $orgData = [
            'name'       => $org->name,
            'legal_name' => $org->legal_name ?? $org->name,
            'phone'      => $org->phone ?? '',
            'email'      => $org->email ?? '',
            'address'    => $org->address ?? '',
            'logo_url'   => $org->logo_url ? Storage::url($org->logo_url) : null,
        ];

        return Inertia::render('Contracts/Print', [
            'contract' => $contract,
            'org'      => $orgData,
        ]);
    }

    public function edit(Contract $contract): Response
    {
        abort_if($contract->organization_id !== Auth::user()->organization_id, 403);
        $orgId = Auth::user()->organization_id;
        $rateCards = RateCard::where('organization_id', $orgId)->where('active', true)->get(['id', 'name']);
        $customers = User::where('organization_id', $orgId)->role('customer')->get(['id', 'name', 'email']);

        return Inertia::render('Contracts/Edit', compact('contract', 'rateCards', 'customers'));
    }

    public function update(Request $request, Contract $contract): RedirectResponse
    {
        abort_if($contract->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'customer_id'  => 'required|integer|exists:users,id',
            'rate_card_id' => 'nullable|integer|exists:rate_cards,id',
            'title'        => 'required|string|max:255',
            'terms'        => 'nullable|string',
            'start_date'   => 'required|date',
            'end_date'     => 'nullable|date|after_or_equal:start_date',
            'status'       => 'in:draft,active,expired,cancelled',
            'files'        => 'nullable|array|max:10',
            'files.*'      => 'file|mimes:pdf|max:10240',
            'remove_files' => 'nullable|array',
            'remove_files.*' => 'string',
        ]);

        $existingPaths = $contract->file_paths ?? ($contract->file_path ? [$contract->file_path] : []);

        // Remove files the user deleted
        $toRemove = $request->input('remove_files', []);
        foreach ($toRemove as $path) {
            Storage::disk('public')->delete($path);
            $existingPaths = array_values(array_filter($existingPaths, fn($p) => $p !== $path));
        }

        // Append new uploads
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $existingPaths[] = $file->store("contracts/{$contract->organization_id}", 'public');
            }
        }

        $contract->update(array_merge(
            collect($validated)->except(['file', 'files', 'remove_files'])->toArray(),
            [
                'file_paths' => $existingPaths ?: null,
                'file_path'  => $existingPaths[0] ?? null,
            ]
        ));

        return redirect()->route('contracts.show', $contract)
            ->with('success', __('contracts.updated'));
    }

    public function sign(Request $request, Contract $contract): RedirectResponse
    {
        abort_if($contract->organization_id !== Auth::user()->organization_id, 403);
        abort_if($contract->status === 'cancelled', 422, 'Cannot sign a cancelled contract.');

        $request->validate([
            'signature' => 'required|string',
        ]);

        $orgId = Auth::user()->organization_id;

        // Decode base64 PNG and store as file
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $request->input('signature')));
        $filename  = "signatures/{$orgId}/contract-{$contract->id}-" . time() . ".png";
        Storage::disk('public')->put($filename, $imageData);

        $contract->update([
            'status'         => 'active',
            'signed_at'      => now(),
            'signed_by'      => Auth::id(),
            'signature_path' => $filename,
        ]);

        return redirect()->route('contracts.show', $contract)
            ->with('success', __('contracts.signed'));
    }

    public function destroy(Contract $contract): RedirectResponse
    {
        abort_if($contract->organization_id !== Auth::user()->organization_id, 403);

        foreach ($contract->file_paths ?? ($contract->file_path ? [$contract->file_path] : []) as $path) {
            Storage::disk('public')->delete($path);
        }

        $contract->delete();

        return redirect()->route('contracts.index')
            ->with('success', __('contracts.deleted'));
    }
}
