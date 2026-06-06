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

return [
    'wizard' => [
        'internal_service' => 'Interno (Por defecto)',
        'payment_manual' => 'Pago manual',
        'validation' => [
            'name_required' => 'El nombre es obligatorio',
            'phone_required' => 'El teléfono es obligatorio',
            'address_required' => 'La dirección es obligatoria',
            'country_required' => 'Seleccione un país',
            'weight_required' => 'El peso es obligatorio',
            'weight_min' => 'El peso debe ser mayor a 0',
            'service_required' => 'Debe seleccionar un servicio',
            'rate_required' => 'Debe seleccionar una tarifa',
            'content_description_required' => 'La descripción del contenido es obligatoria',
        ],
    ],
    'activity' => [
        'created' => 'Envío creado',
        'status_changed' => 'Cambió estado a :status',
        'updated' => 'Actualizó datos del envío',
        'payment_manual' => 'Registró pago manual',
        'payment_stripe' => 'Pago recibido vía Stripe',
        'payment_paypal' => 'Pago recibido vía PayPal',
    ],
];
