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

namespace App\Observers;

use App\Models\Shipment;
use App\Models\ShipmentHistory;
use App\Services\WebhookDispatcher;
use App\Services\InAppNotificationService;
use Illuminate\Support\Facades\Auth;

class ShipmentObserver
{
    /**
     * Handle the Shipment "created" event.
     */
    public function created(Shipment $shipment): void
    {
        $shipment->loadMissing('shipmentStatus');
        $statusCode = $shipment->shipmentStatus?->code ?? $shipment->getRawOriginal('status') ?? 'pending';
        $userId = Auth::id();
        $statusModel = $shipment->shipmentStatus;
        $shipment->history()->create([
            'status_id' => $statusModel?->id,
            'status' => $statusCode,
            'description' => 'Shipment created',
            'location' => $shipment->sender_details['city'] ?? 'Unknown',
            'user_id' => $userId,
            'organization_id' => $shipment->organization_id,
        ]);
        $shipment->activities()->create([
            'user_id' => $userId,
            'action' => 'created',
            'description' => __('shipments.activity.created'),
            'metadata' => ['status' => $statusCode],
        ]);

        // DB audit trail — replaces file-based audit_360.log
        try {
            \App\Models\AuditLog::create([
                'organization_id' => $shipment->organization_id,
                'user_id'         => Auth::id(),
                'action'          => 'shipment_created',
                'module'          => 'shipments',
                'subject_id'      => $shipment->id,
                'subject_type'    => Shipment::class,
                'new_values'      => [
                    'tracking_number' => $shipment->tracking_number,
                    'status'          => $statusCode ?? 'pending',
                    'total'           => $shipment->total,
                ],
                'ip_address'      => request()->ip(),
                'user_agent'      => request()->userAgent(),
            ]);
        } catch (\Throwable) {}

        // In-app notification (bell icon) — broadcast to ALL staff/admin
        try {
            $creatorId   = $shipment->created_by;
            $creatorRole = $creatorId ? \App\Models\User::find($creatorId)?->getRoleNames()->first() : null;
            $createdByCustomer = ($creatorRole === 'customer');

            $senderName   = $shipment->sender_details['name'] ?? '';
            $receiverName = $shipment->receiver_details['name'] ?? '';
            $senderCity   = $shipment->sender_details['city'] ?? '';

            app(InAppNotificationService::class)->broadcast(
                orgId: $shipment->organization_id,
                type: 'shipment_created',
                title: ($createdByCustomer ? '🚚 Pickup pendiente: ' : 'Nuevo envío: ') . $shipment->tracking_number,
                body: $createdByCustomer
                    ? "Recoger en: {$senderCity} — {$senderName} → {$receiverName}"
                    : trim("{$senderName} → {$receiverName}"),
                icon: 'package',
                url: $createdByCustomer ? '/pickups' : "/shipments/{$shipment->id}",
            );

            // Also notify the customer who created the shipment (they see their own bell)
            if ($createdByCustomer && $creatorId) {
                app(InAppNotificationService::class)->notify(
                    orgId: $shipment->organization_id,
                    userId: $creatorId,
                    type: 'shipment_created',
                    title: "✅ Envío creado: {$shipment->tracking_number}",
                    body: 'Tu envío fue creado exitosamente. Un transportador pasará a recogerlo pronto.',
                    icon: 'package',
                    url: "/shipments/{$shipment->id}",
                );
            }
        } catch (\Throwable) {}

        // Fire event for notifications (email, WhatsApp, SMS) and webhook subscribers
        event(new \App\Events\PackageStatusUpdated($shipment));

        // Domain event — triggers HandleShipmentCreatedAudit listener
        event(new \App\Events\ShipmentCreated($shipment));

        // Enterprise webhooks: shipment.created
        app(WebhookDispatcher::class)->dispatch('shipment.created', [
            'event' => 'shipment.created',
            'timestamp' => now()->toIso8601String(),
            'data' => [
                'id' => $shipment->id,
                'uuid' => $shipment->uuid,
                'tracking_number' => $shipment->tracking_number,
                'status' => $shipment->getRawOriginal('status') ?? 'pending',
                'organization_id' => $shipment->organization_id,
            ],
        ], $shipment->organization_id);
    }

    /**
     * Handle the Shipment "updated" event.
     */
    public function updated(Shipment $shipment): void
    {
        $userId = Auth::id();
        if ($shipment->wasChanged('status_id')) {
            $shipment->loadMissing('shipmentStatus');
            $statusCode = $shipment->shipmentStatus?->code ?? 'pending';
            $statusLabel = $shipment->shipmentStatus?->name ?? $statusCode;
            
            // CRÍTICO: Sincronizar campo status con el código del ShipmentStatus
            // Esto asegura que el dashboard y otras consultas funcionen correctamente
            // Usar updateQuietly para evitar loops infinitos
            if ($shipment->getRawOriginal('status') !== $statusCode) {
                \DB::table('shipments')
                    ->where('id', $shipment->id)
                    ->update(['status' => $statusCode]);
            }
            
            $shipment->history()->create([
                'status_id' => $shipment->shipmentStatus?->id,
                'status' => $statusCode,
                'description' => 'Status updated to ' . $statusLabel,
                'location' => 'Deprixa Hub',
                'user_id' => $userId,
                'organization_id' => $shipment->organization_id,
            ]);
            $shipment->activities()->create([
                'user_id' => $userId,
                'action' => 'status_changed',
                'description' => __('shipments.activity.status_changed', ['status' => $statusLabel]),
                'metadata' => ['old_status_id' => $shipment->getOriginal('status_id'), 'new_status' => $statusLabel],
            ]);

            // In-app notification on status change
            try {
                app(InAppNotificationService::class)->broadcast(
                    orgId: $shipment->organization_id,
                    type: 'status_changed',
                    title: "Estado actualizado: {$shipment->tracking_number}",
                    body: "Nuevo estado: {$statusLabel}",
                    icon: 'truck',
                    url: "/shipments/{$shipment->id}",
                );
            } catch (\Throwable) {}

            // Fire event so SendShipmentNotification and DispatchWebhooksOnStatusUpdate
            // listeners execute — notifications (email/WhatsApp/SMS) and outbound webhooks.
            $fresh = $shipment->fresh();
            event(new \App\Events\PackageStatusUpdated($fresh));

            // ── Lifecycle domain events ────────────────────────────────────────
            // Note: ShipmentReturnRequested and ShipmentReturned are fired in
            // ReturnShipmentController (they require a ReturnShipment reference).
            match ($statusCode) {
                'out_for_delivery' => event(new \App\Events\ShipmentOutForDelivery($fresh, $userId ? \App\Models\User::find($userId) : null)),
                'delivered'        => event(new \App\Events\ShipmentDelivered($fresh)),
                'completed'        => event(new \App\Events\ShipmentDelivered($fresh)),
                'cancelled'        => event(new \App\Events\ShipmentCanceled($fresh)),
                'exception'        => event(new \App\Events\ShipmentExceptionRaised($fresh)),
                default            => null,
            };
        }
    }
}
