<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\HsCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class HsCodeController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $query = HsCode::where('organization_id', $orgId);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $hsCodes = $query->orderBy('code')->paginate(15)->withQueryString();

        return Inertia::render('Settings/HsCodes', [
            'hsCodes' => $hsCodes,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20',
            'description' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        HsCode::create(array_merge($validated, [
            'organization_id' => Auth::user()->organization_id,
        ]));

        return response()->json(['success' => true, 'message' => __('hs_codes.created')]);
    }

    public function update(Request $request, HsCode $hsCode): \Illuminate\Http\JsonResponse
    {
        abort_if($hsCode->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'code' => 'required|string|max:20',
            'description' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $hsCode->update($validated);

        return response()->json(['success' => true, 'message' => __('hs_codes.updated')]);
    }

    public function destroy(HsCode $hsCode): \Illuminate\Http\JsonResponse
    {
        abort_if($hsCode->organization_id !== Auth::user()->organization_id, 403);

        $hsCode->delete();

        return response()->json(['success' => true, 'message' => __('hs_codes.deleted')]);
    }

    public function search(Request $request): \Illuminate\Http\JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $q = $request->get('q', '');

        $results = HsCode::where('organization_id', $orgId)
            ->where('is_active', true)
            ->where(function ($query) use ($q) {
                $query->where('code', 'like', "%{$q}%")
                      ->orWhere('description', 'like', "%{$q}%");
            })
            ->orderBy('code')
            ->limit(10)
            ->get(['id', 'code', 'description', 'category']);

        return response()->json($results);
    }
}
