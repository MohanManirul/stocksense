import { api, withQuery } from '@/lib/api-client';
import type { ApiResponse, Paginated } from '@/types';
import type { Sale, SaleFilters, SaleFormData, SaleOptions } from './types';

export function getSales(filters: SaleFilters, signal: AbortSignal): Promise<Paginated<Sale>> {
    return api.get<Paginated<Sale>>(withQuery('/admin/sales', { ...filters, per_page: 15 }), signal);
}

export async function getSale(id: number, signal: AbortSignal): Promise<Sale> {
    const response = await api.get<ApiResponse<Sale>>(`/admin/sales/${id}`, signal);

    return response.data;
}

export async function getSaleOptions(signal: AbortSignal): Promise<SaleOptions> {
    const response = await api.get<ApiResponse<SaleOptions>>('/admin/sales/options', signal);

    return response.data;
}

export async function createSale(data: SaleFormData): Promise<Sale> {
    const response = await api.post<ApiResponse<Sale>>('/admin/sales', {
        customer_name: data.customer_name,
        notes: data.notes,
        items: data.items.map(({ product_id, quantity }) => ({ product_id, quantity })),
    });

    return response.data;
}
