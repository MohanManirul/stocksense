import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { ForecastOverview, ProductForecastDetail } from './types';

export async function getForecasts(signal: AbortSignal): Promise<ForecastOverview> {
    const response = await api.get<ApiResponse<ForecastOverview>>('/admin/forecasts', signal);

    return response.data;
}

export async function getProductForecast(productId: number, signal: AbortSignal): Promise<ProductForecastDetail> {
    const response = await api.get<ApiResponse<ProductForecastDetail>>(`/admin/forecasts/${productId}`, signal);

    return response.data;
}
