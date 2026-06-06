<?php

namespace App\Services;

use App\Exceptions\InsufficientBalanceException;
use App\Models\CustomerWallet;
use App\Models\CustomerWalletTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CustomerWalletService
{
    public function getOrCreate(User $customer): CustomerWallet
    {
        return CustomerWallet::firstOrCreate(
            ['user_id' => $customer->id],
            [
                'organization_id' => $customer->organization_id,
                'balance'         => 0.00,
                'currency'        => 'SAR',
            ]
        );
    }

    public function credit(
        User    $customer,
        float   $amount,
        string  $description,
        ?string $reference = null,
        ?string $paymentMethod = null,
        array   $metadata = [],
        ?int    $performedBy = null,
    ): CustomerWalletTransaction {
        return DB::transaction(function () use ($customer, $amount, $description, $reference, $paymentMethod, $metadata, $performedBy) {
            $wallet = CustomerWallet::where('user_id', $customer->id)
                ->lockForUpdate()
                ->firstOrFail();

            $balanceBefore = (float) $wallet->balance;
            $balanceAfter  = $balanceBefore + $amount;

            $wallet->balance           = $balanceAfter;
            $wallet->last_recharged_at = now();
            $wallet->save();

            return CustomerWalletTransaction::create([
                'wallet_id'       => $wallet->id,
                'user_id'         => $customer->id,
                'organization_id' => $customer->organization_id,
                'type'            => 'credit',
                'amount'          => $amount,
                'balance_before'  => $balanceBefore,
                'balance_after'   => $balanceAfter,
                'description'     => $description,
                'reference'       => $reference,
                'payment_method'  => $paymentMethod,
                'metadata'        => $metadata ?: null,
                'performed_by'    => $performedBy,
            ]);
        });
    }

    public function debit(
        User    $customer,
        float   $amount,
        string  $description,
        ?string $reference = null,
        ?int    $shipmentId = null,
        array   $metadata = [],
    ): CustomerWalletTransaction {
        return DB::transaction(function () use ($customer, $amount, $description, $reference, $shipmentId, $metadata) {
            $wallet = CustomerWallet::where('user_id', $customer->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((float) $wallet->balance < $amount) {
                throw new InsufficientBalanceException($amount, (float) $wallet->balance, $wallet->currency);
            }

            $balanceBefore = (float) $wallet->balance;
            $balanceAfter  = $balanceBefore - $amount;

            $wallet->balance         = $balanceAfter;
            $wallet->last_debited_at = now();
            $wallet->save();

            return CustomerWalletTransaction::create([
                'wallet_id'       => $wallet->id,
                'user_id'         => $customer->id,
                'organization_id' => $customer->organization_id,
                'type'            => 'debit',
                'amount'          => $amount,
                'balance_before'  => $balanceBefore,
                'balance_after'   => $balanceAfter,
                'description'     => $description,
                'reference'       => $reference,
                'payment_method'  => 'system',
                'shipment_id'     => $shipmentId,
                'metadata'        => $metadata ?: null,
                'performed_by'    => $customer->id,
            ]);
        });
    }

    public function balance(User $customer): float
    {
        $wallet = CustomerWallet::where('user_id', $customer->id)->first();
        return $wallet ? (float) $wallet->balance : 0.0;
    }

    public function adminCredit(User $customer, float $amount, string $description, ?int $adminId = null): CustomerWalletTransaction
    {
        $this->getOrCreate($customer);
        return $this->credit($customer, $amount, $description, null, 'manual', [], $adminId);
    }
}
