<?php

namespace App\Http\Controllers;

use App\Models\Locker;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\LockerCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class LockerController extends Controller
{
    public function __construct(protected LockerCodeService $lockerCode) {}
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $query = Locker::with(['customer', 'warehouse'])
            ->withCount('preAlerts')
            ->where('organization_id', $orgId);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->get('per_page', 15);
        $lockers = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        $summary = [
            'total'     => Locker::where('organization_id', $orgId)->count(),
            'active'    => Locker::where('organization_id', $orgId)->where('status', 'active')->count(),
            'inactive'  => Locker::where('organization_id', $orgId)->where('status', 'inactive')->count(),
            'suspended' => Locker::where('organization_id', $orgId)->where('status', 'suspended')->count(),
            'unassigned'=> Locker::where('organization_id', $orgId)->whereNull('customer_id')->count(),
        ];

        return Inertia::render('Lockers/Index', [
            'lockers'  => $lockers,
            'filters'  => $request->only(['search', 'status']),
            'summary'  => $summary,
        ]);
    }

    public function create(): Response
    {
        $orgId = Auth::user()->organization_id;

        $customers  = User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->whereHas('roles', fn($q) => $q->where('name', 'Customer'))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        $warehouses = Warehouse::where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'code']);

        return Inertia::render('Lockers/Create', [
            'customers'        => $customers,
            'warehouses'       => $warehouses,
            'suggestedCode'    => $this->lockerCode->generate($orgId),
            'lockerSettings'   => $this->lockerCode->getSettings($orgId),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'code'         => 'required|string|max:50',
            'customer_id'  => 'nullable|integer|exists:users,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'address'      => 'nullable|string|max:1000',
            'status'       => 'required|in:active,inactive,suspended',
            'expires_at'   => 'nullable|date',
            'notes'        => 'nullable|string|max:1000',
        ]);

        // Unique per org
        $exists = Locker::where('organization_id', $orgId)->where('code', $validated['code'])->exists();
        if ($exists) {
            return back()->withErrors(['code' => __('lockers.code_taken')])->withInput();
        }

        $locker = Locker::create(array_merge($validated, [
            'organization_id' => $orgId,
            'assigned_at'     => $validated['customer_id'] ? now() : null,
        ]));

        return redirect()->route('lockers.show', $locker)->with('success', __('lockers.created'));
    }

    public function show(Locker $locker): Response
    {
        abort_if($locker->organization_id !== Auth::user()->organization_id, 403);

        $orgId = Auth::user()->organization_id;

        $locker->load(['customer', 'warehouse']);
        $locker->loadCount('preAlerts');
        $locker->setRelation('pre_alerts', $locker->preAlerts()
            ->with('customer')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get());

        $customers = User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->whereHas('roles', fn($q) => $q->where('name', 'Customer'))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        $warehouses = Warehouse::where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'code']);

        return Inertia::render('Lockers/Show', [
            'locker'     => $locker,
            'customers'  => $customers,
            'warehouses' => $warehouses,
        ]);
    }

    public function update(Request $request, Locker $locker): RedirectResponse
    {
        abort_if($locker->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            // code is intentionally NOT editable after creation
            'customer_id'  => 'nullable|integer|exists:users,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'address'      => 'nullable|string|max:1000',
            'status'       => 'required|in:active,inactive,suspended',
            'expires_at'   => 'nullable|date',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $wasUnassigned = $locker->customer_id === null;
        $locker->update(array_merge($validated, [
            'assigned_at' => ($wasUnassigned && $validated['customer_id']) ? now() : $locker->assigned_at,
        ]));

        return redirect()->route('lockers.show', $locker)->with('success', __('lockers.updated'));
    }

    public function destroy(Locker $locker): RedirectResponse
    {
        abort_if($locker->organization_id !== Auth::user()->organization_id, 403);
        abort_if($locker->preAlerts()->exists(), 422, __('lockers.has_pre_alerts'));

        $locker->delete();

        return redirect()->route('lockers.index')->with('success', __('lockers.deleted'));
    }
}
