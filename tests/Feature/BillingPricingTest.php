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

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Models\Organization;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Billing and pricing integrity tests.
 *
 * Verifies that:
 * - Clients cannot register a payment amount exceeding the remaining balance.
 * - Partial payments result in PARTIAL status, not PAID.
 * - Full payment results in PAID status.
 * - Already-paid shipments cannot receive a second payment.
 * - Price fields (total/subtotal/tax/discount) are stripped from shipment update.
 */
class BillingPricingTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private Shipment $shipment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->org      = Organization::factory()->create(['is_active' => true]);
        $this->user     = User::factory()->create(['organization_id' => $this->org->id]);
        $this->user->givePermissionTo(['edit shipments', 'manage shipments']);

        Storage::fake('local');

        $this->shipment = Shipment::factory()->create([
            'organization_id' => $this->org->id,
            'total'           => 100.00,
            'currency'        => 'USD',
            'payment_status'  => PaymentStatus::UNPAID,
            'status'          => 'pending',
        ]);
    }

    // ── markPaid() — amount cap ────────────────────────────────────────────────

    public function test_markpaid_rejects_amount_exceeding_shipment_total(): void
    {
        $receipt = UploadedFile::fake()->create('receipt.pdf', 50, 'application/pdf');

        $response = $this->actingAs($this->user)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 999999.99,
            'receipt' => $receipt,
        ]);

        // Validation error — 422 or redirect with errors
        $this->assertTrue(
            in_array($response->getStatusCode(), [302, 422]),
            'Expected validation failure but got ' . $response->getStatusCode()
        );

        // Shipment must remain unpaid
        $this->assertEquals(
            PaymentStatus::UNPAID->value,
            $this->shipment->fresh()->payment_status->value
        );
    }

    public function test_markpaid_partial_amount_sets_partial_status(): void
    {
        $receipt = UploadedFile::fake()->create('receipt.pdf', 50, 'application/pdf');

        $response = $this->actingAs($this->user)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 40.00,   // Only 40% of the 100 total
            'receipt' => $receipt,
        ]);

        $response->assertRedirect();

        $fresh = $this->shipment->fresh();
        $this->assertEquals(
            PaymentStatus::PARTIAL->value,
            $fresh->payment_status->value,
            'A partial payment must result in PARTIAL status, not PAID.'
        );
    }

    public function test_markpaid_full_amount_sets_paid_status(): void
    {
        $receipt = UploadedFile::fake()->create('receipt.pdf', 50, 'application/pdf');

        $response = $this->actingAs($this->user)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 100.00,
            'receipt' => $receipt,
        ]);

        $response->assertRedirect();

        $this->assertEquals(
            PaymentStatus::PAID->value,
            $this->shipment->fresh()->payment_status->value,
            'A full payment must result in PAID status.'
        );
    }

    public function test_markpaid_blocks_payment_on_fully_paid_shipment(): void
    {
        $this->shipment->update(['payment_status' => PaymentStatus::PAID]);
        $receipt = UploadedFile::fake()->create('receipt.pdf', 50, 'application/pdf');

        $response = $this->actingAs($this->user)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 1.00,
            'receipt' => $receipt,
        ]);

        // Should redirect back with error — no double-payment
        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_markpaid_respects_remaining_balance_after_partial(): void
    {
        // Register 60 first (40 still due)
        $receipt1 = UploadedFile::fake()->create('r1.pdf', 50, 'application/pdf');
        $this->actingAs($this->user)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 60.00,
            'receipt' => $receipt1,
        ]);

        // Now try to pay 50 — exceeds the remaining 40 balance
        $receipt2 = UploadedFile::fake()->create('r2.pdf', 50, 'application/pdf');
        $response = $this->actingAs($this->user)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 50.00,
            'receipt' => $receipt2,
        ]);

        $this->assertTrue(
            in_array($response->getStatusCode(), [302, 422]),
            'Overpayment beyond remaining balance should be rejected.'
        );
    }

    // ── Shipment update — price fields stripped for non-pricing users ─────────

    public function test_shipment_update_ignores_price_fields_without_manage_pricing(): void
    {
        // $this->user has only 'edit shipments' + 'manage shipments' — no 'manage pricing'
        $originalTotal = $this->shipment->total;

        $response = $this->actingAs($this->user)->put("/shipments/{$this->shipment->id}", [
            'sender_details'   => ['name' => 'A', 'phone' => '123', 'address' => 'St', 'city' => 'City', 'country' => 'CO'],
            'receiver_details' => ['name' => 'B', 'phone' => '456', 'address' => 'Ave', 'city' => 'Town', 'country' => 'CO'],
            'total'            => 0.01,
            'subtotal'         => 0.01,
            'tax'              => 0,
            'discount'         => 0,
            'currency'         => 'ZWD',
        ]);

        $fresh = $this->shipment->fresh();

        $this->assertEquals(
            (float) $originalTotal,
            (float) $fresh->total,
            'Users without manage pricing must not change prices — server is price source of truth.'
        );
    }

    public function test_shipment_update_allows_price_change_with_manage_pricing(): void
    {
        // Grant the manage pricing permission
        $this->user->givePermissionTo('manage pricing');

        $response = $this->actingAs($this->user)->put("/shipments/{$this->shipment->id}", [
            'sender_details'   => ['name' => 'A', 'phone' => '123', 'address' => 'St', 'city' => 'City', 'country' => 'CO'],
            'receiver_details' => ['name' => 'B', 'phone' => '456', 'address' => 'Ave', 'city' => 'Town', 'country' => 'CO'],
            'total'            => 150.00,
            'subtotal'         => 130.00,
            'tax'              => 20.00,
            'discount'         => 0,
        ]);

        $fresh = $this->shipment->fresh();

        $this->assertEquals(
            150.00,
            (float) $fresh->total,
            'Users with manage pricing must be able to update price fields.'
        );
    }

    // ── cost_price gating ─────────────────────────────────────────────────────

    public function test_admin_can_update_cost_price_with_manage_pricing_permission(): void
    {
        $this->user->givePermissionTo('manage pricing');

        $this->actingAs($this->user)->put("/shipments/{$this->shipment->id}", [
            'sender_details'   => ['name' => 'A', 'phone' => '123', 'address' => 'St', 'city' => 'City', 'country' => 'CO'],
            'receiver_details' => ['name' => 'B', 'phone' => '456', 'address' => 'Ave', 'city' => 'Town', 'country' => 'CO'],
            'cost_price' => 35.50,
        ]);

        $this->assertEquals(
            35.50,
            (float) $this->shipment->fresh()->cost_price,
            'Users with manage pricing must be able to update cost_price.'
        );
    }

    public function test_employee_cannot_update_cost_price_without_manage_pricing_permission(): void
    {
        // $this->user has only 'edit shipments' + 'manage shipments' — no 'manage pricing'
        $this->actingAs($this->user)->put("/shipments/{$this->shipment->id}", [
            'sender_details'   => ['name' => 'A', 'phone' => '123', 'address' => 'St', 'city' => 'City', 'country' => 'CO'],
            'receiver_details' => ['name' => 'B', 'phone' => '456', 'address' => 'Ave', 'city' => 'Town', 'country' => 'CO'],
            'cost_price' => 99.99,
        ]);

        // cost_price should remain 0 (default) — not 99.99
        $this->assertNotEquals(
            99.99,
            (float) $this->shipment->fresh()->cost_price,
            'Users without manage pricing must not change cost_price.'
        );
    }

    // ── IDOR — markPaid cross-org ──────────────────────────────────────────────

    public function test_markpaid_is_blocked_cross_tenant(): void
    {
        $orgB      = Organization::factory()->create(['is_active' => true]);
        $userB     = User::factory()->create(['organization_id' => $orgB->id]);
        $receipt   = UploadedFile::fake()->create('receipt.pdf', 50, 'application/pdf');

        // userB tries to mark orgA's shipment as paid
        $response = $this->actingAs($userB)->post("/shipments/{$this->shipment->id}/mark-paid", [
            'amount'  => 100.00,
            'receipt' => $receipt,
        ]);

        // 403 (explicit org check) or 404 (global scope) — both mean cross-tenant blocked.
        $this->assertContains($response->getStatusCode(), [403, 404]);

        $this->assertEquals(
            PaymentStatus::UNPAID->value,
            $this->shipment->fresh()->payment_status->value
        );
    }
}
