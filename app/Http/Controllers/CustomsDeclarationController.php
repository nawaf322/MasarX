<?php

namespace App\Http\Controllers;

use App\Models\CustomsDeclaration;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CustomsDeclarationController extends Controller
{
    public function show(Shipment $shipment): Response
    {
        $this->authorizeOrg($shipment);

        $shipment->load('customsDeclaration');

        return Inertia::render('Shipments/CustomsDeclaration', [
            'shipment' => $shipment,
            'declaration' => $shipment->customsDeclaration,
        ]);
    }

    public function store(Request $request, Shipment $shipment): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeOrg($shipment);

        $validated = $request->validate([
            'declaration_type' => 'required|in:gift,sale,sample,return,other',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_value' => 'required|numeric|min:0',
            'items.*.total_value' => 'required|numeric|min:0',
            'items.*.hs_code' => 'nullable|string|max:20',
            'items.*.country_of_origin' => 'nullable|string|max:2',
            'declared_value' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'insurance_required' => 'boolean',
            'insurance_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $orgId = Auth::user()->organization_id;

        CustomsDeclaration::updateOrCreate(
            ['shipment_id' => $shipment->id, 'organization_id' => $orgId],
            array_merge($validated, ['organization_id' => $orgId])
        );

        return redirect()->route('shipments.customs.show', $shipment)
            ->with('success', __('customs.saved'));
    }

    public function destroy(Shipment $shipment): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeOrg($shipment);

        $shipment->customsDeclaration?->delete();

        return redirect()->route('shipments.customs.show', $shipment)
            ->with('success', __('customs.deleted'));
    }

    private function authorizeOrg(Shipment $shipment): void
    {
        abort_if(
            $shipment->organization_id !== Auth::user()->organization_id,
            403,
            __('common.forbidden')
        );
    }
}
