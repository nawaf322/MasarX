<?php
namespace App\Listeners;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Writes an AuditLog entry for any shipment lifecycle event.
 * Can be reused by multiple events via a single handler method pattern.
 */
class AuditShipmentLifecycle
{
    public function handleDelivered(\App\Events\ShipmentDelivered $event): void
    {
        $this->write($event->shipment, 'shipment_delivered', [
            'pod_id' => $event->pod?->id,
            'is_cod' => $event->shipment->is_cod,
        ]);
    }

    public function handleCanceled(\App\Events\ShipmentCanceled $event): void
    {
        $this->write($event->shipment, 'shipment_canceled', [
            'reason'      => $event->reason,
            'canceled_by' => $event->canceledBy,
        ]);
    }

    public function handleReturnRequested(\App\Events\ShipmentReturnRequested $event): void
    {
        $this->write($event->originalShipment, 'return_requested', [
            'return_id'     => $event->return->id,
            'return_number' => $event->return->return_number,
            'reason'        => $event->return->reason,
        ]);
    }

    public function handleReturned(\App\Events\ShipmentReturned $event): void
    {
        $this->write($event->originalShipment, 'return_completed', [
            'return_id'     => $event->return->id,
            'return_number' => $event->return->return_number,
            'refund_amount' => $event->return->refund_amount,
        ]);
    }

    public function handleCODCollected(\App\Events\CODCollected $event): void
    {
        $this->write($event->shipment, 'cod_collected', [
            'amount'       => $event->amount,
            'collected_by' => $event->collectedBy,
        ]);
    }

    public function handleCODRemitted(\App\Events\CODRemitted $event): void
    {
        $this->write($event->shipment, 'cod_remitted', [
            'amount'      => $event->amount,
            'remitted_by' => $event->remittedBy,
        ]);
    }

    public function handleCommissionReversed(\App\Events\CommissionReversed $event): void
    {
        try {
            AuditLog::create([
                'organization_id' => $event->originalCommission->organization_id,
                'user_id'         => Auth::id(),
                'action'          => 'commission_reversed',
                'module'          => 'commissions',
                'subject_id'      => $event->originalCommission->id,
                'subject_type'    => 'commission',
                'old_values'      => ['status' => 'pending'],
                'new_values'      => [
                    'status'          => 'reversed',
                    'reversal_reason' => $event->reason,
                    'reversal_id'     => $event->reversalCommission->id,
                ],
                'ip_address'  => request()->ip(),
                'user_agent'  => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::error('AuditShipmentLifecycle: ' . $e->getMessage());
        }
    }

    public function handlePreAlertConverted(\App\Events\PreAlertConverted $event): void
    {
        $this->write($event->shipment, 'pre_alert_converted', [
            'pre_alert_id'          => $event->preAlert->id,
            'store_name'            => $event->preAlert->store_name,
            'store_tracking_number' => $event->preAlert->store_tracking_number,
            'locker_id'             => $event->preAlert->locker_id,
        ]);
    }

    private function write($shipment, string $action, array $extra = []): void
    {
        try {
            AuditLog::create([
                'organization_id' => $shipment->organization_id,
                'user_id'         => Auth::id(),
                'action'          => $action,
                'module'          => 'shipments',
                'subject_id'      => $shipment->id,
                'subject_type'    => 'shipment',
                'old_values'      => [],
                'new_values'      => array_merge(['tracking_number' => $shipment->tracking_number], $extra),
                'ip_address'      => request()->ip(),
                'user_agent'      => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::error('AuditShipmentLifecycle: ' . $e->getMessage());
        }
    }
}
