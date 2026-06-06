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

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditService;

class RolesController extends Controller
{
    protected $audit;

    public function __construct(AuditService $audit)
    {
        $this->audit = $audit;
    }

    /** Derive display group from permission name (no group_name column needed). */
    protected static function permissionGroup(string $name): string
    {
        if ($name === 'view dashboard' || str_starts_with($name, 'dashboard.')) {
            return 'Dashboard';
        }
        if (str_starts_with($name, 'manage ') || in_array($name, ['create shipments', 'edit shipments', 'delete shipments', 'change status shipments', 'shipments.import'])) {
            return 'Shipments';
        }
        if (str_starts_with($name, 'dispatch.')) {
            return 'Dispatch';
        }
        if (str_starts_with($name, 'tracking.')) {
            return 'Tracking';
        }
        if (str_starts_with($name, 'customers.')) {
            return 'Customers';
        }
        if (str_starts_with($name, 'pickups.')) {
            return 'Pickups';
        }
        if (str_starts_with($name, 'pre-alerts.')) {
            return 'Pre-Alerts';
        }
        if (str_starts_with($name, 'lockers.')) {
            return 'Lockers';
        }
        if (str_starts_with($name, 'commissions.')) {
            return 'Commissions';
        }
        if (str_starts_with($name, 'contracts.')) {
            return 'Contracts';
        }
        if (str_starts_with($name, 'locations.')) {
            return 'Locations';
        }
        if (str_starts_with($name, 'returns.')) {
            return 'Returns';
        }
        if (str_starts_with($name, 'cod.')) {
            return 'COD';
        }
        if (str_starts_with($name, 'pod.')) {
            return 'POD';
        }
        if (str_starts_with($name, 'customs.')) {
            return 'Customs';
        }
        if (str_starts_with($name, 'warehouse.')) {
            return 'Warehouse';
        }
        if (str_starts_with($name, 'finance.') || str_starts_with($name, 'reports.')) {
            return 'Finance & Reports';
        }
        if (str_starts_with($name, 'settings.')) {
            $parts = explode('.', $name);
            $segment = $parts[1] ?? 'general';
            $labels = [
                'company'         => 'Company',
                'branding'        => 'Branding',
                'locale'          => 'Locale',
                'users'           => 'Users',
                'roles'           => 'Roles',
                'security'        => 'Security',
                'tracking'        => 'Tracking & Guides',
                'pricing'         => 'Pricing',
                'billing'         => 'Billing',
                'notifications'   => 'Notifications',
                'audit'           => 'Audit',
                'maintenance'     => 'Maintenance',
                'branches'        => 'Branches',
                'shipping-config' => 'Shipping Config',
                'api'               => 'API',
                'integrations'      => 'Integrations',
                'hs-codes'          => 'HS Codes',
                'departments'       => 'Departments',
                'shipment-statuses' => 'Shipment Statuses',
                'services'          => 'Services',
                'updates'           => 'Updates',
            ];
            return 'Settings - ' . ($labels[$segment] ?? ucfirst($segment));
        }
        return 'General';
    }

    public function index()
    {
        $isSuperAdmin = Auth::user()->hasRole('super-admin');

        // Org admins cannot see or manage the super-admin role
        $roles = Role::with('permissions')
            ->when(!$isSuperAdmin, fn($q) => $q->where('name', '!=', 'super-admin'))
            ->get();
        $allPermissions = Permission::orderBy('name')->get();

        // Group by derived group name (no DB column) and keep consistent order
        $groupOrder = [
            // Main modules
            'Dashboard', 'Shipments', 'Tracking',
            'Dispatch', 'Warehouse', 'Pickups', 'Pre-Alerts', 'Lockers',
            'Customers', 'Contracts', 'Locations',
            'Commissions', 'Returns', 'COD', 'POD', 'Customs',
            'Finance & Reports',
            // Settings modules
            'Settings - Company', 'Settings - Branding', 'Settings - Locale',
            'Settings - Users', 'Settings - Roles', 'Settings - Security',
            'Settings - Branches', 'Settings - Departments',
            'Settings - Shipment Statuses', 'Settings - Services',
            'Settings - Tracking & Guides', 'Settings - Pricing', 'Settings - Billing',
            'Settings - Shipping Config', 'Settings - Notifications',
            'Settings - Integrations', 'Settings - HS Codes',
            'Settings - Audit', 'Settings - Maintenance', 'Settings - Updates',
            'General',
        ];
        $permissions = $allPermissions->groupBy(fn ($p) => self::permissionGroup($p->name));
        $ordered = collect();
        foreach ($groupOrder as $group) {
            if ($permissions->has($group)) {
                $ordered[$group] = $permissions->get($group)->values()->all();
            }
        }
        foreach ($permissions->keys() as $group) {
            if (!isset($ordered[$group])) {
                $ordered[$group] = $permissions->get($group)->values()->all();
            }
        }

        return Inertia::render('Settings/Roles', [
            'roles' => $roles,
            'permissions' => $ordered->all(),
            'totalPermissions' => $allPermissions->count(),
        ]);
    }

    // Method to update permissions for a role (Matrix save)
    public function update(Request $request, Role $role)
    {
        $isSuperAdmin = Auth::user()->hasRole('super-admin');

        // Org admins cannot modify the super-admin role
        if ($role->name === 'super-admin' && !$isSuperAdmin) {
            abort(403, 'Only super-admins can modify the super-admin role.');
        }

        // Org admins cannot modify the admin role (prevents self-demotion / lockout)
        if ($role->name === 'admin' && !$isSuperAdmin) {
            abort(403, 'Only super-admins can modify the admin role.');
        }

        $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        $oldPermissions = $role->permissions->pluck('name')->toArray();

        $role->syncPermissions($request->permissions);

        $this->audit?->log(
            'updated',
            'roles',
            "Permissions for {$role->name}",
            ['permissions' => $oldPermissions],
            ['permissions' => $request->permissions],
            $role->id
        );

        return response()->json(['success' => true, 'message' => 'Role permissions updated.']);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'guard_name' => 'required|string|in:web,api'
        ]);

        $role = Role::create(['name' => $request->name, 'guard_name' => $request->guard_name]);

        $this->audit?->log('created', 'roles', $role->name, null, $role->toArray(), $role->id);

        return response()->json(['success' => true, 'message' => 'Role created.']);
    }

    public function destroy(Role $role)
    {
        $nameNormalized = strtolower(str_replace(' ', '-', trim($role->name)));
        if ($nameNormalized === 'super-admin') {
            return response()->json(['error' => 'Cannot delete system role.'], 422);
        }

        $oldData = $role->toArray();
        $role->delete();

        $this->audit?->log('deleted', 'roles', $role->name, $oldData, null, $role->id);

        return response()->json(['success' => true, 'message' => 'Role deleted.']);
    }
}
