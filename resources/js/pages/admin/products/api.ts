import { api, withQuery } from '@/lib/api-client';
import type { ApiResponse, Paginated } from '@/types';
import type { Product, ProductFilters, ProductFormData, ProductOptions, StockAdjustmentData, StockMovement } from './types';

export function getProducts(filters: ProductFilters, signal: AbortSignal): Promise<Paginated<Product>> {
    return api.get<Paginated<Product>>(withQuery('/admin/products', { ...filters, per_page: 15 }), signal);
}

export async function getProduct(id: number, signal: AbortSignal): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/admin/products/${id}`, signal);

    return response.data;
}

export async function getProductOptions(signal: AbortSignal): Promise<ProductOptions> {
    const response = await api.get<ApiResponse<ProductOptions>>('/admin/products/options', signal);

    return response.data;
}

export async function createProduct(data: ProductFormData): Promise<Product> {
    const response = await api.post<ApiResponse<Product>>('/admin/products', data);

    return response.data;
}

export async function updateProduct(id: number, data: ProductFormData): Promise<Product> {
    const response = await api.put<ApiResponse<Product>>(`/admin/products/${id}`, data);

    return response.data;
}

export function deleteProduct(id: number): Promise<void> {
    return api.delete(`/admin/products/${id}`);
}

export function getStockMovements(id: number, page: number, signal: AbortSignal): Promise<Paginated<StockMovement>> {
    return api.get<Paginated<StockMovement>>(withQuery(`/admin/products/${id}/movements`, { page, per_page: 10 }), signal);
}

export async function adjustStock(id: number, data: StockAdjustmentData): Promise<StockMovement> {
    const response = await api.post<ApiResponse<StockMovement>>(`/admin/products/${id}/adjustments`, data);

    return response.data;
}
