<?php

namespace App\Services;

use App\Events\PreAlertConverted;
use App\Events\ShipmentCreated;
use App\Models\InventoryMovement;
use App\Models\PreAlert;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\ShippingRateService;
use App\Services\StatusResolver;

class PreAlertService
{
    /**
     * Convert a received PreAlert into a real Shipment.
     *
     * This is THE BRIDGE METHOD between the casillero flow and the core Shipment lifecycle.
     * After this runs:
     *   - pre_alerts.status       = 'converted'
     *   - pre_alerts.shipment_id  = new shipment id
     *   - shipments.origin_type   = 'locker'
     *   - shipments.locker_id     = pre_alert.locker_id
     *   - shipments.pre_alert_id  = pre_alert.id
     *   - shipments.status        = 'at_origin_warehouse'
     *   - inventory_movements.shipment_id backfilled for this pre_alert
     *   - ShipmentCreated event fired  → all downstream listeners execute
     *   - PreAlertConverted event fired → audit trail, customer notification
     *
     * @param  PreAlert            $preAlert   Must be in 'received' or 'processing' status.
     * @param  array               $overrides  Optional overrides: service_type, rate_card_id, total, currency, notes.
     * @return Shipment
     */
    public function convertToShipment(PreAlert $preAlert, array $overrides = []): Shipment
    {
        if (!in_array($preAlert->status, [PreAlert::STATUS_RECEIVED, PreAlert::STATUS_PROCESSING], true)) {
            abort(422, 'Pre-alert must be received before converting to shipment. Current status: ' . $preAlert->status);
        }

        if ($preAlert->isConverted()) {
            abort(422, 'Pre-alert has already been converted to shipment #' . $preAlert->shipment_id);
        }

        $preAlert->load(['customer', 'locker.warehouse', 'organization']);

        return DB::transaction(function () use ($preAlert, $overrides): Shipment {

            /** @var User $customer */
            $customer = $preAlert->customer;
            $locker   = $preAlert->locker;

            // ── 1. Build sender details from locker / warehouse address ────────
            $senderDetails = [
                'name'    => $preAlert->organization->name ?? 'Locker ' . ($locker?->code ?? ''),
                'phone'   => $preAlert->organization->phone ?? '',
                'address' => $locker?->address ?? ($preAlert->organization->address ?? ''),
                'city'    => '',
                'country' => '',
            ];

            // ── 2. Build receiver details from customer ────────────────────────
            $receiverDetails = [
                'name'    => $customer->name ?? '',
                'phone'   => $customer->phone ?? '',
                'address' => $customer->address ?? '',
                'city'    => '',
                'country' => '',
            ];

            // ── 3. Package details — actual weight overrides declared if provided ──
            $actualWeight = (float) ($overrides['actual_weight_kg'] ?? $preAlert->declared_weight_kg ?? 0);
            $packageDetails = [
                'weight'              => $actualWeight,
                'length'              => (float) ($overrides['length_cm'] ?? 0),
                'width'               => (float) ($overrides['width_cm']  ?? 0),
                'height'              => (float) ($overrides['height_cm'] ?? 0),
                'pieces'              => 1,
                'content_description' => $preAlert->description ?? $preAlert->store_name,
                'declared_value'      => (float) $preAlert->declared_value,
            ];

            // ── 4. Resolve charge breakdown ────────────────────────────────────
            // subtotal = shipping rate chosen by operator
            // tax      = customs / import duty on declared value
            // total    = subtotal + tax
            $currency        = $overrides['currency'] ?? $preAlert->declared_currency ?? 'USD';
            $shippingRate    = (float) ($overrides['shipping_rate'] ?? 0);
            $customsDuty     = (float) ($overrides['customs_duty_amount'] ?? 0);

            // If operator provided an explicit total, use it; otherwise calculate
            $computedTotal = $shippingRate + $customsDuty;
            $finalTotal    = isset($overrides['total']) && (float) $overrides['total'] > 0
                ? (float) $overrides['total']
                : ($computedTotal > 0 ? $computedTotal : (float) ($preAlert->declared_value ?? 0));

            // ── 5. Create the Shipment ─────────────────────────────────────────
            /** @var \App\Services\ShipmentService $shipmentService */
            $shipmentService = app(ShipmentService::class);
            $trackingNumber  = $shipmentService->generateTrackingNumber($preAlert->organization);

            // Build base data, then merge operator overrides (excluding internal keys)
            $internalKeys = ['actual_weight_kg', 'length_cm', 'width_cm', 'height_cm',
                             'shipping_rate', 'customs_duty_percent', 'customs_duty_amount'];
            $applicableOverrides = array_diff_key(
                array_filter($overrides, fn($v) => $v !== null && $v !== ''),
                array_flip($internalKeys)
            );

            $shipment = Shipment::create(array_merge([
                'uuid'             => Str::uuid()->toString(),
                'organization_id'  => $preAlert->organization_id,
                'created_by'       => Auth::id() ?? $preAlert->customer_id,
                'tracking_number'  => $trackingNumber,
                'sender_details'   => $senderDetails,
                'receiver_details' => $receiverDetails,
                'package_details'  => $packageDetails,
                'status'           => 'at_origin_warehouse',
                'payment_status'   => 'unpaid',
                'currency'         => $currency,
                'subtotal'         => $shippingRate > 0 ? $shippingRate : 0,
                'tax'              => $customsDuty > 0 ? $customsDuty : 0,
                'total'            => $finalTotal,
                'origin_type'      => 'locker',
                'locker_id'        => $preAlert->locker_id,
                'pre_alert_id'     => $preAlert->id,
                'notes'            => $overrides['notes'] ?? $preAlert->notes,
            ], $applicableOverrides));

            // ── 5. Auto-quote shipping rate (best-effort fallback when no rate selected) ──
            if (empty($overrides['rate_card_id']) && empty($overrides['shipping_rate']) && $shipment->total <= 0) {
                $this->autoApplyRate($shipment, $preAlert);
            }

            // ── 6. Sync status_id from status code (dual-status architecture) ──
            try {
                app(StatusResolver::class)->setStatusByCode($shipment, $shipment->status);
            } catch (\Throwable) {
                // Non-critical: status string is already set
            }

            // ── 7. Update pre_alert ────────────────────────────────────────────
            $preAlert->update([
                'status'       => PreAlert::STATUS_CONVERTED,
                'shipment_id'  => $shipment->id,
                'converted_at' => now(),
            ]);

            // ── 8. Backfill shipment_id on inventory movements for this pre_alert
            InventoryMovement::where('reference_type', PreAlert::class)
                ->where('reference_id', $preAlert->id)
                ->whereNull('shipment_id')
                ->update(['shipment_id' => $shipment->id]);

            // ── 9. Fire events — re-enter full Shipment core lifecycle ─────────
            event(new ShipmentCreated($shipment));
            event(new PreAlertConverted($preAlert, $shipment));

            return $shipment;
        });
    }

