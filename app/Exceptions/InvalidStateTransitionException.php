<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an operation attempts an illegal shipment state transition.
 */
class InvalidStateTransitionException extends RuntimeException
{
    public function __construct(
        public readonly string $from,
        public readonly string $to,
        public readonly string $operation = '',
    ) {
        $msg = $operation
            ? "Cannot perform '{$operation}': transition from '{$from}' to '{$to}' is not allowed."
            : "Transition from '{$from}' to '{$to}' is not allowed.";

        parent::__construct($msg, 422);
    }
}
