import type { NamedRef, ReorderStatus } from '@/types';

export type Confidence = 'high' | 'medium' | 'low';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ForecastSettings {
    history_days: number;
    holdout_days: number;
    baseline_days: number;
    review_period_days: number;
    min_history_days: number;
    service_level: number;
}

export interface ForecastAccuracy {
    actual_units: number;
    wape: number | null;
    baseline_wape: number | null;
    bias: number | null;
}

export interface ProductForecast {
    product: {
        id: number;
        sku: string;
        name: string;
        stock_on_hand: number;
        reorder_level: number;
        supplier: NamedRef | null;
    };
    status: ReorderStatus;
    confidence: Confidence | null;
    lead_time_days: number;
    history_days: number;
    stock_out_days: number;
    units_sold: number;
    sold_today: number;
    recent_daily_average: number;
    forecast_daily: number | null;
    forecast_7_days: number | null;
    forecast_30_days: number | null;
    on_order: number;
    days_of_cover: number | null;
    stockout_date: string | null;
    safety_stock: number | null;
    reorder_point: number | null;
    target_stock: number | null;
    suggested_order_quantity: number;
    accuracy: ForecastAccuracy | null;
}

export interface ForecastOverview {
    generated_at: string;
    settings: ForecastSettings;
    stats: Record<ReorderStatus, number>;
    accuracy: {
        products_evaluated: number;
        actual_units: number;
        wape: number | null;
        baseline_wape: number | null;
        improvement: number | null;
    };
    products: ProductForecast[];
}

export interface HistoryPoint {
    date: string;
    units: number;
    in_stock: boolean;
}

export interface BacktestPoint {
    date: string;
    actual: number;
    predicted: number;
    baseline: number;
}

export interface ForecastPoint {
    date: string;
    units: number;
    low: number;
    high: number;
}

export interface ProductForecastDetail extends ProductForecast {
    model: {
        alpha: number;
        beta: number;
        level: number;
        trend: number;
        residual_std_dev: number;
        weekday_factors: Record<Weekday, number>;
    } | null;
    history: HistoryPoint[];
    backtest: BacktestPoint[];
    forecast: ForecastPoint[];
    settings: ForecastSettings;
}
