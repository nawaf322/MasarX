<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Services\OrganizationOnboardingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class OrganizationManagementController extends Controller
{
    public function index(Request $request)
    {
        $query = Organization::withCount('users')
            ->withCount('shipments')
            ->withTrashed();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'active') {
                $query->where('is_active', true)->whereNull('deleted_at');
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false)->whereNull('deleted_at');
            }
        }

        $organizations = $query->latest()->paginate(10)->withQueryString();

        $stats = [
            'total'             => Organization::withTrashed()->count(),
            'active'            => Organization::where('is_active', true)->count(),
            'inactive'          => Organization::where('is_active', false)->count(),
            'created_this_month'=> Organization::whereMonth('created_at', Carbon::now()->month)
                                    ->whereYear('created_at', Carbon::now()->year)->count(),
        ];

        return Inertia::render('Admin/Organizations/Index', [
            'organizations' => $organizations,
            'stats'         => $stats,
            'filters'       => $request->only(['search', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Organizations/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|max:255',
            'phone'          => 'nullable|string|max:50',
            'address'        => 'nullable|string|max:500',
            'admin_name'     => 'required|string|max:255',
            'admin_email'    => 'required|email|max:255|unique:users,email',
            'admin_password' => 'required|string|min:8',
        ]);

        DB::transaction(function () use ($validated) {
            // Generate unique slug
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $i = 1;
            while (Organization::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $i++;
            }

            $org = Organization::create([
                'name'      => $validated['name'],
                'slug'      => $slug,
                'email'     => $validated['email'],
                'phone'     => $validated['phone'] ?? null,
                'address'   => $validated['address'] ?? null,
                'is_active' => true,
                'settings'  => [],
            ]);

            app(OrganizationOnboardingService::class)->provision($org, [
                'name'     => $validated['admin_name'],
                'email'    => $validated['admin_email'],
                'password' => $validated['admin_password'],
            ]);
        });

        return redirect()->route('admin.organizations.index')
            ->with('success', 'organizations.provision_success');
    }

    public function show(Request $request, Organization $organization)
    {
        $orgId = $organization->id;

        // Users paginated independently — scales to 100k+ users
        $userPage   = max(1, (int) $request->get('user_page', 1));
        $userSearch = (string) $request->get('user_search', '');
        $perPage    = 15;

        $usersQuery = $organization->users()
            ->with('roles:id,name')
            ->orderBy('name');

        if ($userSearch !== '') {
            $usersQuery->where(function ($q) use ($userSearch) {
                $q->where('name', 'like', "%{$userSearch}%")
                  ->orWhere('email', 'like', "%{$userSearch}%");
            });
        }

        $usersTotal      = $usersQuery->count();
        $usersLastPage   = max(1, (int) ceil($usersTotal / $perPage));
        $userPage        = min($userPage, $usersLastPage);
        $users           = $usersQuery->skip(($userPage - 1) * $perPage)->take($perPage)->get(['id','name','email','is_active']);

        $stats = [
            'users_active'    => $organization->users()->where('is_active', true)->count(),
            'users_total'     => $usersTotal,
            'shipments_total' => \App\Models\Shipment::withoutGlobalScope('tenant')
                                    ->where('organization_id', $orgId)->count(),
            'shipments_month' => \App\Models\Shipment::withoutGlobalScope('tenant')
                                    ->where('organization_id', $orgId)
                                    ->whereMonth('created_at', Carbon::now()->month)
                                    ->whereYear('created_at', Carbon::now()->year)->count(),
            'revenue_month'   => (float) \App\Models\Shipment::withoutGlobalScope('tenant')
                                    ->where('organization_id', $orgId)
                                    ->whereMonth('created_at', Carbon::now()->month)
                                    ->whereYear('created_at', Carbon::now()->year)
                                    ->sum('total'),
        ];

        $settings = \App\Models\OrganizationSetting::withoutGlobalScope('tenant')
            ->where('organization_id', $orgId)
            ->get(['group', 'key', 'value'])
            ->groupBy('group')
            ->map(fn ($g) => $g->pluck('value', 'key'));

        $activeSubscription = $organization->activeSaasSubscription()?->load('plan');
        $wallet             = \App\Models\SaasWallet::where('organization_id', $orgId)->first();

        return Inertia::render('Admin/Organizations/Show', [
            'organization'        => $organization,
            'users'               => [
                'data'         => $users,
                'current_page' => $userPage,
                'last_page'    => $usersLastPage,
                'total'        => $usersTotal,
                'per_page'     => $perPage,
                'search'       => $userSearch,
            ],
            'stats'               => $stats,
            'settings'            => $settings,
            'active_subscription' => $activeSubscription,
            'wallet'              => $wallet,
        ]);
    }

    public function edit(Organization $organization)
    {
        return Inertia::render('Admin/Organizations/Edit', [
            'organization' => $organization,
        ]);
    }

    public function update(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'nullable|email|max:255',
            'phone'   => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'city'    => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
        ]);

        $organization->update($validated);

        return redirect()->route('admin.organizations.show', $organization)
            ->with('success', 'common.saved');
    }

    public function toggleStatus(Organization $organization)
    {
        $organization->update(['is_active' => !$organization->is_active]);

        $msgKey = $organization->is_active ? 'organizations.activated' : 'organizations.deactivated';
        return back()->with('success', $msgKey);
    }

    public function impersonate(Request $request, Organization $organization)
    {
        // Store original org_id in session and switch to impersonated org
        $request->session()->put('impersonating_org_id', $organization->id);
        $request->session()->put('impersonating_org_name', $organization->name);

        return redirect()->route('dashboard')
            ->with('success', 'organizations.impersonating');
    }

    public function stopImpersonating(Request $request)
    {
        $request->session()->forget(['impersonating_org_id', 'impersonating_org_name']);

        return redirect()->route('admin.organizations.index')
            ->with('success', 'common.saved');
    }
}
