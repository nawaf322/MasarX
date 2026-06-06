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

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\NotificationTemplate;
use App\Models\NotificationRule;
use App\Models\NotificationChannel;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $org = \App\Models\Organization::first();
        if (!$org) {
            $this->command->warn('No hay organización. Ejecute DatabaseSeeder primero.');
            return;
        }
        $orgId = $org->id;

        // 1. Ensure Channels exist
        NotificationChannel::firstOrCreate(
            ['organization_id' => $orgId, 'channel_type' => 'smtp'],
            ['name' => 'Default SMTP', 'config' => [], 'status' => 'active']
        );
        NotificationChannel::firstOrCreate(
            ['organization_id' => $orgId, 'channel_type' => 'twilio'],
            ['name' => 'Twilio', 'config' => [], 'status' => 'active']
        );

        // 2. Default Events
        $events = ['shipment_created', 'out_for_delivery', 'delivered', 'exception'];

        foreach ($events as $event) {
            // Rules: Enable Email Default, WhatsApp optional
            NotificationRule::firstOrCreate(
                ['organization_id' => $orgId, 'event_key' => $event],
                ['channels' => ['email'], 'is_active' => true]
            );

            // 3. HTML Templates (Email) - English
            $contentEn = match ($event) {
                'shipment_created' => "Hello {{customer_name}},

Your shipment **{{tracking_number}}** has been created successfully.

We will notify you of any updates.",
                'out_for_delivery' => "Good news, {{customer_name}}!

Your shipment **{{tracking_number}}** is now Out For Delivery. Please be ready to receive it today.",
                'delivered' => "Hello {{customer_name}},

Your shipment **{{tracking_number}}** has been delivered successfully.

Thank you for choosing us!",
                'exception' => "Alert: Shipment **{{tracking_number}}** has encountered an exception ({{status}}).
Please contact support for more information.",
                default => "Update for shipment {{tracking_number}}."
            };

            $subjectEn = match ($event) {
                'shipment_created' => "Shipment Created: {{tracking_number}}",
                'out_for_delivery' => "Out for Delivery: {{tracking_number}}",
                'delivered' => "Delivered: {{tracking_number}}",
                'exception' => "Exception Alert: {{tracking_number}}",
                default => "Shipment Update"
            };

            NotificationTemplate::updateOrCreate(
                ['organization_id' => $orgId, 'channel' => 'email', 'event_key' => $event, 'language' => 'en'],
                ['subject' => $subjectEn, 'content' => $contentEn, 'is_active' => true]
            );

            // Spanish Templates
            $contentEs = match ($event) {
                'shipment_created' => "Hola {{customer_name}},

Tu envío **{{tracking_number}}** ha sido creado exitosamente.

Te notificaremos cualquier novedad.",
                'out_for_delivery' => "¡Buenas noticias, {{customer_name}}!

Tu envío **{{tracking_number}}** está En Ruta de Entrega. Por favor mantente atento.",
                'delivered' => "Hola {{customer_name}},

Tu envío **{{tracking_number}}** ha sido entregado exitosamente.

¡Gracias por elegirnos!",
                'exception' => "Alerta: El envío **{{tracking_number}}** ha reportado una excepción ({{status}}).
Por favor contacta a soporte.",
                default => "Actualización del envío {{tracking_number}}."
            };

            $subjectEs = match ($event) {
                'shipment_created' => "Envío Creado: {{tracking_number}}",
                'out_for_delivery' => "En Ruta de Entrega: {{tracking_number}}",
                'delivered' => "Entregado: {{tracking_number}}",
                'exception' => "Alerta de Excepción: {{tracking_number}}",
                default => "Actualización de Envío"
            };

            NotificationTemplate::updateOrCreate(
                ['organization_id' => $orgId, 'channel' => 'email', 'event_key' => $event, 'language' => 'es'],
                ['subject' => $subjectEs, 'content' => $contentEs, 'is_active' => true]
            );

            // WhatsApp Templates (Simpler)
            $waContent = match ($event) {
                'shipment_created' => "📦 Shipment *{{tracking_number}}* created. Updates to follow.",
                'out_for_delivery' => "🚚 Shipment *{{tracking_number}}* is out for delivery!",
                'delivered' => "✅ Shipment *{{tracking_number}}* has been delivered.",
                'exception' => "⚠️ Exception on shipment *{{tracking_number}}*. Contact support.",
                default => "Update: {{tracking_number}}"
            };

            NotificationTemplate::updateOrCreate(
                ['organization_id' => $orgId, 'channel' => 'whatsapp', 'event_key' => $event, 'language' => 'en'],
                ['subject' => null, 'content' => $waContent, 'is_active' => true]
            );

            // WA Spanish
            $waContentEs = match ($event) {
                'shipment_created' => "📦 Envío *{{tracking_number}}* creado.",
                'out_for_delivery' => "🚚 El envío *{{tracking_number}}* está en reparto.",
                'delivered' => "✅ Envío *{{tracking_number}}* entregado.",
                'exception' => "⚠️ Excepción en envío *{{tracking_number}}*.",
                default => "Actualización: {{tracking_number}}"
            };
            NotificationTemplate::updateOrCreate(
                ['organization_id' => $orgId, 'channel' => 'whatsapp', 'event_key' => $event, 'language' => 'es'],
                ['subject' => null, 'content' => $waContentEs, 'is_active' => true]
            );
        }
    }
}
