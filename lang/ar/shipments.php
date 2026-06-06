<?php

return [
    'created' => 'تم إنشاء الشحنة',
    'updated' => 'تم تحديث الشحنة',
    'deleted' => 'تم حذف الشحنة',
    'status_changed' => 'تم تغيير حالة الشحنة',
    'label_printed' => 'تم طباعة الملصق',
    'invoice_sent' => 'تم إرسال الفاتورة',
    'statuses' => [
        'pending' => 'معلقة',
        'confirmed' => 'مؤكدة',
        'picked_up' => 'تم الاستلام',
        'in_transit' => 'في الطريق',
        'out_for_delivery' => 'خارج للتسليم',
        'delivered' => 'تم التسليم',
        'failed_delivery' => 'فشل التسليم',
        'returned' => 'مرتجعة',
        'cancelled' => 'ملغاة',
        'on_hold' => 'معلّقة',
    ],
    'validation' => [
        'weight_required' => 'الوزن مطلوب',
        'receiver_required' => 'بيانات المستلم مطلوبة',
        'service_required' => 'يرجى اختيار خدمة الشحن',
    ],
];
