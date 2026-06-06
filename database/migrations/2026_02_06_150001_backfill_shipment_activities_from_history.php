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

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $rows = DB::table('shipment_histories')
            ->orderBy('shipment_id')
            ->orderBy('created_at')
            ->get();

        foreach ($rows as $h) {
            $action = str_contains(strtolower($h->description ?? ''), 'created') ? 'created' : 'status_changed';
            DB::table('shipment_activities')->insert([
                'shipment_id' => $h->shipment_id,
                'user_id' => $h->user_id,
                'action' => $action,
                'description' => $h->description ?? 'Status updated',
                'metadata' => json_encode(['status' => $h->status, 'location' => $h->location]),
                'created_at' => $h->created_at,
                'updated_at' => $h->updated_at ?? $h->created_at,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('shipment_activities')->truncate();
    }
};
