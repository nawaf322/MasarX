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

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Manifest;
use App\Models\CarrierAccount;
use App\Models\Payment;
use App\Models\PreAlert;

/**
 * Global search — tenant-scoped, returns results across all key entities:
 * shipments (tracking, sender, receiver), customers, manifests, drivers, carriers, payments.
 */
class SearchController extends Controller
{
    private const MAX_RESULTS_PER_TYPE = 5;

    public function global(Request $request): JsonResponse
    {
        $q = trim((string) $request->get('q', ''));

        if (strlen($q) < 2) {
            return response()->json(['results' => [], 'query' => $q]);
        }

        $user    = Auth::user();
        $orgId   = $user->organization_id;
        $like    = '%' . $q . '%';
        $results = [];

        // Customers get a scoped search (their own shipments + pre-alerts only)
        if ($user->hasRole('customer')) {
            return $this->globalForCustomer($user->id, $orgId, $q, $like);
        }

        // 1. Shipments — tracking number, sender name, receiver name
        try {
            $shipments = Shipment::where('organization_id', $orgId)
                ->where('is_archived', false)
                ->where(function ($sub) use ($q, $like) {
                    $sub->where('tracking_number', 'like', $like)
                        ->orWhere('sender_name_search', 'like', $like)
                        ->orWhere('receiver_name_search', 'like', $like);
                })
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'tracking_number', 'status', 'sender_details', 'receiver_details', 'total', 'currency', 'created_at']);

