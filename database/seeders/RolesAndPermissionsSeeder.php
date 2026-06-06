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

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        $permissions = [
            'view dashboard',
            'dashboard.kpi.view',
            'dashboard.revenue.view',
            'dashboard.analytics.view',
            'dashboard.map.view',
            'dashboard.activity.view',
            'manage shipments',
            'create shipments',
            'edit shipments',
            'delete shipments',
            'change status shipments',

            // Dispatch & Operations Permissions
            'dispatch.view',
            'dispatch.create',
            'dispatch.update',
            'dispatch.delete',
            'tracking.view', // Basic tracking

            // Settings: Foundation
            'settings.company.view',
            'settings.company.update',
            'settings.branding.view',
            'settings.branding.update',
            'settings.locale.view',
            'settings.locale.update',

            // Settings: Access Control
            'settings.users.list',
            'settings.users.create',
            'settings.users.update',
            'settings.users.delete',
            'settings.roles.list',
            'settings.roles.manage',
            'settings.security.view',
            'settings.security.update',
            'settings.branches.view',
            'settings.branches.store',
            'settings.branches.update',
            'settings.branches.destroy',
            'settings.departments.view',
            'settings.departments.store',
            'settings.departments.update',
            'settings.departments.destroy',

            // Settings: Business Logic
            'settings.tracking.view',
            'settings.tracking.update',
            'settings.pricing.view',
            'settings.pricing.update',
            'settings.billing.view',
            'settings.billing.update',
            'settings.shipping-config.view',
            'settings.shipping-config.update',

            // Settings: System
            'settings.integrations.view',
            'settings.integrations.update',
            'settings.notifications.view',
            'settings.notifications.update',
            'settings.audit.view',
            'settings.maintenance.view',
            'settings.maintenance.manage',

            // Warehouse module
            'warehouse.access',

            // Dispatch module
            'dispatch.access',

            // Customers module
            'customers.access',
            'customers.create',
            'customers.delete',

            // Reports
            'reports.financial.view',

            // Finance dashboard
            'finance.view',

            // Pricing control
            'manage pricing',

            // Proof of Delivery
            'pod.view',
            'pod.create',

            // Customs / International
            'customs.view',
            'customs.manage',

            // HS Codes Settings
            'settings.hs-codes.view',
            'settings.hs-codes.manage',

            // Bulk Import
            'shipments.import',

            // Returns / Devolutions
            'returns.view',
            'returns.create',
            'returns.update',

            // COD — Cash on Delivery
            'cod.view',
            'cod.collect',
            'cod.remit',

            // Pickups (Origin Pickups / Recolección)
            'pickups.view',
            'pickups.create',
            'pickups.manage',
            'pickups.complete',

            // Shipments read-only access (Driver role)
            'shipments.view',

            // Pre-Alerts (Casillero pre-alerts)
            'pre-alerts.view',
            'pre-alerts.create',
            'pre-alerts.manage',

            // Lockers (Casilleros admin)
            'lockers.view',
            'lockers.manage',

            // Commissions
            'commissions.view',
            'commissions.manage',

            // Contracts
            'contracts.view',
            'contracts.create',
            'contracts.manage',

            // Locations (global geographic data)
            'locations.view',
            'locations.manage',

            // Settings: Shipment Statuses
            'settings.shipment-statuses.view',
            'settings.shipment-statuses.manage',

            // Settings: Services
            'settings.services.view',
            'settings.services.manage',

            // Settings: Updates
            'settings.updates.view',

            // Customer portal
            'customer.portal',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // create roles and assign created permissions

        // 1. Customer
        $role = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        $role->syncPermissions(['view dashboard', 'create shipments', 'tracking.view', 'pre-alerts.view', 'pre-alerts.create', 'customer.portal']);

        // 2. Driver
        $role = Role::firstOrCreate(['name' => 'Driver', 'guard_name' => 'web']);
        $role->syncPermissions([
            'view dashboard',
            'dashboard.activity.view',
            'dispatch.view',
            'dispatch.access',
            'change status shipments',
            'tracking.view',
            'pickups.view',
            'pickups.complete',
            'shipments.view',
        ]);

        // 3. Employee — operational staff: full access to daily operations, no admin settings
        $role = Role::firstOrCreate(['name' => 'Employee', 'guard_name' => 'web']);
        $role->syncPermissions([
            // Dashboard & general
            'view dashboard', 'dashboard.kpi.view', 'dashboard.analytics.view', 'dashboard.map.view',
            'dashboard.activity.view', 'tracking.view',
            // Shipments — create, edit, manage, change status, import (NO delete)
            'create shipments', 'manage shipments', 'edit shipments', 'change status shipments',
            'shipments.view', 'shipments.import',
            // Dispatch
            'dispatch.view', 'dispatch.create', 'dispatch.access',
            // Warehouse
            'warehouse.access',
            // Customers — create, view (NO delete)
            'customers.access', 'customers.create',
            // Pickups
            'pickups.view', 'pickups.create', 'pickups.manage', 'pickups.complete',
            // Pre-Alerts
            'pre-alerts.view', 'pre-alerts.create', 'pre-alerts.manage',
            // Lockers
            'lockers.view',
            // Returns & COD
            'returns.view', 'returns.create', 'returns.update',
            'cod.view', 'cod.collect',
            // Proof of Delivery
            'pod.view', 'pod.create',
            // Customs
            'customs.view',
            // Reports removed — financial reports are admin-only
            // Locations (view only)
            'locations.view',
            // Read-only settings access (view services & statuses for reference)
            'settings.pricing.view', 'settings.shipment-statuses.view', 'settings.services.view',
        ]);

        // 4. Admin (Tenant Admin)
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $adminPermissions = [
            'view dashboard',
            'dashboard.kpi.view',
            'dashboard.revenue.view',
            'dashboard.analytics.view',
            'dashboard.map.view',
            'dashboard.activity.view',
            'manage shipments',
            'create shipments',
            'edit shipments',
            'delete shipments',
            'change status shipments',
            'tracking.view',
            'dispatch.view',
            'dispatch.create',
            'dispatch.update',
            'dispatch.delete',

            // Settings — all admin-level
            'settings.company.view',
            'settings.company.update',
            'settings.branding.view',
            'settings.branding.update',
            'settings.locale.view',
            'settings.locale.update',
            'settings.users.list',
            'settings.users.create',
            'settings.users.update',
            'settings.users.delete',
            'settings.roles.list',
            'settings.roles.manage',
            'settings.security.view',
            'settings.security.update',
            'settings.branches.view',
            'settings.branches.store',
            'settings.branches.update',
            'settings.branches.destroy',
            'settings.departments.view',
            'settings.departments.store',
            'settings.departments.update',
            'settings.departments.destroy',
            'settings.tracking.view',
            'settings.tracking.update',
            'settings.pricing.view',
            'settings.pricing.update',
            'settings.billing.view',
            'settings.billing.update',
            'settings.shipping-config.view',
            'settings.shipping-config.update',
            'settings.integrations.view',
            'settings.integrations.update',
            'settings.notifications.view',
            'settings.notifications.update',
            'settings.audit.view',
            // settings.maintenance.* and settings.updates.view are super-admin only

            'warehouse.access',
            'dispatch.access',
            'customers.access',
            'customers.create',
            'customers.delete',
            'reports.financial.view',
            'finance.view',
            'manage pricing',

            // Proof of Delivery
            'pod.view',
            'pod.create',

            // Customs / International
            'customs.view',
            'customs.manage',

            // HS Codes Settings
            'settings.hs-codes.view',
            'settings.hs-codes.manage',

            // Bulk Import
            'shipments.import',

            // Returns / Devolutions
            'returns.view',
            'returns.create',
            'returns.update',

            // COD — Cash on Delivery
            'cod.view',
            'cod.collect',
            'cod.remit',

            // Pickups
            'pickups.view',
            'pickups.create',
            'pickups.manage',
            'pickups.complete',

            // Shipments read-only
            'shipments.view',

            // Pre-Alerts
            'pre-alerts.view',
            'pre-alerts.create',
            'pre-alerts.manage',

            // Lockers
            'lockers.view',
            'lockers.manage',

            // Commissions
            'commissions.view',
            'commissions.manage',

            // Contracts
            'contracts.view',
            'contracts.create',
            'contracts.manage',

            // Locations
            'locations.view',
            'locations.manage',

            // Settings: Shipment Statuses
            'settings.shipment-statuses.view',
            'settings.shipment-statuses.manage',

            // Settings: Services
            'settings.services.view',
            'settings.services.manage',

            // settings.updates.view is super-admin only
        ];
        $role->syncPermissions($adminPermissions);

        // 5. Super Admin (único rol sin restricciones; nombre canónico: super-admin)
        $superAdminRole = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        // Eliminar duplicado "Super Admin" (con espacio): migrar usuarios a super-admin y borrar el rol
        $legacy = Role::where('name', 'Super Admin')->first();
        if ($legacy) {
            $usersWithLegacy = \App\Models\User::whereHas('roles', fn ($q) => $q->where('roles.id', $legacy->id))->get();
            foreach ($usersWithLegacy as $u) {
                $u->removeRole($legacy);
                $u->assignRole($superAdminRole);
            }
            $legacy->delete();
        }
    }
}
