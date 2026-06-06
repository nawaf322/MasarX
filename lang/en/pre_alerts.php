<?php

return [
    // Flash messages (controller)
    'created'                 => 'Pre-alert created successfully.',
    'received'                => 'Package marked as received at warehouse.',
    'converted'               => 'Pre-alert converted to shipment successfully.',
    'cancelled'               => 'Pre-alert cancelled.',
    'cannot_cancel_converted' => 'Cannot cancel a pre-alert that has already been converted to a shipment.',
    'parse_error'             => 'Could not extract invoice data',
    'parse_success'           => 'Invoice data extracted successfully.',
    'attachment_uploaded'     => 'Attachment uploaded successfully.',

    // In-app notifications — PreAlertCreated (customer)
    'notification_created_title' => 'Pre-alert registered',
    'notification_created_body'  => 'Your pre-alert for :store (:tracking) has been registered and is pending arrival.',

    // In-app notifications — PreAlertCreated (staff/admin)
    'notification_staff_created_title' => 'New pre-alert received',
    'notification_staff_created_body'  => 'Pre-alert :number — :store (tracking: :tracking) is pending processing.',

    // In-app notifications — PreAlertReceived
    'notification_received_title' => 'Package arrived!',
    'notification_received_body'  => 'Your package from :store (tracking: :tracking) has arrived at the warehouse.',

    // In-app notifications — PreAlertConverted
    'notification_converted_title' => 'Shipment created',
    'notification_converted_body'  => 'Your package from :store has been processed and shipment :tracking has been created.',
];
