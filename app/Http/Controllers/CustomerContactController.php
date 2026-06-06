<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\CustomerContact;
use App\Models\Shipment;
use App\Models\PreAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CustomerContactController extends Controller
{
    public function index(Request $request)
    {
        $perPage = in_array((int) $request->get('per_page', 10), [10, 20, 30, 50, 100])
            ? (int) $request->get('per_page', 10)
            : 10;

        $contacts = CustomerContact::where('customer_id', Auth::id())
            ->where('organization_id', Auth::user()->organization_id)
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $countries = Country::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'iso2', 'phone_code']);

        return Inertia::render('MyLocker/Contacts', [
            'contacts'  => $contacts,
            'countries' => $countries,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255',
            'phone'        => 'required|string|max:30',
            'address'      => 'required|string|max:255',
            'address_line2'=> 'nullable|string|max:255',
            'city'         => 'required|string|max:100',
            'state'        => 'nullable|string|max:100',
            'country'      => 'required|string|max:100',
            'zip_code'     => 'nullable|string|max:20',
            'document_id'  => 'nullable|string|max:50',
            'notes'        => 'nullable|string|max:500',
        ]);

        CustomerContact::create([
            ...$validated,
            'customer_id'     => Auth::id(),
            'organization_id' => Auth::user()->organization_id,
        ]);

        return response()->json(['success' => true]);
    }

    public function update(Request $request, CustomerContact $contact)
    {
        abort_if($contact->customer_id !== Auth::id(), 403);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255',
            'phone'        => 'required|string|max:30',
            'address'      => 'required|string|max:255',
            'address_line2'=> 'nullable|string|max:255',
            'city'         => 'required|string|max:100',
            'state'        => 'nullable|string|max:100',
            'country'      => 'required|string|max:100',
            'zip_code'     => 'nullable|string|max:20',
            'document_id'  => 'nullable|string|max:50',
            'notes'        => 'nullable|string|max:500',
        ]);

        $contact->update($validated);

        return response()->json(['success' => true]);
    }

    public function destroy(CustomerContact $contact)
    {
        abort_if($contact->customer_id !== Auth::id(), 403);

        $orgId     = Auth::user()->organization_id;
        $customerId = Auth::id();

        // Block if the recipient has active (non-terminal) shipments
        $activeShipments = Shipment::where('organization_id', $orgId)
            ->where('created_by', $customerId)
            ->whereRaw('receiver_details->>"$.name" = ?', [$contact->name])
            ->whereNotIn('status', ['delivered', 'completed', 'cancelled', 'returned'])
            ->count();

        if ($activeShipments > 0) {
            return response()->json([
                'blocked' => true,
                'reason'  => 'pending_shipments',
                'count'   => $activeShipments,
            ], 422);
        }

        // Block if the customer has pending pre-alerts (incoming packages) linked to this contact name
        $pendingPreAlerts = PreAlert::where('organization_id', $orgId)
            ->where('customer_id', $customerId)
            ->where('receiver_name', $contact->name)
            ->whereNotIn('status', ['converted', 'cancelled'])
            ->count();

        if ($pendingPreAlerts > 0) {
            return response()->json([
                'blocked' => true,
                'reason'  => 'pending_pre_alerts',
                'count'   => $pendingPreAlerts,
            ], 422);
        }

        $contact->delete();

        return response()->json(['success' => true]);
    }

    /**
     * JSON API: return contacts for the logged-in customer (for shipment wizard).
     */
    public function apiIndex()
    {
        $contacts = CustomerContact::where('customer_id', Auth::id())
            ->where('organization_id', Auth::user()->organization_id)
            ->orderBy('name')
            ->get(['id','name','email','phone','address','address_line2','city','state','country','zip_code','document_id']);

        return response()->json($contacts);
    }

    /**
     * JSON API: create a contact and return it (for shipment wizard).
     */
    public function apiStore(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'nullable|email|max:255',
            'phone'         => 'required|string|max:30',
            'address'       => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city'          => 'required|string|max:100',
            'state'         => 'nullable|string|max:100',
            'country'       => 'required|string|max:100',
            'country_code'  => 'nullable|string|max:10',
            'country_id'    => 'nullable|integer',
            'state_id'      => 'nullable|integer',
            'city_id'       => 'nullable|integer',
            'zip_code'      => 'nullable|string|max:20',
            'document_id'   => 'nullable|string|max:50',
        ]);

        $contact = CustomerContact::create([
            ...$validated,
            'customer_id'     => Auth::id(),
            'organization_id' => Auth::user()->organization_id,
        ]);

        return response()->json($contact);
    }
}
