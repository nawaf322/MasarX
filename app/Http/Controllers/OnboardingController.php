<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use App\Models\OrganizationSetting;

class OnboardingController extends Controller
{
    public function index()
    {
        return Inertia::render('Settings/Onboarding', [
            'steps_completed' => 0 // In real app, calculate based on DB fields
        ]);
    }

    public function complete(Request $request)
    {
        // Save all onboarding data in one go or incremental
        $orgId = Auth::user()->organization_id;

        // Example: Mark onboarding as done
        OrganizationSetting::updateOrCreate(
            ['organization_id' => $orgId, 'group' => 'system', 'key' => 'onboarding_complete'],
            ['value' => true]
        );

        return redirect()->route('dashboard')->with('success', 'Setup completed!');
    }
}