    /**
     * Attempt to auto-apply the cheapest available local rate to the shipment.
     * Best-effort: any failure is silently swallowed — conversion must not be blocked.
     */
    private function autoApplyRate(Shipment $shipment, PreAlert $preAlert): void
    {
        try {
            $rateService = app(ShippingRateService::class);

            $payload = [
                'organization_id' => $shipment->organization_id,
                'sender_details'  => $shipment->sender_details,
                'receiver_details'=> $shipment->receiver_details,
                'package_details' => $shipment->package_details ?? [
                    'weight'         => (float) ($preAlert->declared_weight_kg ?? 0.5),
                    'declared_value' => (float) $preAlert->declared_value,
                    'pieces'         => 1,
                ],
            ];

            $rates = $rateService->quoteRates($payload);

            // Pick cheapest internal (non-carrier) rate
            $internalRates = array_filter($rates, fn($r) => ($r['carrier_code'] ?? 'local') === 'local');
            if (empty($internalRates)) {
                $internalRates = $rates; // fallback to any rate
            }

            if (empty($internalRates)) {
                return;
            }

            usort($internalRates, fn($a, $b) => ($a['total'] ?? PHP_INT_MAX) <=> ($b['total'] ?? PHP_INT_MAX));
            $best = reset($internalRates);

            $updates = [];
            if (!empty($best['total']) && $best['total'] > 0) {
                $updates['total'] = (float) $best['total'];
            }
            if (!empty($best['rate_card_id'])) {
                $updates['rate_card_id'] = $best['rate_card_id'];
            }
            if (!empty($best['rate_rule_id'])) {
                $updates['rate_rule_id'] = $best['rate_rule_id'];
            }
            if (!empty($best['service_type'])) {
                $updates['service_type'] = $best['service_type'];
            }

            if (!empty($updates)) {
                $shipment->update($updates);
            }
        } catch (\Throwable $e) {
            Log::warning('PreAlertService::autoApplyRate failed: ' . $e->getMessage());
        }
    }

    /**
     * Mark a pre-alert as physically received at the warehouse.
     * Creates an InventoryMovement IN record linked to the pre_alert.
     * Does NOT create a Shipment yet — that happens in convertToShipment().
     */
    public function markReceived(PreAlert $preAlert, ?int $warehouseId = null, ?int $locationId = null): PreAlert
    {
        if (!$preAlert->isPending()) {
            abort(422, 'Pre-alert is already in status: ' . $preAlert->status);
        }

        DB::transaction(function () use ($preAlert, $warehouseId, $locationId): void {

            $preAlert->update([
                'status'      => PreAlert::STATUS_RECEIVED,
                'received_at' => now(),
            ]);

            // Create inventory intake movement — shipment_id NULL until conversion
            if ($warehouseId) {
                InventoryMovement::create([
                    'organization_id'  => $preAlert->organization_id,
                    'warehouse_id'     => $warehouseId,
                    'location_id'      => $locationId,
                    'type'             => InventoryMovement::TYPE_IN,
                    'qty'              => 1,
                    'reference_type'   => PreAlert::class,
                    'reference_id'     => $preAlert->id,
                    'shipment_id'      => null, // filled later by convertToShipment()
                    'notes'            => 'Locker receipt: ' . $preAlert->store_tracking_number,
                    'created_by_user_id' => Auth::id(),
                ]);
            }

            event(new \App\Events\PreAlertReceived($preAlert));
        });

        return $preAlert->fresh();
    }
}
