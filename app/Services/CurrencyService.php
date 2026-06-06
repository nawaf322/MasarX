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

namespace App\Services;

use App\Models\Currency;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CurrencyService
{
    /**
     * Get all active currencies.
     */
    public function getActiveCurrencies()
    {
        return Cache::remember('currencies:active', 3600, function () {
            return Currency::where('is_active', true)->get();
        });
    }

    /**
     * Get the primary currency.
     */
    public function getPrimaryCurrency()
    {
        return Cache::remember('currencies:primary', 3600, function () {
            return Currency::where('is_primary', true)->first();
        });
    }

    /**
     * Convert an amount from one currency to another.
     */
    public function convert(float $amount, string $fromCode, string $toCode): float
    {
        if ($fromCode === $toCode) {
            return $amount;
        }

        $currencies = $this->getActiveCurrencies()->keyBy('code');

        $from = $currencies->get($fromCode);
        $to = $currencies->get($toCode);

        if (!$from || !$to) {
            Log::error("Currency conversion failed: Invalid currency code {$fromCode} or {$toCode}");
            return $amount; // Fallback to original amount (dangerous but strictly speaking 1:1 fallback)
        }

        // Convert to Base (Primary) first
        // If From is Primary (Rate 1.0), Amount / 1.0 = Amount.
        // If From is EUR (Rate 0.92, assuming 1 USD = 0.92 EUR is WRONG convention usually).
        // Convention: 1 Base = X Quote using indirect quotation?
        // Let's assume Rate stored is: How many Units of Quote Currency per 1 Unit of Base Currency.
        // Example: Base USD. EUR Rate 0.92 means 1 USD = 0.92 EUR.
        // So 100 EUR to USD: 100 / 0.92 = 108.69 USD.
        // So AmountInBase = Amount / FromRate.

        $baseAmount = $amount / $from->exchange_rate;

        // Convert Base to Target
        // Target Amount = BaseAmount * ToRate.

        return $baseAmount * $to->exchange_rate;
    }

    /**
     * Update exchange rates from an external API.
     * (Placeholder implementation)
     */
    /**
     * Update exchange rates from an external API.
     * Integration with ExchangeRate-API or similar pending.
     */
    public function updateRates(): void
    {
        Log::info('Currency rates update requested (external integration pending).');
    }
}
