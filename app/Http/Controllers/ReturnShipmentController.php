<?php

namespace App\Http\Controllers;

use App\Models\ReturnShipment;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ReturnShipmentController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;

        $query = ReturnShipment::where('organization_id', $orgId)
            ->with(['originalShipment', 'createdBy']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'like', "%{$search}%")
                  ->orWhereHas('originalShipment', function ($sq) use ($search) {
                      $sq->where('tracking_number', 'like', "%{$search}%");
                  });
            });
        }

        $returns = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        $stats = [
            'total' => ReturnShipment::where('organization_id', $orgId)->count(),
            'pending' => ReturnShipment::where('organization_id', $orgId)->where('status', 'requested')->count(),
            'in_transit' => ReturnShipment::where('organization_id', $orgId)->where('status', 'in_transit')->count(),
            'completed' => ReturnShipment::where('organization_id', $orgId)->where('status', 'completed')->count(),
        ];

        return Inertia::render('Returns/Index', [
            'returns' => $returns,
            'stats' => $stats,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function create(Request $request): Response
    {
        $orgId = Auth::user()->organization_id;
        $shipmentId = $request->get('shipment_id');
        $shipment = null;
        $blockedByReturn = false;

        if ($shipmentId) {
            $shipment = Shipment::where('organization_id', $orgId)->findOrFail($shipmentId);
            // Check if the pre-selected shipment already has a non-rejected return
            $existingReturn = ReturnShipment::where('organization_id', $orgId)
                ->where('original_shipment_id', $shipment->id)
                ->whereNotIn('status', ['rejected'])
                ->first();
            if ($existingReturn) {
                $blockedByReturn = true;
            }
        }

        // Shipments that already have a non-rejected return (including completed) cannot get another one
        $existingReturnIds = ReturnShipment::where('organization_id', $orgId)
            ->whereNotIn('status', ['rejected'])
            ->pluck('original_shipment_id');

        // Resolve status IDs for excluded statuses (pending/cancelled/returned don't make sense for returns)
        $excludedStatusIds = \App\Models\ShipmentStatus::whereIn('code', ['pending', 'cancelled', 'returned'])
            ->pluck('id')
            ->toArray();

        // Show eligible shipments: not pending/cancelled/returned, no existing return, not already refunded
        $deliveredShipments = Shipment::where('organization_id', $orgId)
            ->where(function ($q) use ($excludedStatusIds) {
                if (!empty($excludedStatusIds)) {
                    $q->whereNotIn('status_id', $excludedStatusIds);
                }
                $q->whereNotIn('status', ['pending', 'cancelled', 'returned']);
            })
            ->where('payment_status', '!=', 'refunded')
            ->whereNotIn('id', $existingReturnIds)
            ->select('id', 'tracking_number', 'sender_details', 'receiver_details', 'total', 'currency', 'status')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return Inertia::render('Returns/Create', [
            'shipment'          => $shipment,
            'deliveredShipments' => $deliveredShipments,
            'blockedByReturn'   => $blockedByReturn,
        ]);
    }

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        // Convert empty strings to null for nullable fields before validation
        $request->merge([
            'refund_method' => $request->input('refund_method') ?: null,
            'refund_amount' => $request->input('refund_amount') !== '' ? $request->input('refund_amount') : null,
        ]);

        $validated = $request->validate([
            'original_shipment_id' => 'required|integer|exists:shipments,id',
            'reason' => 'required|in:damaged,wrong_item,not_delivered,customer_request,other',
            'reason_notes' => 'nullable|string|max:1000',
            'refund_amount' => 'nullable|numeric|min:0',
            'refund_method' => 'nullable|in:original,store_credit,cash',
        ]);

        $orgId = Auth::user()->organization_id;

        $shipment = Shipment::where('organization_id', $orgId)
            ->findOrFail($validated['original_shipment_id']);

        // Prevent duplicate return: reject if a non-rejected return already exists for this shipment
        $duplicate = ReturnShipment::where('organization_id', $orgId)
            ->where('original_shipment_id', $shipment->id)
            ->whereNotIn('status', ['rejected'])
            ->exists();

        if ($duplicate) {
            return back()->withErrors([
                'original_shipment_id' => __('returns.duplicate_return'),
            ])->withInput();
        }

        // Also block if shipment itself is already in 'returned' state or has been refunded
        if ($shipment->status === 'returned' || $shipment->payment_status === 'refunded') {
            return back()->withErrors([
                'original_shipment_id' => __('returns.shipment_already_returned'),
            ])->withInput();
        }

        $return = ReturnShipment::create(array_merge($validated, [
            'organization_id' => $orgId,
            'created_by'      => Auth::id(),
            'status'          => 'requested',
            'refund_amount'   => $validated['refund_amount'] ?? 0,
        ]));

        event(new \App\Events\ShipmentReturnRequested($return, $shipment));

        // Log return creation in the shipment's activity timeline for full traceability
        $shipment->activities()->create([
            'user_id'     => Auth::id(),
            'action'      => 'return_requested',
            'description' => __('returns.activity_requested', [
                'number' => $return->return_number,
                'reason' => __('returns.reason_' . $validated['reason']),
            ]),
            'metadata'    => [
                'return_id'     => $return->id,
                'return_number' => $return->return_number,
                'reason'        => $validated['reason'],
                'refund_amount' => $return->refund_amount,
            ],
        ]);

        return redirect()->route('returns.show', $return)
            ->with('success', __('returns.created'));
    }

    public function show(ReturnShipment $returnShipment): Response
    {
        abort_if($returnShipment->organization_id !== Auth::user()->organization_id, 403);

        $returnShipment->load(['originalShipment', 'returnShipment', 'createdBy']);

        return Inertia::render('Returns/Show', [
            'return' => $returnShipment,
        ]);
    }

    public function update(Request $request, ReturnShipment $returnShipment): \Illuminate\Http\RedirectResponse
    {
        abort_if($returnShipment->organization_id !== Auth::user()->organization_id, 403);

        $validated = $request->validate([
            'status' => 'required|in:approved,in_transit,received,completed,rejected',
        ]);

        $data = ['status' => $validated['status']];

        if ($validated['status'] === 'approved') {
            $data['approved_at'] = now();
        } elseif ($validated['status'] === 'received') {
            $data['received_at'] = now();
        } elseif ($validated['status'] === 'completed') {
            $data['completed_at'] = now();
        }

        $returnShipment->update($data);

        // ── Log status change in the original shipment's activity timeline ─────
        $original = $returnShipment->originalShipment;
        if ($original) {
            $original->activities()->create([
                'user_id'     => Auth::id(),
                'action'      => 'return_updated',
                'description' => __('returns.activity_status_changed', [
                    'number' => $returnShipment->return_number,
                    'status' => __('returns.status_' . $validated['status']),
                ]),
                'metadata'    => [
                    'return_id'     => $returnShipment->id,
                    'return_number' => $returnShipment->return_number,
                    'new_status'    => $validated['status'],
                ],
            ]);
        }

        // ── When return is COMPLETED: lock the original shipment ──────────────
        // payment_status → refunded (removes it from active billing/finance revenue)
        // status         → returned (reflects physical reality in tracking)
        if ($validated['status'] === 'completed') {
            if ($original) {
                $shipmentUpdate = ['payment_status' => 'refunded'];

                // Try to find the 'returned' status in shipment_statuses for this org
                $returnedStatus = \App\Models\ShipmentStatus::where('organization_id', $original->organization_id)
                    ->where('code', 'returned')
                    ->first();
                $shipmentUpdate['status'] = 'returned';
                if ($returnedStatus) {
                    $shipmentUpdate['status_id'] = $returnedStatus->id;
                }

                $original->update($shipmentUpdate);

                // Fire canonical return-completed event (reverses commissions + audit)
                event(new \App\Events\ShipmentReturned($returnShipment, $original));

                // Fire ReturnProcessed for financial closure + credit note + HandleReturnProcessedFinance
                event(new \App\Events\ReturnProcessed(
                    originalShipment: $original,
                    returnShipment:   $returnShipment,
                    disposition:      $returnShipment->disposition ?? 'returned',
                    refundAmount:     $returnShipment->refund_amount ?? null,
                ));
            }
        }

        // ── When return is REJECTED: restore shipment to its pre-return state ─
        // payment_status → restore to 'paid' if it was 'refunded' (rejected means no refund)
        if ($validated['status'] === 'rejected') {
            if ($original && $original->payment_status === 'refunded') {
                $original->update(['payment_status' => 'paid']);
            }
        }

        return back()->with('success', __('returns.updated'));
    }
}
