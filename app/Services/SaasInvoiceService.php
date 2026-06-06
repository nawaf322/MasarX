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

use App\Models\Organization;
use App\Models\SaasInvoice;
use App\Models\SaasSubscription;
use Illuminate\Support\Facades\DB;

class SaasInvoiceService
{
    /**
     * Create a subscription invoice for a billing cycle charge.
     */
    public function createSubscriptionInvoice(
        Organization    $org,
        SaasSubscription $subscription,
        float           $amount,
        string          $description,
        ?string         $notes = null,
    ): SaasInvoice {
        return DB::transaction(function () use ($org, $subscription, $amount, $description, $notes) {
            $invoiceNumber = SaasInvoice::generateInvoiceNumber();

            return SaasInvoice::create([
                'organization_id'      => $org->id,
                'subscription_id'      => $subscription->id,
                'invoice_number'       => $invoiceNumber,
                'type'                 => 'subscription',
                'status'               => 'issued',
                'subtotal'             => $amount,
                'tax_rate'             => 0,
                'tax_amount'           => 0,
                'total'                => $amount,
                'currency'             => $subscription->currency,
                'description'          => $description,
                'billing_period_start' => $subscription->starts_at?->toDateString(),
                'billing_period_end'   => $subscription->expires_at?->toDateString(),
                'issued_at'            => now(),
                'due_at'               => now()->addDays(3),
                'notes'                => $notes,
            ]);
        });
    }

    /**
     * Create a wallet recharge invoice.
     */
    public function createRechargeInvoice(
        Organization $org,
        float        $amount,
        string       $currency,
        string       $description,
        array        $metadata = [],
    ): SaasInvoice {
        return DB::transaction(function () use ($org, $amount, $currency, $description, $metadata) {
            $invoiceNumber = SaasInvoice::generateInvoiceNumber();

            return SaasInvoice::create([
                'organization_id' => $org->id,
                'subscription_id' => null,
                'invoice_number'  => $invoiceNumber,
                'type'            => 'recharge',
                'status'          => 'paid',
                'subtotal'        => $amount,
                'tax_rate'        => 0,
                'tax_amount'      => 0,
                'total'           => $amount,
                'currency'        => $currency,
                'description'     => $description,
                'issued_at'       => now(),
                'paid_at'         => now(),
                'due_at'          => now(),
                'metadata'        => $metadata ?: null,
            ]);
        });
    }

    /**
     * Mark an invoice as paid.
     */
    public function markAsPaid(SaasInvoice $invoice): SaasInvoice
    {
        $invoice->update([
            'status'  => 'paid',
            'paid_at' => now(),
        ]);
        return $invoice->fresh();
    }

    /**
     * Mark overdue invoices (issued + past due_at → overdue).
     * Intended to be called from the scheduler.
     */
    public function markOverdueInvoices(): int
    {
        return SaasInvoice::where('status', 'issued')
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->update(['status' => 'overdue']);
    }
}
