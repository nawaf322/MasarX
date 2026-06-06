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
 * SECURITY FIX: Agrega campo webhook_secret a carrier_accounts.
 *
 * Propósito: almacenar el secreto compartido que cada carrier (DHL, FedEx, UPS, USPS)
 * proporciona al configurar webhooks entrantes. Se usa para verificar la firma HMAC-SHA256
 * de cada request recibido en /api/webhooks/carrier-update.
 *
 * El valor se cifra con Crypt::encryptString() antes de guardar.
 * Nulo = carrier no tiene secreto configurado (webhook pasa con advertencia en log).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carrier_accounts', function (Blueprint $table) {
            $table->text('webhook_secret')
                ->nullable()
                ->after('status')
                ->comment('Encrypted shared secret for HMAC-SHA256 verification of incoming carrier webhooks');
        });
    }

    public function down(): void
    {
        Schema::table('carrier_accounts', function (Blueprint $table) {
            $table->dropColumn('webhook_secret');
        });
    }
};
