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

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (!Schema::hasColumn('organizations', 'card_skin')) {
                $table->string('card_skin')->default('shadow')->after('layout_density');
            }
            if (!Schema::hasColumn('organizations', 'layout_background')) {
                $table->string('layout_background', 100)->default('oklch(92.9% .013 255.508)')->after('card_skin');
            }
            if (!Schema::hasColumn('organizations', 'notification_group_style')) {
                $table->string('notification_group_style')->default('stacked')->after('notification_style');
            }
            if (!Schema::hasColumn('organizations', 'notification_max_count')) {
                $table->unsignedTinyInteger('notification_max_count')->default(4)->after('notification_group_style');
            }
            if (!Schema::hasColumn('organizations', 'monochrome_mode')) {
                $table->boolean('monochrome_mode')->default(false)->after('notification_max_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'card_skin',
                'layout_background',
                'notification_group_style',
                'notification_max_count',
                'monochrome_mode',
            ]);
        });
    }
};
