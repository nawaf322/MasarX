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
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use App\Services\AuditService;
use App\Models\Branch;
use App\Http\Requests\Settings\StoreUserRequest;
use App\Http\Requests\Settings\UpdateUserRequest;
use App\Mail\UserInvitationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class UsersController extends Controller
{
    protected $audit;

    public function __construct(AuditService $audit)
    {
        $this->audit = $audit;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            abort(401);
        }
        $orgId = $user->organization_id;

        $isSuperAdmin = $user->hasRole('super-admin');

        // super-admin can assign any role except Customer.
        // admin can assign any role except super-admin and Customer.
        $excludedRoles = $isSuperAdmin
            ? ['Customer', 'customer']
            : ['Customer', 'customer', 'super-admin'];

        $roles = Role::where('guard_name', 'web')
            ->whereNotIn('name', $excludedRoles)
            ->get(['id', 'name', 'guard_name']);
        $withRelations = ['roles:id,name', 'branch:id,name'];
        if (\Illuminate\Support\Facades\Schema::hasTable('departments')) {
            $withRelations[] = 'department:id,name';
        }
        $hiddenRoles = $isSuperAdmin
            ? ['Customer', 'customer']
            : ['Customer', 'customer', 'super-admin'];

        $query = User::where('organization_id', $orgId)
            ->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', $hiddenRoles))
            ->with($withRelations);

        if ($request->filled('search') && is_string($request->search)) {
            $search = trim($request->search);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            }
        }

        $perPage = 15;
        $users = $query->latest()->paginate($perPage)->withQueryString();
        // BelongsToTenant scope filters by organization_id automatically
        $branches = Branch::get(['id', 'name']);
        try {
            $departments = \App\Models\Department::where('organization_id', $orgId)->get(['id', 'name']);
        } catch (\Throwable) {
            $departments = collect();
        }

        return Inertia::render('Settings/Users', [
            'users' => $users->items(),
            'roles' => $roles->isEmpty() ? [] : $roles->toArray(),
            'branches' => $branches->isEmpty() ? [] : $branches->toArray(),
            'departments' => $departments->isEmpty() ? [] : $departments->toArray(),
            'search' => $request->has('search') ? (string) $request->search : '',
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem() ?? 0,
                'to' => $users->lastItem() ?? 0,
            ],
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        $validated = $request->validated();
        $invitedBy = Auth::user();

        // Prevent privilege escalation
        if (! $invitedBy->hasRole('super-admin') && in_array($validated['role'], ['super-admin'])) {
            abort(403, 'You cannot assign this role.');
        }

        $manualPassword = ! empty($validated['password']);

        try {
            $token = $manualPassword ? null : Str::random(64);

            $user = DB::transaction(function () use ($validated, $token, $manualPassword) {
                $userData = [
                    'name'            => $validated['name'],
                    'email'           => $validated['email'],
                    'password'        => $manualPassword
                        ? Hash::make($validated['password'])
                        : Hash::make(Str::random(40)),
                    'organization_id' => Auth::user()->organization_id,
                    'is_active'       => $manualPassword,   // active immediately if password set
                    'must_change_password' => false,
                ];

                if (! $manualPassword) {
                    $userData['invitation_token']   = $token;
                    $userData['invitation_sent_at'] = now();
                }

                if (! is_null($validated['branch_id']     ?? null)) $userData['branch_id']     = $validated['branch_id'];
                if (! is_null($validated['department_id'] ?? null)) $userData['department_id'] = $validated['department_id'];
                if (! is_null($validated['document_id']   ?? null)) $userData['document_id']   = $validated['document_id'];

                $user = User::create($userData);
                $user->assignRole($validated['role']);
                return $user;
            });

            $this->audit?->log('created', 'users', $user->name, null, [
                'email'           => $user->email,
                'role'            => $validated['role'],
                'password_mode'   => $manualPassword ? 'manual' : 'invitation',
            ], $user->id);

            // Manual password mode — no email needed
            if ($manualPassword) {
                return response()->json([
                    'success' => true,
                    'message' => "User {$user->name} created and is ready to log in.",
                ]);
            }

            // Invitation email mode
            $user->load(['organization', 'roles']);
            $invitationUrl = url(route('invitation.show', ['token' => $token], false));
            $emailSent = false;
            try {
                Mail::to($user->email)->send(new UserInvitationMail($user, $token, $invitedBy));
                $emailSent = true;
            } catch (\Throwable $e) {
                report($e);
            }

            $responseData = ['success' => true, 'message' => __('invitation.sent', ['email' => $user->email])];
            if (! $emailSent) {
                $responseData['invitation_url'] = $invitationUrl;
                $responseData['warning'] = __('invitation.email_failed_expose_link');
            }

            return response()->json($responseData);

        } catch (\Throwable $e) {
            report($e);
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => [__('A system error occurred. Please try again.')],
            ]);
        }
    }

    /**
     * Regenerate invitation token and resend email to a pending (not yet accepted) user.
     */
    public function resendInvitation(User $user): \Illuminate\Http\JsonResponse
    {
        if ($user->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        if ($user->invitation_accepted_at !== null) {
            return response()->json(['error' => __('invitation.already_accepted')], 422);
        }

        $token = Str::random(64);
        $user->update([
            'invitation_token'   => $token,
            'invitation_sent_at' => now(),
        ]);

        $user->load(['organization', 'roles']);
        $invitationUrl = url(route('invitation.show', ['token' => $token], false));
        $emailSent = false;
        try {
            Mail::to($user->email)->send(new UserInvitationMail($user, $token, Auth::user()));
            $emailSent = true;
        } catch (\Throwable $e) {
            report($e);
        }

        $responseData = ['success' => true, 'message' => __('invitation.resent', ['email' => $user->email])];
        if (! $emailSent) {
            $responseData['invitation_url'] = $invitationUrl;
            $responseData['warning'] = __('invitation.email_failed_expose_link');
        }

        return response()->json($responseData);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        if ($user->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $validated = $request->validated();

        $oldValues = $user->toArray();
        $oldRole = $user->roles->pluck('name')->first();

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'document_id' => $validated['document_id'] ?? null,
        ]);

        // Prevent privilege escalation: only super-admin can assign super-admin role
        if (!Auth::user()->hasRole('super-admin') && in_array($request->role, ['super-admin'])) {
            abort(403, 'You cannot assign this role.');
        }

        $user->syncRoles([$request->role]);

        $this->audit?->log(
            'updated',
            'users',
            $user->name,
            ['name' => $oldValues['name'], 'email' => $oldValues['email'], 'role' => $oldRole],
            ['name' => $validated['name'], 'email' => $validated['email'], 'role' => $validated['role']],
            $user->id
        );

        return response()->json(['success' => true, 'message' => 'User updated successfully.']);
    }

    public function destroy(User $user)
    {
        if ($user->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        // [CRITICAL] Strict Security Check
        if ($user->id === Auth::id()) {
            abort(403, 'You cannot delete yourself.');
        }

        if ($user->hasRole('super-admin')) {
            abort(403, 'Super Admin accounts cannot be deleted.');
        }

        $oldData = $user->toArray();
        $user->delete();

        $this->audit?->log('deleted', 'users', $oldData['name'], $oldData, null, $user->id);

        return response()->json(['success' => true, 'message' => 'User deleted successfully.']);
    }

    public function resetPassword(Request $request, User $user)
    {
        if ($user->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        // Super Admin protection: only super-admin or admin (same org) can reset super-admin passwords
        if ($user->hasRole('super-admin') && !Auth::user()->hasRole(['super-admin', 'admin'])) {
            abort(403, 'Only Super Admins or Admins can reset Super Admin passwords.');
        }

        $request->validate([
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false,
        ]);

        // Security: Invalidate sessions
        try {
            \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $user->id)->delete();
        } catch (\Exception $e) {
            // driver might not be database
        }

        $this->audit?->log('security', 'users', $user->name, ['action' => 'password_reset_enforced'], null, $user->id);

        return response()->json(['success' => true, 'message' => 'Password reset. User sessions killed and password change required on next login.']);
    }

    /** Toggle user active status. Never allow deactivating super-admin or admin. */
    public function toggleActive(User $user)
    {
        if ($user->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        if ($user->hasRole('super-admin') || $user->hasRole('admin')) {
            return response()->json(['error' => 'Super Admin and Admin users cannot be deactivated.'], 422);
        }

        $user->update(['is_active' => !$user->is_active]);
        $this->audit?->log('updated', 'users', $user->name, ['is_active' => !$user->is_active], ['is_active' => $user->is_active], $user->id);

        return response()->json(['success' => true, 'message' => $user->is_active ? 'User activated.' : 'User deactivated.']);
    }

    /** Bulk deactivate: only non super-admin and non admin users. */
    public function bulkDeactivate(Request $request)
    {
        $orgId = Auth::user()->organization_id;
        $request->validate([
            'user_ids'   => 'required|array',
            'user_ids.*' => ['integer', Rule::exists('users', 'id')->where('organization_id', $orgId)],
        ]);
        $count = 0;
        foreach ($request->user_ids as $id) {
            $user = User::where('organization_id', $orgId)->find($id);
            if (!$user || $user->hasRole('super-admin') || $user->hasRole('admin')) {
                continue;
            }
            $user->update(['is_active' => false]);
            $this->audit?->log('updated', 'users', $user->name, ['is_active' => true], ['is_active' => false], $user->id);
            $count++;
        }

        return response()->json(['success' => true, 'message' => $count ? "{$count} user(s) deactivated." : 'No users were deactivated (Super Admin and Admin cannot be deactivated).']);
    }
}
