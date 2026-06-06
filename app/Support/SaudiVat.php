<?php

namespace App\Support;

class SaudiVat
{
    public const RATE = 0.15;

    /** Extract VAT amount from a VAT-inclusive total. */
    public static function fromInclusive(float $inclusiveTotal): float
    {
        return round($inclusiveTotal - ($inclusiveTotal / (1 + self::RATE)), 2);
    }

    /** Calculate VAT amount to add on top of a net (exclusive) amount. */
    public static function fromExclusive(float $netAmount): float
    {
        return round($netAmount * self::RATE, 2);
    }

    /** Net (pre-VAT) amount from a VAT-inclusive total. */
    public static function netFromInclusive(float $inclusiveTotal): float
    {
        return round($inclusiveTotal / (1 + self::RATE), 2);
    }

    /** Add VAT to a net amount, returning the gross total. */
    public static function addVat(float $netAmount): float
    {
        return round($netAmount * (1 + self::RATE), 2);
    }
}
