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

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CustomersApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $this->orgId();
        if (!$orgId) {
            return response()->json(['error' => 'Organization required'], 403);
        }

        $query = User::role('customer')
            ->where('organization_id', $orgId);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $users = $query->orderBy('name')->paginate($perPage);

        $items = $users->getCollection()->map(function ($user) use ($orgId) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'created_at' => $user->created_at?->toIso8601String(),
            ];
        });

        $arr = $users->toArray();
        $arr['data'] = $items;
        return response()->json($arr);
    }

    public function store(Request $request): JsonResponse
    {
        $orgId = $this->orgId();
        if (!$orgId) {
            return response()->json(['error' => 'Organization required'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users', 'email')->where('organization_id', $orgId)],
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'country_id' => 'nullable|exists:countries,id',
            'state_id' => 'nullable|exists:states,id',
            'city_id' => 'nullable|exists:cities,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'country_id' => $validated['country_id'] ?? null,
            'state_id' => $validated['state_id'] ?? null,
            'city_id' => $validated['city_id'] ?? null,
            'organization_id' => $orgId,
            'password' => bcrypt(str()->random(32)),
        ]);

        $user->assignRole('customer');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'created_at' => $user->created_at?->toIso8601String(),
        ], 201);
    }

    private function orgId(): ?int
    {
        $token = request()->attributes->get('api_token');
        return $token?->organization_id ?? Auth::user()?->organization_id;
    }
}
