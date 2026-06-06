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
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ensure basic branches exist
        $defaults = ['Miami', 'Madrid', 'Bogota', 'Medellin', 'HQ'];
        foreach ($defaults as $name) {
            \App\Models\Branch::firstOrCreate(['name' => $name]);
        }

        // 2. Migrate existing users based on 'city' column
        $users = \App\Models\User::whereNotNull('city')->whereNull('branch_id')->get();
        foreach ($users as $user) {
            $branch = \App\Models\Branch::firstOrCreate(['name' => $user->city]);
            $user->update(['branch_id' => $branch->id]);
        }
    }

    public function down(): void
    {
        // Optional: clear branch_ids
        \App\Models\User::query()->update(['branch_id' => null]);
        \App\Models\Branch::query()->truncate();
    }
};
