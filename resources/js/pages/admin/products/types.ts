export interface CategoryOption {
    id: number;
    name: string;
}

export interface SupplierOption {
    id: number;
    name: string;
    lead_time_days: number;
}

export interface Product {
    id: number;
    sku: string;
    name: string;
    description: string | null;
    category_id: number;
    supplier_id: number | null;
    category?: CategoryOption;
    supplier?: SupplierOption | null;
    cost_price: string;
    sale_price: string;
    stock_on_hand: number;
    reorder_level: number;
    is_active: boolean;
    on_order?: number;
    updated_at: string;
}

export interface ProductOptions {
    categories: CategoryOption[];
    suppliers: SupplierOption[];
}

export interface ProductFormData {
    sku: string;
    name: string;
    description: string;
    category_id: string;
    supplier_id: string;
    cost_price: string;
    sale_price: string;
    reorder_level: string;
    is_active: boolean;
    opening_stock: string;
}

export interface ProductFilters {
    search?: string;
    category?: string;
    supplier?: string;
    status?: string;
    stock?: string;
    page?: string;
}

export type StockMovementType = 'opening' | 'sale' | 'purchase' | 'adjustment';

export interface StockMovement {
    id: number;
    type: StockMovementType;
    type_label: string;
    quantity: number;
    balance_after: number;
    note: string | null;
    occurred_at: string;
    user?: { id: number; name: string } | null;
    reference?: { type: 'sale' | 'purchase_order'; id: number; number: string } | null;
}

export interface StockAdjustmentData {
    quantity: string;
    note: string;
}
