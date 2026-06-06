export interface Shipment {
    id: number;
    uuid?: string | null;
    tracking_number: string;
    organization_id?: number;
    status?: string | null;
    status_id?: number | null;
    payment_status?: string | null;
    service_type?: string | null;
    sender_details?: Record<string, string> | null;
    receiver_details?: Record<string, string> | null;
    package_details?: Record<string, unknown> | null;
    subtotal?: number | null;
    tax?: number | null;
    discount?: number | null;
    total?: number | null;
    cost_price?: number | null;
    currency?: string | null;
    exchange_rate?: number | null;
    ship_date?: string | null;
    estimated_delivery_date?: string | null;
    delivered_at?: string | null;
    is_archived?: boolean;
    created_by?: number | null;
    rate_card_id?: number | null;
    rate_rule_id?: number | null;
    manifest_id?: number | null;
    department_id?: number | null;
    origin_address?: string | null;
    destination_address?: string | null;
    notes?: string | null;
    notes_internal?: string | null;
    external_order_id?: string | null;
    reference_number?: string | null;
    reference?: string | null;
    weight?: number | null;
    shipment_status?: { id: number; name: string; code: string; color: string; icon?: string } | null;
    created_at?: string;
    updated_at?: string;
}

export enum ServiceType {
    ECONOMY = 'economy',
    EXPRESS = 'express',
    OVERNIGHT = 'overnight',
    INTERNATIONAL = 'international'
}

export enum PaymentStatus {
    PAID = 'paid',
    UNPAID = 'unpaid',
    PENDING = 'pending',
    REFUNDED = 'refunded'
}

export enum ShipmentStatus {
    PENDING = 'pending',
    PROCESSED = 'processed',
    PICKED_UP = 'picked_up',
    IN_TRANSIT = 'in_transit',
    OUT_FOR_DELIVERY = 'out_for_delivery',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    RETURNED = 'returned'
}
