<?php
namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Shipment;
use App\Services\MoyasarService;
use App\Services\SaasWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MoyasarController extends Controller
{
    public function __construct(
        private MoyasarService   $moyasar,
        private SaasWalletService $wallet,
    ) {}

    /**
     * Initiate a wallet recharge via Moyasar.
     */
    public function rechargeInitiate(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:10|max:50000',
        ]);

        $user   = Auth::user();
        $amount = (float) $request->amount;

        $callbackUrl = route('moyasar.recharge.callback');

        try {
            $invoice = $this->moyasar->createInvoice(
                $amount,
                "شحن محفظة MasarX — {$user->name}",
                $callbackUrl,
                [
                    'type'            => 'wallet_recharge',
                    'user_id'         => $user->id,
                    'organization_id' => $user->organization_id,
                    'amount_sar'      => $amount,
                ]
            );

            return Inertia::location($invoice['url']);
        } catch (\Throwable $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }
    }

    /**
     * Moyasar redirects here after payment.
     */
    public function rechargeCallback(Request $request)
    {
        $payment = $this->moyasar->verifyCallback($request->all());

        if (!$payment) {
            return redirect()->route('my-wallet.index')
                ->with('error', 'لم يتم إتمام عملية الدفع. يرجى المحاولة مرة أخرى.');
        }

        $meta    = $payment['metadata'] ?? [];
        $orgId   = (int) ($meta['organization_id'] ?? 0);
        $amount  = (float) ($meta['amount_sar'] ?? ($payment['amount'] / 100));
        $payId   = $payment['id'];

        // Idempotency: skip if already processed
        if (\App\Models\SaasWalletTransaction::where('reference', 'moyasar:' . $payId)->exists()) {
            return redirect()->route('my-wallet.index')->with('success', 'تم شحن المحفظة مسبقًا.');
        }

        DB::transaction(function () use ($orgId, $amount, $payId, $payment) {
            $this->wallet->credit(
                $orgId,
                $amount,
                'moyasar',
                'moyasar:' . $payId,
                'شحن المحفظة عبر Moyasar',
                ['moyasar_payment' => $payment],
            );
        });

        return redirect()->route('my-wallet.index')
            ->with('success', 'تم شحن المحفظة بمبلغ ' . number_format($amount, 2) . ' ر.س بنجاح.');
    }

    /**
     * Initiate a shipment payment via Moyasar.
     */
    public function shipmentPayInitiate(Request $request, Shipment $shipment)
    {
        if ($shipment->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }

        $amount = (float) ($shipment->total ?? $shipment->subtotal ?? 0);
        if ($amount <= 0) {
            return back()->withErrors(['payment' => 'مبلغ الشحنة غير صالح.']);
        }

        $callbackUrl = route('moyasar.shipment.callback', ['shipment' => $shipment->id]);

        try {
            $invoice = $this->moyasar->createInvoice(
                $amount,
                "دفع شحنة #{$shipment->tracking_number} — MasarX",
                $callbackUrl,
                [
                    'type'            => 'shipment_payment',
                    'shipment_id'     => $shipment->id,
                    'organization_id' => $shipment->organization_id,
                    'amount_sar'      => $amount,
                ]
            );

            return Inertia::location($invoice['url']);
        } catch (\Throwable $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }
    }

    /**
     * Moyasar redirects here after shipment payment.
     */
    public function shipmentPayCallback(Request $request, Shipment $shipment)
    {
        $payment = $this->moyasar->verifyCallback($request->all());

        if (!$payment) {
            return redirect()->route('invoices.show', $shipment->id)
                ->with('error', 'لم يتم إتمام الدفع.');
        }

        if (Payment::where('external_id', $payment['id'])->exists()) {
            return redirect()->route('invoices.show', $shipment->id)->with('success', 'تم الدفع مسبقًا.');
        }

        DB::transaction(function () use ($shipment, $payment) {
            Payment::create([
                'shipment_id'     => $shipment->id,
                'organization_id' => $shipment->organization_id,
                'amount'          => $payment['amount'] / 100,
                'currency'        => strtoupper($payment['currency'] ?? 'SAR'),
                'method'          => 'moyasar_' . ($payment['source']['type'] ?? 'card'),
                'external_id'     => $payment['id'],
                'notes'           => 'Moyasar — ' . ($payment['source']['company'] ?? ''),
                'created_by'      => Auth::id(),
            ]);

            $shipment->update(['payment_status' => 'paid']);
        });

        return redirect()->route('invoices.show', $shipment->id)
            ->with('success', 'تم الدفع بنجاح.');
    }
}
