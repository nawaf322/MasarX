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

/**
 * SECURITY FIX: Agrega paypal_pending_order_id a shipments.
 *
 * Propósito: vincular el PayPal order ID al shipment específico en el momento de
 * crear el order (antes del redirect a PayPal). Permite verificar en capturePayPalOrder()
 * que el orderId recibido en el callback fue efectivamente creado para ESTE shipment.
 *
 * Sin este campo, un usuario autenticado podría reutilizar un orderId de otro pago
 * (order ID reuse attack) para marcar un envío como pagado sin haber pagado.
 *
 * El campo se limpia (→ null) tras una captura exitosa o si el pago es cancelado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('paypal_pending_order_id')->nullable()
                ->comment('Transient PayPal order ID pending capture; cleared after successful capture or cancellation');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('paypal_pending_order_id');
        });
    }
};
