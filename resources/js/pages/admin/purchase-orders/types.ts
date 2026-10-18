import type { NamedRef, PurchaseOrderStatus } from '@/types';

export interface PurchaseOrderSupplier {
    id: number;
    name: string;
    lead_time_days: number;
}

export interface PurchaseOrderProductOption {
    id: number;
    supplier_id: number;
    sku: string;
    name: string;
    cost_price: string;
    stock_on_hand: number;
    reorder_level: number;
}

export interface PurchaseOrderOptions {
    suppliers: PurchaseOrderSupplier[];
    products: PurchaseOrderProductOption[];
}

export interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product?: { id: number; sku: string; name: string; stock_on_hand: number };
    quantity: number;
    unit_cost: string;
    line_total: string;
}

export interface PurchaseOrder {
    id: number;
    number: string;
    status: PurchaseOrderStatus;
    status_label: string;
    supplier_id: number;
    supplier?: PurchaseOrderSupplier;
    creator?: NamedRef;
    receiver?: NamedRef | null;
    total: string;
    expected_at: string | null;
    ordered_at: string | null;
    received_at: string | null;
    cancelled_at: string | null;
    notes: string | null;
    created_at: string;
    items_count?: number;
    items?: PurchaseOrderItem[];
}

export interface PurchaseOrderLine {
    key: number;
    product_id: string;
    quantity: string;
    unit_cost: string;
}

export interface PurchaseOrderFormData {
    supplier_id: string;
    expected_at: string;
    notes: string;
    items: PurchaseOrderLine[];
}

export interface PurchaseOrderFilters {
    search?: string;
    status?: string;
    supplier?: string;
    page?: string;
}
