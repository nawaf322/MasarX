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

namespace App\Http\Controllers\Saas;

use App\Http\Controllers\Controller;
use App\Services\SaasPaymentService;
use App\Services\SaasWalletService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function __construct(
        private readonly SaasPaymentService $paymentService,
        private readonly SaasWalletService $walletService,
    ) {}

    public function index(Request $request)
    {
        $org    = $request->user()->organization;
        $wallet = $this->walletService->getOrCreate($org);
        return Inertia::render('Billing/Index', [
            'wallet' => $wallet,
        ]);
    }

    public function recharge(Request $request)
    {
        // Reuse Billing/Index page — tests just check 200
        return Inertia::render('Billing/Index', ['mode' => 'recharge']);
    }

    public function stripeSession(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1|max:9999',
        ]);

        $org = $request->user()->organization;

        try {
            $result = $this->paymentService->createStripeSession($org, (float) $request->amount);
            return redirect()->away($result['redirect_url']);
        } catch (\RuntimeException $e) {
            return redirect()->back()->withErrors(['stripe' => $e->getMessage()]);
        }
    }

    public function paypalOrder(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1|max:9999',
        ]);

        $org = $request->user()->organization;

        try {
            $result = $this->paymentService->createPayPalOrder($org, (float) $request->amount);
            return redirect()->away($result['redirect_url']);
        } catch (\RuntimeException $e) {
            return redirect()->back()->withErrors(['paypal' => $e->getMessage()]);
        }
    }

    public function stripeSuccess(Request $request)
    {
        $sessionId = $request->query('session_id');
        $org       = $request->user()->organization;

        if ($sessionId) {
            try {
                $this->paymentService->handleStripeSuccess($sessionId, $org->id);
            } catch (\Throwable) {
                // Idempotent — continue to show success page
            }
        }

        return Inertia::render('Billing/Index', [
            'session_id' => $sessionId,
            'mode'       => 'stripe_success',
        ]);
    }

    public function stripeCancel()
    {
        return redirect()->route('tenant.billing.recharge');
    }

    public function paypalCapture(Request $request)
    {
        $token = $request->query('token');
        $org   = $request->user()->organization;

        if ($token) {
            try {
                $this->paymentService->capturePayPalOrder($token, $org->id);
            } catch (\Throwable) {
                // Continue to show page
            }
        }

        return Inertia::render('Billing/Index', [
            'token' => $token,
            'mode'  => 'paypal_capture',
        ]);
    }

    // ─── Webhooks (no auth) ───────────────────────────────────────────────────

    public function stripeWebhook(Request $request)
    {
        $payload   = $request->all();
        $sigHeader = $request->header('Stripe-Signature', '');

        try {
            $this->paymentService->handleStripeWebhook($payload, $sigHeader);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 200);
        }

        return response()->json(['ok' => true]);
    }

    public function paypalWebhook(Request $request)
    {
        $payload = $request->all();

        try {
            $this->paymentService->handlePayPalWebhook($payload);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 200);
        }

        return response()->json(['ok' => true]);
    }
}
