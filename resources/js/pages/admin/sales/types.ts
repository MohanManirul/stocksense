import type { NamedRef } from '@/types';

export interface SaleProductOption {
    id: number;
    sku: string;
    name: string;
    sale_price: string;
    stock_on_hand: number;
}

export interface SaleOptions {
    products: SaleProductOption[];
}

export interface SaleItem {
    id: number;
    product_id: number;
    product?: { id: number; sku: string; name: string };
    quantity: number;
    unit_price: string;
    line_total: string;
}

export interface Sale {
    id: number;
    number: string;
    customer_name: string | null;
    notes: string | null;
    total: string;
    sold_at: string;
    items_count?: number;
    user?: NamedRef;
    items?: SaleItem[];
}

export interface SaleLine {
    key: number;
    product_id: string;
    quantity: string;
}

export interface SaleFormData {
    customer_name: string;
    notes: string;
    items: SaleLine[];
}

export interface SaleFilters {
    search?: string;
    from?: string;
    to?: string;
    page?: string;
}
