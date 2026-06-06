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
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Colores avanzados
            $table->string('secondary_color')->nullable()->after('primary_color');
            $table->string('accent_color')->nullable()->after('secondary_color');
            
            // Fuentes
            $table->string('primary_font')->nullable()->after('accent_color'); // Google Font name
            $table->string('secondary_font')->nullable()->after('primary_font');
            $table->string('base_font_size')->default('16px')->after('secondary_font');
            
            // Layout
            $table->string('layout_density')->default('normal')->after('base_font_size'); // compact, normal, spacious
            $table->json('sidebar_menu_order')->nullable()->after('layout_density'); // Custom menu order
            
            // Notificaciones visuales
            $table->string('notification_style')->default('toast')->after('sidebar_menu_order'); // toast, banner, modal
            $table->string('notification_position')->default('top-right')->after('notification_style'); // top-right, top-left, bottom-right, bottom-left
            $table->integer('notification_duration')->default(5000)->after('notification_position'); // milliseconds
            
            // Login page
            $table->text('login_welcome_text')->nullable()->after('notification_duration');
            $table->string('login_form_position')->default('right')->after('login_welcome_text'); // left, right, center
            $table->json('login_visible_fields')->nullable()->after('login_form_position'); // Array of field names to show/hide
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'secondary_color',
                'accent_color',
                'primary_font',
                'secondary_font',
                'base_font_size',
                'layout_density',
                'sidebar_menu_order',
                'notification_style',
                'notification_position',
                'notification_duration',
                'login_welcome_text',
                'login_form_position',
                'login_visible_fields',
            ]);
        });
    }
};