            foreach ($shipments as $s) {
                $senderName   = $s->sender_details['name']   ?? '';
                $receiverName = $s->receiver_details['name'] ?? '';
                $results[] = [
                    'type'       => 'shipment',
                    'id'         => $s->id,
                    'label'      => $s->tracking_number,
                    'sub'        => trim($senderName . ' → ' . $receiverName, ' → '),
                    'status'     => $s->getRawOriginal('status') ?? (string) $s->status,
                    'total'      => $s->total ? number_format((float) $s->total, 2) . ' ' . ($s->currency ?? 'USD') : null,
                    'url'        => route('shipments.show', $s->id),
                    'created_at' => $s->created_at?->format('d/m/Y'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search: shipments query failed', ['error' => $e->getMessage()]);
        }

        // 2. Customers — name, email, phone, document
        try {
            $customers = User::where('organization_id', $orgId)
                ->whereHas('roles', fn($q) => $q->where('name', 'Customer'))
                ->where(function ($sub) use ($like) {
                    $sub->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('phone', 'like', $like)
                        ->orWhere('document_id', 'like', $like);
                })
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'name', 'email', 'phone']);

            foreach ($customers as $c) {
                $results[] = [
                    'type'  => 'customer',
                    'id'    => $c->id,
                    'label' => $c->name,
                    'sub'   => $c->email . ($c->phone ? ' · ' . $c->phone : ''),
                    'url'   => route('customers.show', $c->id),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search: customers query failed', ['error' => $e->getMessage()]);
        }

        // 3. Manifests — manifest_number
        try {
            $manifests = Manifest::where('organization_id', $orgId)
                ->where('manifest_number', 'like', $like)
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'manifest_number', 'status', 'created_at']);

            foreach ($manifests as $m) {
                $results[] = [
                    'type'       => 'manifest',
                    'id'         => $m->id,
                    'label'      => $m->manifest_number,
                    'sub'        => 'Manifest · ' . ucfirst($m->status ?? 'open'),
                    'url'        => route('warehouse.manifests.index') . '?search=' . urlencode($m->manifest_number),
                    'created_at' => $m->created_at?->format('d/m/Y'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search: manifests query failed', ['error' => $e->getMessage()]);
        }

        // 4. Drivers — by name, email, phone
        try {
            $drivers = User::where('organization_id', $orgId)
                ->whereHas('roles', fn($q) => $q->where('name', 'Driver'))
                ->where(function ($sub) use ($like) {
                    $sub->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('phone', 'like', $like);
                })
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'name', 'email', 'phone']);

            foreach ($drivers as $d) {
                $results[] = [
                    'type'  => 'driver',
                    'id'    => $d->id,
                    'label' => $d->name,
                    'sub'   => 'Driver · ' . $d->email . ($d->phone ? ' · ' . $d->phone : ''),
                    'url'   => route('settings.users.index') . '?search=' . urlencode($d->name),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search: drivers query failed', ['error' => $e->getMessage()]);
        }

        // 5. Carrier accounts — by carrier_code or mode
        try {
            $carriers = CarrierAccount::where('organization_id', $orgId)
                ->where(function ($sub) use ($like) {
                    $sub->where('carrier_code', 'like', $like)
                        ->orWhere('mode', 'like', $like);
                })
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'carrier_code', 'mode', 'status']);

            foreach ($carriers as $c) {
                $results[] = [
                    'type'  => 'carrier',
                    'id'    => $c->id,
                    'label' => strtoupper($c->carrier_code),
                    'sub'   => 'Carrier · ' . strtoupper($c->mode ?? '') . ' · ' . ($c->status === 'active' ? 'Active' : 'Inactive'),
                    'url'   => route('settings.index') . '?section=carriers',
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search: carriers query failed', ['error' => $e->getMessage()]);
        }

        // 6. Payments — by external_id or notes
        try {
            $payments = Payment::where('organization_id', $orgId)
                ->where(function ($sub) use ($like) {
                    $sub->where('external_id', 'like', $like)
                        ->orWhere('notes', 'like', $like);
                })
                ->with('shipment:id,tracking_number')
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'shipment_id', 'amount', 'currency', 'method', 'external_id', 'created_at']);

            foreach ($payments as $p) {
                $results[] = [
                    'type'       => 'payment',
                    'id'         => $p->id,
                    'label'      => $p->external_id ?: ('Payment #' . $p->id),
                    'sub'        => number_format((float) $p->amount, 2) . ' ' . ($p->currency ?? 'USD')
                        . ' · ' . ucfirst($p->method ?? '')
                        . ($p->shipment ? ' · ' . $p->shipment->tracking_number : ''),
                    'url'        => $p->shipment ? route('shipments.show', $p->shipment_id) : route('billing.index'),
                    'created_at' => $p->created_at?->format('d/m/Y'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search: payments query failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'results' => $results,
            'query'   => $q,
            'count'   => count($results),
        ]);
    }

    /**
     * Customer-scoped search: only their own shipments and pre-alerts.
     */
    private function globalForCustomer(int $userId, int $orgId, string $q, string $like): JsonResponse
    {
        $results = [];

        // 1. Customer's own shipments
        try {
            $shipments = Shipment::where('organization_id', $orgId)
                ->where('created_by', $userId)
                ->where('is_archived', false)
                ->where(function ($sub) use ($like) {
                    $sub->where('tracking_number', 'like', $like)
                        ->orWhere('sender_name_search', 'like', $like)
                        ->orWhere('receiver_name_search', 'like', $like);
                })
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'tracking_number', 'status', 'sender_details', 'receiver_details', 'total', 'currency', 'created_at']);

            foreach ($shipments as $s) {
                $senderName   = $s->sender_details['name']   ?? '';
                $receiverName = $s->receiver_details['name'] ?? '';
                $results[] = [
                    'type'       => 'shipment',
                    'id'         => $s->id,
                    'label'      => $s->tracking_number,
                    'sub'        => trim($senderName . ' → ' . $receiverName, ' → '),
                    'status'     => $s->getRawOriginal('status') ?? (string) $s->status,
                    'total'      => $s->total ? number_format((float) $s->total, 2) . ' ' . ($s->currency ?? 'USD') : null,
                    'url'        => route('shipments.show', $s->id),
                    'created_at' => $s->created_at?->format('d/m/Y'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search (customer): shipments query failed', ['error' => $e->getMessage()]);
        }

        // 2. Customer's own pre-alerts
        try {
            $preAlerts = PreAlert::where('organization_id', $orgId)
                ->where('customer_id', $userId)
                ->where(function ($sub) use ($like) {
                    $sub->where('store_name', 'like', $like)
                        ->orWhere('store_tracking_number', 'like', $like);
                })
                ->limit(self::MAX_RESULTS_PER_TYPE)
                ->get(['id', 'store_name', 'store_tracking_number', 'status', 'created_at']);

            foreach ($preAlerts as $p) {
                $results[] = [
                    'type'       => 'pre_alert',
                    'id'         => $p->id,
                    'label'      => $p->store_tracking_number ?: ('Pre-Alert #' . $p->id),
                    'sub'        => ($p->store_name ?? '') . ' · ' . ucfirst($p->status ?? ''),
                    'url'        => route('pre-alerts.index'),
                    'created_at' => $p->created_at?->format('d/m/Y'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Global search (customer): pre-alerts query failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'results' => $results,
            'query'   => $q,
            'count'   => count($results),
        ]);
    }
}
