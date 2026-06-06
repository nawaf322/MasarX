<?php

return [
    // Mensajes flash (controlador)
    'created'                 => 'Pre-alerta creada correctamente.',
    'received'                => 'Paquete marcado como recibido en bodega.',
    'converted'               => 'Pre-alerta convertida en envío correctamente.',
    'cancelled'               => 'Pre-alerta cancelada.',
    'cannot_cancel_converted' => 'No se puede cancelar una pre-alerta que ya fue convertida en envío.',
    'parse_error'             => 'No se pudo extraer la información de la factura',
    'parse_success'           => 'Información de la factura extraída correctamente.',
    'attachment_uploaded'     => 'Archivo adjunto subido correctamente.',

    // Notificaciones en app — PreAlertCreated (cliente)
    'notification_created_title' => 'Pre-alerta registrada',
    'notification_created_body'  => 'Tu pre-alerta para :store (:tracking) ha sido registrada y está pendiente de llegada.',

    // Notificaciones en app — PreAlertCreated (staff/admin)
    'notification_staff_created_title' => 'Nueva pre-alerta recibida',
    'notification_staff_created_body'  => 'Pre-alerta :number — :store (tracking: :tracking) está pendiente de procesamiento.',

    // Notificaciones en app — PreAlertReceived
    'notification_received_title' => '¡Paquete llegó!',
    'notification_received_body'  => 'Tu paquete de :store (tracking: :tracking) ha llegado a la bodega.',

    // Notificaciones en app — PreAlertConverted
    'notification_converted_title' => 'Envío creado',
    'notification_converted_body'  => 'Tu paquete de :store ha sido procesado y se ha creado el envío :tracking.',
];
