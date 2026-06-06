<?php

namespace App\Http\Controllers;

use App\Models\ProofOfDelivery;
use App\Models\Shipment;
use App\Services\ShipmentStateMachine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProofOfDeliveryController extends Controller
{
    public function show(Shipment $shipment): Response
    {
        $this->authorizeOrg($shipment);

        $shipment->load(['proofOfDelivery', 'proofOfDelivery.createdBy']);

        return Inertia::render('Shipments/ProofOfDelivery', [
            'shipment' => $shipment,
            'pod' => $shipment->proofOfDelivery,
        ]);
    }

    public function store(Request $request, Shipment $shipment): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeOrg($shipment);

        // Business rule: can only record POD if shipment is not yet in a terminal state
        app(ShipmentStateMachine::class)->assertCanTransition($shipment, 'delivered', 'record POD');

        $validated = $request->validate([
            'recipient_name' => 'required|string|max:255',
            'recipient_id_number' => 'nullable|string|max:100',
            'signature' => 'nullable|string',
            'photos' => 'nullable|array',
            'photos.*' => 'image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'notes' => 'nullable|string|max:1000',
            'delivered_at' => 'required|date',
        ]);

        if (empty($validated['signature']) && !$request->hasFile('photos')) {
            return back()->withErrors(['signature' => 'Se requiere firma o al menos una foto como prueba de entrega.'])
                ->withInput();
        }

        $orgId = Auth::user()->organization_id;
        $photoPaths = [];

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store("pod-photos/{$orgId}", 'public');
                $photoPaths[] = $path;
            }
        }

        $pod = DB::transaction(function () use ($shipment, $validated, $photoPaths, $orgId) {
            $pod = ProofOfDelivery::create([
                'shipment_id'        => $shipment->id,
                'organization_id'    => $orgId,
                'created_by'         => Auth::id(),
                'recipient_name'     => $validated['recipient_name'],
                'recipient_id_number'=> $validated['recipient_id_number'] ?? null,
                'signature'          => $validated['signature'] ?? null,
                'photos'             => !empty($photoPaths) ? $photoPaths : null,
                'notes'              => $validated['notes'] ?? null,
                'delivered_at'       => $validated['delivered_at'],
            ]);

            $shipment->update([
                'status'       => 'delivered',
                'delivered_at' => now(),
            ]);

            return $pod;
        });

        // Fire canonical delivery event (COD-aware financial closure + commission calculation + audit)
        event(new \App\Events\ShipmentDelivered($shipment->fresh(), $pod));

        // Fire legacy event for any external callers still listening to DeliveryConfirmed
        event(new \App\Events\DeliveryConfirmed($shipment));

        return redirect()->route('shipments.pod.show', $shipment)
            ->with('success', __('pod.saved'));
    }

    public function download(Shipment $shipment): Response
    {
        $this->authorizeOrg($shipment);

        $shipment->load(['proofOfDelivery', 'proofOfDelivery.createdBy']);

        return Inertia::render('Shipments/PodDownload', [
            'shipment' => $shipment,
            'pod' => $shipment->proofOfDelivery,
        ]);
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
