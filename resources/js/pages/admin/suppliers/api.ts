import { api, withQuery } from '@/lib/api-client';
import type { ApiResponse, Paginated } from '@/types';
import type { Supplier, SupplierFilters, SupplierFormData } from './types';

export function getSuppliers(filters: SupplierFilters, signal: AbortSignal): Promise<Paginated<Supplier>> {
    return api.get<Paginated<Supplier>>(withQuery('/admin/suppliers', { ...filters, per_page: 15 }), signal);
}

export async function getSupplier(id: number, signal: AbortSignal): Promise<Supplier> {
    const response = await api.get<ApiResponse<Supplier>>(`/admin/suppliers/${id}`, signal);

    return response.data;
}

export async function createSupplier(data: SupplierFormData): Promise<Supplier> {
    const response = await api.post<ApiResponse<Supplier>>('/admin/suppliers', data);

    return response.data;
}

export async function updateSupplier(id: number, data: SupplierFormData): Promise<Supplier> {
    const response = await api.put<ApiResponse<Supplier>>(`/admin/suppliers/${id}`, data);

    return response.data;
}

export function deleteSupplier(id: number): Promise<void> {
    return api.delete(`/admin/suppliers/${id}`);
}
