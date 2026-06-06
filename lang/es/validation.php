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
    'maps' => [
        'mapbox_required' => 'El token de Mapbox es obligatorio cuando Mapbox está activo o es el proveedor por defecto.',
        'mapbox_invalid' => 'El token de Mapbox debe comenzar con pk.',
        'google_required' => 'La clave API de Google Maps es obligatoria cuando Google Maps está activo.',
        'google_invalid' => 'La clave API de Google Maps debe comenzar con AIza.',
    ],
    'attributes' => [
        'email' => 'correo electrónico',
        'document_id' => 'cédula / documento',
    ],
    'driver_location' => [
        'lat_required' => 'La latitud es obligatoria.',
        'lng_required' => 'La longitud es obligatoria.',
    ],
    'custom' => [
        'email' => [
            'unique' => 'Este correo ya está registrado. Use otro correo.',
        ],
        'document_id' => [
            'unique' => 'Esta cédula/documento ya está registrado. Use otro.',
        ],
    ],
];
