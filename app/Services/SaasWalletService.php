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

use App\Exceptions\InsufficientBalanceException;
use App\Models\Organization;
use App\Models\SaasWallet;
use App\Models\SaasWalletTransaction;
use Illuminate\Support\Facades\DB;

class SaasWalletService
{
    /**
     * Get or create a wallet for the given organization.
     */
    public function getOrCreate(Organization $org): SaasWallet
    {
        return SaasWallet::firstOrCreate(
            ['organization_id' => $org->id],
            ['balance' => 0.00, 'currency' => 'USD']
        );
    }

    /**
     * Credit an amount to the wallet (e.g., recharge via payment gateway or manual top-up).
     *
     * @throws \Throwable
     */
    public function credit(
        Organization $org,
        float        $amount,
        string       $description,
        ?string      $reference = null,
        ?string      $paymentMethod = null,
        array        $metadata = [],
        ?int         $performedBy = null,
        ?\DateTimeInterface $expiresAt = null,
    ): SaasWalletTransaction {
        return DB::transaction(function () use ($org, $amount, $description, $reference, $paymentMethod, $metadata, $performedBy, $expiresAt) {
            /** @var SaasWallet $wallet */
            $wallet = SaasWallet::where('organization_id', $org->id)->lockForUpdate()->firstOrFail();

            $balanceBefore = (float) $wallet->balance;
            $balanceAfter  = $balanceBefore + $amount;

            $wallet->balance           = $balanceAfter;
            $wallet->last_recharged_at = now();
            $wallet->save();

            return SaasWalletTransaction::create([
                'wallet_id'       => $wallet->id,
                'organization_id' => $org->id,
                'type'            => 'credit',
                'amount'          => $amount,
                'balance_before'  => $balanceBefore,
                'balance_after'   => $balanceAfter,
                'description'     => $description,
                'reference'       => $reference,
                'payment_method'  => $paymentMethod,
                'metadata'        => $metadata ?: null,
                'performed_by'    => $performedBy,
                'expires_at'      => $expiresAt,
            ]);
        });
    }

    /**
     * Debit an amount from the wallet (e.g., subscription payment, service charge).
     *
     * @throws InsufficientBalanceException
     * @throws \Throwable
     */
    public function debit(
        Organization $org,
        float        $amount,
        string       $description,
        ?string      $reference = null,
        array        $metadata = [],
        ?int         $performedBy = null,
    ): SaasWalletTransaction {
        return DB::transaction(function () use ($org, $amount, $description, $reference, $metadata, $performedBy) {
            /** @var SaasWallet $wallet */
            $wallet = SaasWallet::where('organization_id', $org->id)->lockForUpdate()->firstOrFail();

            if ((float) $wallet->balance < $amount) {
                throw new InsufficientBalanceException($amount, (float) $wallet->balance, $wallet->currency);
            }

            $balanceBefore = (float) $wallet->balance;
            $balanceAfter  = $balanceBefore - $amount;

            $wallet->balance         = $balanceAfter;
            $wallet->last_debited_at = now();
            $wallet->save();

            return SaasWalletTransaction::create([
                'wallet_id'       => $wallet->id,
                'organization_id' => $org->id,
                'type'            => 'debit',
                'amount'          => $amount,
                'balance_before'  => $balanceBefore,
                'balance_after'   => $balanceAfter,
                'description'     => $description,
                'reference'       => $reference,
                'payment_method'  => 'system',
                'metadata'        => $metadata ?: null,
                'performed_by'    => $performedBy,
            ]);
        });
    }

    /**
     * Get current balance for an organization (returns 0 if no wallet).
     */
    public function balance(Organization $org): float
    {
        $wallet = SaasWallet::where('organization_id', $org->id)->first();
        return $wallet ? (float) $wallet->balance : 0.0;
    }
}
