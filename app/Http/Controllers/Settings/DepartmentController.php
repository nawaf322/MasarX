<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class DepartmentController extends Controller
{
    public function index()
    {
        $orgId = Auth::user()->organization_id;

        $departments = Department::where('organization_id', $orgId)
            ->withCount('users')
            ->latest()
            ->get();

        return Inertia::render('Settings/Departments', [
            'departments' => $departments,
        ]);
    }

    public function store(Request $request)
    {
        $orgId = Auth::user()->organization_id;

        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments')->where(function ($query) use ($orgId) {
                    return $query->where('organization_id', $orgId);
                })
            ],
            'code' => 'nullable|string|max:50',
        ]);

        Department::create([
            'organization_id' => $orgId,
            'name' => $request->name,
            'code' => $request->code,
            'active' => true,
        ]);

        return response()->json(['success' => true, 'message' => 'Department created successfully.']);
    }

    public function update(Request $request, Department $department)
    {
        if ($department->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $orgId = Auth::user()->organization_id;

        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments')->where(function ($query) use ($orgId) {
                    return $query->where('organization_id', $orgId);
                })->ignore($department->id)
            ],
            'code' => 'nullable|string|max:50',
            'active' => 'boolean',
        ]);

        $department->update($request->only('name', 'code', 'active'));

        return response()->json(['success' => true, 'message' => 'Department updated successfully.']);
    }

    public function destroy(Department $department)
    {
        if ($department->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        if ($department->users()->exists()) {
            return response()->json(['error' => 'Cannot delete department: It has ' . $department->users()->count() . ' active users assigned. Please reassign them first.'], 422);
        }

        $department->delete();

        return response()->json(['success' => true, 'message' => 'Department deleted successfully.']);
    }
}
