export interface DashboardStats {
    active_products: number;
    low_stock_count: number;
    sales_today: number;
    sales_last_30_days: number;
    open_purchase_orders: number;
}

export interface LowStockProduct {
    id: number;
    sku: string;
    name: string;
    stock_on_hand: number;
    reorder_level: number;
}

export interface DashboardSummary {
    stats: DashboardStats;
    low_stock_products: LowStockProduct[];
}
