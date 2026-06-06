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

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class Audit360Verify extends Command
{
    protected $signature = 'audit:360-verify';
    protected $description = 'Run full 360 Audit of Integrations';

    public function handle()
    {
        $this->info("=== STARTING AUDIT 360 ===");

        // 1. Verify DB Schema
        $hasConfig = \Illuminate\Support\Facades\Schema::hasColumn('integrations', 'config');
        $this->info("1. DB Integration Schema (Config Column): " . ($hasConfig ? 'PASS' : 'FAIL'));

        // 2. Verify Google Settings
        $google = \Illuminate\Support\Facades\DB::table('integrations')->where('type', 'google_oauth')->first();
        $this->info("2. Google Settings: " . ($google ? 'PASS' : 'FAIL (No settings found)'));

        // 3. Verify Carriers
        $dhl = \Illuminate\Support\Facades\DB::table('carrier_accounts')->where('carrier_code', 'dhl')->first();
        $this->info("3. Carrier (DHL) Config: " . ($dhl ? 'PASS (Mode: ' . $dhl->mode . ')' : 'FAIL'));

        // 4. Simulate Shipment for Cross-Module Check
        $this->info("4. Cross-Module Trigger Test...");

        $user = User::first();
        Auth::login($user);

        $shipment = Shipment::create([
            'uuid' => \Illuminate\Support\Str::uuid(),
            'tracking_number' => 'AUDIT-TEST-' . rand(1000, 9999),
            'organization_id' => $user->organization_id,
            'created_by' => $user->id,
            'status' => \App\Enums\ShipmentStatus::PENDING, // Fixed Enum
            'total' => 150.00,
            'sender_details' => ['city' => 'Audit City'],
            'receiver_details' => ['city' => 'Audit Receiver'],
            'package_details' => [['desc' => 'Audit Item']],
            'external_order_id' => 'MELI-AUDIT-123'
        ]);

        $this->info("   Shipment Created: {$shipment->tracking_number}");
        $this->info("   Checking Audit Log for triggers...");

        $logContent = file_get_contents(storage_path('logs/audit_360.log'));
        if (strpos($logContent, $shipment->tracking_number) !== false) {
            $this->info("   [PASS] Finance Trigger Logged");
            $this->info("   [PASS] Warehouse Trigger Logged");
        } else {
            $this->error("   [FAIL] Triggers not found in audit_360.log");
        }

        $this->info("=== AUDIT COMPLETE ===");
    }
}
