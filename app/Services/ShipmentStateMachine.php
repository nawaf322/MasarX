<?php

namespace App\Services;

use App\Exceptions\InvalidStateTransitionException;
use App\Models\Shipment;

/**
 * Formal state machine for shipment lifecycle transitions.
 *
 * Enforces that status changes follow the allowed graph.
 * Canonical terminal states are: delivered, returned, cancelled.
 *
 * Usage:
 *   app(ShipmentStateMachine::class)->assertCanTransition($shipment, 'delivered');
 *   app(ShipmentStateMachine::class)->guardNotTerminal($shipment, 'record POD');
 *   if (ShipmentStateMachine::isTerminal($shipment->status)) { ... }
 */
class ShipmentStateMachine
{
    /**
     * Allowed transitions: from_status => [allowed to_statuses]
     * Covers all statuses used in ShipmentStatus.code across the platform.
     */
    private const GRAPH = [
        'pending'          => ['picked_up', 'in_transit', 'processing', 'dispatched', 'cancelled'],
        'processing'       => ['picked_up', 'in_transit', 'dispatched', 'cancelled'],
        'dispatched'       => ['picked_up', 'in_transit', 'at_warehouse', 'cancelled'],
        'picked_up'        => ['in_transit', 'out_for_delivery', 'at_warehouse', 'on_hold', 'exception', 'cancelled'],
        'in_transit'       => ['out_for_delivery', 'at_warehouse', 'on_hold', 'exception', 'cancelled'],
        'at_warehouse'     => ['in_transit', 'out_for_delivery', 'on_hold', 'exception'],
        'out_for_delivery' => ['delivered', 'failed_delivery', 'exception', 'on_hold'],
        'on_hold'          => ['in_transit', 'out_for_delivery', 'cancelled', 'exception'],
        'failed_delivery'  => ['out_for_delivery', 'returned', 'cancelled'],
        'exception'        => ['in_transit', 'on_hold', 'failed_delivery', 'cancelled'],
        // ── Locker / casillero states ──────────────────────────────────────────
        // pre_alerted: prealerta registrada por cliente, paquete aún en origen
        'pre_alerted'         => ['at_origin_warehouse', 'cancelled'],
        // at_origin_warehouse: recibido físicamente en bodega casillero (Miami)
        'at_origin_warehouse' => ['in_consolidation', 'in_transit', 'on_hold', 'cancelled'],
        // in_consolidation: siendo consolidado con otros paquetes del cliente
        'in_consolidation'    => ['in_transit', 'on_hold', 'cancelled'],
        // ── Terminal states (no outbound transitions) ──
        'delivered'        => [],
        'returned'         => [],
        'cancelled'        => [],
    ];

    private const TERMINAL = ['delivered', 'returned', 'cancelled'];

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Whether the given status code is a terminal state.
     */
    public static function isTerminal(string $status): bool
    {
        return in_array($status, self::TERMINAL, true);
    }

    /**
     * Whether transitioning from → to is allowed in the graph.
     * Unknown `from` states are treated permissively (return true) to avoid
     * blocking legacy custom statuses that predate the state machine.
     */
    public function canTransition(string $from, string $to): bool
    {
        if (!array_key_exists($from, self::GRAPH)) {
            return true; // Unknown status — allow; don't block legacy data
        }
        return in_array($to, self::GRAPH[$from], true);
    }

    /**
     * Throw InvalidStateTransitionException if the transition is not allowed.
     */
    public function assertCanTransition(Shipment $shipment, string $to, string $operation = ''): void
    {
        $from = $shipment->status ?? 'pending';

        if (!$this->canTransition($from, $to)) {
            throw new InvalidStateTransitionException($from, $to, $operation);
        }
    }

    /**
     * Abort with 422 if the shipment is already in a terminal state.
     * Used to guard operations like recording POD, collecting COD, etc.
     */
    public function guardNotTerminal(Shipment $shipment, string $operation): void
    {
        $status = $shipment->status ?? 'pending';

        if (self::isTerminal($status)) {
            abort(422, "Cannot perform '{$operation}': shipment is already in terminal state '{$status}'.");
        }
    }

    /**
     * Guard that the shipment IS in a specific required state.
     * Used to enforce preconditions (e.g. must be delivered before COD collect).
     */
    public function requireState(Shipment $shipment, array|string $allowed, string $operation): void
    {
        $status  = $shipment->status ?? 'pending';
        $allowed = (array) $allowed;

        if (!in_array($status, $allowed, true)) {
            $expected = implode('|', $allowed);
            abort(422, "Cannot perform '{$operation}': shipment must be in state [{$expected}], currently '{$status}'.");
        }
    }

    /**
     * List all allowed next states from the current shipment status.
     */
    public function allowedTransitions(Shipment $shipment): array
    {
        $from = $shipment->status ?? 'pending';
        return self::GRAPH[$from] ?? [];
    }
}
