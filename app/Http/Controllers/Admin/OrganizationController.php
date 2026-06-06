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

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\OrganizationOnboardingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class OrganizationController extends Controller
{
    public function index()
    {
        abort_unless(Auth::user()->hasRole('super-admin'), 403);
        $organizations = Organization::paginate(20);
        return Inertia::render('Settings/Index', ['organizations' => $organizations]);
    }

    public function store(Request $request)
    {
        abort_unless(Auth::user()->hasRole('super-admin'), 403);
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email',
            'admin_name'     => 'required|string|max:255',
            'admin_email'    => 'required|email',
            'admin_password' => 'required|string|min:8',
        ]);

        DB::transaction(function () use ($data) {
            // Generate a unique slug
            $slug = Str::slug($data['name']);
            $originalSlug = $slug;
            $i = 1;
            while (Organization::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $i;
                $i++;
            }

            $org = Organization::create([
                'name'      => $data['name'],
                'slug'      => $slug,
                'email'     => $data['email'],
                'is_active' => true,
                'settings'  => json_encode([]),
            ]);

            $svc = app(OrganizationOnboardingService::class);
            $svc->provision($org, [
                'name'     => $data['admin_name'],
                'email'    => $data['admin_email'],
                'password' => $data['admin_password'],
            ]);
        });

        return redirect()->route('admin.organizations.index')->with('success', 'Organization created.');
    }

    public function update(Request $request, Organization $organization)
    {
        abort_unless(Auth::user()->hasRole('super-admin'), 403);
        $data = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email',
        ]);
        $organization->update($data);
        return redirect()->route('admin.organizations.index')->with('success', 'Updated.');
    }

    public function toggleStatus(Organization $organization)
    {
        abort_unless(Auth::user()->hasRole('super-admin'), 403);
        $organization->update(['is_active' => !$organization->is_active]);
        return redirect()->route('admin.organizations.index')->with('success', 'Status updated.');
    }
}
