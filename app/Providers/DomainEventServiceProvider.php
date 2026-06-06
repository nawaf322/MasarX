<?php

namespace App\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

/**
 * DomainEventServiceProvider
 *
 * Registers all domain event → listener wiring for the masarx-plus domain.
 * Extracted from AppServiceProvider (Phase 9 refactor) to keep providers focused.
 *
 * AppServiceProvider retains: singletons, Gate bypass, model observers, auth events.
 * This provider owns: shipment lifecycle, COD, commission, return events.
 */
class DomainEventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // ── PackageStatusUpdated (notifications + webhooks) ───────────────────
        Event::listen(\App\Events\PackageStatusUpdated::class, \App\Listeners\SendShipmentNotification::class);
        Event::listen(\App\Events\PackageStatusUpdated::class, \App\Listeners\DispatchWebhooksOnStatusUpdate::class);

        // ── DeliveryConfirmed (legacy compat — superseded by ShipmentDelivered) ─
        Event::listen(\App\Events\DeliveryConfirmed::class, \App\Listeners\RecordDeliveryRevenue::class);

        // ── ShipmentDelivered ─────────────────────────────────────────────────
        Event::listen(\App\Events\ShipmentDelivered::class, \App\Listeners\HandleFinancialClosureOnDelivery::class);
        Event::listen(\App\Events\ShipmentDelivered::class, \App\Listeners\CalculateCommissionsOnDelivery::class);
        Event::listen(
            \App\Events\ShipmentDelivered::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleDelivered']
        );

        // ── ShipmentCanceled ──────────────────────────────────────────────────
        Event::listen(
            \App\Events\ShipmentCanceled::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleCanceled']
        );

        // ── ShipmentReturnRequested ───────────────────────────────────────────
        Event::listen(
            \App\Events\ShipmentReturnRequested::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleReturnRequested']
        );

        // ── ShipmentReturned (return completed) ───────────────────────────────
        Event::listen(\App\Events\ShipmentReturned::class, \App\Listeners\ReverseCommissionsOnReturn::class);
        Event::listen(
            \App\Events\ShipmentReturned::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleReturned']
        );

        // ── ShipmentExceptionRaised ───────────────────────────────────────────
        Event::listen(\App\Events\ShipmentExceptionRaised::class, \App\Listeners\NotifyAdminsOnException::class);

        // ── CODCollected ──────────────────────────────────────────────────────
        Event::listen(
            \App\Events\CODCollected::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleCODCollected']
        );

        // ── CODRemitted ───────────────────────────────────────────────────────
        Event::listen(\App\Events\CODRemitted::class, \App\Listeners\HandleCODPaymentOnRemittance::class);
        Event::listen(\App\Events\CODRemitted::class, \App\Listeners\CalculateCommissionsOnCOD::class);
        Event::listen(
            \App\Events\CODRemitted::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleCODRemitted']
        );

        // ── CommissionReversed ────────────────────────────────────────────────
        Event::listen(
            \App\Events\CommissionReversed::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handleCommissionReversed']
        );

        // ── PreAlert (Locker / Casillero flow) ────────────────────────────────
        // PreAlertCreated: notificar al cliente que creó la pre-alerta
        Event::listen(
            \App\Events\PreAlertCreated::class,
            \App\Listeners\NotifyCustomerOnPreAlertCreated::class,
        );
        // PreAlertCreated: notificar a todo el staff (admin/empleados) para gestión
        Event::listen(
            \App\Events\PreAlertCreated::class,
            \App\Listeners\NotifyStaffOnPreAlertCreated::class,
        );
        // PreAlertReceived: notify customer that package arrived at warehouse
        Event::listen(
            \App\Events\PreAlertReceived::class,
            \App\Listeners\NotifyCustomerOnPreAlertReceived::class,
        );
        // PreAlertConverted: customer notification — package became a shipment
        Event::listen(
            \App\Events\PreAlertConverted::class,
            \App\Listeners\NotifyCustomerOnPreAlertConverted::class,
        );
        // PreAlertConverted: audit trail — pre_alert → shipment bridge confirmed
        Event::listen(
            \App\Events\PreAlertConverted::class,
            [\App\Listeners\AuditShipmentLifecycle::class, 'handlePreAlertConverted'],
        );
    }
}
